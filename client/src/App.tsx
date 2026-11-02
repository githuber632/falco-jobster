import { useState } from 'react';
import EmployeesPage from './components/EmployeesPage';
import TimerPage from './components/TimerPage';
import ReportsPage from './components/ReportsPage';

type Tab = 'employees' | 'timer' | 'reports';

const tabs: { id: Tab; label: string }[] = [
  { id: 'employees', label: 'Сотрудники' },
  { id: 'timer', label: 'Учёт времени' },
  { id: 'reports', label: 'Отчёты' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('employees');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-indigo-700 font-bold text-sm">FJ</span>
          </div>
          <h1 className="text-white text-xl font-bold tracking-wide">
            Falco Jobster
          </h1>
          <span className="text-indigo-300 text-sm ml-1">— Учёт рабочего времени</span>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'employees' && <EmployeesPage />}
        {activeTab === 'timer' && <TimerPage />}
        {activeTab === 'reports' && <ReportsPage />}
      </main>
    </div>
  );
}
