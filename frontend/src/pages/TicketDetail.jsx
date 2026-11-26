import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, PriorityBadge, Spinner, StatusBadge } from '../components/ui';
import { PRIORITIES, STATUS_TRANSITIONS, formatDate, label, timeAgo } from '../utils/format';

export default function TicketDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, c, a] = await Promise.all([
        api.get(`/tickets/${id}`),
        api.get(`/tickets/${id}/comments`),
        api.get(`/tickets/${id}/activity`),
      ]);
      setTicket(t.data.data);
      setComments(c.data.data);
      setActivity(a.data.data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!ticket) return error ? <Alert>{error}</Alert> : <Spinner />;

  const isOwner = ticket.createdBy?.id === user.id;
  const canEdit = isOwner && ticket.status === 'open';
  const canDelete = isAdmin || canEdit;
  const transitions = STATUS_TRANSITIONS[ticket.status];

  const remove = () => {
    if (!window.confirm('Delete this ticket permanently?')) return;
    run(async () => {
      await api.delete(`/tickets/${id}`);
      navigate('/tickets');
    });
  };

  return (
    <>
      <Link to="/tickets" className="back">← All tickets</Link>
      <Alert>{error}</Alert>

      <div className="detail-grid">
        <div>
          <div className="card">
            <div className="row-between">
              <h1 className="ticket-title">{ticket.title}</h1>
              <div className="actions">
                {canEdit && <Link className="btn btn-ghost" to={`/tickets/${id}/edit`}>Edit</Link>}
                {canDelete && <button className="btn btn-danger" onClick={remove} disabled={busy}>Delete</button>}
              </div>
            </div>
            <div className="badges">
              <StatusBadge value={ticket.status} />
              <PriorityBadge value={ticket.priority} />
              <span className="badge">{label(ticket.category)}</span>
            </div>
            <p className="description">{ticket.description}</p>
            <p className="muted small">
              Raised by <strong>{ticket.createdBy?.name}</strong> ({ticket.createdBy?.email}) ·{' '}
              {formatDate(ticket.createdAt)}
              {ticket.resolvedAt && <> · Resolved {formatDate(ticket.resolvedAt)}</>}
            </p>
            {isOwner && !canEdit && ticket.status !== 'closed' && (
              <p className="muted small">Tickets can only be edited while they are open.</p>
            )}
          </div>

          <div className="card">
            <h3>Conversation ({comments.length})</h3>
            {comments.length === 0 && <p className="muted">No comments yet.</p>}
            <ul className="comments">
              {comments.map((c) => (
                <li key={c.id} className={c.authorRole === 'admin' ? 'from-admin' : ''}>
                  <div className="comment-head">
                    <strong>{c.author?.name || 'Deleted user'}</strong>
                    {c.authorRole === 'admin' && <span className="role role-admin">support</span>}
                    <span className="muted small">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p>{c.message}</p>
                </li>
              ))}
            </ul>
            {ticket.status === 'closed' ? (
              <p className="muted">This ticket is closed. Comments are disabled.</p>
            ) : (
              <form
                className="comment-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!message.trim()) return;
                  run(async () => {
                    await api.post(`/tickets/${id}/comments`, { message });
                    setMessage('');
                  });
                }}
              >
                <textarea
                  rows={3}
                  maxLength={2000}
                  placeholder={isAdmin ? 'Reply to the customer…' : 'Add a comment…'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button className="btn btn-primary" disabled={busy || !message.trim()}>
                  {isAdmin ? 'Send reply' : 'Comment'}
                </button>
              </form>
            )}
          </div>
        </div>

        <aside>
          {isAdmin && (
            <div className="card">
              <h3>Manage ticket</h3>
              <label>
                Status
                <select
                  value=""
                  disabled={busy || transitions.length === 0}
                  onChange={(e) =>
                    e.target.value &&
                    run(() => api.patch(`/tickets/${id}/status`, { status: e.target.value }))
                  }
                >
                  <option value="">
                    {transitions.length ? `Move from "${label(ticket.status)}" to…` : 'Closed (final)'}
                  </option>
                  {transitions.map((s) => (
                    <option key={s} value={s}>{label(s)}</option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={ticket.priority}
                  disabled={busy || ticket.status === 'closed'}
                  onChange={(e) =>
                    run(() => api.patch(`/tickets/${id}/priority`, { priority: e.target.value }))
                  }
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{label(p)}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="card">
            <h3>Activity</h3>
            <ul className="timeline">
              {activity.map((a) => (
                <li key={a.id}>
                  <span>{a.message}</span>
                  <span className="muted small">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
