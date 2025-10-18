const logger = require('./logger')
const User = require('../models/user')
const jwt = require('jsonwebtoken')

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '')
    
  } else {
    request.token = null
  }
  next()
}

const userExtractor = async(request, response, next) => {
   
    if (!request.token) {
      request.user = null
      return next()
    }
try {
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token invalid' })
    }

    const user = await User.findById(decodedToken.id)
    if (!user) {
      return response.status(400).json({ error: 'user not found' })
    }

    request.user = user
    next()
  } catch (error) {
    return response.status(401).json({ error: 'token invalid or missing' })
  }
}

const requestLogger = (request, response, next) => {
  logger.info('method:', request.method);
  logger.info('path:', request.path);
  logger.info('body', request.body);
  logger.info('------------');
  next();
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message);
  if(error.name === 'CastError'){
    return response.status(400).send({ error: 'malformatted id' })
  }else if(error.name === 'ValidationError'){
    return response.status(400).json({ error: error.message })
  }else if(error.name === 'JsonWebTokenError'){
    return response.status(401).json({ error: error.message })
  }
  next(error)
}

module.exports = {
    requestLogger,
    unknownEndpoint,
    errorHandler,
    tokenExtractor,
    userExtractor
}