# Vesc

Vesc is a full-stack real-time chat application built with Vue 3, Express, Socket.IO, MySQL, and JWT authentication.

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

Install dependencies in both apps:

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

Update `server/.env` with your local MySQL password and a private `JWT_SECRET`.

Initialize the database:

```powershell
cd server
mysql -u root -p < db.sql
```

If your database already existed before the indexes were added, run the migration:

```powershell
mysql -u root -p < migrations/001_add_message_indexes.sql
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

## Git Safety

Real `.env` files are ignored by Git. Commit the `.env.example` files, but never commit local secrets such as database passwords or JWT secrets.
