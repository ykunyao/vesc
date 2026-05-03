<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
// 空的 setup，因为这里只需要路由视图
</script>

<style>
/* CSS 变量定义 */
:root {
  --brand_pink: #ff6699;
  --brand_blue: #409eff;
  --text2: #666666;
  --el-color-primary: var(--brand_pink);
}

/* 重置默认样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
               "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
}

#app {
  height: 100%;
  width: 100%;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 全局输入框样式 */
input {
  font-family: inherit;
}

/* 移除按钮默认样式 */
button {
  font-family: inherit;
  cursor: pointer;
}

/* 移除链接默认样式 */
a {
  color: inherit;
  text-decoration: none;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Element Plus 样式覆盖 */
.el-message {
  --el-message-min-width: 300px;
  --el-message-padding: 12px 24px;
  --el-message-bg-color: #fff;
  --el-message-border-color: #e4e4e4;
  --el-message-padding-left: 24px;
  --el-message-close-size: 16px;
}

.el-message--success {
  --el-message-text-color: var(--brand_pink);
  --el-message-border-color: var(--brand_pink);
}

.el-message--error {
  --el-message-text-color: #f56c6c;
  --el-message-border-color: #f56c6c;
}

/* 加载动画 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--brand_pink);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 弹窗样式 */
.el-dialog {
  --el-dialog-border-radius: 8px;
  --el-dialog-padding-primary: 24px;
  --el-dialog-margin-top: 15vh;
}

.el-dialog__header {
  margin: 0;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.el-dialog__body {
  padding: 24px;
}

.el-dialog__footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

/* 表单样式 */
.el-form-item {
  margin-bottom: 24px;
}

.el-form-item__label {
  font-weight: normal;
  color: #333;
}

.el-input__inner {
  height: 40px;
  line-height: 40px;
}

.el-button {
  height: 40px;
  padding: 0 20px;
  font-size: 14px;
  border-radius: 4px;
}

.el-button--primary {
  background-color: var(--brand_pink);
  border-color: var(--brand_pink);
}

.el-button--primary:hover,
.el-button--primary:focus {
  background-color: #ff80aa;
  border-color: #ff80aa;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .el-message {
    --el-message-min-width: 90%;
    --el-message-margin-top: 20px;
  }

  .el-dialog {
    --el-dialog-margin-top: 10vh;
    width: 90% !important;
  }
}
</style>