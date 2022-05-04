import express from 'express'

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Create, deploy, manage zero knowledge proofs!')
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
