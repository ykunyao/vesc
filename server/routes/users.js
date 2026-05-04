const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();

router.use(auth);

const normalizeAvatarUrl = (value) => {
  const avatarUrl = String(value || '').trim();
  if (!avatarUrl) return '';
  if (avatarUrl.length > 500) {
    throw new Error('头像地址不能超过 500 个字符');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(avatarUrl);
  } catch (error) {
    throw new Error('请输入有效的头像 URL');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('头像 URL 仅支持 http 或 https');
  }

  return avatarUrl;
};

router.get('/me', async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, username, email, avatar_url FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('获取当前用户失败:', error);
    res.status(500).json({ message: '获取当前用户失败' });
  }
});

router.patch('/me/avatar', async (req, res) => {
  try {
    const avatarUrl = normalizeAvatarUrl(req.body?.avatarUrl);
    await db.execute(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl || null, req.user.userId]
    );

    const [users] = await db.execute(
      'SELECT id, username, email, avatar_url FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );

    res.json({ user: users[0] });
  } catch (error) {
    console.error('更新头像失败:', error);
    res.status(400).json({ message: error.message || '更新头像失败' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const keyword = String(req.query.q || '').trim();
    if (!keyword) {
      return res.json({ users: [] });
    }

    const pattern = `%${keyword}%`;
    const [users] = await db.execute(
      `SELECT id, username, email, avatar_url
       FROM users
       WHERE id <> ?
         AND (username LIKE ? OR email LIKE ?)
       ORDER BY username ASC
       LIMIT 10`,
      [req.user.userId, pattern, pattern]
    );

    res.json({ users });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ message: '搜索用户失败' });
  }
});

module.exports = router;
