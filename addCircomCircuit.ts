import * as dynamoose from 'dynamoose'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'
import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import CircuitShema from './db/Circuit'

dotenv.config()

dynamoose.aws.ddb.local(process.env.AWS_ENDPOINT)

const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.REGION,
  forcePathStyle: true,
})

async function main() {
  const args = process.argv.slice(2)
  try {
    const circuitId = randomUUID().split('-').join('')
    console.log(`Creating circuit id ${circuitId}`)
    const circuitName = args[0]
    console.log(`Circuit name ${circuitName}`)
    const circuitTemplate = args[1]
    const requiredVariables = args[2]

    const templateBuffer = readFileSync(circuitTemplate)

    const bucketName = `${circuitId}-${circuitName.toLowerCase()}`
    console.log(`Creating bucket ${bucketName}`)

    await s3Client.send(new CreateBucketCommand({
      Bucket: bucketName,
    }))

    console.log('Successfully created bucket')
    console.log('Putting object in bucket')
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: `${circuitName}.circom`,
      Body: templateBuffer,
    }))
    console.log('Successfully put object')

    const Circuit = dynamoose.model('Circuit', CircuitShema)
    const newCircuit = new Circuit({
      circuitId,
      bucketName,
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
