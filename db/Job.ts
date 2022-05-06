import * as dynamoose from 'dynamoose'

const schema = new dynamoose.Schema({
  jobId: String,
  status: {
    type: String,
    enum: ['Received', 'Processing', 'Ready for Deployment'],
  },
  address: String,
  circuitId: String,
  variables: Object,
})

export default schema
