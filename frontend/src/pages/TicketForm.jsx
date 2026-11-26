import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { Alert, Spinner } from '../components/ui';
import { CATEGORIES, PRIORITIES, label } from '../utils/format';

const EMPTY = { title: '', description: '', category: 'general', priority: 'medium' };

export default function TicketForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/tickets/${id}`)
      .then((r) => {
        const t = r.data.data;
        setForm({ title: t.title, description: t.description, category: t.category, priority: t.priority });
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = editing
        ? await api.patch(`/tickets/${id}`, form)
        : await api.post('/tickets', form);
      navigate(`/tickets/${res.data.data.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="narrow">
      <Link to={editing ? `/tickets/${id}` : '/tickets'} className="back">← Back</Link>
      <form className="card form" onSubmit={submit}>
        <h1>{editing ? 'Edit ticket' : 'Raise a support ticket'}</h1>
        <Alert>{error}</Alert>
        <label>
          Title
          <input required minLength={5} maxLength={150} value={form.title} onChange={set('title')}
            placeholder="Short summary of the problem" />
        </label>
        <label>
          Description
          <textarea required minLength={10} maxLength={5000} rows={7} value={form.description}
            onChange={set('description')} placeholder="What happened? Steps to reproduce, error messages…" />
        </label>
        <div className="grid-2">
          <label>
            Category
            <select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Submit ticket'}
        </button>
      </form>
    </div>
  );
}
