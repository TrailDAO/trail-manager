import * as dynamoose from 'dynamoose'
import { Document } from 'dynamoose/dist/Document'
import dotenv from 'dotenv'

dotenv.config()

dynamoose.aws.ddb.local(process.env.AWS_ENDPOINT)

const schema = new dynamoose.Schema({
  id: String,
  status: {
    type: String,
    enum: ['Received', 'Processing', 'Ready for Deployment', 'Error'],
  },
  user: String,
  circuitId: String,
  variables: Object,
  bucket: String,
  key: String,
  error: String,
  inputs: Object,
  additionalKeys: Object,
  deployments: Object,
}, {
  saveUnknown: ['inputs.*', 'variables.*', 'additionalKeys.*', 'deployments.*'],
})

class Compile extends Document {
  id!: string
  status!: string
  user!: string
  circuitId!: string
  variables?: Object
  key!: string
  bucket!: string
  error?: string
  inputs?: Object
  additionalKeys?: Object
  deployments?: Object
}

const CompileModel = dynamoose.model<Compile>('Compile', schema)

export default CompileModel
