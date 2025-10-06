const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')

usersRouter.post('/', async (request, response) => {
  const { username, name, password } = request.body

  if(password.length < 3){
    return response.status(400).json({error: 'min length password is 3'})
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const user = new User({
    username,
    name,
    passwordHash,
  })

  const savedUser = await user.save()

  response.status(201).json(savedUser)
})

usersRouter.get('/', async (request, response) => {
  const users = await User
    .find({}).populate('blogs', { tittle: 1, url: 1, likes: 1, author: 1 })
  response.json(users)
})

usersRouter.delete('/:id', async(request, response) => {
    await User.findByIdAndDelete(request.params.id)
    response.status(204).end()
})


module.exports = usersRouter