import {
  CreateBucketCommand, GetObjectCommand, PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3'
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import dotenv from 'dotenv'
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'fs'
import { execFileSync } from 'child_process'
import { promisify } from 'util'
import randomstring from 'randomstring'
import Mustache from 'mustache'
import path from 'path'
import { Readable } from 'stream'
import { difference, isEmpty } from 'lodash'
import CircuitModel from '../src/db/Circuit'
import CompileModel from '../src/db/Compile'
import validateInputs from '../src/validateInputs'

dotenv.config()

const solc = require('solc')

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
})

const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  forcePathStyle: true,
})

const streamToString = (stream: Readable) => new Promise<string>((resolve) => {
  stream.setEncoding('utf-8')
  const chunks: string[] = []

  stream.on('data', (chunk: string) => {
    chunks.push(chunk)
  })

  stream.on('end', () => resolve(chunks.join()))
})

const deleteMessage = async (receiptHandle: any) => {
  console.log(`Deleting ${receiptHandle}`)
  await sqsClient.send(new DeleteMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    ReceiptHandle: receiptHandle,
  }))
}

const writeExecBuffer = async (output: Buffer, tempDir: string, outputName: string) => {
  const outputFile = path.join(tempDir, `${outputName}.txt`)
  writeFileSync(outputFile, output.toString())
}

// add in an array here for parameters
const execZkStep = (stepName: string, args: string[], cwd: string) => {
  writeExecBuffer(execFileSync(
    `${process.cwd()}/scripts/${stepName}.sh`,
    args,
    { cwd },
  ), cwd, `${stepName}_output`)
}

async function main() {
  const input = {
    QueueUrl: process.env.SQS_QUEUE_URL,
    MaxNumberOfMessages: 1,
  }

  let msg
  try {
    const receiveResponse = await sqsClient.send(new ReceiveMessageCommand(input))
    if (receiveResponse.Messages) {
      [msg] = receiveResponse.Messages

      if (!msg.Body) {
        throw new Error('Message with no body?')
      }

      const {
        requestId, circuitId, variables, user, inputs,
      } = JSON.parse(msg.Body)

      const circuit = (await CircuitModel.scan('id').eq(circuitId).exec())[0]

      if (!circuit) {
        throw new Error('Circuit not found')
      }

      const missingVariables = difference(
        circuit.requiredVariables,
        Object.getOwnPropertyNames(variables),
      )

      if (!isEmpty(missingVariables)) {
        throw new Error(`Missing required variables ${missingVariables.join(' ')}`)
      }

      const badInputs = validateInputs(circuit.requiredInputs, inputs)
      if (!isEmpty(badInputs)) {
        throw new Error(`Bad inputs ${badInputs.join(' ')}`)
      }

      const bucket = `${requestId}-compile`.toLowerCase()
      await s3Client.send(new CreateBucketCommand({
        Bucket: bucket,
      }))

      const newCompile = new CompileModel({
        id: requestId,
        user,
        inputs,
        bucket,
        circuitId,
        variables,
        status: 'Received',
      })
      newCompile.save()

      try {
        // Retrieve template from s3
        const s3Res = await s3Client.send(new GetObjectCommand({
          Bucket: circuit.bucket,
          Key: circuit.key,
        }))
        const stream = s3Res.Body as Readable
        const template = await streamToString(stream)

        // Populate template with mustache
        const populatedTemplate = Mustache.render(template, variables)

        // set status of compile in dynamodb to processing
        newCompile.status = 'Processing'
        newCompile.save()

        // Create temp directory with name of job id
        const tempDir = path.join('tmp', `compile-${requestId}`)
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir)
        }
        // Write out populated template
        const circomCircuitFile = path.join(tempDir, `${circuit.name}.circom`)
        writeFileSync(circomCircuitFile, populatedTemplate)

        // write input.json to tempdir
        const inputsFile = path.join(tempDir, 'input.json')
        writeFileSync(inputsFile, JSON.stringify(inputs))

        const entropyX = randomstring.generate()
        const entropyY = randomstring.generate()

        // Execute zk steps
        execZkStep('compile', [circuit.name], tempDir)
        execZkStep('generate_witness', [circuit.name], `${tempDir}/${circuit.name}_js`)
        execZkStep('powers_of_tau', [circuit.name, entropyX, entropyY], tempDir)
        execZkStep('generate_proof', [circuit.name], tempDir)
        execZkStep('create_contract', [circuit.name], tempDir)

        // TODO: Save output streams and essential outputs
        const contract = readFileSync(path.join(tempDir, 'Verifier.sol'))

        const solcInput = {
          language: 'Solidity',
          sources: {
            'Verifier.sol': {
              content: contract.toString(),
            },
          },
          settings: {
            outputSelection: {
              '*': {
                '*': ['*'],
              },
            },
          },
        }

        const loadRemoteVersion = promisify(solc.loadRemoteVersion)
        const solcVer = await loadRemoteVersion('v0.6.11+commit.5ef660b1')

        const solcOutput = JSON.parse(solcVer.compile(JSON.stringify(solcInput)))

        const abi = JSON.stringify(solcOutput.contracts['Verifier.sol'].Verifier.abi)
        const bytecode = solcOutput.contracts['Verifier.sol'].Verifier.evm.bytecode.object

        await s3Client.send(new PutObjectCommand({
          Key: 'Verifier.sol',
          Bucket: bucket,
          Body: contract,
        }))

        await s3Client.send(new PutObjectCommand({
          Key: 'bytecode',
          Bucket: bucket,
          Body: bytecode,
        }))

        await s3Client.send(new PutObjectCommand({
          Key: 'abi',
          Bucket: bucket,
          Body: abi,
        }))

        newCompile.keys = {
          contract: 'Verifier.sol',
          bytecode: 'bytecode',
          abi: 'abi',
        }

        newCompile.status = 'Ready for Deployment'
        newCompile.save()
      } catch (err) {
        console.log(err)
      }
    } else {
      console.log('Nothing on the queue, exiting')
    }
  } catch (err) {
    console.log(err)
  } finally {
    if (msg) {
      deleteMessage(msg.ReceiptHandle)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
