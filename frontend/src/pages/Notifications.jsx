import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui';
import { timeAgo } from '../utils/format';

export default function Notifications() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get('/notifications', { params: { page, limit: 15, ...(unreadOnly && { unread: 'true' }) } })
      .then((r) => setData({ items: r.data.data, meta: r.data.meta }))
      .catch((e) => setError(errorMessage(e)));
  }, [page, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (n) => {
    if (!n.read) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    if (n.ticket) navigate(`/tickets/${n.ticket}`);
    else load();
  };

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <>
      <div className="page-head">
        <h1>Notifications</h1>
        <div className="actions">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
            />
            Unread only
          </label>
          <button
            className="btn btn-ghost"
            disabled={!data.meta.unread}
            onClick={() => api.patch('/notifications/read-all').then(load)}
          >
            Mark all as read
          </button>
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyState title="You're all caught up" />
      ) : (
        <ul className="card notif-list">
          {data.items.map((n) => (
            <li key={n.id} className={n.read ? '' : 'unread'} onClick={() => open(n)}>
              <span className="dot" />
              <span className="grow">{n.message}</span>
              <span className="muted small">{timeAgo(n.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={data.meta} onChange={setPage} />
    </>
  );
}
