import http from './http'

export const login = ({ email, password }) => {
  return http.post('/api/auth/login', { email, password })
}

export const register = ({ username, email, password }) => {
  return http.post('/api/auth/register', { username, email, password })
}
