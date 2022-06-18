import * as dynamoose from 'dynamoose'
import { Document } from 'dynamoose/dist/Document'
import dotenv from 'dotenv'

dotenv.config()

dynamoose.aws.ddb.local(process.env.AWS_ENDPOINT)

const schema = new dynamoose.Schema({
  id: String,
  name: String,
  location: String,
  latitude: String,
  longitude: String,
  bounds: {
    type: Array,
    schema: [{
      type: Object,
      schema: {
        latitude: Number,
        longitude: Number,
      },
    }],
  },
  state: String,
  counties: String,
  shortDescription: String,
  longDescription: String,
})

interface Geopoint {
  latitude: number
  longitude: number
}

class Trail extends Document {
  id!: string
  name!: string
  location!: string
  latitude!: string
  longitude!: string
  bounds!: Geopoint[]
  state!: string
  counties!: string
  shortDescription!: string
  longDescription!: string
}

const TrailModel = dynamoose.model<Trail>('Trail', schema)

export default TrailModel
