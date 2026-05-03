const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const config = require('../config/env');
const Conversation = require('../models/Conversation');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeAuthInput = ({ username = '', email = '', password = '' }) => ({
  username: String(username).trim(),
  email: String(email).trim().toLowerCase(),
  password: String(password)
});

const validateRegisterInput = ({ username, email, password }) => {
  if (username.length < 2 || username.length > 50) {
    return '用户名长度需要在 2 到 50 个字符之间';
  }
  if (!emailPattern.test(email) || email.length > 100) {
    return '请输入有效的邮箱地址';
  }
  if (password.length < 6 || password.length > 72) {
    return '密码长度需要在 6 到 72 个字符之间';
  }
  return null;
};

const validateLoginInput = ({ email, password }) => {
  if (!emailPattern.test(email) || !password) {
    return '邮箱或密码错误';
  }
  return null;
};

// 注册路由
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = normalizeAuthInput(req.body || {});
    const validationError = validateRegisterInput({ username, email, password });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // 检查用户是否已存在
    const [existingUsers] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: '用户名或邮箱已被使用' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    await Conversation.ensureDefaultConversation(result.insertId);

    // 生成 JWT
    const token = jwt.sign(
      { userId: result.insertId, username },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 登录路由
router.post('/login', async (req, res) => {
  try {
    const { email, password } = normalizeAuthInput(req.body || {});
    const validationError = validateLoginInput({ email, password });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // 查找用户
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: '邮箱或密码错误' });
    }

    const user = users[0];
    await Conversation.ensureDefaultConversation(user.id);

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: '邮箱或密码错误' });
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({ token, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
