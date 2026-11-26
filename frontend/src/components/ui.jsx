import { label } from '../utils/format';

export function StatusBadge({ value }) {
  return <span className={`badge status-${value}`}>{label(value)}</span>;
}

export function PriorityBadge({ value }) {
  return <span className={`badge priority-${value}`}>{label(value)}</span>;
}

export function Alert({ children, type = 'error' }) {
  if (!children) return null;
  return <div className={`alert alert-${type}`}>{children}</div>;
}

export function Spinner() {
  return <div className="spinner" aria-label="Loading" />;
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-ghost" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
        ← Prev
      </button>
      <span>
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <button
        className="btn btn-ghost"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onChange(meta.page + 1)}
      >
        Next →
      </button>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
