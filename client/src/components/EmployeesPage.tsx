import { useState, useEffect } from 'react';
import api from '../api';
import { Employee } from '../types';
import { formatDuration } from '../utils';

interface Alert {
  type: 'success' | 'error';
  message: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<Alert | null>(null);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const showAlert = (type: Alert['type'], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get<Employee[]>('/employees');
      setEmployees(res.data);
    } catch {
      showAlert('error', 'Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !position.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/employees', { name: name.trim(), position: position.trim() });
      setName('');
      setPosition('');
      showAlert('success', 'Сотрудник успешно добавлен');
      fetchEmployees();
    } catch {
      showAlert('error', 'Ошибка при добавлении сотрудника');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(`Удалить сотрудника «${emp.name}»? Все записи времени также будут удалены.`)) return;
    setDeletingId(emp.id);
    try {
      await api.delete(`/employees/${emp.id}`);
      showAlert('success', `Сотрудник «${emp.name}» удалён`);
      fetchEmployees();
    } catch {
      showAlert('error', 'Ошибка при удалении сотрудника');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Сотрудники</h2>

      {/* Alert */}
      {alert && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            alert.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {alert.message}
        </div>
      )}

      {/* Add employee form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Добавить сотрудника</h3>
        <form onSubmit={handleAddEmployee} className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="ФИО сотрудника"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Должность"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            required
            className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {submitting ? 'Добавление...' : 'Добавить'}
          </button>
        </form>
      </div>

      {/* Employee list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Нет сотрудников. Добавьте первого сотрудника выше.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800 text-base">{emp.name}</p>
                  <p className="text-sm text-indigo-600 mt-0.5">{emp.position}</p>
                </div>
                <button
                  onClick={() => handleDelete(emp)}
                  disabled={deletingId === emp.id}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 text-xs mt-0.5"
                  title="Удалить сотрудника"
                >
                  {deletingId === emp.id ? '...' : '✕'}
                </button>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-1">Отработано</p>
                <p className="text-lg font-bold text-indigo-700">
                  {emp.total_seconds > 0 ? formatDuration(emp.total_seconds) : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
