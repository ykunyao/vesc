const jwt = require('jsonwebtoken');
const config = require('../config/env');

const auth = (req, res, next) => {
  const authHeader = req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: '请先登录' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (error) {
    res.status(401).json({ message: '登录已失效，请重新登录' });
  }
};

module.exports = auth;
