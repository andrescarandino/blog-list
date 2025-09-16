const dummy = (blogs) => {
    return 1
}

const totalLikes = (blogs) => {
    if(!Array.isArray(blogs) || blogs.length === 0){
        return 0
    }
    return blogs.reduce((sum, blog) => sum + (Number(blog.likes) || 0), 0)
}

//ULTIMOS 2 EJERCICIOS PENDIENTES EN LA SECCION DE INTRODUCCION A PRUEBAS/
module.exports = {
    dummy, 
    totalLikes
}