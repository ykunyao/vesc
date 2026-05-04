const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();
const avatarUploadDir = path.join(__dirname, '..', 'uploads', 'avatars');

fs.mkdirSync(avatarUploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.userId}-${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('头像仅支持 jpg、png、webp 或 gif 图片'));
      return;
    }

    cb(null, true);
  }
});

const handleAvatarUpload = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '头像图片不能超过 2MB' });
    }

    return res.status(400).json({ message: error.message || '上传头像失败' });
  });
};

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

router.post('/me/avatar/upload', handleAvatarUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择头像图片' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await db.execute(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, req.user.userId]
    );

    const [users] = await db.execute(
      'SELECT id, username, email, avatar_url FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );

    res.status(201).json({ user: users[0] });
  } catch (error) {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('上传头像失败:', error);
    res.status(400).json({ message: error.message || '上传头像失败' });
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
