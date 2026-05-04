import http from './http'

export const getCurrentUser = () => {
  return http.get('/api/users/me')
}

export const updateAvatar = (avatarUrl) => {
  return http.patch('/api/users/me/avatar', { avatarUrl })
}

export const searchUsers = (keyword) => {
  return http.get('/api/users/search', {
    params: { q: keyword }
  })
}
