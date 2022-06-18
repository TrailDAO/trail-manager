import dotenv from 'dotenv'

dotenv.config()

const tokenSecret = process.env.TOKEN_SECRET || 'secret'

export default tokenSecret
