const { test, after, beforeEach } = require('node:test')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const assert = require('node:assert')
const Blog = require('../models/blog')
const helper = require('./test_helper')
const { log } = require('node:console')

const api = supertest(app)

beforeEach(async () => {
  await Blog.deleteMany({})

  const blogObjects = helper.initialBlogs
    .map(blog => new Blog(blog))
  const promiseArray = blogObjects.map(blog => blog.save())

  await Promise.all(promiseArray)
})

test('blog_api Blog are returned as json', async () => {
  console.log('entered test');
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('blog_api there are two blogs', async () => {
  const response = await api.get('/api/blogs')

  assert.strictEqual(response.body.length, 2)
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
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogAtEnd = await Blog.find({})
  assert.strictEqual(blogAtEnd.length, helper.initialBlogs.length + 1)

  const tittles = blogAtEnd.map(b => b.title)
  assert(tittles.includes('a valid blog tittle'))
})

test('blog_api if likes property is missing, it defaults to 0', async () => {
  const newBlog = {
    title: 'Test blog without likes',
    author: 'Tester',
    url: 'http://example.com'
  }

  const response = await api
    .post('/api/blogs')
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

  const response = await api
    .post('/api/blogs')
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

  const response = await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(400)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('blog_api succeeds with status code 204 if id is valid', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToDelete = blogsAtStart[0]

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .expect(204)

  const blogAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogAtEnd.length, helper.initialBlogs.length - 1)
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