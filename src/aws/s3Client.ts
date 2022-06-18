import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  forcePathStyle: true,
})

export default async function getStreamFromS3(bucket: string, key: string) {
  const s3Res = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  }))
  return s3Res.Body as Readable
}
