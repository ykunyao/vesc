<template>
    <div class="login-register">
        <div class="canvas-wrapper">
            <div class="video-wrapper">
                <video
                    src="/video/BadApple.mp4"
                    id="login-video" 
                    ref="loginVideo"
                    muted 
                    autoplay 
                    loop
                ></video>
            </div>
            <canvas id="cvs" width="360" height="360"></canvas>
            <canvas id="cvs2" width="360" height="360" @click="playVideo" loop></canvas>
        </div>
        <div class="login-register-container">
            <el-tabs v-model="activeTab" stretch class="login-tabs" @tab-click="handleClick">
                <el-tab-pane label="登录" name="login" lazy>
                    <div class="login-box">
                        <el-input 
                            v-model="loginForm.email" 
                            class="input" 
                            placeholder="请输入邮箱"
                            @keyup.enter="submitLogin"
                        >
                            <template #prefix>
                                <el-icon><Message /></el-icon>
                            </template>
                        </el-input>
                        <el-input 
                            v-model="loginForm.password" 
                            class="input" 
                            type="password" 
                            show-password 
                            placeholder="请输入密码"
                            @keyup.enter="submitLogin"
                        >
                            <template #prefix>
                                <el-icon><Lock /></el-icon>
                            </template>
                        </el-input>
                        <div class="submit" @click="submitLogin" :class="{ 'loading': loading }">
                            {{ loading ? '登录中...' : '登 录' }}
                        </div>
                        <div class="tips">
                            登录即代表你同意我们的
                            <span class="agreement" @click="showAgreement">用户协议</span>
                        </div>
                    </div>
                </el-tab-pane>
                <el-tab-pane label="注册" name="register" lazy>
                    <div class="register-box">
                        <el-input 
                            v-model="registerForm.username" 
                            class="input" 
                            placeholder="请输入用户名" 
                            maxlength="50"
                        >
                            <template #prefix>
                                <el-icon><User /></el-icon>
                            </template>
                        </el-input>
                        <el-input 
                            v-model="registerForm.email" 
                            class="input" 
                            placeholder="请输入邮箱"
                        >
                            <template #prefix>
                                <el-icon><Message /></el-icon>
                            </template>
                        </el-input>
                        <el-input 
                            v-model="registerForm.password" 
                            class="input" 
                            type="password" 
                            show-password 
                            placeholder="请输入密码"
                        >
                            <template #prefix>
                                <el-icon><Lock /></el-icon>
                            </template>
                        </el-input>
                        <el-input 
                            v-model="registerForm.confirmedPassword" 
                            class="input" 
                            type="password" 
                            show-password 
                            placeholder="再次确认密码"
                        >
                            <template #prefix>
                                <el-icon><Lock /></el-icon>
                            </template>
                        </el-input>
                        <div class="submit" @click="submitRegister" :class="{ 'loading': loading }">
                            {{ loading ? '注册中...' : '注 册' }}
                        </div>
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>

        <!-- 用户协议对话框 -->
        <el-dialog
            v-model="dialogVisible"
            title="用户协议"
            width="50%"
            :close-on-click-modal="false"
        >
            <div class="agreement-content">
                <h3>欢迎使用我们的服务</h3>
                <p>请仔细阅读以下条款，使用我们的服务即表示您同意这些条款。</p>
                <!-- 这里添加更多协议内容 -->
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">关闭</el-button>
                    <el-button type="primary" @click="acceptAgreement">
                        同意
                    </el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { Message, Lock, User } from '@element-plus/icons-vue';
import { login, register } from '../api/auth';
import { setAuth } from '../utils/auth';

const router = useRouter();
const loginVideo = ref(null);
const activeTab = ref('login');
const loading = ref(false);
const dialogVisible = ref(false);

const loginForm = ref({
    email: '',
    password: ''
});

const registerForm = ref({
    username: '',
    email: '',
    password: '',
    confirmedPassword: ''
});

// canvas 动画
const init = () => {
    const ctx = document.getElementById("cvs").getContext("2d");
    const ctx2 = document.getElementById("cvs2").getContext("2d");

    loginVideo.value.crossOrigin = "anonymous";

    const playVideo = () => {
        requestAnimationFrame(playVideo);
        const { width, height } = ctx.canvas;
        ctx.drawImage(loginVideo.value, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;
        ctx2.clearRect(0, 0, width, height);
        const bl = 12;
        const maxX = Math.ceil(width / bl);
        const maxY = Math.ceil(height / bl);
        ctx.font = "5px serif";
        for (let x = 0; x < maxX; x++) {
            for (let y = 0; y < maxY; y++) {
                const i = (y * bl * width + x * bl) * 4;
                const g = parseInt((data[i] + data[i + 1] + data[i + 2]) / 1.5);
                ctx2.fillStyle = `rgba(${g}, ${g}, ${g}, ${data[i + 3]})`;
                ctx2.fillText("0", x * bl, y * bl);
            }
        }
    };
    playVideo();
};

const playVideo = () => {
    if (loginVideo.value) {
        loginVideo.value.play();
    } else {
        console.error('无法播放视频，loginVideo.value 为 null');
    }
};

const handleClick = (tab) => {
    activeTab.value = tab.props.name;
};

const showAgreement = () => {
    dialogVisible.value = true;
};

const acceptAgreement = () => {
    dialogVisible.value = false;
    submitLogin();
};

const submitLogin = async () => {
    if (loading.value) return;

    if (!loginForm.value.email.trim()) {
        ElMessage.error("请输入邮箱");
        return;
    }
    if (!loginForm.value.password) {
        ElMessage.error("请输入密码");
        return;
    }

    try {
        loading.value = true;
        const response = await login({
            email: loginForm.value.email,
            password: loginForm.value.password
        });

        setAuth(response.data);
        ElMessage.success('登录成功');
        router.push('/chat');
    } catch (error) {
        ElMessage.error(error.message || '登录失败');
    } finally {
        loading.value = false;
    }
};

const submitRegister = async () => {
    if (loading.value) return;

    if (!registerForm.value.username.trim()) {
        ElMessage.error("用户名不能为空");
        return;
    }
    if (!registerForm.value.email.trim()) {
        ElMessage.error("邮箱不能为空");
        return;
    }
    if (!registerForm.value.password || !registerForm.value.confirmedPassword) {
        ElMessage.error("密码不能为空");
        return;
    }
    if (registerForm.value.password !== registerForm.value.confirmedPassword) {
        ElMessage.error("两次输入的密码不一致");
        return;
    }

    try {
        loading.value = true;
        await register({
            username: registerForm.value.username,
            email: registerForm.value.email,
            password: registerForm.value.password
        });

        ElMessage.success('注册成功');
        registerForm.value = {
            username: '',
            email: '',
            password: '',
            confirmedPassword: ''
        };
        activeTab.value = 'login';
    } catch (error) {
        ElMessage.error(error.message || '注册失败');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loginVideo.value = document.getElementById('login-video');
    if (loginVideo.value) {
        init();
    } else {
        console.error('视频元素未找到');
    }
});
</script>

<!-- <style scoped>
.login-register {
    position: relative;
    display: flex;
    width: 100%;
    height: 100vh;
    justify-content: center;
    align-items: center;
    background-color: #f5f5f5;
}

.canvas-wrapper {
    position: relative;
    width: 360px;
    height: 360px;
    margin-right: 20px;
}

.video-wrapper {
    visibility: hidden;
    position: absolute;
    width: 360px;
    height: 360px;
}

.video-wrapper video {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
}

#cvs {
    visibility: hidden;
    position: absolute;
}

#cvs2 {
    position: absolute;
    top: 4px;
    left: 5px;
    cursor: pointer;
}

.login-register-container {
    background: white;
    width: 360px;
    height: 360px;
    padding: 30px 40px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.login-tabs {
    width: 80%;
    margin: 0 auto;
}

.login-box,
.register-box {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.login-box .input,
.login-box .submit,
.login-box .tips {
    margin-top: 30px;
    width: 100%;
}

.register-box .input,
.register-box .submit {
    margin-top: 20px;
    width: 100%;
}

.submit {
    color: #fff;
    border-radius: 4px;
    background-color: var(--brand_pink);
    text-align: center;
    padding: 10px 15px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.submit:hover {
    background-color: #f992af;
}

.submit.loading {
    background-color: #ffb3c7;
    cursor: not-allowed;
}

.tips {
    color: var(--text2);
    font-size: 12px;
    text-align: center;
}

.agreement {
    color: var(--brand_blue);
    margin-left: 4px;
    cursor: pointer;
}

.agreement:hover {
    text-decoration: underline;
}

/* Element Plus 样式覆盖 */
:deep(.el-input__wrapper) {
    border-radius: 4px;
}

:deep(.el-input__inner) {
    height: 40px;
}

:deep(.el-tabs__nav) {
    width: 100%;
}

:deep(.el-tabs__item) {
    font-size: 16px;
    color: #666;
}

:deep(.el-tabs__item.is-active) {
    color: var(--brand_pink);
}

:deep(.el-tabs__active-bar) {
    background-color: var(--brand_pink);
}

/* 响应式布局 */
@media (max-width: 768px) {
    .login-register {
        flex-direction: column;
        padding: 20px;
    }

    .canvas-wrapper {
        margin-right: 0;
        margin-bottom: 20px;
    }

    .login-register-container {
        width: 100%;
        max-width: 360px;
    }
}
</style> -->

<style scoped>
.login-register {
    position: relative;
    display: flex;
    width: 100%;
    height: 100vh;
    justify-content: center;
    align-items: center;
    background-color: #f5f5f5;
}

.canvas-wrapper {
    position: relative;
    width: 360px;
    height: 360px;
    margin-right: 20px;
}

.video-wrapper {
    visibility: hidden;
    position: absolute;
    width: 360px;
    height: 360px;
}

.video-wrapper video {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
}

#cvs {
    visibility: hidden;
    position: absolute;
}

#cvs2 {
    position: absolute;
    top: 4px;
    left: 5px;
    cursor: pointer;
}

.login-register-container {
    background: white;
    width: 360px;
    height: auto;
    min-height: 360px;
    padding: 20px 40px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.login-tabs {
    width: 80%;
    margin: 0 auto;
}

.login-box,
.register-box {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.login-box .input,
.login-box .submit,
.login-box .tips {
    margin-top: 20px;
    width: 100%;
}

.register-box .input,
.register-box .submit {
    margin-top: 15px;
    width: 100%;
}

.submit {
    color: #fff;
    border-radius: 4px;
    background-color: var(--brand_pink);
    text-align: center;
    padding: 8px 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 15px;
}

.submit:hover {
    background-color: #f992af;
}

.submit.loading {
    background-color: #ffb3c7;
    cursor: not-allowed;
}

.tips {
    color: var(--text2);
    font-size: 12px;
    text-align: center;
    margin-top: 12px;
}

.agreement {
    color: var(--brand_blue);
    margin-left: 4px;
    cursor: pointer;
}

.agreement:hover {
    text-decoration: underline;
}

/* Element Plus 样式覆盖 */
:deep(.el-tabs__header) {
    margin-bottom: 15px;
}

:deep(.el-input__wrapper) {
    border-radius: 4px;
    padding: 1px 11px;
}

:deep(.el-input__inner) {
    height: 36px;
}

:deep(.el-tabs__nav) {
    width: 100%;
}

:deep(.el-tabs__item) {
    font-size: 16px;
    color: #666;
}

:deep(.el-tabs__item.is-active) {
    color: var(--brand_pink);
}

:deep(.el-tabs__active-bar) {
    background-color: var(--brand_pink);
}

/* 对话框样式 */
.agreement-content {
    max-height: 400px;
    overflow-y: auto;
    padding: 0 20px;
}

.agreement-content h3 {
    margin-bottom: 15px;
    color: #333;
}

.agreement-content p {
    margin-bottom: 10px;
    line-height: 1.6;
    color: #666;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

/* 响应式布局 */
@media (max-width: 768px) {
    .login-register {
        flex-direction: column;
        padding: 20px;
    }

    .canvas-wrapper {
        margin-right: 0;
        margin-bottom: 20px;
    }

    .login-register-container {
        width: 100%;
        max-width: 360px;
    }

    .agreement-content {
        max-height: 300px;
    }
}

/* 动画效果 */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.login-box,
.register-box {
    animation: fadeIn 0.3s ease-out;
}

/* 加载中状态的动画 */
@keyframes pulse {
    0% {
        opacity: 1;
    }
    50% {
        opacity: 0.6;
    }
    100% {
        opacity: 1;
    }
}

.submit.loading {
    animation: pulse 1.5s infinite;
}

/* 输入框聚焦效果 */
:deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px var(--brand_pink) inset;
}

/* 错误状态 */
:deep(.el-input__wrapper.is-error) {
    box-shadow: 0 0 0 1px #f56c6c inset;
}

/* 禁用状态 */
:deep(.el-input.is-disabled .el-input__wrapper) {
    background-color: #f5f7fa;
}
</style>
