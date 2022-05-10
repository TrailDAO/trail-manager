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
  keys: {
    type: Object,
    schema: {
      contract: String,
      abi: String,
      bytecode: String,
    },
  },
  error: String,
  inputs: Object,
}, {
  saveUnknown: ['inputs.*', 'variables.*', 'keys.*'],
})

interface CompileKeys {
  contract: string
  abi: string
  bytecode: string
}

class Compile extends Document {
  id!: string
  status!: string
  user!: string
  circuitId!: string
  variables?: Object
  keys?: CompileKeys
  bucket!: string
  error?: string
  inputs?: Object
}

const CompileModel = dynamoose.model<Compile>('Compile', schema)

export default CompileModel
