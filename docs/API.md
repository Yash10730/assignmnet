# API Documentation

Base URL: `http://localhost:5000/api` (or your deployed URL + `/api`)

A ready-to-import Postman collection is in [`Helpdesk.postman_collection.json`](./Helpdesk.postman_collection.json). Its login requests save the tokens into collection variables automatically.

## Conventions

**Authentication:** send `Authorization: Bearer <token>` on every endpoint except register, login and health.

**Success response**
```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```
`meta` appears only on paginated lists.

**Error response**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [{ "location": "body", "field": "title", "message": "Title must be at least 5 characters" }]
  }
}
```

| Status | Meaning |
|---|---|
| 200 / 201 / 204 | OK / Created / Deleted (no body) |
| 400 | Validation failed, malformed JSON or malformed id |
| 401 | Missing, invalid or expired token, or wrong credentials |
| 403 | Authenticated but role not allowed (e.g. a user calling an admin endpoint) |
| 404 | Not found. Also returned for another user's ticket, so ticket ids can't be probed. |
| 409 | Business rule conflict (duplicate email, invalid status transition, editing a non-open ticket, commenting on a closed ticket) |
| 429 | Too many login/register attempts (20 per 15 minutes per IP) |
| 500 | Unexpected server error (message hidden in production) |

**Enums**
- `status`: `open`, `in_progress`, `resolved`, `closed`
- `priority`: `low`, `medium`, `high`, `urgent`
- `category`: `technical`, `billing`, `account`, `feature_request`, `general`

---

## Auth

### POST `/auth/register`
Creates a **user** account. Any `role` field sent is ignored, so admins can't be self-registered.
```json
{ "name": "Asha Rao", "email": "asha@example.com", "password": "Password1" }
```
Password rules: 8–72 characters, with at least one letter and one number.
→ `201` `{ user, token }` · `409` email already exists

### POST `/auth/login`
```json
{ "email": "asha@example.com", "password": "Password1" }
```
→ `200` `{ user, token }` · `401` "Invalid email or password" (same message for an unknown email, to prevent user enumeration)

### GET `/auth/me`
→ `200` the current user's profile.

---

## Tickets

| Method | Endpoint | Who | Description |
|---|---|---|---|
| POST | `/tickets` | user, admin | Create a ticket |
| GET | `/tickets` | user (own) / admin (all) | List with filters, search, sort and pagination |
| GET | `/tickets/stats` | user (own) / admin (all) | Dashboard statistics |
| GET | `/tickets/:id` | owner, admin | Ticket details |
| PATCH | `/tickets/:id` | owner, only while `open` | Edit title, description, category or priority |
| DELETE | `/tickets/:id` | owner while `open`, admin always | Delete (comments and notifications are deleted with it) |
| PATCH | `/tickets/:id/status` | admin | Change status (transitions are validated) |
| PATCH | `/tickets/:id/priority` | admin | Change priority |
| GET | `/tickets/:id/activity` | owner, admin | Activity timeline for the ticket |

### POST `/tickets`
```json
{
  "title": "Unable to download invoice",
  "description": "Clicking Download shows a 500 error page.",
  "category": "billing",
  "priority": "high"
}
```
`category` defaults to `general` and `priority` defaults to `medium`. The status always starts as `open`.
→ `201` ticket · fires `ticket.created`

### GET `/tickets`
Query parameters (all optional):

| Param | Example | Notes |
|---|---|---|
| `status` | `open` | |
| `priority` | `high` | |
| `category` | `billing` | |
| `createdBy` | `<userId>` | Admins only. Ignored for users, who always see only their own tickets. |
| `search` | `invoice` | Case-insensitive match on title or description. Input is regex-escaped. |
| `sortBy` | `createdAt` \| `updatedAt` \| `priority` \| `status` \| `title` | Default `createdAt` |
| `order` | `asc` \| `desc` | Default `desc` |
| `page`, `limit` | `1`, `10` | `limit` is capped at 100 |

Example: `GET /tickets?status=open&priority=high&search=vpn&sortBy=priority&order=desc&page=1&limit=10`

### PATCH `/tickets/:id/status` (admin)
```json
{ "status": "resolved" }
```
Allowed transitions:

| From | To |
|---|---|
| open | in_progress, resolved, closed |
| in_progress | open, resolved, closed |
| resolved | in_progress (reopen), closed |
| closed | — (final) |

→ `200` · `409` invalid transition · fires `ticket.status_changed`, plus `ticket.resolved` when the new status is `resolved`

### PATCH `/tickets/:id/priority` (admin)
```json
{ "priority": "urgent" }
```
→ `200` · fires `ticket.updated`

### GET `/tickets/stats`
```json
{
  "total": 12,
  "byStatus": { "open": 5, "in_progress": 3, "resolved": 4 },
  "byPriority": { "low": 2, "medium": 5, "high": 3, "urgent": 2 },
  "byCategory": { "billing": 4, "technical": 8 },
  "avgResolutionHours": 6.5,
  "recent": [ "...5 latest tickets" ]
}
```

---

## Comments

| Method | Endpoint | Who |
|---|---|---|
| GET | `/tickets/:id/comments` | owner, admin |
| POST | `/tickets/:id/comments` | owner, admin (any ticket) |

```json
{ "message": "Any update on this?" }
```
→ `201` comment `{ id, ticket, author: { name, role }, authorRole, message, createdAt }` · `409` if the ticket is closed · fires `comment.added`

---

## Notifications (current user)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications?unread=true&page=1&limit=20` | List. `meta.unread` holds the unread count. |
| GET | `/notifications/unread-count` | `{ count }` |
| PATCH | `/notifications/:id/read` | Mark one as read. Returns 404 if it belongs to someone else. |
| PATCH | `/notifications/read-all` | `{ updated }` |

## Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/activity?event=ticket.resolved&page=1` | Global activity log (audit trail) |
| GET | `/admin/users` | Users with their `ticketCount`, used for the "filter by user" option |

## Health
`GET /health` → `{ status: "ok", db: "connected", uptime }`
