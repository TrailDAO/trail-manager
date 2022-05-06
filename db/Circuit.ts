import * as dynamoose from 'dynamoose'

const schema = new dynamoose.Schema({
  circuitId: String,
  bucketName: String,
  requiredVariables: String,
})

export default schema
