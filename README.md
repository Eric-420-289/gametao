# Liar Dice Online

A production-style real-time multiplayer room game built with Next.js, Express, Socket.IO, and shared TypeScript packages. It supports instant room creation, join-by-code gameplay, live chat, and a server-authoritative Liar's Dice flow.

## Features
- Mobile-first UI with glassmorphism and dark theme
- Instant room creation and join flow
- Real-time lobby, chat, and game updates via Socket.IO
- Server-authoritative game state for Liar's Dice
- Free-tier-friendly architecture for Render + Supabase

## Project Structure
- apps/frontend: Next.js app router UI
- apps/backend: Express + Socket.IO server
- packages/shared: reusable TypeScript types and gameplay helpers
- database: SQL schema and migration examples
- scripts: deployment helpers

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run locally
```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Health check: http://localhost:4000/health

## Environment Variables
Create .env files as needed:

Backend:
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
```

Frontend:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Deploy to Render
1. Create a new Web Service for the backend.
2. Set the build command to `npm install && npm run build`.
3. Set the start command to `npm run start`.
4. Add environment variables for `PORT`, `FRONTEND_URL`.
5. For the frontend, deploy as a separate Next.js service using `npm install && npm run build` and `npm run start`.

## Database
A Supabase PostgreSQL schema is included in [database/schema.sql](database/schema.sql).

## Notes
This project is intentionally structured so the core room/game flow is real and extensible. It can be expanded with more games, settings, and persistence over time.
