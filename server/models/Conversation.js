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

  static async getById(conversationId) {
    const [rows] = await pool.execute(
      `SELECT id, type, name, owner_id, created_at, updated_at
       FROM conversations
       WHERE id = ?
       LIMIT 1`,
      [conversationId]
    );

    return rows[0] || null;
  }

  static async getMember(conversationId, userId) {
    const [rows] = await pool.execute(
      `SELECT cm.id, cm.conversation_id, cm.user_id, cm.role, cm.joined_at, u.username, u.email, u.avatar_url
       FROM conversation_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = ? AND cm.user_id = ?
       LIMIT 1`,
      [conversationId, userId]
    );

    return rows[0] || null;
  }

  static async listMembers(conversationId) {
    const [rows] = await pool.execute(
      `SELECT cm.user_id AS id, u.username, u.email, u.avatar_url, cm.role, cm.joined_at
       FROM conversation_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = ?
       ORDER BY FIELD(cm.role, 'owner', 'admin', 'member'), cm.joined_at ASC`,
      [conversationId]
    );

    return rows;
  }

  static async addMembers(conversationId, actorUserId, memberIds = []) {
    const conversation = await this.getById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      throw new Error('群聊不存在');
    }

    const actor = await this.getMember(conversationId, actorUserId);
    if (!actor) {
      throw new Error('无权管理该群聊');
    }

    const uniqueMemberIds = [...new Set(memberIds.map(Number))]
      .filter((id) => Number.isInteger(id) && id > 0 && id !== actorUserId);
    if (uniqueMemberIds.length === 0) {
      throw new Error('请选择要邀请的成员');
    }

    const [users] = await pool.query(
      'SELECT id FROM users WHERE id IN (?)',
      [uniqueMemberIds]
    );
    const existingUserIds = new Set(users.map((user) => user.id));
    if (existingUserIds.size === 0) {
      throw new Error('用户不存在');
    }

    for (const userId of existingUserIds) {
      await this.addMember(conversationId, userId, 'member');
    }

    await pool.execute(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    return this.listMembers(conversationId);
  }

  static async removeMember(conversationId, actorUserId, targetUserId) {
    const conversation = await this.getById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      throw new Error('群聊不存在');
    }

    const actor = await this.getMember(conversationId, actorUserId);
    if (!actor) {
      throw new Error('无权管理该群聊');
    }

    const target = await this.getMember(conversationId, targetUserId);
    if (!target) {
      throw new Error('成员不存在');
    }

    const isSelfLeave = actorUserId === targetUserId;
    if (!isSelfLeave && actor.role !== 'owner') {
      throw new Error('只有群主可以移除成员');
    }
    if (!isSelfLeave && target.role === 'owner') {
      throw new Error('不能移除群主');
    }

    await pool.execute(
      'DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
      [conversationId, targetUserId]
    );

    const members = await this.listMembers(conversationId);
    if (members.length === 0) {
      await pool.execute('DELETE FROM conversations WHERE id = ?', [conversationId]);
      return [];
    }

    if (isSelfLeave && actor.role === 'owner') {
      await pool.execute(
        `UPDATE conversation_members
         SET role = 'owner'
         WHERE conversation_id = ?
         ORDER BY joined_at ASC
         LIMIT 1`,
        [conversationId]
      );
      const [newOwner] = await pool.execute(
        `SELECT user_id FROM conversation_members
         WHERE conversation_id = ? AND role = 'owner'
         LIMIT 1`,
        [conversationId]
      );
      await pool.execute(
        'UPDATE conversations SET owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newOwner[0]?.user_id || null, conversationId]
      );
      return this.listMembers(conversationId);
    }

    await pool.execute(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    return members;
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
         CASE
           WHEN c.type = 'direct' THEN other_user.avatar_url
           ELSE NULL
         END AS avatar_url,
         c.created_at,
         c.updated_at,
         CASE
           WHEN last_message.status = 'revoked' THEN '[已撤回]'
           WHEN last_message.message_type = 'image' THEN '[图片]'
           ELSE last_message.content
         END AS last_message,
         last_message.message_type AS last_message_type,
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
           AND m.status <> 'deleted'
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
