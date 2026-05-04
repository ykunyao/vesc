<template>
  <form ref="composerRef" @submit.prevent="sendMessage" class="message-form">
    <textarea
      v-model="newMessage"
      placeholder="输入消息..."
      maxlength="1000"
      rows="2"
      @keydown.enter.exact.prevent="sendMessage"
    ></textarea>
    <div class="composer-footer">
      <span class="composer-hint">Enter 发送，Shift + Enter 换行</span>
      <div class="composer-actions">
        <button :class="['emoji-btn', { active: showEmojiPicker }]" type="button" @click="toggleEmojiPicker">☻</button>
        <button class="send-btn" type="submit" :disabled="!newMessage.trim()">➤</button>
      </div>
    </div>
    <div v-if="showEmojiPicker" class="emoji-popover">
      <EmojiPicker @onEmojiSelect="addEmoji" />
    </div>
  </form>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import EmojiPicker from './EmojiPicker.vue';

const emit = defineEmits(['sendMessage']);

const newMessage = ref('');
const showEmojiPicker = ref(false);
const composerRef = ref(null);

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
};

const closeEmojiPicker = () => {
  showEmojiPicker.value = false;
};

const handleDocumentPointerDown = (event) => {
  if (!showEmojiPicker.value) return;
  if (composerRef.value?.contains(event.target)) return;
  closeEmojiPicker();
};

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    closeEmojiPicker();
  }
};

const addEmoji = (emoji) => {
  newMessage.value += emoji;
  showEmojiPicker.value = false; // 选择表情后关闭选择器
};

const sendMessage = () => {
  const trimmedMessage = newMessage.value.trim();
  if (trimmedMessage) {
    emit('sendMessage', trimmedMessage);
    newMessage.value = '';
  }
};

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.message-form {
  position: absolute;
  right: 16px;
  bottom: 16px;
  left: 16px;
  min-height: 128px;
  padding: 18px 16px 12px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dce5f1;
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(40, 54, 82, 0.12);
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 2;
}

textarea {
  flex: 1;
  width: 100%;
  min-height: 54px;
  padding: 6px 0;
  border: none;
  resize: none;
  color: #35445a;
  font-size: 1rem;
  line-height: 1.6;
  background: transparent;
  outline: none;
}

.composer-footer,
.composer-actions {
  display: flex;
  align-items: center;
}

.composer-footer {
  justify-content: space-between;
  gap: 12px;
}

.composer-actions {
  gap: 8px;
}

button {
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.emoji-btn,
.send-btn {
  height: 36px;
  color: #6f7f98;
  background: #f4f8fb;
  border-radius: 12px;
}

.emoji-btn {
  width: 36px;
  background: transparent;
  font-size: 18px;
}

.emoji-btn.active,
.emoji-btn:hover {
  background: #edf3f8;
}

.emoji-popover {
  position: absolute;
  right: 54px;
  bottom: calc(100% + 12px);
  z-index: 10;
}

.composer-hint {
  color: #60708d;
  font-size: 13px;
}

.send-btn {
  width: 44px;
  border-radius: 999px;
  color: #8794a8;
  background: #f5f8fc;
  font-size: 18px;
}

.send-btn:not(:disabled) {
  color: #ffffff;
  background: #7c8faf;
}

.send-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .message-form {
    right: 10px;
    bottom: 10px;
    left: 10px;
  }

  .emoji-popover {
    right: 0;
  }

  .composer-hint {
    display: none;
  }
}
</style>
