import http from './http'

export const searchUsers = (keyword) => {
  return http.get('/api/users/search', {
    params: { q: keyword }
  })
}
