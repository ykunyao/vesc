<template>
  <div class="emoji-picker" role="dialog" aria-label="选择表情">
    <div class="emoji-tabs">
      <button
        v-for="group in emojiGroups"
        :key="group.name"
        :class="['emoji-tab', { active: activeGroup === group.name }]"
        type="button"
        @click="activeGroup = group.name"
      >
        {{ group.icon }}
      </button>
    </div>

    <div class="emoji-grid">
      <button
        v-for="emoji in currentEmojis"
        :key="emoji"
        class="emoji-item"
        type="button"
        @click="selectEmoji(emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const emojiGroups = [
  {
    name: '常用',
    icon: '😊',
    emojis: ['😀', '😄', '😁', '😂', '🤣', '😊', '😍', '😘', '🥰', '😎', '🤔', '🥹', '😭', '😡', '😴', '🤯']
  },
  {
    name: '手势',
    icon: '👍',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '🤝', '👋', '👌', '✌️', '🤟', '💪', '🫶', '👀', '💅', '🫡', '🤙']
  },
  {
    name: '符号',
    icon: '✨',
    emojis: ['❤️', '💔', '💕', '💯', '✨', '🔥', '🎉', '🌟', '⚡', '✅', '❌', '❗', '❓', '💤', '🎯', '💡']
  },
  {
    name: '生活',
    icon: '🍀',
    emojis: ['🍀', '🌈', '☕', '🍵', '🍰', '🍔', '🍟', '🍕', '🎮', '🎧', '📷', '💻', '📱', '🚀', '🌙', '☀️']
  }
];

const emit = defineEmits(['onEmojiSelect']);
const activeGroup = ref(emojiGroups[0].name);

const currentEmojis = computed(() => {
  return emojiGroups.find((group) => group.name === activeGroup.value)?.emojis || [];
});

const selectEmoji = (emoji) => {
  emit('onEmojiSelect', emoji);
};
</script>

<style scoped>
.emoji-picker {
  width: 316px;
  padding: 12px;
  border: 1px solid #dce5f1;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 48px rgba(40, 54, 82, 0.16);
  backdrop-filter: blur(12px);
}

.emoji-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.emoji-tab,
.emoji-item {
  border: none;
  cursor: pointer;
}

.emoji-tab {
  height: 34px;
  border-radius: 12px;
  background: transparent;
  font-size: 17px;
}

.emoji-tab.active,
.emoji-tab:hover {
  background: #edf3f8;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.emoji-item {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 10px;
  background: transparent;
  font-size: 20px;
  line-height: 32px;
  transition: background-color 0.18s, transform 0.18s;
}

.emoji-item:hover {
  background: #f3f6fa;
  transform: translateY(-1px);
}

@media (max-width: 760px) {
  .emoji-picker {
    width: min(316px, calc(100vw - 32px));
  }
}
</style>
