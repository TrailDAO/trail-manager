import * as dynamoose from 'dynamoose'
import { Document } from 'dynamoose/dist/Document'
import dotenv from 'dotenv'

dotenv.config()

dynamoose.aws.ddb.local(process.env.AWS_ENDPOINT)

const schema = new dynamoose.Schema({
  id: String,
  name: String,
  description: String,
  requiredVariables: {
    type: Array,
    schema: [String],
  },
  requiredInputs: Object,
  key: String,
  bucket: String,
}, {
  saveUnknown: ['requiredInputs.*'],
})

class Circuit extends Document {
  id!: string
  name!: string
  description!: string
  requiredVariables!: string[]
  requiredInputs!: object
  key!: string
  bucket!: string
}

const CircuitModel = dynamoose.model<Circuit>('Circuit', schema)

export default CircuitModel
