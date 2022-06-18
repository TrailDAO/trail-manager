import { NextFunction, Request, Response } from 'express'

const validationErrorHandler = () => (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err.name === 'JsonSchemaValidation') {
    console.log(err.message)

    const responseData = {
      statusText: 'Bad Request',
      jsonSchemaValidation: true,
      validations: err.validations,
    }

    res.status(400).json(responseData)
  } else {
    next(err)
  }
}

export default validationErrorHandler
