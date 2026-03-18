import { useEffect, useState, useCallback } from 'react';
import { getMaintenance, createMaintenance, updateMaintenance, deleteMaintenance, getResidents } from '../api';
import type { MaintenanceFee, Resident } from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const statusColors: Record<MaintenanceFee['status'], string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function Maintenance() {
  const [records, setRecords] = useState<MaintenanceFee[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MaintenanceFee | null>(null);
  const [form, setForm] = useState({
    resident_id: 0, amount: 2500,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'pending' as MaintenanceFee['status'],
    paid_date: null as string | null
  });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getMaintenance(statusFilter ? { status: statusFilter } : {}), getResidents()])
      .then(([m, r]) => { setRecords(m); setResidents(r); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ resident_id: residents[0]?.id || 0, amount: 2500, month: new Date().getMonth() + 1, year: new Date().getFullYear(), status: 'pending', paid_date: null });
    setError('');
    setShowModal(true);
  };

  const openEdit = (r: MaintenanceFee) => {
    setEditing(r);
    setForm({ resident_id: r.resident_id, amount: r.amount, month: r.month, year: r.year, status: r.status, paid_date: r.paid_date });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await updateMaintenance(editing.id, form);
      else await createMaintenance(form);
      setShowModal(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this record?')) return;
    await deleteMaintenance(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Maintenance Fees</h2>
        <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">+ Add Record</button>
      </div>

      <div className="flex gap-2">
        {['', 'paid', 'pending', 'overdue'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Flat</th>
                <th className="px-4 py-3 text-left">Resident</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Paid Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-indigo-700">{r.flat_number}</td>
                  <td className="px-4 py-3">{r.resident_name}</td>
                  <td className="px-4 py-3 text-gray-500">{MONTHS[r.month - 1]} {r.year}</td>
                  <td className="px-4 py-3 font-medium">₹{r.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.paid_date ? new Date(r.paid_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(r)} className="text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && records.length === 0 && <p className="text-center text-gray-400 py-8">No records found.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{editing ? 'Edit Record' : 'Add Maintenance Record'}</h3>
            {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Resident</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.resident_id} onChange={e => setForm({...form, resident_id: Number(e.target.value)})}>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.flat_number} - {r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount (₹)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Month</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.month} onChange={e => setForm({...form, month: Number(e.target.value)})}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Year</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.year} onChange={e => setForm({...form, year: Number(e.target.value)})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.status} onChange={e => setForm({...form, status: e.target.value as MaintenanceFee['status']})}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Paid Date</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.paid_date || ''} onChange={e => setForm({...form, paid_date: e.target.value || null})} />
                </div>
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
