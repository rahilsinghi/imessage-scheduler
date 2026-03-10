# iMessage Scheduler

Schedule and send iMessages from your Mac at configurable intervals. Built as a monorepo with three services: a React frontend, an Express backend with a FIFO message queue, and a macOS iMessage gateway.

## Quick Start

```bash
git clone https://github.com/rahilsinghi/imessage-scheduler.git
cd imessage-scheduler
./start.sh
```

That's it. The script checks prerequisites, installs dependencies, and opens the app at **http://localhost:5173**.

> **Requirements:** macOS with Messages.app signed in, Node.js 20+

## Features

- **Schedule messages** for a specific date and time, or send immediately
- **FIFO queue** with configurable send interval (default: 1 message per hour)
- **Live status tracking** — watch messages progress through QUEUED → SENT → DELIVERED
- **iMessage delivery** via macOS Messages.app (AppleScript bridge)
- **Dashboard** with message stats and queue configuration
- **Real-time updates** — UI polls every 5 seconds for status changes

## Architecture

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Frontend   │──────▶│   Backend   │──────▶│   Gateway   │
│  React/Vite  │ REST  │Express/SQLite│ HTTP  │  AppleScript │
│   :5173      │◀──────│   :3001     │◀──────│   :3002      │
└─────────────┘       └──────┬──────┘       └──────┬──────┘
                             │                      │
                        ┌────┴────┐           ┌─────┴─────┐
                        │ SQLite  │           │ Messages  │
                        │  (FIFO  │           │   .app    │
                        │  queue) │           │  (macOS)  │
                        └─────────┘           └───────────┘
```

**Frontend** (`packages/frontend/`) — React 19, TypeScript, Vite, Tailwind CSS v4. Scheduling form with datetime picker, message list grouped by status, and a configuration dashboard.

**Backend** (`packages/backend/`) — Express, TypeScript, Drizzle ORM, SQLite. REST API, FIFO queue worker that respects scheduled times, configurable send interval.

**Gateway** (`packages/gateway/`) — Express, TypeScript, AppleScript. Receives HTTP requests from the backend and sends iMessages through macOS Messages.app via `osascript`.

## How It Works

1. **Schedule** — Enter a phone number, message, and optional send time. Stored in SQLite as `QUEUED`.
2. **Queue** — A FIFO worker picks the oldest queued message at a configurable interval (default: 1 hour). The interval and batch size are adjustable via the dashboard or the API. Messages scheduled for the future wait until their time arrives.
3. **Send** — The worker forwards the message to the gateway, which executes AppleScript to deliver it via Messages.app. Status transitions: `QUEUED` → `ACCEPTED` → `SENT` (or `FAILED`).
4. **Track** — The dashboard shows message counts by status and lets you adjust the send interval in real time.

## Manual Setup

If you prefer not to use the start script:

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Copy environment config (optional — defaults work out of the box)
cp .env.example .env

# Start all services
pnpm dev
```

Or run services individually:

```bash
pnpm dev:gateway   # iMessage bridge on :3002
pnpm dev:backend   # API + queue worker on :3001
pnpm dev:frontend  # React app on :5173
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/messages` | Schedule a message `{ phoneNumber, content, scheduledFor? }` |
| `GET` | `/api/messages` | List messages (filter: `?status=QUEUED&limit=50`) |
| `GET` | `/api/messages/:id` | Get a single message |
| `DELETE` | `/api/messages/:id` | Cancel a queued message |
| `GET` | `/api/stats` | Counts by status |
| `GET` | `/api/config` | Queue configuration |
| `PUT` | `/api/config` | Update send interval and batch size |

## Configuration

All values have sensible defaults. Override via `.env` or the dashboard UI.

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_PORT` | `3001` | Backend API port |
| `GATEWAY_PORT` | `3002` | Gateway service port |
| `GATEWAY_URL` | `http://localhost:3002` | Gateway address (from backend) |
| `SEND_INTERVAL_MS` | `3600000` | Queue send interval in ms (1 hour) |
| `MESSAGES_PER_TICK` | `1` | Messages sent per interval |
| `DATABASE_URL` | `./data/messages.db` | SQLite database path |

## Project Structure

```
imessage-scheduler/
├── packages/
│   ├── frontend/          # React + Vite + Tailwind
│   │   └── src/
│   │       ├── components/  # ScheduleForm, MessageList, Dashboard, ...
│   │       ├── hooks/       # useMessages, useStats (polling)
│   │       └── api/         # Typed fetch client
│   ├── backend/           # Express + Drizzle + SQLite
│   │   └── src/
│   │       ├── db/          # Schema, connection
│   │       ├── routes/      # Message, stats, config endpoints
│   │       ├── services/    # Message service layer
│   │       ├── queue/       # FIFO worker
│   │       └── middleware/  # Error handling
│   └── gateway/           # iMessage bridge
│       └── src/
│           ├── imessage.ts  # AppleScript execution
│           └── index.ts     # HTTP server
├── start.sh               # One-command setup and launch
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

## Design Decisions

- **SQLite over Redis/Postgres** — Zero external dependencies. The queue is backed by a single file, WAL mode enabled for concurrent reads. Appropriate for the throughput (messages per hour, not per second).

- **Atomic FIFO pick** — The queue worker wraps SELECT + UPDATE in a SQLite transaction to prevent double-sends if the interval fires twice.

- **Safe AppleScript** — Phone numbers and message content are passed as positional arguments to `osascript`, not interpolated into the script string. Prevents injection.

- **Separate gateway service** — The iMessage bridge runs as its own process so it can be swapped for a different delivery mechanism (SMS API, WhatsApp, etc.) without changing the backend.

- **Polling over WebSockets** — The frontend polls every 5 seconds. For a scheduler sending messages hourly, real-time push adds complexity without meaningful UX benefit.

## Notes

- The gateway requires macOS with Messages.app signed in. It will log a warning on startup if Messages.app is not detected but will not crash.
- Messages are sent from whatever Apple ID is signed into Messages.app on the machine running the gateway.
- When scheduling, messages wait in the queue until their scheduled time arrives.
- The send interval is adjustable at runtime via the dashboard or `PUT /api/config`. Changes take effect immediately (the worker restarts with the new interval).
- First-time macOS will prompt to allow Terminal/iTerm to control Messages.app.
