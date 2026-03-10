# iMessage Scheduler

A message scheduling system that queues and sends iMessages at configurable intervals via macOS Messages.app.

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

**Frontend** — React + TypeScript + Tailwind. Scheduling form, message list with live status updates, and an optional dashboard for stats and configuration.

**Backend** — Express + TypeScript + Drizzle ORM + SQLite. Stores scheduled messages, exposes a REST API, and runs a FIFO queue worker that sends one message per tick to the gateway.

**Gateway** — Lightweight Express server that bridges HTTP to macOS iMessage. Receives send requests from the backend and executes AppleScript commands through `osascript` to deliver messages via Messages.app.

## Prerequisites

- **macOS** with Messages.app signed in to iMessage
- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)

## Setup

```bash
# Clone and install
git clone <repo-url>
cd imessage-scheduler
pnpm install

# Configure (optional — defaults work out of the box)
cp .env.example .env
```

## Running locally

Start all three services with one command:

```bash
pnpm dev
```

This runs the gateway (:3002), backend (:3001), and frontend (:5173) concurrently.

Open **http://localhost:5173** in your browser.

To run services individually:

```bash
pnpm dev:gateway   # iMessage bridge on :3002
pnpm dev:backend   # API + queue worker on :3001
pnpm dev:frontend  # React app on :5173
```

## How it works

1. **Schedule** — Enter a phone number and message in the UI. The backend stores it in SQLite with status `QUEUED`.

2. **Queue processing** — A FIFO worker picks the oldest queued message at a configurable interval (default: 1 hour). The interval and batch size are adjustable via the dashboard or the API.

3. **Delivery** — The worker sends the message to the gateway, which executes an AppleScript command to send it through Messages.app. The message status transitions: `QUEUED` → `ACCEPTED` → `SENT` (or `FAILED`).

4. **Monitoring** — The dashboard tab shows message counts by status and lets you adjust the send interval in real time.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/messages` | Schedule a message `{ phoneNumber, content }` |
| `GET` | `/api/messages` | List messages (optional `?status=QUEUED&limit=50`) |
| `GET` | `/api/messages/:id` | Get a single message |
| `DELETE` | `/api/messages/:id` | Cancel a queued message |
| `GET` | `/api/stats` | Message counts by status |
| `GET` | `/api/config` | Current queue configuration |
| `PUT` | `/api/config` | Update send interval / batch size |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_PORT` | `3001` | Backend API port |
| `GATEWAY_PORT` | `3002` | Gateway service port |
| `GATEWAY_URL` | `http://localhost:3002` | Gateway address (from backend) |
| `SEND_INTERVAL_MS` | `3600000` | Queue send interval in ms (1 hour) |
| `MESSAGES_PER_TICK` | `1` | Messages sent per interval |
| `DATABASE_URL` | `./data/messages.db` | SQLite database path |

## Project structure

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
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

## Design decisions

- **SQLite over Redis/Postgres** — Zero external dependencies. The queue is backed by a single file, WAL mode enabled for concurrent reads. Appropriate for the throughput (messages per hour, not per second).

- **Atomic FIFO pick** — The queue worker wraps SELECT + UPDATE in a SQLite transaction to prevent double-sends if the interval fires twice.

- **AppleScript argument passing** — Phone numbers and message content are passed as positional arguments to `osascript`, not interpolated into the script string. This prevents injection.

- **Separate gateway service** — The iMessage bridge runs as its own process so it can be swapped for a different delivery mechanism (SMS API, WhatsApp, etc.) without changing the backend.

- **Polling over WebSockets** — The frontend polls every 5 seconds. For a scheduler sending messages hourly, real-time push adds complexity without meaningful UX benefit.

## Notes

- The gateway requires macOS with Messages.app signed in. It will log a warning on startup if Messages.app is not detected but will not crash.
- Messages are sent from whatever Apple ID is signed into Messages.app on the machine running the gateway.
- The send interval is configurable at runtime via the dashboard or `PUT /api/config`. Changes take effect immediately (the worker restarts with the new interval).
