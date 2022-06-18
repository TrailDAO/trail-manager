import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
})

export default async function sendMessage(request: any) {
  await sqsClient.send(new SendMessageCommand({
    MessageBody: JSON.stringify(request),
    QueueUrl: process.env.SQS_QUEUE_URL,
  }))
}
