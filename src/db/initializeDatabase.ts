import dotenv from 'dotenv'
import * as dynamoose from 'dynamoose'

dotenv.config()

dynamoose.aws.ddb.local(process.env.AWS_ENDPOINT)
