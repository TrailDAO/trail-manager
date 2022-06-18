import { Router } from 'express'
import { validate } from 'express-jsonschema'
import { difference, isEmpty } from 'lodash'
import randomstring from 'randomstring'
import CompileSchema from '../schemas/CompileSchema'
import CircuitModel from '../db/Circuit'
import auth from '../auth'
import validateInputs from '../validateInputs'
import CompileModel from '../db/Compile'
import DeploymentSchema from '../schemas/DeploymentSchema'
import getStreamFromS3 from '../aws/s3Client'
import sendMessage from '../aws/sqsClient'

const compileRouter = Router()

compileRouter.post('/compile', auth, validate({ body: CompileSchema }), async (req: any, res, next) => {
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
    await sendMessage(request)
  } catch (err) {
    next(err)
  }

  res.status(200).send(requestId)
})

compileRouter.get('/compile', auth, async (req: any, res) => {
  const compile = await CompileModel.scan('user').eq(req.user).exec()
  res.status(200).json(compile)
})

compileRouter.get('/compile/:id', auth, async (req: any, res) => {
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

compileRouter.post('/compile/:id/deploy', auth, validate({ body: DeploymentSchema }), async (req: any, res) => {
  const deployment = req.body

  const { id } = req.params
  const compile = (await CompileModel.scan('id').eq(id)
    .and()
    .where('user')
    .eq(req.user)
    .exec())[0]
  if (!compile) {
    res.status(404).send('Not found')
  }

  compile.status = 'Deployed'
  if (!compile.deployments) {
    compile.deployments = [deployment]
  } else {
    compile.deployments.push(deployment)
  }
  compile.save()
  res.sendStatus(200)
})

compileRouter.get('/compile/:id/:keyType', auth, async (req: any, res) => {
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

    const stream = await getStreamFromS3(compile.bucket, key)
    stream.pipe(res)
  } catch (err) {
    console.log(err)
    res.status(404).send('Contract source not found')
  }
})

export default compileRouter
