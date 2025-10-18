const { test, after, beforeEach, before } = require('node:test')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const assert = require('node:assert')
const Blog = require('../models/blog')
const helper = require('./test_helper')
const User = require('../models/user')
const bcrypt = require('bcrypt')

const api = supertest(app)

let token = '' // token usado en tests autenticados

before(async () => {
  await User.deleteMany({})
  await Blog.deleteMany({})
})

beforeEach(async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})

  // 1) crear usuario de prueba
  const passwordHash = await bcrypt.hash('sekret', 10)
  const user = new User({ username: 'root', name: 'admin', passwordHash })
  const savedUser = await user.save()

  // 2) crear blogs iniciales asignados a este usuario
  const blogObjects = helper.initialBlogs.map(blog => new Blog({ ...blog, user: savedUser._id }))
  const promiseArray = blogObjects.map(blog => blog.save())
  const savedBlogs = await Promise.all(promiseArray)

  // 3) actualizar user.blogs (si tu app lo usa)
  savedUser.blogs = savedBlogs.map(b => b._id)
  await savedUser.save()

  // 4) hacer login vía API para obtener token real (recomendado)
  const loginResponse = await api
    .post('/api/login')
    .send({ username: 'root', password: 'sekret' })
    .expect(200)

  token = loginResponse.body.token
  // Si tu login devuelve el token con otra propiedad, adapta esto:
  // token = loginResponse.body.accessToken || loginResponse.body.token
})

test('blog_api Blog are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('blog_api there are two blogs', async () => {
  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, helper.initialBlogs.length)
})

test('blog_api unique identifier property of blog posts is named id', async () => {
  const response = await api.get('/api/blogs')
  const blogs = response.body
  assert.ok(blogs[0].id, 'id property should be defined')
})

test('blog_api a valid blog can be added', async () => {
  const newBlog = {
    title: 'a valid blog tittle',
    author: 'a valid blog author',
    url: 'a valid blog url',
    likes: 5
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

  const titles = blogsAtEnd.map(b => b.title)
  assert(titles.includes('a valid blog tittle'))
})

test('blog_api if likes property is missing, it defaults to 0', async () => {
  const newBlog = {
    title: 'Test blog without likes',
    author: 'Tester',
    url: 'http://example.com'
  }

  const response = await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  assert.strictEqual(response.body.likes, 0)
})

test('blog_api if tittle property is missing, return 400 bad request', async () => {
  const newBlog = {
    likes: 5,
    author: 'Tester',
    url: 'http://example.com'
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(400)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('blog_api if url property is missing, return 400 bad request', async () => {
  const newBlog = {
    title: 'Test blog without likes',
    likes: 5,
    author: 'Tester',
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(400)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('deleting fails with status 401 if user is not the creator', async () => {
  const newBlog = {
    title: 'Blog by root',
    author: 'Root',
    url: 'http://root.blog',
    likes: 1
  }

  const createdBlog = await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)

  // Creamos otro usuario y su token
  await api.post('/api/users').send({ username: 'another', name: 'user', password: 'pass' })
  const loginResponse = await api
    .post('/api/login')
    .send({ username: 'another', password: 'pass' })
    .expect(200)

  const anotherToken = loginResponse.body.token

  // Intentar eliminar el blog de otro usuario
  await api
    .delete(`/api/blogs/${createdBlog.body.id}`)
    .set('Authorization', `Bearer ${anotherToken}`)
    .expect(401)
})


test('blog_api update a specific blog', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToUpdate = blogsAtStart[0]
  blogToUpdate.likes += 1

  await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .send(blogToUpdate)
    .expect(200)

  const blogsAtEnd = await helper.blogsInDb()
  const updatedBlog = blogsAtEnd.find(b => b.id === blogToUpdate.id)

  assert.strictEqual(updatedBlog.likes, blogToUpdate.likes)
})

after(async () => {
  await mongoose.connection.close()
})
