<template>
  <form @submit.prevent="sendMessage" class="message-form">
    <input 
      v-model="newMessage" 
      placeholder="输入消息..." 
      @keypress.enter.prevent="sendMessage"
    />
    <button type="button" @click="toggleEmojiPicker">😊</button>
    <button type="submit" :disabled="!newMessage.trim()">发送</button>
    <EmojiPicker v-if="showEmojiPicker" @onEmojiSelect="addEmoji" />
  </form>
</template>

<script setup>
import { ref } from 'vue';
import EmojiPicker from './EmojiPicker.vue';

const emit = defineEmits(['sendMessage']);

const newMessage = ref('');
const showEmojiPicker = ref(false);

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
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
</script>

<style scoped>
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
</style>
