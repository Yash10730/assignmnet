import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, EmptyState, Pagination, PriorityBadge, Spinner, StatusBadge } from '../components/ui';
import { CATEGORIES, PRIORITIES, STATUSES, label, timeAgo } from '../utils/format';

const FILTER_KEYS = ['status', 'priority', 'category', 'createdBy', 'search', 'sortBy', 'order', 'page'];

export default function Tickets() {
  const { isAdmin } = useAuth();
  // Filters live in the URL so they survive refresh and can be shared
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], meta: null });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('search') || '');

  const query = Object.fromEntries(FILTER_KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
  const queryKey = params.toString();

  useEffect(() => {
    setLoading(true);
    api
      .get('/tickets', { params: { limit: 10, ...query } })
      .then((r) => setData({ items: r.data.data, meta: r.data.meta }))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  useEffect(() => {
    if (isAdmin) api.get('/admin/users').then((r) => setUsers(r.data.data)).catch(() => {});
  }, [isAdmin]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get('search') || '') !== search) update('search', search.trim());
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const select = (key, options, placeholder) => (
    <select value={params.get(key) || ''} onChange={(e) => update(key, e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{label(o)}</option>
      ))}
    </select>
  );

  return (
    <>
      <div className="page-head">
        <h1>{isAdmin ? 'All tickets' : 'My tickets'}</h1>
        {!isAdmin && <Link className="btn btn-primary" to="/tickets/new">+ New ticket</Link>}
      </div>

      <div className="card filters">
        <input
          className="search"
          placeholder="Search title or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {select('status', STATUSES, 'All statuses')}
        {select('priority', PRIORITIES, 'All priorities')}
        {select('category', CATEGORIES, 'All categories')}
        {isAdmin && (
          <select value={params.get('createdBy') || ''} onChange={(e) => update('createdBy', e.target.value)}>
            <option value="">All users</option>
            {users
              .filter((u) => u.role === 'user')
              .map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.ticketCount})</option>
              ))}
          </select>
        )}
        <select
          value={`${params.get('sortBy') || 'createdAt'}:${params.get('order') || 'desc'}`}
          onChange={(e) => {
            const [sortBy, order] = e.target.value.split(':');
            const next = new URLSearchParams(params);
            next.set('sortBy', sortBy);
            next.set('order', order);
            next.delete('page');
            setParams(next);
          }}
        >
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="updatedAt:desc">Recently updated</option>
          <option value="priority:desc">Priority: high → low</option>
          <option value="priority:asc">Priority: low → high</option>
          <option value="title:asc">Title A–Z</option>
        </select>
      </div>

      <Alert>{error}</Alert>

      {loading ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <EmptyState title="No tickets found">
          <p className="muted">Try changing the filters{!isAdmin && ' or create a new ticket'}.</p>
        </EmptyState>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                {isAdmin && <th>Raised by</th>}
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Comments</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/tickets/${t.id}`}>{t.title}</Link></td>
                  {isAdmin && <td>{t.createdBy?.name}</td>}
                  <td>{label(t.category)}</td>
                  <td><PriorityBadge value={t.priority} /></td>
                  <td><StatusBadge value={t.status} /></td>
                  <td>{t.commentCount}</td>
                  <td className="muted">{timeAgo(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={data.meta} onChange={(p) => update('page', String(p))} />
    </>
  );
}
