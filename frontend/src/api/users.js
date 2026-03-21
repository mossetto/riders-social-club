import api from './axiosInstance'

export const getMe = () => api.get('/users/me')
export const getProfile = (id) => api.get(`/users/${id}`)
export const updateProfile = (data) => api.put('/users/me', data)
export const addMoto = (data) => api.post('/users/me/moto', data)
