import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, PriorityBadge, Spinner, StatusBadge } from '../components/ui';
import { CATEGORIES, PRIORITIES, STATUSES, label, timeAgo } from '../utils/format';

function BarList({ title, data, keys }) {
  const max = Math.max(1, ...keys.map((k) => data[k] || 0));
  return (
    <div className="card">
      <h3>{title}</h3>
      {keys.map((k) => (
        <div className="bar-row" key={k}>
          <span className="bar-label">{label(k)}</span>
          <div className="bar-track">
            <div className={`bar-fill fill-${k}`} style={{ width: `${((data[k] || 0) / max) * 100}%` }} />
          </div>
          <span className="bar-value">{data[k] || 0}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/tickets/stats')
      .then((r) => setStats(r.data.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) return <Spinner />;

  const s = stats.byStatus;
  const cards = [
    { k: 'total', v: stats.total, t: 'Total tickets' },
    { k: 'open', v: s.open || 0, t: 'Open' },
    { k: 'in_progress', v: s.in_progress || 0, t: 'In progress' },
    { k: 'resolved', v: (s.resolved || 0) + (s.closed || 0), t: 'Resolved / Closed' },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hello, {user.name.split(' ')[0]} 👋</h1>
          <p className="muted">
            {isAdmin ? 'Overview of all support tickets' : 'Overview of your support tickets'}
          </p>
        </div>
        {!isAdmin && (
          <Link className="btn btn-primary" to="/tickets/new">+ New ticket</Link>
        )}
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className={`card stat stat-${c.k}`} key={c.k}>
            <span className="stat-value">{c.v}</span>
            <span className="muted">{c.t}</span>
          </div>
        ))}
      </div>

      <div className="grid-3">
        <BarList title="By status" data={stats.byStatus} keys={STATUSES} />
        <BarList title="By priority" data={stats.byPriority} keys={PRIORITIES} />
        <BarList title="By category" data={stats.byCategory} keys={CATEGORIES} />
      </div>

      <div className="card">
        <div className="row-between">
          <h3>Recent tickets</h3>
          {stats.avgResolutionHours !== null && (
            <span className="muted">Avg. resolution time: {stats.avgResolutionHours} h</span>
          )}
        </div>
        {stats.recent.length === 0 ? (
          <p className="muted">No tickets yet.</p>
        ) : (
          <ul className="recent">
            {stats.recent.map((t) => (
              <li key={t.id}>
                <Link to={`/tickets/${t.id}`}>{t.title}</Link>
                <span className="muted">
                  {isAdmin && `${t.createdBy?.name} · `}
                  {timeAgo(t.createdAt)}
                </span>
                <span className="badges">
                  <PriorityBadge value={t.priority} />
                  <StatusBadge value={t.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
