<template>
  <div ref="containerRef" class="messages" @scroll="handleScroll">
    <button
      v-if="hasMore"
      class="load-older-btn"
      type="button"
      :disabled="loadingOlder"
      @click="$emit('loadOlder')"
    >
      {{ loadingOlder ? '加载中...' : '加载更早消息' }}
    </button>

    <template v-for="msg in messages" :key="msg.id">
      <div v-if="msg.status === 'revoked'" class="system-message-row">
        <span>{{ formatRevokedMessage(msg) }}</span>
      </div>
      <div
        v-else
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
          <button
            v-if="msg.message_type === 'image'"
            class="message-image-btn"
            type="button"
            @click="$emit('previewImage', msg.media_url)"
          >
            <img :src="resolveMediaUrl(msg.media_url)" alt="聊天图片" />
          </button>
          <div v-else class="message-content">{{ msg.content }}</div>
          <div class="message-actions">
            <button
              v-if="msg.message_type === 'text'"
              type="button"
              @click="$emit('copyMessage', msg)"
            >
              复制
            </button>
            <button v-if="canManageMessage(msg)" type="button" @click="$emit('deleteMessage', msg)">删除</button>
            <button v-if="canManageMessage(msg)" type="button" @click="$emit('revokeMessage', msg)">撤回</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { nextTick, ref } from 'vue';

  const props = defineProps({
    messages: {
      type: Array,
      required: true
    },
    currentUserId: {
      type: Number,
      default: null
    },
    hasMore: {
      type: Boolean,
      default: false
    },
    loadingOlder: {
      type: Boolean,
      default: false
    },
    avatarStyle: {
      type: Function,
      required: true
    },
    avatarText: {
      type: Function,
      required: true
    },
    formatTime: {
      type: Function,
      required: true
    },
    resolveMediaUrl: {
      type: Function,
      required: true
    },
    canManageMessage: {
      type: Function,
      required: true
    }
  });

  const emit = defineEmits([
    'copyMessage',
    'deleteMessage',
    'loadOlder',
    'previewImage',
    'revokeMessage'
  ]);

  const containerRef = ref(null);

  const formatRevokedMessage = (message) => {
    return message.sender_id === props.currentUserId
      ? '你撤回了一条消息'
      : `${message.username} 撤回了一条消息`;
  };

  const handleScroll = () => {
    if (!containerRef.value || props.loadingOlder || !props.hasMore) return;
    if (containerRef.value.scrollTop <= 24) {
      emit('loadOlder');
    }
  };

  const scrollToBottom = async () => {
    await nextTick();
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  };

  const getScrollSnapshot = () => {
    if (!containerRef.value) return null;
    return {
      scrollHeight: containerRef.value.scrollHeight,
      scrollTop: containerRef.value.scrollTop
    };
  };

  const restoreScrollFromSnapshot = async (snapshot) => {
    await nextTick();
    if (!containerRef.value || !snapshot) return;
    containerRef.value.scrollTop = containerRef.value.scrollHeight - snapshot.scrollHeight + snapshot.scrollTop;
  };

  defineExpose({
    getScrollSnapshot,
    restoreScrollFromSnapshot,
    scrollToBottom
  });
</script>

<style scoped>
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 30px 28px 214px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .load-older-btn {
    align-self: center;
    padding: 7px 13px;
    border: 1px solid #e5ebf3;
    border-radius: 999px;
    background: #f7f9fc;
    color: #718098;
    font-size: 12px;
    box-shadow: none;
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

  .message {
    position: relative;
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

  .system-message-row {
    align-self: center;
    max-width: min(520px, 82%);
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(232, 237, 244, 0.68);
    color: #8b96a8;
    font-size: 12px;
    line-height: 1.4;
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

  .message-actions {
    position: absolute;
    top: calc(100% - 2px);
    left: 8px;
    z-index: 2;
    display: flex;
    gap: 8px;
    margin-top: 0;
    padding: 8px 4px 4px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s;
  }

  .my-message .message-actions {
    right: 8px;
    left: auto;
  }

  .message:hover .message-actions,
  .message-actions:hover {
    opacity: 1;
    pointer-events: auto;
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
