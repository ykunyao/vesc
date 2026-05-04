import http from './http'

export const getConversations = () => {
  return http.get('/api/conversations')
}

export const getConversationMessages = (conversationId) => {
  return http.get(`/api/conversations/${conversationId}/messages`)
}

export const createDirectConversation = (userId) => {
  return http.post('/api/conversations/direct', { userId })
}

export const createGroupConversation = ({ name, memberIds = [] }) => {
  return http.post('/api/conversations/group', { name, memberIds })
}

export const getConversationMembers = (conversationId) => {
  return http.get(`/api/conversations/${conversationId}/members`)
}

export const updateGroupProfile = (conversationId, { name, announcement = '', avatarUrl = '' }) => {
  return http.patch(`/api/conversations/${conversationId}/group`, { name, announcement, avatarUrl })
}

export const addConversationMembers = (conversationId, memberIds = []) => {
  return http.post(`/api/conversations/${conversationId}/members`, { memberIds })
}

export const removeConversationMember = (conversationId, userId) => {
  return http.delete(`/api/conversations/${conversationId}/members/${userId}`)
}

export const uploadConversationImage = (conversationId, file) => {
  const formData = new FormData()
  formData.append('image', file)

  return http.post(`/api/conversations/${conversationId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
