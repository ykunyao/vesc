const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const config = require('./config/env');
const Message = require('./models/Message');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// 身份验证中间件
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('未认证，请提供有效的令牌'));
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Token 无效，请重新登录'));
  }
});

// Socket.IO 连接处理
io.on('connection', async (socket) => {
  console.log(`用户 ${socket.user.username} 已连接`);

  // 获取历史消息
  const getMessages = async () => {
    try {
      const messages = await Message.getRecentMessages(50);
      if (messages && Array.isArray(messages)) {
        socket.emit('history messages', messages);
      } else {
        console.log('没有历史消息或消息格式不正确');
        socket.emit('history messages', []);
      }
    } catch (error) {
      console.log('获取历史消息时发生错误，返回空数组');
      socket.emit('history messages', []);
    }
  };

  // 初始化加载消息
  await getMessages().catch(err => {
    console.log('消息处理失败，但不影响程序运行');
  });

  // 处理新消息
  socket.on('chat message', async (msg) => {
    try {
      const newMessage = await Message.create(socket.user.userId, msg);
      if (newMessage) {
        io.emit('chat message', newMessage);
      }
    } catch (error) {
      console.error('消息发送失败:', error);
      socket.emit('error', '消息发送失败，请重试');
    }
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log(`用户 ${socket.user.username} 已断开连接`);
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

// 启动服务器
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
