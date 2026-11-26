# Helpdesk: Support Ticket Management System

A mini helpdesk where **users** raise support tickets and **admins** manage and resolve them. Built with Node.js, Express, MongoDB and React, with JWT authentication, role-based access control and an **event-driven workflow** that writes an activity log and sends notifications.

> **Live demo:** `<add your deployed frontend URL>` · **API:** `<add your deployed API URL>/api/health`
> Demo admin: `admin@helpdesk.com` / `Admin@123` · Demo user: `user@helpdesk.com` / `User@1234` (after `npm run seed -- --demo`)

---

## Features

**Users**
- Register and log in (JWT)
- Create, view, edit and delete their own tickets. Edit and delete are allowed only while the ticket is `open`.
- Track status through a timeline, and comment on their tickets
- In-app notifications when support replies or changes the status

**Admins**
- View all tickets, filter by status, priority, category and user, search, sort, paginate
- Change status (with validated transitions) and priority
- Reply to any ticket, delete any ticket
- Dashboard statistics and a global activity log (audit trail)

**Events → actions**

| Event | Activity log | In-app notification | Email |
|---|---|---|---|
| `ticket.created` | ✓ | all admins | |
| `ticket.updated` | ✓ | owner (if an admin made the change) | |
| `ticket.status_changed` | ✓ | owner | owner |
| `ticket.resolved` | ✓ | owner | owner |
| `comment.added` | ✓ | owner (admin replied) or admins (user commented) | |
| `ticket.deleted` | ✓ | | |

**Bonus features implemented:** search, pagination, sorting, filtering, dashboard statistics, email notifications (SMTP, or console output in development), automated tests (unit and integration), a React frontend, Docker, and a Postman collection.

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js 18+, Express 4, JavaScript |
| Database | MongoDB 7 with Mongoose 8 |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` |
| Validation | `zod` |
| Security | `helmet`, `cors` allow-list, `express-rate-limit`, 100 kb body limit |
| Email | `nodemailer` |
| Frontend | React 18, Vite, React Router, Axios |
| Tests | Jest, Supertest, mongodb-memory-server |
| DevOps | Docker, docker-compose, nginx |

---

## Project structure

```
helpdesk/
├── backend/
│   ├── src/
│   │   ├── config/         env, db connection, constants (roles, statuses, transitions)
│   │   ├── models/         User, Ticket, Comment, ActivityLog, Notification
│   │   ├── validators/     zod schemas per resource
│   │   ├── middleware/     authenticate, authorize(role), validate, error handler
│   │   ├── services/       business logic (ticket, comment, auth, notification, admin, mail)
│   │   ├── controllers/    thin HTTP layer: req → service → JSON
│   │   ├── routes/         REST routes
│   │   ├── events/         eventBus, event types, handlers (activity log, notification, email)
│   │   ├── utils/          ApiError, asyncHandler, pagination, logger
│   │   ├── scripts/seed.js admin + demo data
│   │   ├── app.js          Express app factory (used by server and tests)
│   │   └── server.js       starts the server, graceful shutdown
│   └── tests/              unit/ (no DB) and integration/ (in-memory MongoDB)
├── frontend/               React app (Vite)
├── docs/                   API.md, DATABASE.md, Postman collection
└── docker-compose.yml
```

---

## Setup

### Prerequisites
- Node.js 18 or later
- MongoDB: a local install, Docker, or a free MongoDB Atlas cluster

### 1. Backend
```bash
cd backend
cp .env.example .env          # set MONGO_URI and JWT_SECRET
npm install
npm run seed                  # creates the admin from ADMIN_* env vars
npm run seed -- --demo        # (optional) adds a demo user and sample tickets
npm run dev                   # http://localhost:5000/api/health
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :5000)
```

### 3. Or run everything with Docker
```bash
docker compose up --build
# Frontend: http://localhost:8080   API: http://localhost:5000/api
# The admin account is seeded automatically on start-up.
```

### Environment variables (backend)

| Variable | Description | Default |
|---|---|---|
| `PORT` | API port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/helpdesk` |
| `JWT_SECRET` | Secret used to sign tokens. **Required in production.** | — |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins | `http://localhost:5173` |
| `ADMIN_NAME/EMAIL/PASSWORD` | Admin account created by the seed script | see `.env.example` |
| `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` | Optional SMTP settings. If empty, emails are logged to the console. | — |

Frontend: `VITE_API_URL`, the full API base URL in production (e.g. `https://your-api.onrender.com/api`).

---

## Tests

```bash
cd backend
npm test                 # all tests
npm run test:unit        # event bus, notification rules, validation, security (no DB needed)
npm run test:integration # full API flows against an in-memory MongoDB
npm run test:coverage
```

Integration tests start a throwaway MongoDB with `mongodb-memory-server`. It downloads the MongoDB binary once on the first run, which needs internet access. The tests cover:
- auth (register, login, role cannot be self-assigned, duplicates, `/me`)
- ticket CRUD and ownership (404 on other users' tickets)
- filters, search, priority sorting and pagination
- edit and delete rules, admin-only status and priority changes, status transition validation
- events firing activity logs and notifications, the resolved flow
- comments (closed-ticket rule), notifications (read, read-all, ownership), admin endpoint protection, stats

---

## Deployment (free tier)

1. **Database:** create a free MongoDB Atlas cluster. Allow access from `0.0.0.0/0` (or your host's IPs) and copy the connection string.
2. **API on Render (or Railway):** create a new Web Service from the repo.
   - Root directory: `backend` · Build command: `npm install` · Start command: `npm start`
   - Environment variables: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (a long random string), `CORS_ORIGIN=https://<your-frontend>.vercel.app`, and the `ADMIN_*` values
   - Seed the admin once: run `npm run seed` locally with `MONGO_URI` pointing at Atlas, or use the Render shell.
3. **Frontend on Vercel (or Netlify):** import the repo.
   - Root directory: `frontend` · Framework: Vite
   - Environment variable: `VITE_API_URL=https://<your-api>.onrender.com/api`
   - `vercel.json` already rewrites all routes to `index.html` so client-side routing works.
4. Put both URLs at the top of this README.

---

## Implementation decisions

**Layered architecture.** The request flows routes → validate middleware → controller → service → model. Controllers only translate HTTP to and from service calls. All business rules (ownership, the edit-while-open rule, status transitions) live in services, so they're easy to test and can be reused outside HTTP.

**Event-driven workflow.** Services publish domain events to an in-process `EventBus` after a successful write. Handlers subscribe by event type:
- `activityLog`: subscribes to `*` (every event) and writes the audit trail
- `notification`: decides who gets notified for each event and never notifies the person who performed the action
- `email`: emails the ticket owner about status changes and resolution

Handlers run asynchronously, so a slow email never delays the API response. Each one is isolated: if a handler fails, the error is logged and neither the request nor the other handlers are affected. That's why the bus is a custom class rather than a raw `EventEmitter`, where a throwing listener would break the publish call. `drain()` waits for pending handlers during tests and graceful shutdown. Because services depend only on `eventBus.publish()`, the bus can later be replaced by Redis, RabbitMQ or SQS without changing business code.

**Authentication and authorization.**
- Stateless JWT (`sub` = user id) sent as a Bearer token. The user is reloaded on every request, so a deleted user or a role change takes effect immediately.
- `authorize('admin')` protects admin routes, and ownership checks happen in the service layer.
- Public registration always creates a `user`. Admins are created by the seed script, so nobody can register as an admin.
- Users get **404 instead of 403** for other people's tickets, so they can't tell whether a ticket id exists.
- Login returns the same error for an unknown email and a wrong password (no user enumeration), and auth endpoints are rate-limited.

**Ticket rules.**
- Users can edit or delete a ticket only while it's `open`. Once support starts working on it, the original report stays as it was.
- Status changes follow a transition table. `closed` is final, and `resolved` can be reopened to `in_progress`.
- Commenting on a `closed` ticket is blocked.

**Validation and errors.** zod schemas validate params, query and body. Parsed output replaces the raw input, which strips unknown fields (protecting against mass assignment) and rejects operator objects (protecting against NoSQL injection). A central error handler maps known errors to status codes: zod → 400, CastError → 400, duplicate key → 409, bad JSON → 400, JWT errors → 401. All errors share one JSON shape.

**Database.** See [docs/DATABASE.md](docs/DATABASE.md) for the schema, indexes, why comments are a separate collection, and the derived `priorityRank` field used for correct priority sorting.

## Challenges and how they were solved
- **Sorting by priority:** alphabetical order (high < low < medium < urgent) is wrong, so a numeric `priorityRank` is kept in sync in a pre-save hook.
- **Testing asynchronous event handlers:** the bus tracks in-flight handler promises, and tests call `eventBus.drain()` before checking logs and notifications.
- **Duplicate notifications on resolve:** a resolve emits both `status_changed` and `resolved`. The notification rules skip the generic status message for `resolved`, so the owner gets one clear notification.

## Possible improvements
- Refresh tokens stored in an httpOnly cookie
- File attachments on tickets (S3)
- Real-time notifications via WebSockets or Server-Sent Events
- Ticket assignment to specific agents, and SLA timers
- A message broker for the event bus, with retries and a dead-letter queue

## Documentation
- API reference: [docs/API.md](docs/API.md)
- Postman collection: [docs/Helpdesk.postman_collection.json](docs/Helpdesk.postman_collection.json)
- Database design: [docs/DATABASE.md](docs/DATABASE.md)
