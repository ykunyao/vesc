const express = require('express');
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const router = express.Router();

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
