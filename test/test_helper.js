const Blog = require('../models/blog')

const initialBlogs = [
{
    title: 'learn js',
    author: 'Andres carandino',
    url: 'learnjs.com',
    likes: 5
},
{
    title: 'travel for argentina',
    author: 'yago ',
    url: 'yago.com',
    likes: 5
}
]

const blogsInDb = async () => {
    const blogs = await Blog.find({})
    return blogs.map(blog => blog.toJSON())
}

module.exports = { initialBlogs, blogsInDb }