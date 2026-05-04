<template>
    <div class="chat-container">
      <aside class="conversation-list">
        <div class="conversation-title">会话</div>
        <div class="conversation-actions">
          <input
            v-model="userSearchKeyword"
            class="user-search-input"
            placeholder="搜索用户"
            @keyup.enter="searchUserList"
          />
          <button class="compact-btn" type="button" @click="searchUserList">搜索</button>
          <button class="compact-btn ghost" type="button" @click="openGroupDialog">建群</button>
        </div>
        <div v-if="searchedUsers.length" class="search-results">
          <button
            v-for="user in searchedUsers"
            :key="user.id"
            class="search-result"
            type="button"
            @click="startDirectConversation(user.id)"
          >
            <span>{{ user.username }}</span>
            <span>私信</span>
          </button>
        </div>
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          :class="['conversation-item', { active: conversation.id === activeConversationId }]"
          @click="selectConversation(conversation.id)"
        >
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
        </button>
      </aside>

      <main class="chat-main">
        <div class="chat-header">
          <h2>{{ activeConversationName }}</h2>
          <div class="user-info">
            <span>{{ currentUsername }}</span>
            <button @click="handleLogout" class="logout-btn">退出登录</button>
          </div>
        </div>
  
        <div class="messages" ref="messagesContainer">
          <div v-for="msg in messages" 
               :key="msg.id" 
               :class="['message', { 'my-message': msg.sender_id === currentUserId }]">
            <div class="message-header">
              <span class="username">{{ msg.username }}</span>
              <span class="time">{{ formatTime(msg.created_at) }}</span>
            </div>
            <div class="message-content">{{ msg.content }}</div>
          </div>
        </div>
  
        <MessageInput @sendMessage="sendMessage" />
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
              <span>{{ user.username }}</span>
              <span class="group-user-email">{{ user.email }}</span>
            </label>
          </div>
        </div>
        <template #footer>
          <button class="compact-btn ghost" type="button" @click="groupDialogVisible = false">取消</button>
          <button class="compact-btn" type="button" @click="submitGroupConversation">创建</button>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, inject, onMounted, onUnmounted, nextTick } from 'vue';
  import { ElMessage } from 'element-plus';
  import { useRouter } from 'vue-router';
  import MessageInput from '../components/MessageInput.vue';
  import { createDirectConversation, createGroupConversation, getConversations } from '../api/conversations';
  import { searchUsers } from '../api/users';
  import { clearAuth, getToken, getUsername } from '../utils/auth';
  
  const createSocket = inject('socket');
  const router = useRouter();
  const socket = ref(null);
  const conversations = ref([]);
  const activeConversationId = ref(null);
  const userSearchKeyword = ref('');
  const searchedUsers = ref([]);
  const groupDialogVisible = ref(false);
  const groupName = ref('');
  const groupSearchKeyword = ref('');
  const groupSearchResults = ref([]);
  const selectedGroupMemberIds = ref([]);
  const unreadCounts = ref({});
  const messages = ref([]);
  const currentUserId = ref(null);
  const currentUsername = ref('');
  const messagesContainer = ref(null);

  const activeConversationName = computed(() => {
    const activeConversation = conversations.value.find((item) => item.id === activeConversationId.value);
    return activeConversation?.name || ':)';
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
      last_message: msg.content,
      last_message_at: msg.created_at,
      updated_at: msg.created_at
    };

    conversations.value = [
      updatedConversation,
      ...conversations.value.filter((item) => item.id !== conversationId)
    ];
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

  const startDirectConversation = async (userId) => {
    try {
      const response = await createDirectConversation(userId);
      searchedUsers.value = [];
      userSearchKeyword.value = '';
      await refreshAndSelectConversation(response.data.conversationId);
    } catch (error) {
      ElMessage.error(error.message || '创建私聊失败');
    }
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
  
  onMounted(() => {
    const token = getToken();
    const username = getUsername();
  
    if (!token || !username) {
      router.push('/login');
      return;
    }
  
    currentUsername.value = username;
  
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserId.value = payload.userId;
  
      if (!initializeSocket()) {
        return;
      }

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
      content: message
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
    .chat-container {
      height: 100vh;
      display: flex;
      background-color: #f5f5f5;
    }

    .conversation-list {
      width: 240px;
      background: white;
      border-right: 1px solid #eee;
      display: flex;
      flex-direction: column;
      padding: 16px 12px;
      gap: 8px;
    }

    .conversation-title {
      font-size: 14px;
      color: #666;
      padding: 0 8px 8px;
    }

    .conversation-actions {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 6px;
      margin-bottom: 8px;
    }

    .user-search-input {
      min-width: 0;
      padding: 8px;
      border: 1px solid #eee;
      border-radius: 6px;
      font-size: 13px;
    }

    .compact-btn {
      border: none;
      background: #f56c6c;
      color: white;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 13px;
      cursor: pointer;
    }

    .compact-btn.ghost {
      background: #fff0f3;
      color: #f56c6c;
    }

    .search-results {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }

    .search-result {
      border: none;
      background: #fafafa;
      color: #333;
      padding: 8px 10px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      cursor: pointer;
    }

    .conversation-item {
      width: 100%;
      border: none;
      background: transparent;
      color: #333;
      padding: 10px 12px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .conversation-item:hover,
    .conversation-item.active {
      background: #fff0f3;
    }

    .conversation-name {
      font-size: 14px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .conversation-type {
      font-size: 12px;
      color: #999;
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
      font-size: 12px;
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

    .chat-main {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .group-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
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
    
    .chat-header {
      padding: 1rem 2rem;
      background: #f56c6c;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .logout-btn {
      padding: 0.5rem 1rem;
      background: white;
      color: #f56c6c;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .logout-btn:hover {
      background: #f0f0f0;
    }
    
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .message {
      padding: 10px;
      border-radius: 8px;
      background: white;
      max-width: 70%;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      word-break: break-word;
    }
    
    .my-message {
      margin-left: auto;
      background: #dcf8c6;
    }
    
    .message-header {
      margin-bottom: 5px;
      font-size: 0.8em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .username {
      font-weight: bold;
      color: #f56c6c;
    }
    
    .time {
      color: #666;
    }
    
    .message-content {
      line-height: 1.4;
    }
    
    .message-form {
      padding: 20px;
      background: white;
      display: flex;
      gap: 10px;
      box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
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
