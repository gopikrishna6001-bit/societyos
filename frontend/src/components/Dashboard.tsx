import { useEffect, useState } from 'react';
import { getStats, getNotices } from '../api';
import type { Stats, Notice } from '../types';

function StatCard({ label, value, color, prefix }: { label: string; value: number; color: string; prefix?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-2">
        {prefix}{Math.round(value)}
      </p>
    </div>
  );
}

function noticeBadge(category: Notice['category']) {
  switch (category) {
    case 'urgent': return 'bg-red-100 text-red-700';
    case 'event': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getNotices()])
      .then(([s, n]) => { setStats(s); setNotices(n.slice(0, 5)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500 text-lg">Loading...</div></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Residents" value={stats.totalResidents} color="border-indigo-500" />
          <StatCard label="Active Residents" value={stats.activeResidents} color="border-green-500" />
          <StatCard label="Pending Fees" value={stats.pendingMaintenance} color="border-yellow-500" prefix="₹" />
          <StatCard label="Open Complaints" value={stats.openComplaints} color="border-red-500" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Collection</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-indigo-600">₹{stats.monthlyCollection.toLocaleString()}</div>
              <div className="text-gray-500 text-sm">collected this month</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Notices</h3>
          {notices.length === 0 ? (
            <p className="text-gray-400 text-sm">No notices yet.</p>
          ) : (
            <ul className="space-y-3">
              {notices.map((n) => (
                <li key={n.id} className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${noticeBadge(n.category)}`}>
                    {n.category}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
