import http from './http'

export const getCurrentUser = () => {
  return http.get('/api/users/me')
}

export const updateAvatar = (avatarUrl) => {
  return http.patch('/api/users/me/avatar', { avatarUrl })
}

export const uploadAvatar = (file) => {
  const formData = new FormData()
  formData.append('avatar', file)

  return http.post('/api/users/me/avatar/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const searchUsers = (keyword) => {
  return http.get('/api/users/search', {
    params: { q: keyword }
  })
}

export const getFriends = () => {
  return http.get('/api/users/friends')
}

export const getFriendRequests = () => {
  return http.get('/api/users/friend-requests')
}

export const sendFriendRequest = (userId) => {
  return http.post('/api/users/friend-requests', { userId })
}

export const respondFriendRequest = (requestId, action) => {
  return http.patch(`/api/users/friend-requests/${requestId}`, { action })
}
