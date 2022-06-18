import jwt from 'jsonwebtoken'
import tokenSecret from './tokenSecret'

// eslint-disable-next-line consistent-return
function auth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    return res.sendStatus(401)
  }

  try {
    const verified = jwt.verify(token, tokenSecret)
    req.user = verified.sub
  } catch (err) {
    next(err)
  }

  next()
}

export default auth
