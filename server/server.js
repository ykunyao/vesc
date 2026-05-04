const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const userRoutes = require('./routes/users');
const config = require('./config/env');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const corsOptions = {
  origin: config.clientOrigin,
  methods: ['GET', 'POST']
};
const io = socketIo(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);

// 身份验证中间件
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('UNAUTHORIZED'));
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('UNAUTHORIZED'));
  }
});

// Socket.IO 连接处理
io.on('connection', async (socket) => {
  console.log(`用户 ${socket.user.username} 已连接`);
  await Conversation.ensureDefaultConversation(socket.user.userId);

  const userConversations = await Conversation.listForUser(socket.user.userId);
  userConversations.forEach((conversation) => {
    socket.join(`conversation:${conversation.id}`);
  });
  socket.emit('socket ready');

  const joinConversation = async (conversationId) => {
    const isMember = await Conversation.isMember(conversationId, socket.user.userId);
    if (!isMember) {
      socket.emit('error', '无权访问该会话');
      return false;
    }

    socket.join(`conversation:${conversationId}`);
    return true;
  };

  // 获取历史消息
  const getMessages = async (conversationId) => {
    try {
      const messages = await Message.getRecentMessages(conversationId, 50);
      if (messages && Array.isArray(messages)) {
        socket.emit('history messages', { conversationId, messages });
      } else {
        console.log('没有历史消息或消息格式不正确');
        socket.emit('history messages', { conversationId, messages: [] });
      }
    } catch (error) {
      console.log('获取历史消息时发生错误，返回空数组');
      socket.emit('history messages', { conversationId, messages: [] });
    }
  };

  socket.on('join conversation', async (conversationId) => {
    const targetConversationId = Number(conversationId);
    if (!Number.isInteger(targetConversationId) || targetConversationId <= 0) {
      socket.emit('error', '会话不存在');
      return;
    }

    if (await joinConversation(targetConversationId)) {
      await getMessages(targetConversationId);
    }
  });

  // 处理新消息
  socket.on('chat message', async (payload) => {
    try {
      const conversationId = Number(payload?.conversationId);
      const content = typeof payload?.content === 'string' ? payload.content.trim() : '';

      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        socket.emit('error', '会话不存在');
        return;
      }
      if (!content) {
        socket.emit('error', '消息不能为空');
        return;
      }
      if (content.length > 1000) {
        socket.emit('error', '消息不能超过 1000 个字符');
        return;
      }
      if (!(await joinConversation(conversationId))) {
        return;
      }

      const newMessage = await Message.create(conversationId, socket.user.userId, content);
      if (newMessage) {
        io.to(`conversation:${conversationId}`).emit('chat message', newMessage);
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
