import express from 'express'
import { validate } from 'express-jsonschema'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import randomstring from 'randomstring'
import Web3 from 'web3'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import * as dynamoose from 'dynamoose'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { difference, isEmpty } from 'lodash'
import CircuitModel from './db/Circuit'
import CompileModel from './db/Compile'
import CompileSchema from './schemas/CompileSchema'
import CircuitsSchema from './schemas/CircuitsSchema'
import validateInputs from './validateInputs'

const web3 = new Web3(process.env.ALCHEMY_URL || 'ws://localhost:8545')

dotenv.config()

dynamoose.aws.ddb.local(process.env.AWS_ENDPOINT)

const tokenSecret = process.env.TOKEN_SECRET || 'secret'

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
})

const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  forcePathStyle: true,
})

const app = express()

app.use(cors())
app.use(bodyParser.json())

// eslint-disable-next-line consistent-return
function auth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    return res.sendStatus(401)
  }

  try {
    const verified = jwt.verify(token, tokenSecret)
    req.user = verified.sub
  } catch (err) {
    next(err)
  }

  next()
}

app.get('/circuits', async (req, res) => {
  const circuits = await CircuitModel.scan().exec()
  res.status(200).json(circuits)
})

app.post('/circuits', validate({ body: CircuitsSchema }), async (req, res) => {
  const { limit, lastKey } = req.body
  const scan = CircuitModel.scan()
  let documentRetriever
  if (limit) {
    documentRetriever = scan.limit(limit)
  }
  if (lastKey) {
    documentRetriever = documentRetriever
      ? documentRetriever.startAt(lastKey)
      : scan.startAt(lastKey)
  }

  const circuits = documentRetriever ? await documentRetriever.exec() : await scan.exec()

  res.status(200).json({
    circuits,
    lastKey: circuits.lastKey,
  })
})

app.get('/circuits/:id', async (req, res) => {
  const { id } = req.params
  const circuit = await CircuitModel.scan('id').eq(id).exec()
  res.status(200).json(circuit[0])
})

app.get('/circuits/:id/template', async (req, res) => {
  const { id } = req.params
  const circuit = await CircuitModel.scan('id').eq(id).exec()
  const s3Res = await s3Client.send(new GetObjectCommand({
    Bucket: circuit[0].bucket,
    Key: circuit[0].key,
  }))
  const stream = s3Res.Body as Readable
  stream.pipe(res)
})

app.get('/health-check', (req, res) => {
  res.status(200).send('ok')
})

app.post('/compile', auth, validate({ body: CompileSchema }), async (req: any, res, next) => {
  const { circuitId, variables, inputs } = req.body
  const circuit = (await CircuitModel.scan('id').eq(circuitId).exec())[0]

  if (!circuit) {
    res.status(404).send('Circuit not found')
    return
  }

  const badInputs = validateInputs(circuit.requiredInputs, inputs)
  if (!isEmpty(badInputs)) {
    res.status(400).send(`Bad inputs ${badInputs.join(' ')}`)
    return
  }

  const missingVariables = difference(
    circuit.requiredVariables,
    Object.getOwnPropertyNames(variables),
  )

  if (!isEmpty(missingVariables)) {
    res.status(400).send(`Missing required variables ${missingVariables.join(' ')}`)
    return
  }

  const requestId = randomstring.generate(7)

  const request = {
    requestId,
    circuitId,
    variables,
    inputs,
    user: req.user,
  }

  try {
    await sqsClient.send(new SendMessageCommand({
      MessageBody: JSON.stringify(request),
      QueueUrl: process.env.SQS_QUEUE_URL,
    }))
  } catch (err) {
    next(err)
  }

  res.status(200).send(requestId)
})

app.get('/compile/:id', auth, async (req: any, res) => {
  const { id } = req.params
  const compile = await CompileModel.scan('id').eq(id)
    .and()
    .where('user')
    .eq(req.user)
    .exec()
  if (!compile[0]) {
    res.status(404).send('Not found')
  }
  res.status(200).json(compile[0])
})

app.get('/compile', auth, async (req: any, res) => {
  const compile = await CompileModel.scan('user').eq(req.user).exec()
  res.status(200).json(compile)
})

app.get('/compile/:id/:keyType', auth, async (req: any, res) => {
  const { id, keyType } = req.params
  const compile = (await CompileModel.scan('id').eq(id)
    .and()
    .where('user')
    .eq(req.user)
    .exec())[0]

  if (!compile) {
    res.status(404).send('Not found')
  }

  try {
    if (!compile.keys) {
      throw new Error('Keys undefined')
    }

    let key
    if (keyType === 'contract') key = compile.keys.contract
    else if (keyType === 'abi') key = compile.keys.abi
    else key = compile.keys.bytecode

    const s3Res = await s3Client.send(new GetObjectCommand({
      Bucket: compile.bucket,
      Key: key,
    }))
    const stream = s3Res.Body as Readable
    stream.pipe(res)
  } catch (err) {
    console.log(err)
    res.status(404).send('Contract source not found')
  }
})

app.get('/web3-login-message', async (req, res) => {
  const nonce = randomstring.generate(7)
  const message = [
    'Sign this message to confirm you own this wallet address.',
    'This action will not cost any gas.\nNonce: ',
    nonce,
  ]

  res.status(200).send(message.join(' '))
})

app.post('/web3-login-verify', async (req, res, next) => {
  const { msg, sig, address } = req.body
  try {
    const recoveredAddress = web3.eth.accounts.recover(msg, sig)
    if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
      const accessToken = jwt.sign({
        sub: recoveredAddress,
      }, tokenSecret)

      res.status(201).send(accessToken)
    } else {
      res.status(400).send('Bad signature')
    }
  } catch (err) {
    next(err)
  }
})

const port = 3000
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
