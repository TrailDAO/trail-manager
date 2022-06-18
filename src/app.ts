import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import dotenv from 'dotenv'

import './db/initializeDatabase'

import trailsRouter from './routes/trails'
import circuitsRouter from './routes/circuits'
import compileRouter from './routes/compile'
import loginRouter from './routes/login'

dotenv.config()

const app = express()

app.use(cors())
app.use(bodyParser.json())

app.use(trailsRouter)
app.use(circuitsRouter)
app.use(compileRouter)
app.use(loginRouter)

app.get('/health-check', (req, res) => {
  res.status(200).send('ok')
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
