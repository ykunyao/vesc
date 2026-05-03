const pool = require('../config/db');

const DEFAULT_GROUP_NAME = 'Vesc Lobby';

class Conversation {
  static async ensureDefaultConversation(userId) {
    const [existing] = await pool.execute(
      'SELECT id FROM conversations WHERE type = ? AND name = ? LIMIT 1',
      ['group', DEFAULT_GROUP_NAME]
    );

    let conversationId = existing[0]?.id;
    if (!conversationId) {
      const [result] = await pool.execute(
        'INSERT INTO conversations (type, name) VALUES (?, ?)',
        ['group', DEFAULT_GROUP_NAME]
      );
      conversationId = result.insertId;
    }

    if (userId) {
      await this.addMember(conversationId, userId, 'member');
    }

    return conversationId;
  }

  static async addMember(conversationId, userId, role = 'member') {
    await pool.execute(
      `INSERT IGNORE INTO conversation_members (conversation_id, user_id, role)
       VALUES (?, ?, ?)`,
      [conversationId, userId, role]
    );
  }

  static async isMember(conversationId, userId) {
    const [rows] = await pool.execute(
      `SELECT id FROM conversation_members
       WHERE conversation_id = ? AND user_id = ?
       LIMIT 1`,
      [conversationId, userId]
    );

    return rows.length > 0;
  }

  static async listForUser(userId) {
    await this.ensureDefaultConversation(userId);

    const [rows] = await pool.execute(
      `SELECT
         c.id,
         c.type,
         CASE
           WHEN c.type = 'direct' THEN other_user.username
           ELSE c.name
         END AS name,
         c.owner_id,
         c.created_at,
         c.updated_at,
         last_message.content AS last_message,
         last_message.created_at AS last_message_at
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id
       LEFT JOIN conversation_members other_member
         ON other_member.conversation_id = c.id
        AND other_member.user_id <> ?
        AND c.type = 'direct'
       LEFT JOIN users other_user ON other_user.id = other_member.user_id
       LEFT JOIN messages last_message ON last_message.id = (
         SELECT m.id
         FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 1
       )
       WHERE cm.user_id = ?
       ORDER BY COALESCE(last_message.created_at, c.updated_at, c.created_at) DESC`,
      [userId, userId]
    );

    return rows;
  }

  static async createDirectConversation(currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
      throw new Error('不能和自己创建私聊');
    }

    const [users] = await pool.execute(
      'SELECT id, username FROM users WHERE id = ? LIMIT 1',
      [targetUserId]
    );
    if (users.length === 0) {
      throw new Error('用户不存在');
    }

    const [existing] = await pool.execute(
      `SELECT c.id
       FROM conversations c
       JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
       JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
       WHERE c.type = 'direct'
       LIMIT 1`,
      [currentUserId, targetUserId]
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    const [result] = await pool.execute(
      'INSERT INTO conversations (type) VALUES (?)',
      ['direct']
    );
    const conversationId = result.insertId;

    await this.addMember(conversationId, currentUserId);
    await this.addMember(conversationId, targetUserId);

    return conversationId;
  }

  static async createGroupConversation(ownerId, name, memberIds = []) {
    const groupName = String(name || '').trim();
    if (groupName.length < 2 || groupName.length > 50) {
      throw new Error('群聊名称需要在 2 到 50 个字符之间');
    }

    const uniqueMemberIds = [...new Set([ownerId, ...memberIds.map(Number)])]
      .filter((id) => Number.isInteger(id) && id > 0);

    const [result] = await pool.execute(
      'INSERT INTO conversations (type, name, owner_id) VALUES (?, ?, ?)',
      ['group', groupName, ownerId]
    );
    const conversationId = result.insertId;

    for (const userId of uniqueMemberIds) {
      await this.addMember(conversationId, userId, userId === ownerId ? 'owner' : 'member');
    }

    return conversationId;
  }
}

module.exports = Conversation;
