import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { io } from 'socket.io-client'
import { API_BASE_URL } from './config'
import { clearAuth, getToken } from './utils/auth'

const app = createApp(App)

// 创建 socket 连接的函数
const createSocket = () => {
  const token = getToken()
  if (!token) return null

  const socket = io(API_BASE_URL, {
    auth: { token }
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message)
    if (error.message === 'UNAUTHORIZED') {
      clearAuth()
      router.push('/login')
    }
  })

  return socket
}

app.provide('socket', createSocket)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
