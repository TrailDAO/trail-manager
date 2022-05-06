import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import dotenv from 'dotenv'

dotenv.config()

const sqsClient = new SQSClient({
  region: process.env.REGION,
  endpoint: process.env.AWS_ENDPOINT,
})

async function main() {
  const input = {
    QueueUrl: process.env.SQS_QUEUE_URL,
    MaxNumberOfMessages: 1,
  }

  try {
    const receiveResponse = await sqsClient.send(new ReceiveMessageCommand(input))
    if (receiveResponse.Messages) {
      const msg = receiveResponse.Messages[0]

      console.log(msg.Body)

      // Find circom template from dynamodb table
      // Ensure that circom template variables are in message
      // Get user from message
      // Populate template
      // set status of job in dynamodb for user
      // Run through scripts, setting status after each step
      // Create temp directory with name of job id
      // Shell out to create files
      // Create a bucket for each output
      // Save required outputs to s3, save paths to dynamodb

      await sqsClient.send(new DeleteMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        ReceiptHandle: msg.ReceiptHandle,
      }))
      console.log(`deleted ${msg.ReceiptHandle}`)
    }
  } catch (err) {
    console.log(err)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
