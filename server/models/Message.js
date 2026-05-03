const pool = require('../config/db');

class Message {
  static async create(senderId, content) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO messages (sender_id, content) VALUES (?, ?)',
        [senderId, content]
      );
      
      // 获取刚插入的消息完整信息
      const [newMessage] = await pool.execute(`
        SELECT 
          m.id,
          m.content,
          m.created_at,
          m.sender_id,
          u.username
        FROM messages m 
        JOIN users u ON m.sender_id = u.id 
        WHERE m.id = ?
      `, [result.insertId]);
      
      return newMessage[0]; // 返回完整的消息对象
    } catch (error) {
      console.error('创建消息失败:', error);
      throw error;
    }
  }

  static async getRecentMessages(limit = 50) {
    try {
      const messageLimit = parseInt(limit, 10);
      if (!Number.isInteger(messageLimit) || messageLimit <= 0) {
        throw new Error('limit 必须是正整数');
      }

      const [messages] = await pool.query(`
        SELECT 
          m.id,
          m.content,
          m.created_at,
          m.sender_id,
          u.username
        FROM messages m 
        JOIN users u ON m.sender_id = u.id 
        ORDER BY m.created_at DESC
        LIMIT ${messageLimit}
      `);

      return messages.reverse(); // 反转消息顺序，使旧消息在前，新消息在后
    } catch (error) {
      console.log('获取消息失败:', error);
      throw error;
    }
  }
}

module.exports = Message;