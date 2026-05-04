const pool = require('../config/db');

class Message {
  static async create(conversationId, senderId, { content = '', messageType = 'text', mediaUrl = null }) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url)
         VALUES (?, ?, ?, ?, ?)`,
        [conversationId, senderId, content, messageType, mediaUrl]
      );
      
      // 获取刚插入的消息完整信息
      const [newMessage] = await pool.execute(`
        SELECT 
          m.id,
          m.conversation_id,
          m.content,
          m.message_type,
          m.media_url,
          m.status,
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
          m.message_type,
          m.media_url,
          m.status,
          m.created_at,
          m.sender_id,
          u.username,
          u.avatar_url
        FROM messages m 
        JOIN users u ON m.sender_id = u.id 
        WHERE m.conversation_id = ?
          AND m.status <> 'deleted'
        ORDER BY m.created_at DESC
        LIMIT ${messageLimit}
      `, [conversationId]);

      return messages.reverse(); // 反转消息顺序，使旧消息在前，新消息在后
    } catch (error) {
      console.log('获取消息失败:', error);
      throw error;
    }
  }

  static async getById(messageId) {
    const [messages] = await pool.execute(`
      SELECT 
        m.id,
        m.conversation_id,
        m.content,
        m.message_type,
        m.media_url,
        m.status,
        m.created_at,
        m.sender_id,
        u.username,
        u.avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
      LIMIT 1
    `, [messageId]);

    return messages[0] || null;
  }

  static async deleteForSender(messageId, senderId) {
    const message = await this.getById(messageId);
    if (!message || message.sender_id !== senderId || message.status === 'deleted') {
      throw new Error('消息不存在');
    }

    await pool.execute(
      `UPDATE messages
       SET status = 'deleted', content = '', media_url = NULL
       WHERE id = ?`,
      [messageId]
    );

    return { ...message, status: 'deleted', content: '', media_url: null };
  }

  static async revokeForSender(messageId, senderId) {
    const message = await this.getById(messageId);
    if (!message || message.sender_id !== senderId || message.status !== 'normal') {
      throw new Error('消息不可撤回');
    }

    const ageMs = Date.now() - new Date(message.created_at).getTime();
    if (ageMs > 2 * 60 * 1000) {
      throw new Error('只能撤回 2 分钟内的消息');
    }

    await pool.execute(
      `UPDATE messages
       SET status = 'revoked', content = '', media_url = NULL
       WHERE id = ?`,
      [messageId]
    );

    return { ...message, status: 'revoked', content: '', media_url: null };
  }
}

module.exports = Message;
