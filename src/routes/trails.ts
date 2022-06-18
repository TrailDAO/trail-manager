import { Router, Request, Response } from 'express'
import { validate } from 'express-jsonschema'
import { randomUUID } from 'crypto'
import { orderByDistance, getDistance } from 'geolib'
import validationErrorHandler from '../validationErrorHandler'
import TrailModel from '../db/Trail'
import TrailSchema from '../schemas/TrailSchema'

const trailsRouter = Router()

trailsRouter.get('/trails', async (req, res) => {
  const { limit, lastKey } = req.query

  const scan = TrailModel.scan()
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

  const trails = documentRetriever ? await documentRetriever.exec() : await scan.exec()

  res.status(200).json({
    trails,
    lastKey: trails.lastKey,
  })
})

trailsRouter.post(
  '/trails',
  validate({ body: TrailSchema }),
  validationErrorHandler(),
  async (req: Request, res: Response) => {
    const {
      name,
      location,
      latitude,
      longitude,
      bounds,
      state,
      counties,
      shortDescription,
      longDescription,
    } = req.body

    let { id } = req.body

    if (id) {
      const trail = (await TrailModel.scan('id').eq(id).exec())[0]
      if (trail) {
        trail.name = name
        trail.location = location
        trail.latitude = latitude
        trail.longitude = longitude
        trail.bounds = bounds
        trail.state = state
        trail.counties = counties
        trail.shortDescription = shortDescription
        trail.longDescription = longDescription
        trail.save()
        res.sendStatus(200)
      } else {
        res.status(400).send(`Trail does not exist with id ${id}`)
      }
    } else {
      const trail = await TrailModel.scan('name').eq(name).exec()
      if (trail) {
        res.status(400).send('Trail already exists, use id to update')
        return
      }

      id = randomUUID()
      const newTrail = new TrailModel({
        id,
        name,
        location,
        latitude,
        longitude,
        bounds,
        state,
        counties,
        shortDescription,
        longDescription,
      })

      await newTrail.save()
      res.status(200).send(id)
    }
  },
)

trailsRouter.get('/trails/search', async (req, res) => {
  const { latitude, longitude, distanceMax } = req.query

  const referencePoint = {
    latitude: latitude!.toString(),
    longitude: longitude!.toString(),
  }

  const trails = await TrailModel.scan().exec()

  res.status(200).send(
    orderByDistance(referencePoint, trails).filter(
      (sortedTrail) => getDistance(sortedTrail, referencePoint) <= Number(distanceMax),
    ),
  )
})

trailsRouter.get('/trails/:id', async (req, res) => {
  const { id } = req.params
  const trail = (await TrailModel.scan('id').eq(id).exec())[0]
  if (trail) {
    res.status(200).json(trail)
  } else {
    res.sendStatus(404)
  }
})

export default trailsRouter
