const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();

router.use(auth);

router.get('/search', async (req, res) => {
  try {
    const keyword = String(req.query.q || '').trim();
    if (!keyword) {
      return res.json({ users: [] });
    }

    const pattern = `%${keyword}%`;
    const [users] = await db.execute(
      `SELECT id, username, email
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
