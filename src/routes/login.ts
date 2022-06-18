import { Router } from 'express'
import randomstring from 'randomstring'
import jwt from 'jsonwebtoken'
import Web3 from 'web3'
import dotenv from 'dotenv'
import tokenSecret from '../tokenSecret'

dotenv.config()

const web3 = new Web3(process.env.ALCHEMY_URL || 'ws://localhost:8545')

const loginRouter = Router()

loginRouter.get('/web3-login-message', async (req, res) => {
  const nonce = randomstring.generate(7)
  const message = [
    'Sign this message to confirm you own this wallet address.',
    'This action will not cost any gas.\nNonce: ',
    nonce,
  ]

  res.status(200).send(message.join(' '))
})

loginRouter.post('/web3-login-verify', async (req, res, next) => {
  const { msg, sig, address } = req.body
  try {
    const recoveredAddress = web3.eth.accounts.recover(msg, sig)
    if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
      const accessToken = jwt.sign({
        sub: recoveredAddress,
      }, tokenSecret)

      res.status(201).send(accessToken)
    } else {
      res.status(400).send('Bad signature')
    }
  } catch (err) {
    next(err)
  }
})

export default loginRouter
