# Database Design

**Database:** MongoDB, using the Mongoose ODM.

**Why MongoDB:** a ticket and its metadata fit naturally as a document. The event payloads stored in the activity log have a flexible shape (`metadata`), which a document store handles well. Relationships are simple one-to-many links, handled with references and indexes.

## Entity relationship

```
┌──────────┐ 1      * ┌───────────┐ 1      * ┌───────────┐
│   User   │──────────│  Ticket   │──────────│  Comment  │
└──────────┘ createdBy└───────────┘  ticket  └───────────┘
     │ 1                    │ 1                    │ *
     │                      │                      │ author ──► User
     │ *                    │ *
┌──────────────┐     ┌──────────────┐
│ Notification │     │ ActivityLog  │  actor ──► User
│ recipient ►U │     │ ticket ► T   │
└──────────────┘     └──────────────┘
```

## Collections

### users
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| name | String | required, ≤ 80 characters |
| email | String | required, **unique index**, stored in lowercase |
| password | String | bcrypt hash (10 rounds), `select: false` so it is never returned by queries |
| role | String | `user` \| `admin`, indexed. Defaults to `user`. |
| createdAt / updatedAt | Date | timestamps |

### tickets
| Field | Type | Notes |
|---|---|---|
| title | String | 5–150 characters |
| description | String | 10–5000 characters |
| category | enum | technical, billing, account, feature_request, general |
| priority | enum | low, medium, high, urgent |
| priorityRank | Number | Derived from priority (1–4) in a pre-save hook, so sorting by priority is correct (alphabetical order would put "high" before "low") |
| status | enum | open, in_progress, resolved, closed |
| createdBy | ObjectId → users | owner of the ticket |
| commentCount | Number | denormalised counter, incremented with `$inc` so lists don't need a join |
| resolvedAt / closedAt | Date | set automatically on status change, used for the average resolution time |
| createdAt / updatedAt | Date | |

**Indexes**
- `{ status: 1, priority: 1, createdAt: -1 }` for the admin's most common filter and sort
- `{ createdBy: 1, createdAt: -1 }` for "my tickets"
- single-field indexes on `status`, `priority`, `category`

### comments
| Field | Type | Notes |
|---|---|---|
| ticket | ObjectId → tickets | |
| author | ObjectId → users | |
| authorRole | String | snapshot of the author's role when the comment was written (drives the "support" badge) |
| message | String | 1–2000 characters |
| createdAt | Date | |

Index: `{ ticket: 1, createdAt: 1 }`, which returns a ticket's conversation in order straight from the index.

Comments live in their own collection rather than being embedded in the ticket, because:
1. A conversation can grow without limit, and MongoDB documents are capped at 16 MB.
2. Ticket list queries stay small, since they don't load comments.
3. Each comment has its own author and timestamps and is queried on its own.

### activitylogs (audit trail)
| Field | Type | Notes |
|---|---|---|
| event | enum | `ticket.created`, `ticket.updated`, `ticket.deleted`, `ticket.status_changed`, `ticket.resolved`, `comment.added` |
| ticket | ObjectId → tickets | indexed |
| actor | ObjectId → users | who performed the action |
| message | String | human-readable description |
| metadata | Mixed | event-specific data, e.g. `{ from: "open", to: "resolved" }` or `{ changes: { title: { from, to } } }` |
| createdAt | Date | |

Append-only, and written only by the event handler. Logs are kept when a ticket is deleted, so the audit history survives.

### notifications
| Field | Type | Notes |
|---|---|---|
| recipient | ObjectId → users | |
| ticket | ObjectId → tickets | |
| event | enum | the event that caused it |
| message | String | |
| read | Boolean | default `false` |
| createdAt | Date | |

Index: `{ recipient: 1, read: 1, createdAt: -1 }`, which covers both the unread count and the newest-first list.

## Data integrity and protection rules
- **Ownership is enforced in the service layer:** users' queries always include `createdBy = currentUser`. Another user's ticket returns 404, not 403.
- **Cascade on delete:** deleting a ticket removes its comments and notifications. Activity logs are kept for auditing.
- **No mass assignment:** request bodies are parsed by zod schemas that whitelist fields, so `role`, `status`, `createdBy` and similar can't be injected.
- **NoSQL injection:** every input field is validated as a string, enum or ObjectId before it reaches a query, so operator objects like `{ "$gt": "" }` are rejected with 400. Search text is regex-escaped.
- **Passwords:** bcrypt-hashed, excluded from queries and stripped in `toJSON`.

## Scaling notes
- For large datasets, the regex search can be replaced with a MongoDB `$text` index or Atlas Search.
- `commentCount` avoids `$lookup` on every list request.
- Older activity logs can be archived or given a TTL index if retention rules allow.
