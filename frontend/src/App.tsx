import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Residents from './components/Residents';
import Maintenance from './components/Maintenance';
import Notices from './components/Notices';
import Complaints from './components/Complaints';

export type Page = 'dashboard' | 'residents' | 'maintenance' | 'notices' | 'complaints';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'residents': return <Residents />;
      case 'maintenance': return <Maintenance />;
      case 'notices': return <Notices />;
      case 'complaints': return <Complaints />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
