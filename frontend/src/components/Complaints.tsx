import { useEffect, useState, useCallback } from 'react';
import { getComplaints, createComplaint, updateComplaint, deleteComplaint, getResidents } from '../api';
import type { Complaint, Resident } from '../types';

const statusColors: Record<Complaint['status'], string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
};

const categoryColors: Record<Complaint['category'], string> = {
  maintenance: 'bg-orange-100 text-orange-700',
  security: 'bg-purple-100 text-purple-700',
  noise: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function Complaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [form, setForm] = useState({
    resident_id: 0, title: '', description: '',
    category: 'other' as Complaint['category'],
    status: 'open' as Complaint['status']
  });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getComplaints(statusFilter ? { status: statusFilter } : {}), getResidents()])
      .then(([c, r]) => { setComplaints(c); setResidents(r); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ resident_id: residents[0]?.id || 0, title: '', description: '', category: 'other', status: 'open' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (c: Complaint) => {
    setEditing(c);
    setForm({ resident_id: c.resident_id, title: c.title, description: c.description, category: c.category, status: c.status });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await updateComplaint(editing.id, form);
      else await createComplaint(form);
      setShowModal(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this complaint?')) return;
    await deleteComplaint(id);
    load();
  };

  const quickStatusUpdate = async (complaint: Complaint, newStatus: Complaint['status']) => {
    await updateComplaint(complaint.id, {
      resident_id: complaint.resident_id,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      status: newStatus
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Complaints</h2>
        <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">+ Add Complaint</button>
      </div>

      <div className="flex gap-2">
        {['', 'open', 'in_progress', 'resolved'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>
            {s ? s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : complaints.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow p-5">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[c.status]}`}>{c.status.replace('_', ' ')}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColors[c.category]}`}>{c.category}</span>
                  <span className="text-xs text-gray-400">{c.flat_number} • {c.resident_name}</span>
                </div>
                <h3 className="font-semibold text-gray-800">{c.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{c.description}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col gap-1 ml-4">
                {c.status !== 'in_progress' && (
                  <button onClick={() => quickStatusUpdate(c, 'in_progress')} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-300 px-2 py-1 rounded hover:bg-yellow-100">In Progress</button>
                )}
                {c.status !== 'resolved' && (
                  <button onClick={() => quickStatusUpdate(c, 'resolved')} className="text-xs bg-green-50 text-green-700 border border-green-300 px-2 py-1 rounded hover:bg-green-100">Resolve</button>
                )}
                <button onClick={() => openEdit(c)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {!loading && complaints.length === 0 && <div className="text-center text-gray-400 py-12">No complaints found.</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{editing ? 'Edit Complaint' : 'Add Complaint'}</h3>
            {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Resident</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.resident_id} onChange={e => setForm({...form, resident_id: Number(e.target.value)})}>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.flat_number} - {r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.category} onChange={e => setForm({...form, category: e.target.value as Complaint['category']})}>
                    <option value="maintenance">Maintenance</option>
                    <option value="security">Security</option>
                    <option value="noise">Noise</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.status} onChange={e => setForm({...form, status: e.target.value as Complaint['status']})}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Title</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">{editing ? 'Update' : 'Add'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
