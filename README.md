# Vesc

<a id="zh"></a>

**中文** | [English](#en)

Vesc 是一个全栈实时聊天应用，使用 Vue 3、Express、Socket.IO、MySQL 和 JWT 鉴权构建。项目目标是从基础聊天室逐步演进为更完整的 IM 系统，支持登录注册、私信、群聊、群成员管理、未读提醒和自定义头像。

## 功能

- 登录、注册和 JWT 鉴权
- Socket.IO 实时消息
- 默认群聊大厅
- 私信和群聊会话
- 用户搜索和创建群聊
- 群成员查看、邀请、移除和退出群聊
- 会话最后消息、最后消息时间和未读数
- URL 版自定义头像和默认头像占位

## 技术栈

- 前端：Vue 3、Vite、Vue Router、Element Plus、Axios、Socket.IO Client
- 后端：Node.js、Express、Socket.IO、MySQL2、JWT、bcryptjs
- 数据库：MySQL

## 项目结构

```text
vesc/
  client/   # Vue 前端
  server/   # Express 和 Socket.IO 后端
```

## 本地运行

安装依赖：

```powershell
cd client
npm install

cd ..\server
npm install
```

从示例文件创建本地环境变量文件：

```powershell
copy server\.env.example server\.env
copy client\.env.example client\.env
```

修改 `server/.env`，填入你的 MySQL 配置和私有 `JWT_SECRET`。

初始化数据库：

```powershell
cd server
mysql -u root -p < db.sql
```

如果你的数据库已经存在，请按顺序执行迁移：

```powershell
mysql -u root -p < migrations/001_add_message_indexes.sql
mysql -u root -p < migrations/002_add_conversations.sql
mysql -u root -p < migrations/003_add_user_avatar.sql
```

在项目根目录启动后端：

```powershell
npm run dev:server
```

另开一个终端，在项目根目录启动前端：

```powershell
npm run dev:client
```

前端默认地址是 `http://localhost:5173`，后端默认地址是 `http://localhost:3000`。

## 环境变量

后端环境变量位于 `server/.env`：

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=replace-with-your-local-db-password
DB_NAME=chat_app
```

前端环境变量位于 `client/.env`：

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

<a id="en"></a>

[中文](#zh) | **English**

Vesc is a full-stack real-time chat application built with Vue 3, Express, Socket.IO, MySQL, and JWT authentication. The project is evolving from a basic chat room into a richer IM-style system with direct messages, group chats, member management, unread state, and custom avatars.

## Features

- Login, registration, and JWT authentication
- Real-time messaging with Socket.IO
- Default lobby group chat
- Direct and group conversations
- User search and group creation
- Group member list, invitation, removal, and leaving groups
- Last message preview, last message time, and unread badges
- URL-based custom avatars with default avatar placeholders

## Tech Stack

- Frontend: Vue 3, Vite, Vue Router, Element Plus, Axios, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, MySQL2, JWT, bcryptjs
- Database: MySQL

## Project Structure

```text
vesc/
  client/   # Vue frontend
  server/   # Express and Socket.IO backend
```

## Local Setup

Install dependencies:

```powershell
cd client
npm install

cd ..\server
npm install
```

Create local environment files from the examples:

```powershell
copy server\.env.example server\.env
copy client\.env.example client\.env
```

Update `server/.env` with your MySQL configuration and a private `JWT_SECRET`.

Initialize the database:

```powershell
cd server
mysql -u root -p < db.sql
```

If your database already exists, run the migrations in order:

```powershell
mysql -u root -p < migrations/001_add_message_indexes.sql
mysql -u root -p < migrations/002_add_conversations.sql
mysql -u root -p < migrations/003_add_user_avatar.sql
```

From the project root, start the backend:

```powershell
npm run dev:server
```

In another terminal, also from the project root, start the frontend:

```powershell
npm run dev:client
```

The frontend defaults to `http://localhost:5173`, and the backend defaults to `http://localhost:3000`.

## Environment Variables

Backend variables live in `server/.env`:

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=replace-with-your-local-db-password
DB_NAME=chat_app
```

Frontend variables live in `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```
