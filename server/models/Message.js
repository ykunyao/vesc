const pool = require('../config/db');

class Message {
  static async create(conversationId, senderId, content) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
        [conversationId, senderId, content]
      );
      
      // 获取刚插入的消息完整信息
      const [newMessage] = await pool.execute(`
        SELECT 
          m.id,
          m.conversation_id,
          m.content,
          m.created_at,
          m.sender_id,
          u.username,
          u.avatar_url
        FROM messages m 
        JOIN users u ON m.sender_id = u.id 
        WHERE m.id = ?
      `, [result.insertId]);

      await pool.execute(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId]
      );
      
      return newMessage[0]; // 返回完整的消息对象
    } catch (error) {
      console.error('创建消息失败:', error);
      throw error;
    }
  }

  static async getRecentMessages(conversationId, limit = 50) {
    try {
      const messageLimit = parseInt(limit, 10);
      if (!Number.isInteger(messageLimit) || messageLimit <= 0) {
        throw new Error('limit 必须是正整数');
      }

      const [messages] = await pool.query(`
        SELECT 
          m.id,
          m.conversation_id,
          m.content,
          m.created_at,
          m.sender_id,
          u.username,
          u.avatar_url
        FROM messages m 
        JOIN users u ON m.sender_id = u.id 
        WHERE m.conversation_id = ?
        ORDER BY m.created_at DESC
        LIMIT ${messageLimit}
      `, [conversationId]);

      return messages.reverse(); // 反转消息顺序，使旧消息在前，新消息在后
    } catch (error) {
      console.log('获取消息失败:', error);
      throw error;
    }
  }
}

module.exports = Message;
