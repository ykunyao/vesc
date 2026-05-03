<template>
    <div class="chat-container">
      <aside class="conversation-list">
        <div class="conversation-title">会话</div>
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          :class="['conversation-item', { active: conversation.id === activeConversationId }]"
          @click="selectConversation(conversation.id)"
        >
          <span class="conversation-name">{{ conversation.name || '未命名会话' }}</span>
          <span class="conversation-type">{{ conversation.type === 'direct' ? '私信' : '群聊' }}</span>
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
    </div>
  </template>
  
  <script setup>
  import { ref, computed, inject, onMounted, onUnmounted, nextTick } from 'vue';
  import { ElMessage } from 'element-plus';
  import { useRouter } from 'vue-router';
  import MessageInput from '../components/MessageInput.vue';
  import { getConversations } from '../api/conversations';
  import { clearAuth, getToken, getUsername } from '../utils/auth';
  
  const createSocket = inject('socket');
  const router = useRouter();
  const socket = ref(null);
  const conversations = ref([]);
  const activeConversationId = ref(null);
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
  
  const initializeSocket = () => {
    socket.value = createSocket();
    
    if (!socket.value) {
      console.error('Socket creation failed');
      router.push('/login');
      return false;
    }
  
    socket.value.on('chat message', (msg) => {
      if (msg.conversation_id !== activeConversationId.value) return;
      messages.value.push(msg);
      scrollToBottom();
    });
  
    socket.value.on('history messages', ({ conversationId, messages: msgs }) => {
      if (conversationId !== activeConversationId.value) return;
      messages.value = msgs;
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

  const selectConversation = (conversationId) => {
    activeConversationId.value = conversationId;
    messages.value = [];

    if (socket.value) {
      socket.value.emit('join conversation', conversationId);
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
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // 24小时制
    });
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
      gap: 2px;
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
    }

    .conversation-type {
      font-size: 12px;
      color: #999;
    }

    .chat-main {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
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
