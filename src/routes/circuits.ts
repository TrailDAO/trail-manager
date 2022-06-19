import { Router } from 'express'
import getObjectFromS3 from '../aws/s3Client'
import CircuitModel from '../db/Circuit'
import auth from '../auth'

const circuitsRouter = Router()

circuitsRouter.get('/circuits', auth, async (req, res) => {
  const { limit, lastKey } = req.query
  const scan = CircuitModel.scan()
  let documentRetriever

  if (limit) {
    documentRetriever = scan.limit(Number(limit))
  }

  if (lastKey) {
    const ref = {
      id: lastKey,
    }
    documentRetriever = documentRetriever
      ? documentRetriever.startAt(ref)
      : scan.startAt(ref)
  }

  const circuits = documentRetriever ? await documentRetriever.exec() : await scan.exec()

  res.status(200).json({
    circuits,
    lastKey: circuits.lastKey,
  })
})

circuitsRouter.get('/circuits/:id', auth, async (req, res) => {
  const { id } = req.params
  const circuit = await CircuitModel.scan('id').eq(id).exec()
  res.status(200).json(circuit[0])
})

circuitsRouter.get('/circuits/:id/template', auth, async (req, res) => {
  const { id } = req.params
  const circuit = (await CircuitModel.scan('id').eq(id).exec())[0]
  const stream = await getObjectFromS3(circuit.bucket, circuit.key)
  stream.pipe(res)
})

export default circuitsRouter
