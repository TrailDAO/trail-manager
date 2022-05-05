import express from 'express'
import { validate } from 'express-jsonschema'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import CompileSchema from './schemas/CompileSchema'

dotenv.config()

const sqsClient = new SQSClient({
  region: process.env.REGION,
  endpoint: process.env.AWS_ENDPOINT,
})

const app = express()

app.use(bodyParser.json())

app.get('/health-check', (req, res) => {
  res.status(200).send('ok')
})

app.post('/compile', validate({ body: CompileSchema }), async (req, res, next) => {
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

const port = 3000
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
