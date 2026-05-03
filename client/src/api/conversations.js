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
