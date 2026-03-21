import api from './axiosInstance'

export const getFeed = () => api.get('/posts')
export const getClubsFeed = () => api.get('/posts/clubs')
export const createPost = (data) => api.post('/posts', data)
export const deletePost = (id) => api.delete(`/posts/${id}`)
export const toggleLike = (id) => api.post(`/posts/${id}/like`)
export const getComments = (id) => api.get(`/posts/${id}/comments`)
export const addComment = (id, contenido) => api.post(`/posts/${id}/comments`, { contenido })
