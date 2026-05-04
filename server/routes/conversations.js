const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const router = express.Router();
const messageUploadDir = path.join(__dirname, '..', 'uploads', 'messages');

fs.mkdirSync(messageUploadDir, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, messageUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.userId}-${Date.now()}${ext}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('图片仅支持 jpg、png、webp 或 gif'));
      return;
    }

    cb(null, true);
  }
});

const handleImageUpload = (req, res, next) => {
  imageUpload.single('image')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '图片不能超过 5MB' });
    }

    return res.status(400).json({ message: error.message || '图片上传失败' });
  });
};

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.listForUser(req.user.userId);
    res.json({ conversations });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({ message: '获取会话列表失败' });
  }
});

router.post('/direct', async (req, res) => {
  try {
    const targetUserId = Number(req.body?.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ message: '请选择要私聊的用户' });
    }

    const conversationId = await Conversation.createDirectConversation(req.user.userId, targetUserId);
    res.status(201).json({ conversationId });
  } catch (error) {
    console.error('创建私聊失败:', error);
    res.status(400).json({ message: error.message || '创建私聊失败' });
  }
});

router.post('/group', async (req, res) => {
  try {
    const name = req.body?.name;
    const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
    const conversationId = await Conversation.createGroupConversation(req.user.userId, name, memberIds);
    res.status(201).json({ conversationId });
  } catch (error) {
    console.error('创建群聊失败:', error);
    res.status(400).json({ message: error.message || '创建群聊失败' });
  }
});

router.get('/:id/members', async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: '群聊不存在' });
    }

    const conversation = await Conversation.getById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ message: '群聊不存在' });
    }

    const currentMember = await Conversation.getMember(conversationId, req.user.userId);
    if (!currentMember) {
      return res.status(403).json({ message: '无权访问该群聊' });
    }

    const members = await Conversation.listMembers(conversationId);
    res.json({ conversation, currentMember, members });
  } catch (error) {
    console.error('获取群成员失败:', error);
    res.status(500).json({ message: '获取群成员失败' });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: '群聊不存在' });
    }

    const members = await Conversation.addMembers(conversationId, req.user.userId, memberIds);
    res.status(201).json({ members });
  } catch (error) {
    console.error('邀请群成员失败:', error);
    res.status(400).json({ message: error.message || '邀请群成员失败' });
  }
});

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(conversationId) || conversationId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ message: '成员不存在' });
    }

    const members = await Conversation.removeMember(conversationId, req.user.userId, targetUserId);
    res.json({ members });
  } catch (error) {
    console.error('移除群成员失败:', error);
    res.status(400).json({ message: error.message || '移除群成员失败' });
  }
});

router.post('/:id/images', handleImageUpload, async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: '会话不存在' });
    }

    const isMember = await Conversation.isMember(conversationId, req.user.userId);
    if (!isMember) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: '无权访问该会话' });
    }

    if (!req.file) {
      return res.status(400).json({ message: '请选择图片' });
    }

    res.status(201).json({ mediaUrl: `/uploads/messages/${req.file.filename}` });
  } catch (error) {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('上传聊天图片失败:', error);
    res.status(400).json({ message: error.message || '上传聊天图片失败' });
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: '会话不存在' });
    }

    const isMember = await Conversation.isMember(conversationId, req.user.userId);
    if (!isMember) {
      return res.status(403).json({ message: '无权访问该会话' });
    }

    const limit = Number(req.query.limit || 50);
    const messages = await Message.getRecentMessages(conversationId, limit);
    res.json({ messages });
  } catch (error) {
    console.error('获取会话消息失败:', error);
    res.status(500).json({ message: '获取会话消息失败' });
  }
});

module.exports = router;
