import axios from 'axios'

const api = axios.create({ baseURL: 'https://returns-shield-2.onrender.com' })

export const getStats = () => api.get('/returns/stats')
export const getAllReturns = () => api.get('/returns/all')
export const makeDecision = (id, decision) =>
  api.patch(`/returns/${id}/decide?decision=${decision}&notes=`)
export const analyzeReturn = (formData) =>
  api.post('/returns/analyze', formData)
