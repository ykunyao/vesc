const pool = require('../config/db');

class Friendship {
  static async areFriends(userId, friendId) {
    const [rows] = await pool.execute(
      `SELECT user_id
       FROM friendships
       WHERE user_id = ? AND friend_id = ?
       LIMIT 1`,
      [userId, friendId]
    );

    return rows.length > 0;
  }

  static async listFriends(userId) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.username, u.email, u.avatar_url, f.created_at AS friend_since
       FROM friendships f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ?
       ORDER BY u.username ASC`,
      [userId]
    );

    return rows;
  }

  static async listRequests(userId) {
    const [incoming] = await pool.execute(
      `SELECT fr.id, fr.requester_id, fr.receiver_id, fr.status, fr.created_at, u.username, u.email, u.avatar_url
       FROM friend_requests fr
       JOIN users u ON u.id = fr.requester_id
       WHERE fr.receiver_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    const [outgoing] = await pool.execute(
      `SELECT fr.id, fr.requester_id, fr.receiver_id, fr.status, fr.created_at, u.username, u.email, u.avatar_url
       FROM friend_requests fr
       JOIN users u ON u.id = fr.receiver_id
       WHERE fr.requester_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    return { incoming, outgoing };
  }

  static async createRequest(requesterId, receiverId) {
    if (requesterId === receiverId) {
      throw new Error('不能添加自己为好友');
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [receiverId]
    );
    if (users.length === 0) {
      throw new Error('用户不存在');
    }

    if (await this.areFriends(requesterId, receiverId)) {
      throw new Error('你们已经是好友');
    }

    const [pending] = await pool.execute(
      `SELECT id, requester_id, receiver_id
       FROM friend_requests
       WHERE status = 'pending'
         AND ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
       LIMIT 1`,
      [requesterId, receiverId, receiverId, requesterId]
    );
    if (pending.length > 0) {
      if (pending[0].requester_id === requesterId) {
        throw new Error('好友申请已发送');
      }
      throw new Error('对方已向你发送好友申请，请先处理');
    }

    await pool.execute(
      `INSERT INTO friend_requests (requester_id, receiver_id, status)
       VALUES (?, ?, 'pending')
       ON DUPLICATE KEY UPDATE status = 'pending', updated_at = CURRENT_TIMESTAMP`,
      [requesterId, receiverId]
    );

    return this.listRequests(requesterId);
  }

  static async respondToRequest(requestId, receiverId, action) {
    if (!['accept', 'reject'].includes(action)) {
      throw new Error('请选择同意或拒绝');
    }

    const [requests] = await pool.execute(
      `SELECT id, requester_id, receiver_id, status
       FROM friend_requests
       WHERE id = ? AND receiver_id = ?
       LIMIT 1`,
      [requestId, receiverId]
    );
    const request = requests[0];
    if (!request || request.status !== 'pending') {
      throw new Error('好友申请不存在或已处理');
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';
    await pool.execute(
      'UPDATE friend_requests SET status = ? WHERE id = ?',
      [status, requestId]
    );

    if (action === 'accept') {
      await pool.execute(
        `INSERT IGNORE INTO friendships (user_id, friend_id)
         VALUES (?, ?), (?, ?)`,
        [request.requester_id, request.receiver_id, request.receiver_id, request.requester_id]
      );
    }

    return this.listRequests(receiverId);
  }
}

module.exports = Friendship;
