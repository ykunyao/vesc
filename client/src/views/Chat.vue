<template>
    <div class="chat-container">
      <aside class="conversation-list">
        <div class="sidebar-primary-actions">
          <button class="new-chat-btn" type="button" @click="openGroupDialog">新建聊天</button>
          <button class="friends-btn" type="button" @click="openFriendsDialog">
            好友
            <span v-if="incomingFriendRequests.length" class="unread-badge">
              {{ formatUnreadCount(incomingFriendRequests.length) }}
            </span>
          </button>
        </div>
        <div class="conversation-actions">
          <input
            v-model="userSearchKeyword"
            class="user-search-input"
            placeholder="搜索用户或邮箱"
            @keyup.enter="searchUserList"
          />
          <button class="compact-btn icon-btn" type="button" @click="searchUserList">⌕</button>
        </div>
        <div v-if="searchedUsers.length" class="search-results">
          <button
            v-for="user in searchedUsers"
            :key="user.id"
            class="search-result"
            type="button"
            @click="handleSearchUserClick(user)"
          >
            <span class="search-user-main">
              <span class="avatar small" :style="avatarStyle(user.avatar_url, user.username)">
                <span v-if="!user.avatar_url">{{ avatarText(user.username) }}</span>
              </span>
              <span>{{ user.username }}</span>
            </span>
            <span class="search-action-text">{{ formatFriendAction(user) }}</span>
          </button>
        </div>
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          :class="['conversation-item', { active: conversation.id === activeConversationId }]"
          @click="selectConversation(conversation.id)"
        >
          <span class="conversation-avatar avatar" :style="avatarStyle(conversation.avatar_url, conversation.name)">
            <span v-if="!conversation.avatar_url">{{ conversation.type === 'direct' ? avatarText(conversation.name) : '群' }}</span>
          </span>
          <span class="conversation-body">
            <span class="conversation-main-row">
              <span class="conversation-name">{{ conversation.name || '未命名会话' }}</span>
              <span v-if="unreadCounts[conversation.id]" class="unread-badge">
                {{ formatUnreadCount(unreadCounts[conversation.id]) }}
              </span>
            </span>
            <span class="conversation-meta-row">
              <span class="conversation-type">{{ conversation.type === 'direct' ? '私信' : '群聊' }}</span>
              <span v-if="conversation.last_message_at" class="conversation-time">
                {{ formatConversationTime(conversation.last_message_at) }}
              </span>
            </span>
            <span class="conversation-preview">
              {{ conversation.last_message || '还没有消息，打个招呼吧' }}
            </span>
          </span>
        </button>
      </aside>

      <main class="chat-main">
        <div class="chat-header">
          <div class="chat-title">
            <span class="message-count">{{ messages.length }} 条消息</span>
            <h2>{{ activeConversationName }}</h2>
            <button
              v-if="isActiveGroup"
              class="header-action-btn"
              type="button"
              @click="openGroupDetailDialog"
            >
              群详情
            </button>
          </div>
          <div class="user-info">
            <button class="profile-btn" type="button" @click="openAvatarDialog">
              <span class="avatar header-avatar" :style="avatarStyle(currentAvatarUrl, currentUsername)">
                <span v-if="!currentAvatarUrl">{{ avatarText(currentUsername) }}</span>
              </span>
              <span>{{ currentUsername }}</span>
            </button>
            <button @click="handleLogout" class="logout-btn">退出登录</button>
          </div>
        </div>
  
        <div class="messages" ref="messagesContainer">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['message-row', { 'my-message-row': msg.sender_id === currentUserId }]"
          >
            <span class="avatar message-avatar" :style="avatarStyle(msg.avatar_url, msg.username)">
              <span v-if="!msg.avatar_url">{{ avatarText(msg.username) }}</span>
            </span>
            <div :class="['message', { 'my-message': msg.sender_id === currentUserId }]">
              <div class="message-header">
                <span class="username">{{ msg.username }}</span>
                <span class="time">{{ formatTime(msg.created_at) }}</span>
              </div>
              <div v-if="msg.status === 'revoked'" class="revoked-message">消息已撤回</div>
              <button
                v-else-if="msg.message_type === 'image'"
                class="message-image-btn"
                type="button"
                @click="previewImage(msg.media_url)"
              >
                <img :src="resolveMediaUrl(msg.media_url)" alt="聊天图片" />
              </button>
              <div v-else class="message-content">{{ msg.content }}</div>
              <div class="message-actions">
                <button
                  v-if="msg.message_type === 'text' && msg.status !== 'revoked'"
                  type="button"
                  @click="copyMessage(msg)"
                >
                  复制
                </button>
                <button v-if="canManageMessage(msg)" type="button" @click="deleteMessage(msg)">删除</button>
                <button v-if="canManageMessage(msg)" type="button" @click="revokeMessage(msg)">撤回</button>
              </div>
            </div>
          </div>
        </div>
  
        <MessageInput @sendMessage="sendMessage" @sendImage="sendImageMessage" />
      </main>

      <el-dialog v-model="groupDialogVisible" title="创建群聊" width="420px">
        <div class="group-form">
          <el-input v-model="groupName" placeholder="群聊名称" maxlength="50" />
          <el-input
            v-model="groupSearchKeyword"
            placeholder="搜索成员"
            @keyup.enter="searchGroupUserList"
          />
          <button class="compact-btn" type="button" @click="searchGroupUserList">搜索成员</button>
          <div class="group-user-list">
            <label v-for="user in groupSearchResults" :key="user.id" class="group-user-item">
              <input
                type="checkbox"
                :value="user.id"
                v-model="selectedGroupMemberIds"
              />
              <span class="search-user-main">
                <span class="avatar small" :style="avatarStyle(user.avatar_url, user.username)">
                  <span v-if="!user.avatar_url">{{ avatarText(user.username) }}</span>
                </span>
                <span>{{ user.username }}</span>
              </span>
              <span class="group-user-email">{{ user.email }}</span>
            </label>
          </div>
        </div>
        <template #footer>
          <button class="compact-btn ghost" type="button" @click="groupDialogVisible = false">取消</button>
          <button class="compact-btn" type="button" @click="submitGroupConversation">创建</button>
        </template>
      </el-dialog>

      <el-dialog v-model="friendsDialogVisible" title="好友" width="520px">
        <div class="friends-panel">
          <section class="friend-section">
            <div class="friend-section-header">
              <span>好友列表</span>
              <span>{{ friends.length }} 位好友</span>
            </div>
            <div v-if="friends.length" class="friend-list">
              <button
                v-for="friend in friends"
                :key="friend.id"
                class="friend-item"
                type="button"
                @click="startDirectConversation(friend.id)"
              >
                <span class="search-user-main">
                  <span class="avatar small" :style="avatarStyle(friend.avatar_url, friend.username)">
                    <span v-if="!friend.avatar_url">{{ avatarText(friend.username) }}</span>
                  </span>
                  <span class="friend-name">{{ friend.username }}</span>
                </span>
                <span>私信</span>
              </button>
            </div>
            <p v-else class="empty-hint">还没有好友，可以先搜索用户发送好友申请。</p>
          </section>

          <section class="friend-section">
            <div class="friend-section-header">
              <span>收到的申请</span>
              <span>{{ incomingFriendRequests.length }} 条</span>
            </div>
            <div v-if="incomingFriendRequests.length" class="friend-list">
              <div v-for="request in incomingFriendRequests" :key="request.id" class="friend-request-item">
                <span class="search-user-main">
                  <span class="avatar small" :style="avatarStyle(request.avatar_url, request.username)">
                    <span v-if="!request.avatar_url">{{ avatarText(request.username) }}</span>
                  </span>
                  <span class="friend-name">{{ request.username }}</span>
                </span>
                <span class="friend-request-actions">
                  <button class="compact-btn" type="button" @click="handleFriendRequest(request.id, 'accept')">同意</button>
                  <button class="compact-btn ghost" type="button" @click="handleFriendRequest(request.id, 'reject')">拒绝</button>
                </span>
              </div>
            </div>
            <p v-else class="empty-hint">暂无新的好友申请。</p>
          </section>

          <section class="friend-section">
            <div class="friend-section-header">
              <span>已发送申请</span>
              <span>{{ outgoingFriendRequests.length }} 条</span>
            </div>
            <div v-if="outgoingFriendRequests.length" class="friend-list">
              <div v-for="request in outgoingFriendRequests" :key="request.id" class="friend-request-item">
                <span class="search-user-main">
                  <span class="avatar small" :style="avatarStyle(request.avatar_url, request.username)">
                    <span v-if="!request.avatar_url">{{ avatarText(request.username) }}</span>
                  </span>
                  <span class="friend-name">{{ request.username }}</span>
                </span>
                <span class="pending-label">等待对方通过</span>
              </div>
            </div>
            <p v-else class="empty-hint">没有待通过的申请。</p>
          </section>
        </div>
      </el-dialog>

      <el-dialog v-model="groupDetailVisible" title="群详情" width="480px">
        <div class="group-detail">
          <div class="group-detail-header">
            <div>
              <div class="group-detail-name">{{ groupDetailConversation?.name || activeConversationName }}</div>
              <div class="group-detail-meta">{{ groupMembers.length }} 位成员</div>
            </div>
            <button class="compact-btn ghost" type="button" @click="leaveCurrentGroup">退出群聊</button>
          </div>

          <div class="group-profile-form">
            <div class="group-profile-heading">
              <span class="avatar group-avatar-preview" :style="avatarStyle(groupProfileAvatarUrl, groupProfileName)">
                <span v-if="!groupProfileAvatarUrl">{{ avatarText(groupProfileName) }}</span>
              </span>
              <div>
                <div class="group-section-title">群资料</div>
                <div class="group-section-note">
                  {{ isCurrentUserGroupOwner ? '群主可以编辑群名、公告和头像' : '只有群主可以编辑群资料' }}
                </div>
              </div>
            </div>
            <el-input
              v-model="groupProfileName"
              placeholder="群聊名称"
              maxlength="50"
              :disabled="!isCurrentUserGroupOwner"
            />
            <el-input
              v-model="groupProfileAvatarUrl"
              placeholder="群头像 URL，可留空使用默认头像"
              maxlength="500"
              :disabled="!isCurrentUserGroupOwner"
            />
            <el-input
              v-model="groupProfileAnnouncement"
              type="textarea"
              :rows="3"
              placeholder="群公告"
              maxlength="500"
              show-word-limit
              :disabled="!isCurrentUserGroupOwner"
            />
            <button
              v-if="isCurrentUserGroupOwner"
              class="compact-btn"
              type="button"
              @click="saveGroupProfile"
            >
              保存群资料
            </button>
          </div>

          <div class="group-invite">
            <el-input
              v-model="memberSearchKeyword"
              placeholder="搜索用户邀请入群"
              @keyup.enter="searchInviteUsers"
            />
            <button class="compact-btn" type="button" @click="searchInviteUsers">搜索</button>
          </div>
          <div v-if="memberSearchResults.length" class="group-user-list">
            <label v-for="user in memberSearchResults" :key="user.id" class="group-user-item">
              <input
                type="checkbox"
                :value="user.id"
                v-model="selectedInviteMemberIds"
                :disabled="isGroupMember(user.id)"
              />
              <span class="search-user-main">
                <span class="avatar small" :style="avatarStyle(user.avatar_url, user.username)">
                  <span v-if="!user.avatar_url">{{ avatarText(user.username) }}</span>
                </span>
                <span>{{ user.username }}</span>
              </span>
              <span class="group-user-email">{{ isGroupMember(user.id) ? '已在群内' : user.email }}</span>
            </label>
            <button class="compact-btn" type="button" @click="submitInviteMembers">邀请选中成员</button>
          </div>

          <div class="member-list">
            <div v-for="member in groupMembers" :key="member.id" class="member-item">
              <div class="member-profile">
                <span class="avatar small" :style="avatarStyle(member.avatar_url, member.username)">
                  <span v-if="!member.avatar_url">{{ avatarText(member.username) }}</span>
                </span>
                <div>
                  <span class="member-name">{{ member.username }}</span>
                  <span class="member-role">{{ formatMemberRole(member.role) }}</span>
                </div>
              </div>
              <button
                v-if="canRemoveMember(member)"
                class="danger-link"
                type="button"
                @click="removeGroupMember(member.id)"
              >
                移除
              </button>
            </div>
          </div>
        </div>
      </el-dialog>

      <el-dialog v-model="avatarDialogVisible" title="设置头像" width="420px">
        <div class="avatar-form">
          <div class="avatar-preview avatar large" :style="avatarStyle(avatarDraftUrl, currentUsername)">
            <span v-if="!avatarDraftUrl">{{ avatarText(currentUsername) }}</span>
          </div>
          <label class="upload-avatar-btn">
            选择本地图片
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="handleAvatarFileChange" />
          </label>
          <el-input v-model="avatarDraftUrl" placeholder="输入 http/https 头像图片地址" clearable />
          <p class="avatar-help">支持 jpg、png、webp、gif，最大 2MB。也可以继续使用图片 URL。</p>
        </div>
        <template #footer>
          <button class="compact-btn ghost" type="button" @click="avatarDialogVisible = false">取消</button>
          <button class="compact-btn" type="button" @click="saveAvatar">保存</button>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, inject, onMounted, onUnmounted, nextTick } from 'vue';
  import { ElMessage } from 'element-plus';
  import { useRouter } from 'vue-router';
  import MessageInput from '../components/MessageInput.vue';
  import {
    addConversationMembers,
    createDirectConversation,
    createGroupConversation,
    getConversationMembers,
    getConversations,
    removeConversationMember,
    updateGroupProfile,
    uploadConversationImage
  } from '../api/conversations';
  import {
    getCurrentUser,
    getFriendRequests,
    getFriends,
    respondFriendRequest,
    searchUsers,
    sendFriendRequest,
    updateAvatar,
    uploadAvatar
  } from '../api/users';
  import { API_BASE_URL } from '../config';
  import { clearAuth, getAvatarUrl, getToken, getUsername, setAvatarUrl } from '../utils/auth';
  
  const createSocket = inject('socket');
  const router = useRouter();
  const socket = ref(null);
  const conversations = ref([]);
  const activeConversationId = ref(null);
  const userSearchKeyword = ref('');
  const searchedUsers = ref([]);
  const friendsDialogVisible = ref(false);
  const friends = ref([]);
  const incomingFriendRequests = ref([]);
  const outgoingFriendRequests = ref([]);
  const groupDialogVisible = ref(false);
  const groupName = ref('');
  const groupSearchKeyword = ref('');
  const groupSearchResults = ref([]);
  const selectedGroupMemberIds = ref([]);
  const groupDetailVisible = ref(false);
  const groupDetailConversation = ref(null);
  const groupMembers = ref([]);
  const currentGroupMember = ref(null);
  const groupProfileName = ref('');
  const groupProfileAnnouncement = ref('');
  const groupProfileAvatarUrl = ref('');
  const memberSearchKeyword = ref('');
  const memberSearchResults = ref([]);
  const selectedInviteMemberIds = ref([]);
  const unreadCounts = ref({});
  const messages = ref([]);
  const currentUserId = ref(null);
  const currentUsername = ref('');
  const currentAvatarUrl = ref('');
  const avatarDialogVisible = ref(false);
  const avatarDraftUrl = ref('');
  const messagesContainer = ref(null);

  const activeConversationName = computed(() => {
    return activeConversation.value?.name || ':)';
  });

  const activeConversation = computed(() => {
    return conversations.value.find((item) => item.id === activeConversationId.value) || null;
  });

  const isActiveGroup = computed(() => {
    return activeConversation.value?.type === 'group';
  });

  const isCurrentUserGroupOwner = computed(() => {
    return currentGroupMember.value?.role === 'owner';
  });
  
  const scrollToBottom = async () => {
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  };

  const resetUnreadCount = (conversationId) => {
    const nextCounts = { ...unreadCounts.value };
    delete nextCounts[conversationId];
    unreadCounts.value = nextCounts;
  };

  const incrementUnreadCount = (conversationId) => {
    unreadCounts.value = {
      ...unreadCounts.value,
      [conversationId]: (unreadCounts.value[conversationId] || 0) + 1
    };
  };

  const updateConversationPreview = (msg) => {
    const conversationId = msg.conversation_id;
    const index = conversations.value.findIndex((item) => item.id === conversationId);
    if (index === -1) return;

    const updatedConversation = {
      ...conversations.value[index],
      last_message: getConversationPreviewText(msg),
      last_message_at: msg.created_at,
      updated_at: msg.created_at
    };

    conversations.value = [
      updatedConversation,
      ...conversations.value.filter((item) => item.id !== conversationId)
    ];
  };

  const avatarText = (name = '') => {
    return String(name || '?').trim().slice(0, 1).toUpperCase() || '?';
  };

  const avatarStyle = (avatarUrl, name = '') => {
    if (avatarUrl) {
      return { backgroundImage: `url("${resolveAvatarUrl(avatarUrl)}")` };
    }

    const seed = [...String(name || 'vesc')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const hue = seed % 360;
    return {
      backgroundImage: `linear-gradient(135deg, hsl(${hue}, 52%, 84%), hsl(${(hue + 38) % 360}, 56%, 72%))`
    };
  };

  const resolveAvatarUrl = (avatarUrl = '') => {
    if (!avatarUrl) return '';
    if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
    if (avatarUrl.startsWith('/')) return `${API_BASE_URL}${avatarUrl}`;
    return avatarUrl;
  };

  const resolveMediaUrl = (mediaUrl = '') => {
    if (!mediaUrl) return '';
    if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
    if (mediaUrl.startsWith('/')) return `${API_BASE_URL}${mediaUrl}`;
    return mediaUrl;
  };

  const getConversationPreviewText = (message) => {
    if (message.status === 'revoked') return '[已撤回]';
    if (message.message_type === 'image') return '[图片]';
    return message.content;
  };

  const loadCurrentUser = async () => {
    const response = await getCurrentUser();
    currentUsername.value = response.data.user.username;
    currentAvatarUrl.value = response.data.user.avatar_url || '';
    setAvatarUrl(currentAvatarUrl.value);
  };
  
  const initializeSocket = () => {
    socket.value = createSocket();
    
    if (!socket.value) {
      console.error('Socket creation failed');
      router.push('/login');
      return false;
    }
  
    socket.value.on('chat message', (msg) => {
      updateConversationPreview(msg);

      if (msg.conversation_id !== activeConversationId.value) {
        incrementUnreadCount(msg.conversation_id);
        return;
      }

      messages.value.push(msg);
      resetUnreadCount(msg.conversation_id);
      scrollToBottom();
    });

    socket.value.on('message deleted', ({ conversationId, messageId }) => {
      if (conversationId !== activeConversationId.value) return;
      messages.value = messages.value.filter((message) => message.id !== messageId);
    });

    socket.value.on('message revoked', (msg) => {
      updateConversationPreview(msg);
      messages.value = messages.value.map((message) => {
        if (message.id !== msg.id) return message;
        return { ...message, ...msg };
      });
    });
  
    socket.value.on('history messages', ({ conversationId, messages: msgs }) => {
      if (conversationId !== activeConversationId.value) return;
      messages.value = msgs;
      resetUnreadCount(conversationId);
      scrollToBottom();
    });
  
    socket.value.on('error', (error) => {
      console.error('Socket error:', error);
      ElMessage.error(error || '连接出现问题，请稍后再试。');
    });
  
    return true;
  };

  const loadConversations = async () => {
    const response = await getConversations();
    conversations.value = response.data.conversations;

    if (!activeConversationId.value && conversations.value.length > 0) {
      selectConversation(conversations.value[0].id);
    }
  };

  const loadFriendData = async () => {
    const [friendsResponse, requestsResponse] = await Promise.all([
      getFriends(),
      getFriendRequests()
    ]);
    friends.value = friendsResponse.data.friends;
    incomingFriendRequests.value = requestsResponse.data.incoming;
    outgoingFriendRequests.value = requestsResponse.data.outgoing;
  };

  const refreshAndSelectConversation = async (conversationId) => {
    await loadConversations();
    selectConversation(conversationId);
  };

  const selectConversation = (conversationId) => {
    activeConversationId.value = conversationId;
    messages.value = [];
    resetUnreadCount(conversationId);

    if (socket.value) {
      socket.value.emit('join conversation', conversationId);
    }
  };

  const searchUserList = async () => {
    if (!userSearchKeyword.value.trim()) {
      searchedUsers.value = [];
      return;
    }

    const response = await searchUsers(userSearchKeyword.value);
    searchedUsers.value = response.data.users;
  };

  const refreshSearchResults = async () => {
    if (!userSearchKeyword.value.trim()) return;
    await searchUserList();
  };

  const startDirectConversation = async (userId) => {
    try {
      const response = await createDirectConversation(userId);
      searchedUsers.value = [];
      userSearchKeyword.value = '';
      friendsDialogVisible.value = false;
      await refreshAndSelectConversation(response.data.conversationId);
    } catch (error) {
      ElMessage.error(error.message || '创建私聊失败');
    }
  };

  const sendRequestToUser = async (userId) => {
    try {
      const response = await sendFriendRequest(userId);
      incomingFriendRequests.value = response.data.incoming;
      outgoingFriendRequests.value = response.data.outgoing;
      await refreshSearchResults();
      ElMessage.success('好友申请已发送');
    } catch (error) {
      ElMessage.error(error.message || '发送好友申请失败');
    }
  };

  const handleFriendRequest = async (requestId, action) => {
    try {
      const response = await respondFriendRequest(requestId, action);
      incomingFriendRequests.value = response.data.incoming;
      outgoingFriendRequests.value = response.data.outgoing;
      await loadFriendData();
      await refreshSearchResults();
      ElMessage.success(action === 'accept' ? '已添加好友' : '已拒绝申请');
    } catch (error) {
      ElMessage.error(error.message || '处理好友申请失败');
    }
  };

  const openFriendsDialog = async () => {
    try {
      friendsDialogVisible.value = true;
      await loadFriendData();
    } catch (error) {
      ElMessage.error(error.message || '获取好友信息失败');
    }
  };

  const formatFriendAction = (user) => {
    const statusMap = {
      friend: '私信',
      pending_outgoing: '已申请',
      pending_incoming: '待处理',
      none: '加好友'
    };
    return statusMap[user.friendship_status] || '加好友';
  };

  const handleSearchUserClick = (user) => {
    if (user.friendship_status === 'friend') {
      startDirectConversation(user.id);
      return;
    }
    if (user.friendship_status === 'pending_incoming') {
      openFriendsDialog();
      return;
    }
    if (user.friendship_status === 'pending_outgoing') {
      ElMessage.info('好友申请等待对方通过');
      return;
    }
    sendRequestToUser(user.id);
  };

  const openGroupDialog = () => {
    groupDialogVisible.value = true;
    groupName.value = '';
    groupSearchKeyword.value = '';
    groupSearchResults.value = [];
    selectedGroupMemberIds.value = [];
  };

  const searchGroupUserList = async () => {
    if (!groupSearchKeyword.value.trim()) {
      groupSearchResults.value = [];
      return;
    }

    const response = await searchUsers(groupSearchKeyword.value);
    groupSearchResults.value = response.data.users;
  };

  const submitGroupConversation = async () => {
    try {
      const response = await createGroupConversation({
        name: groupName.value,
        memberIds: selectedGroupMemberIds.value
      });

      groupDialogVisible.value = false;
      await refreshAndSelectConversation(response.data.conversationId);
    } catch (error) {
      ElMessage.error(error.message || '创建群聊失败');
    }
  };

  const loadGroupMembers = async () => {
    if (!activeConversationId.value) return;

    const response = await getConversationMembers(activeConversationId.value);
    groupDetailConversation.value = response.data.conversation;
    currentGroupMember.value = response.data.currentMember;
    groupMembers.value = response.data.members;
    groupProfileName.value = response.data.conversation.name || '';
    groupProfileAnnouncement.value = response.data.conversation.announcement || '';
    groupProfileAvatarUrl.value = response.data.conversation.avatar_url || '';
  };

  const openGroupDetailDialog = async () => {
    try {
      groupDetailVisible.value = true;
      memberSearchKeyword.value = '';
      memberSearchResults.value = [];
      selectedInviteMemberIds.value = [];
      await loadGroupMembers();
    } catch (error) {
      groupDetailVisible.value = false;
      ElMessage.error(error.message || '获取群详情失败');
    }
  };

  const searchInviteUsers = async () => {
    if (!memberSearchKeyword.value.trim()) {
      memberSearchResults.value = [];
      return;
    }

    const response = await searchUsers(memberSearchKeyword.value);
    memberSearchResults.value = response.data.users;
  };

  const isGroupMember = (userId) => {
    return groupMembers.value.some((member) => member.id === userId);
  };

  const saveGroupProfile = async () => {
    try {
      const response = await updateGroupProfile(activeConversationId.value, {
        name: groupProfileName.value,
        announcement: groupProfileAnnouncement.value,
        avatarUrl: groupProfileAvatarUrl.value
      });

      const updatedConversation = response.data.conversation;
      groupDetailConversation.value = updatedConversation;
      conversations.value = conversations.value.map((conversation) => {
        if (conversation.id !== updatedConversation.id) return conversation;
        return {
          ...conversation,
          name: updatedConversation.name,
          avatar_url: updatedConversation.avatar_url,
          announcement: updatedConversation.announcement
        };
      });
      ElMessage.success('群资料已更新');
    } catch (error) {
      ElMessage.error(error.message || '更新群资料失败');
    }
  };

  const submitInviteMembers = async () => {
    try {
      if (selectedInviteMemberIds.value.length === 0) {
        ElMessage.error('请选择要邀请的成员');
        return;
      }

      const response = await addConversationMembers(activeConversationId.value, selectedInviteMemberIds.value);
      groupMembers.value = response.data.members;
      selectedInviteMemberIds.value = [];
      memberSearchResults.value = [];
      memberSearchKeyword.value = '';
      ElMessage.success('已邀请成员入群');
    } catch (error) {
      ElMessage.error(error.message || '邀请成员失败');
    }
  };

  const openAvatarDialog = () => {
    avatarDraftUrl.value = currentAvatarUrl.value;
    avatarDialogVisible.value = true;
  };

  const saveAvatar = async () => {
    try {
      const response = await updateAvatar(avatarDraftUrl.value.trim());
      currentAvatarUrl.value = response.data.user.avatar_url || '';
      setAvatarUrl(currentAvatarUrl.value);
      avatarDialogVisible.value = false;

      messages.value = messages.value.map((message) => {
        if (message.sender_id !== currentUserId.value) return message;
        return { ...message, avatar_url: currentAvatarUrl.value };
      });

      conversations.value = conversations.value.map((conversation) => {
        if (conversation.type !== 'direct') return conversation;
        return conversation;
      });

      ElMessage.success('头像已更新');
    } catch (error) {
      ElMessage.error(error.message || '头像更新失败');
    }
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const response = await uploadAvatar(file);
      currentAvatarUrl.value = response.data.user.avatar_url || '';
      avatarDraftUrl.value = currentAvatarUrl.value;
      setAvatarUrl(currentAvatarUrl.value);

      messages.value = messages.value.map((message) => {
        if (message.sender_id !== currentUserId.value) return message;
        return { ...message, avatar_url: currentAvatarUrl.value };
      });

      avatarDialogVisible.value = false;
      ElMessage.success('头像已上传');
    } catch (error) {
      ElMessage.error(error.message || '头像上传失败');
    }
  };

  const removeGroupMember = async (userId) => {
    try {
      const response = await removeConversationMember(activeConversationId.value, userId);
      groupMembers.value = response.data.members;
      ElMessage.success('已移除成员');
    } catch (error) {
      ElMessage.error(error.message || '移除成员失败');
    }
  };

  const leaveCurrentGroup = async () => {
    try {
      await removeConversationMember(activeConversationId.value, currentUserId.value);
      groupDetailVisible.value = false;
      activeConversationId.value = null;
      messages.value = [];
      await loadConversations();
      ElMessage.success('已退出群聊');
    } catch (error) {
      ElMessage.error(error.message || '退出群聊失败');
    }
  };

  const canRemoveMember = (member) => {
    return isCurrentUserGroupOwner.value && member.id !== currentUserId.value && member.role !== 'owner';
  };

  const formatMemberRole = (role) => {
    const roleMap = {
      owner: '群主',
      admin: '管理员',
      member: '成员'
    };
    return roleMap[role] || '成员';
  };
  
  onMounted(() => {
    const token = getToken();
    const username = getUsername();
  
    if (!token || !username) {
      router.push('/login');
      return;
    }
  
    currentUsername.value = username;
    currentAvatarUrl.value = getAvatarUrl();
  
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserId.value = payload.userId;
  
      if (!initializeSocket()) {
        return;
      }

      loadCurrentUser().catch(() => {});
      loadFriendData().catch(() => {});
      loadConversations().catch((error) => {
        ElMessage.error(error.message || '获取会话失败');
      });
    } catch (error) {
      console.error('Token parsing error:', error);
      router.push('/login');
    }
  });
  
  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
  });
  
  const sendMessage = (message) => {
    if (!activeConversationId.value) {
      ElMessage.error('请先选择会话');
      return;
    }

    socket.value.emit('chat message', {
      conversationId: activeConversationId.value,
      content: message,
      messageType: 'text'
    });
  };

  const sendImageMessage = async (file) => {
    if (!activeConversationId.value) {
      ElMessage.error('请先选择会话');
      return;
    }

    try {
      const response = await uploadConversationImage(activeConversationId.value, file);
      socket.value.emit('chat message', {
        conversationId: activeConversationId.value,
        content: '',
        messageType: 'image',
        mediaUrl: response.data.mediaUrl
      });
    } catch (error) {
      ElMessage.error(error.message || '图片发送失败');
    }
  };

  const previewImage = (mediaUrl) => {
    const url = resolveMediaUrl(mediaUrl);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const canManageMessage = (message) => {
    return message.sender_id === currentUserId.value && message.status === 'normal';
  };

  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      ElMessage.success('已复制');
    } catch (error) {
      ElMessage.error('复制失败');
    }
  };

  const deleteMessage = (message) => {
    socket.value.emit('delete message', {
      conversationId: activeConversationId.value,
      messageId: message.id
    });
  };

  const revokeMessage = (message) => {
    socket.value.emit('revoke message', {
      conversationId: activeConversationId.value,
      messageId: message.id
    });
  };
  
  const formatTime = (time) => {
    if (!time) return '';

    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // 24小时制
    });
  };

  const formatConversationTime = (time) => {
    if (!time) return '';

    const date = new Date(time);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }

    if (isYesterday) {
      return '昨天';
    }

    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatUnreadCount = (count) => {
    return count > 99 ? '99+' : count;
  };
  
  const handleLogout = () => {
    if (socket.value) {
      socket.value.disconnect();
    }
    clearAuth();
    router.push('/login');
  };
  </script>
  
  <style scoped>
    :global(body) {
      background: #fbfcfe;
    }

    .chat-container {
      height: 100vh;
      display: flex;
      background:
        radial-gradient(circle at 74% 16%, rgba(217, 226, 240, 0.32), transparent 28%),
        linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
      color: #253247;
      font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
    }

    .conversation-list {
      width: 248px;
      background: rgba(255, 255, 255, 0.88);
      border-right: 1px solid #edf1f7;
      box-shadow: 12px 0 30px rgba(31, 45, 71, 0.04);
      display: flex;
      flex-direction: column;
      padding: 18px 12px 20px;
      gap: 10px;
    }

    .new-chat-btn {
      width: 100%;
      margin-bottom: 6px;
      padding: 14px 18px;
      border: none;
      border-radius: 16px;
      background: #e8edf4;
      color: #1f2b3d;
      font-size: 15px;
      text-align: left;
      box-shadow: none;
    }

    .sidebar-primary-actions {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: stretch;
    }

    .friends-btn {
      min-width: 64px;
      margin-bottom: 6px;
      padding: 0 12px;
      border: none;
      border-radius: 16px;
      background: #f4f7fb;
      color: #60708a;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: none;
    }

    .conversation-actions {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      margin-bottom: 10px;
      padding: 0 2px;
    }

    .user-search-input {
      min-width: 0;
      padding: 11px 13px;
      border: 1px solid #edf1f7;
      border-radius: 14px;
      background: #ffffff;
      color: #415066;
      font-size: 13px;
    }

    .compact-btn {
      border: none;
      background: #edf3f8;
      color: #60708a;
      border-radius: 12px;
      padding: 9px 12px;
      font-size: 13px;
      cursor: pointer;
      box-shadow: none;
    }

    .compact-btn.ghost {
      background: #f5f8fb;
      color: #60708a;
    }

    .icon-btn {
      width: 42px;
      font-size: 18px;
    }

    .search-results {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }

    .search-result {
      border: none;
      background: #f7f9fc;
      color: #3d4a5f;
      padding: 8px 10px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
    }

    .search-action-text,
    .pending-label {
      flex-shrink: 0;
      color: #8b96a8;
      font-size: 12px;
    }

    .search-user-main {
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .conversation-item {
      width: 100%;
      border: none;
      background: transparent;
      color: #3d4a5f;
      padding: 11px 12px;
      border-radius: 15px;
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      box-shadow: none;
      transition: background-color 0.2s, color 0.2s;
    }

    .conversation-body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .conversation-item:hover,
    .conversation-item.active {
      background: #e8edf4;
      color: #1f2b3d;
    }

    .conversation-name {
      font-size: 15px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .conversation-type {
      font-size: 12px;
      color: #8b96a8;
    }

    .conversation-main-row,
    .conversation-meta-row {
      width: 100%;
      min-width: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .conversation-time,
    .conversation-preview {
      color: #999;
      font-size: 13px;
    }

    .conversation-preview {
      width: 100%;
      overflow: hidden;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .unread-badge {
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: #f56c6c;
      color: white;
      font-size: 11px;
      line-height: 18px;
      text-align: center;
      flex-shrink: 0;
    }

    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      overflow: hidden;
      border-radius: 14px;
      background-position: center;
      background-size: cover;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42);
      flex-shrink: 0;
    }

    .avatar.small {
      width: 30px;
      height: 30px;
      border-radius: 10px;
      font-size: 12px;
    }

    .avatar.large {
      width: 86px;
      height: 86px;
      border-radius: 26px;
      font-size: 28px;
    }

    .conversation-avatar {
      width: 38px;
      height: 38px;
    }

    .chat-main {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      background: rgba(255, 255, 255, 0.62);
    }

    .group-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .friends-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: #34435a;
    }

    .friend-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .friend-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #65738a;
      font-size: 13px;
      font-weight: 700;
    }

    .friend-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 180px;
      overflow-y: auto;
    }

    .friend-item,
    .friend-request-item {
      width: 100%;
      border: 1px solid #edf1f7;
      border-radius: 14px;
      background: #fbfcfe;
      color: #415066;
      padding: 9px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      box-shadow: none;
    }

    .friend-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .friend-request-actions {
      flex-shrink: 0;
      display: inline-flex;
      gap: 6px;
    }

    .empty-hint {
      margin: 0;
      padding: 12px;
      border-radius: 14px;
      background: #fbfcfe;
      color: #9aa5b6;
      font-size: 13px;
    }

    .group-user-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
    }

    .group-user-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px 8px;
      align-items: center;
      color: #333;
    }

    .group-user-email {
      grid-column: 2;
      color: #999;
      font-size: 12px;
    }

    .group-detail {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: #333;
    }

    .group-detail-header,
    .group-invite {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .group-profile-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border: 1px solid #edf1f7;
      border-radius: 18px;
      background: #fbfcfe;
    }

    .group-profile-heading {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .group-avatar-preview {
      width: 46px;
      height: 46px;
      border-radius: 16px;
    }

    .group-section-title {
      font-weight: 700;
      color: #34435a;
    }

    .group-section-note {
      margin-top: 3px;
      color: #8b96a8;
      font-size: 12px;
    }

    .group-detail-name {
      font-weight: 700;
      font-size: 16px;
    }

    .group-detail-meta {
      margin-top: 4px;
      color: #999;
      font-size: 12px;
    }

    .member-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 260px;
      overflow-y: auto;
    }

    .member-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      background: #fafafa;
    }

    .member-profile {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .member-name {
      font-weight: 600;
    }

    .member-role {
      margin-left: 8px;
      color: #999;
      font-size: 12px;
    }

    .danger-link {
      padding: 4px 8px;
      background: transparent;
      color: #f56c6c;
      border: none;
      font-size: 12px;
    }
    
    .chat-header {
      height: 62px;
      padding: 0 28px;
      background: rgba(255, 255, 255, 0.78);
      color: #768196;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #edf1f7;
      box-shadow: none;
    }

    .chat-title {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      margin: 0 auto;
      font-size: 14px;
    }

    .chat-title h2 {
      margin: 0;
      max-width: 320px;
      overflow: hidden;
      color: #7b879b;
      font-size: 15px;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .message-count {
      color: #4d6590;
      font-size: 14px;
    }

    .header-action-btn {
      padding: 5px 9px;
      background: #f3f6fa;
      color: #67758f;
      border: 1px solid #e7edf5;
      border-radius: 999px;
      font-size: 12px;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #77849a;
      font-size: 14px;
    }

    .profile-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px 4px 4px;
      border: 1px solid #e8eef6;
      border-radius: 999px;
      background: #ffffff;
      color: #5e6d85;
      box-shadow: none;
    }

    .header-avatar {
      width: 30px;
      height: 30px;
      border-radius: 999px;
      font-size: 12px;
    }
    
    .logout-btn {
      padding: 7px 12px;
      background: #f5f8fb;
      color: #67758f;
      border: 1px solid #e8eef6;
      border-radius: 999px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .logout-btn:hover {
      background: #edf3f8;
    }
    
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 30px 28px 176px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .message {
      padding: 12px 14px;
      border: 1px solid #edf1f7;
      border-radius: 18px 18px 18px 6px;
      background: #ffffff;
      max-width: min(680px, 100%);
      min-width: 0;
      box-shadow: 0 12px 30px rgba(50, 64, 92, 0.06);
      word-break: break-word;
    }

    .message-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      max-width: min(720px, 76%);
    }

    .my-message-row {
      flex-direction: row-reverse;
      align-self: flex-end;
    }

    .message-avatar {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      margin-top: 2px;
      font-size: 12px;
    }
    
    .my-message {
      border-color: #dfe8f2;
      border-radius: 18px 18px 6px 18px;
      background: #eef4fb;
    }
    
    .message-header {
      margin-bottom: 5px;
      font-size: 0.8em;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      min-width: 0;
      white-space: nowrap;
    }
    
    .username {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: bold;
      color: #587092;
    }
    
    .time {
      flex-shrink: 0;
      color: #9aa5b6;
    }
    
    .message-content {
      line-height: 1.4;
    }

    .message-image-btn {
      display: block;
      max-width: min(320px, 58vw);
      padding: 0;
      overflow: hidden;
      border: none;
      border-radius: 14px;
      background: transparent;
      box-shadow: none;
      cursor: zoom-in;
    }

    .message-image-btn img {
      display: block;
      max-width: 100%;
      max-height: 260px;
      object-fit: cover;
    }

    .revoked-message {
      color: #9aa5b6;
      font-size: 13px;
      font-style: italic;
    }

    .message-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      opacity: 0;
      transition: opacity 0.18s;
    }

    .message:hover .message-actions {
      opacity: 1;
    }

    .message-actions button {
      padding: 3px 6px;
      border: none;
      border-radius: 8px;
      background: #edf3f8;
      color: #60708a;
      font-size: 12px;
      box-shadow: none;
    }

    .avatar-form {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .avatar-help {
      margin: 0;
      color: #8b96a8;
      font-size: 12px;
    }

    .upload-avatar-btn {
      position: relative;
      overflow: hidden;
      padding: 9px 14px;
      border-radius: 999px;
      background: #edf3f8;
      color: #60708a;
      font-size: 13px;
      cursor: pointer;
    }

    .upload-avatar-btn input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    
    input {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.3s;
    }
    
    input:focus {
      outline: none;
      border-color: #f56c6c;
    }
    
    button {
      padding: 12px 24px;
      background: #f56c6c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    /* 滚动条样式 */
    .messages::-webkit-scrollbar {
      width: 6px;
    }
    
    .messages::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    .messages::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }
    
    .messages::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  </style>
