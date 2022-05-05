import express from 'express'
import { validate } from 'express-jsonschema'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import randomstring from 'randomstring'
import Web3 from 'web3'
import jwt from 'jsonwebtoken'
import CompileSchema from './schemas/CompileSchema'

const web3 = new Web3(process.env.ALCHEMY_URL || 'ws://localhost:8545')

dotenv.config()

const tokenSecret = process.env.TOKEN_SECRET || 'secret'

const sqsClient = new SQSClient({
  region: process.env.REGION,
  endpoint: process.env.AWS_ENDPOINT,
})

const app = express()

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

app.get('/health-check', (req, res) => {
  res.status(200).send('ok')
})

app.post('/compile', auth, validate({ body: CompileSchema }), async (req, res, next) => {
  const input = {
    MessageBody: JSON.stringify(req.body),
    QueueUrl: process.env.SQS_QUEUE_URL,
  }

  try {
    await sqsClient.send(new SendMessageCommand(input))
  } catch (err) {
    next(err)
  }

  res.sendStatus(200)
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
