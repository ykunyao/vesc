import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { io } from 'socket.io-client'
import { API_BASE_URL } from './config'

const app = createApp(App)

// 创建 socket 连接的函数
const createSocket = () => {
  const token = localStorage.getItem('token')
  if (!token) return null

  const socket = io(API_BASE_URL, {
    auth: { token }
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message)
    if (error.message === '未认证' || error.message === 'Token 无效') {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      router.push('/login')
    }
  })

  return socket
}

app.provide('socket', createSocket)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
