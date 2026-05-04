const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const db = require('../config/db');
const Friendship = require('../models/Friendship');

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
      `SELECT
         u.id,
         u.username,
         u.email,
         u.avatar_url,
         CASE
           WHEN f.user_id IS NOT NULL THEN 'friend'
           WHEN outgoing.id IS NOT NULL THEN 'pending_outgoing'
           WHEN incoming.id IS NOT NULL THEN 'pending_incoming'
           ELSE 'none'
         END AS friendship_status
       FROM users u
       LEFT JOIN friendships f
         ON f.user_id = ? AND f.friend_id = u.id
       LEFT JOIN friend_requests outgoing
         ON outgoing.requester_id = ? AND outgoing.receiver_id = u.id AND outgoing.status = 'pending'
       LEFT JOIN friend_requests incoming
         ON incoming.requester_id = u.id AND incoming.receiver_id = ? AND incoming.status = 'pending'
       WHERE u.id <> ?
         AND (u.username LIKE ? OR u.email LIKE ?)
       ORDER BY u.username ASC
       LIMIT 10`,
      [req.user.userId, req.user.userId, req.user.userId, req.user.userId, pattern, pattern]
    );

    res.json({ users });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ message: '搜索用户失败' });
  }
});

router.get('/friends', async (req, res) => {
  try {
    const friends = await Friendship.listFriends(req.user.userId);
    res.json({ friends });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ message: '获取好友列表失败' });
  }
});

router.get('/friend-requests', async (req, res) => {
  try {
    const requests = await Friendship.listRequests(req.user.userId);
    res.json(requests);
  } catch (error) {
    console.error('获取好友申请失败:', error);
    res.status(500).json({ message: '获取好友申请失败' });
  }
});

router.post('/friend-requests', async (req, res) => {
  try {
    const receiverId = Number(req.body?.userId);
    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      return res.status(400).json({ message: '请选择要添加的用户' });
    }

    const requests = await Friendship.createRequest(req.user.userId, receiverId);
    res.status(201).json(requests);
  } catch (error) {
    console.error('发送好友申请失败:', error);
    res.status(400).json({ message: error.message || '发送好友申请失败' });
  }
});

router.patch('/friend-requests/:id', async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: '好友申请不存在' });
    }

    const requests = await Friendship.respondToRequest(requestId, req.user.userId, req.body?.action);
    res.json(requests);
  } catch (error) {
    console.error('处理好友申请失败:', error);
    res.status(400).json({ message: error.message || '处理好友申请失败' });
  }
});

module.exports = router;
