import api from './axiosInstance'

export const getClubs = (provincia) => api.get('/clubs', { params: provincia ? { provincia } : {} })
export const getClub = (id) => api.get(`/clubs/${id}`)
export const createClub = (data) => api.post('/clubs', data)
export const joinClub = (id) => api.post(`/clubs/${id}/join`)
export const updateMember = (clubId, userId, data) => api.put(`/clubs/${clubId}/members/${userId}`, data)
export const getClubEvents = (clubId) => api.get(`/clubs/${clubId}/events`)
export const createEvent = (clubId, data) => api.post(`/clubs/${clubId}/events`, data)
export const getRoutes = (clubId) => api.get(`/clubs/${clubId}/routes`)
export const addRoute = (clubId, data) => api.post(`/clubs/${clubId}/routes`, data)
