<template>
  <div class="emoji-picker">
    <span v-for="emoji in emojis" :key="emoji" @click="selectEmoji(emoji)">
      {{ emoji }}
    </span>
  </div>
</template>

<script setup>
const emojis = ['😊', '😂', '❤️', '😢', '😎', '😍', '😡', '👍', '👋', '✨', '🎉', '💔', '🤔', '😜', '🤗', '😇', '🥹', '😅'];

const emit = defineEmits(['onEmojiSelect']);

const selectEmoji = (emoji) => {
  emit('onEmojiSelect', emoji);
};
</script>

<style scoped>
.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
</style>
