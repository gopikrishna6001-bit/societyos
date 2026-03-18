import { useEffect, useState, useCallback } from 'react';
import { getNotices, createNotice, updateNotice, deleteNotice } from '../api';
import type { Notice } from '../types';

const categoryStyles: Record<Notice['category'], { badge: string; border: string }> = {
  urgent: { badge: 'bg-red-100 text-red-700', border: 'border-red-400' },
  event: { badge: 'bg-blue-100 text-blue-700', border: 'border-blue-400' },
  general: { badge: 'bg-gray-100 text-gray-700', border: 'border-gray-300' },
};

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' as Notice['category'], created_by: 'Admin' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getNotices().then(setNotices).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ title: '', content: '', category: 'general', created_by: 'Admin' }); setError(''); setShowModal(true); };
  const openEdit = (n: Notice) => { setEditing(n); setForm({ title: n.title, content: n.content, category: n.category, created_by: n.created_by }); setError(''); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await updateNotice(editing.id, form);
      else await createNotice(form);
      setShowModal(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this notice?')) return;
    await deleteNotice(id);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Notice Board</h2>
        <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">+ Post Notice</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notices.map((n) => {
          const styles = categoryStyles[n.category];
          return (
            <div key={n.id} className={`bg-white rounded-xl shadow p-5 border-l-4 ${styles.border}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles.badge}`}>{n.category}</span>
                  <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(n)} className="text-indigo-500 hover:text-indigo-700 text-sm">Edit</button>
                  <button onClick={() => handleDelete(n.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{n.title}</h3>
              <p className="text-gray-600 text-sm">{n.content}</p>
              <p className="text-xs text-gray-400 mt-2">— {n.created_by}</p>
            </div>
          );
        })}
      </div>
      {notices.length === 0 && <div className="text-center text-gray-400 py-12">No notices posted yet.</div>}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{editing ? 'Edit Notice' : 'Post New Notice'}</h3>
            {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Title</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.category} onChange={e => setForm({...form, category: e.target.value as Notice['category']})}>
                    <option value="general">General</option>
                    <option value="urgent">Urgent</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Posted By</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.created_by} onChange={e => setForm({...form, created_by: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Content</label>
                <textarea rows={4} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" value={form.content} onChange={e => setForm({...form, content: e.target.value})} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">{editing ? 'Update' : 'Post'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
