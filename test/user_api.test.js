const { test, after, beforeEach, before } = require('node:test')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const assert = require('node:assert')
const User = require('../models/user')
const helper = require('./test_helper')
const bcrypt = require('bcrypt')
const Blog = require('../models/blog')


before(async () => {
  await User.deleteMany({})
  await Blog.deleteMany({})
})

beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const rootUser = new User({ username: 'root', passwordHash })
    await rootUser.save() 
})

test('creation succeds', async () => {
    const usersAtStart = await helper.usersInBd()

    const newUser = {
        username: 'mluukkai',
        name: 'Matti Luukkainen',
        password: 'salainen',
    }

    await api
        .post('/api/users')
        .send(newUser)
        .expect(201)
        .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInBd()
    console.log(usersAtEnd, usersAtStart);
    
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username))
})

test('creation fails with proper status code and message if username is invalid', async () => {
    const usersAtStart = await helper.usersInBd()

    const newUser = {
        username: 'm',
        name: 'Matti Luukkainen',
        password: 'salainen',
    }

    const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInBd()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    
    assert(result.body.error.includes('`username` (`m`, length 1) is shorter than the minimum allowed length (3)'))
})

test('creation fails with proper status code and message if password is invalid', async () => {
    const usersAtStart = await helper.usersInBd()

    const newUser = {
        username: 'andres993',
        name: 'Andres carandino',
        password: 'sa',
    }

    const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInBd()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    
    assert(result.body.error.includes('min length password is 3'))
})


after(async () => {
  await mongoose.connection.close(true)
})
