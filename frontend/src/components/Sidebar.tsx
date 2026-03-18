import type { Page } from '../App';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'residents', label: 'Residents', icon: '👥' },
  { id: 'maintenance', label: 'Maintenance', icon: '💰' },
  { id: 'notices', label: 'Notices', icon: '📋' },
  { id: 'complaints', label: 'Complaints', icon: '📝' },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <div className="w-64 bg-indigo-900 text-white flex flex-col">
      <div className="p-6 border-b border-indigo-700">
        <h1 className="text-xl font-bold">🏢 SocietyOS</h1>
        <p className="text-indigo-300 text-sm mt-1">Society Management</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  currentPage === item.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-indigo-700">
        <p className="text-indigo-400 text-xs text-center">SocietyOS v1.0.0</p>
      </div>
    </div>
  );
}
