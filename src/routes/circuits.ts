import { Router } from 'express'
import { validate } from 'express-jsonschema'
import getObjectFromS3 from '../aws/s3Client'
import CircuitModel from '../db/Circuit'
import CircuitsSchema from '../schemas/CircuitsSchema'

const circuitsRouter = Router()

circuitsRouter.get('/circuits', async (req, res) => {
  const circuits = await CircuitModel.scan().exec()
  res.status(200).json(circuits)
})

circuitsRouter.post('/circuits', validate({ body: CircuitsSchema }), async (req, res) => {
  const { limit, lastKey } = req.body
  const scan = CircuitModel.scan()
  let documentRetriever
  if (limit) {
    documentRetriever = scan.limit(limit)
  }
  if (lastKey) {
    documentRetriever = documentRetriever
      ? documentRetriever.startAt(lastKey)
      : scan.startAt(lastKey)
  }

  const circuits = documentRetriever ? await documentRetriever.exec() : await scan.exec()

  res.status(200).json({
    circuits,
    lastKey: circuits.lastKey,
  })
})

circuitsRouter.get('/circuits/:id', async (req, res) => {
  const { id } = req.params
  const circuit = await CircuitModel.scan('id').eq(id).exec()
  res.status(200).json(circuit[0])
})

circuitsRouter.get('/circuits/:id/template', async (req, res) => {
  const { id } = req.params
  const circuit = (await CircuitModel.scan('id').eq(id).exec())[0]
  const stream = await getObjectFromS3(circuit.bucket, circuit.key)
  stream.pipe(res)
})

export default circuitsRouter
