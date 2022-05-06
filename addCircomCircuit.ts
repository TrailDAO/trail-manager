import * as dynamoose from 'dynamoose'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'
import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import CircuitModel from './db/Circuit'

dotenv.config()

dynamoose.aws.sdk.config.update({
  region: 'us-east-1',
})

dynamoose.aws.ddb.local(process.env.AWS_ENDPOINT)

const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  forcePathStyle: true,
})

async function main() {
  const args = process.argv.slice(2)
  try {
    const id = randomUUID().split('-').join('')
    console.log(`Creating circuit id ${id}`)

    const circuitMetadata = JSON.parse(readFileSync(args[0]).toString())
    const template = readFileSync(args[1])

    const { name, description, requiredVariables } = circuitMetadata
    console.log(`'${name}' '${description}' '${requiredVariables}'`)

    const bucket = `${id}-${name.toLowerCase()}`
    const key = `${name}.circom`
    console.log(`Creating bucket ${bucket}`)

    await s3Client.send(new CreateBucketCommand({
      Bucket: bucket,
    }))

    console.log('Successfully created bucket')
    console.log('Putting object in bucket')
    await s3Client.send(new PutObjectCommand({
      Key: key,
      Bucket: bucket,
      Body: template,
    }))
    console.log('Successfully put object')

    const newCircuit = new CircuitModel({
      id,
      key,
      name,
      bucket,
      description,
      requiredVariables,
    })
    console.log('Saving circuit')
    await newCircuit.save()
  } catch (err) {
    console.log(err)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
