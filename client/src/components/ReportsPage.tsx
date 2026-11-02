import { useState, useEffect } from 'react';
import api from '../api';
import { Employee, EntriesResponse, TimeEntry } from '../types';
import { formatDuration, formatDateTime } from '../utils';
import { format, startOfMonth } from 'date-fns';

interface Alert {
  type: 'success' | 'error';
  message: string;
}

export default function ReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const firstOfMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);

  const showAlert = (type: Alert['type'], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  useEffect(() => {
    api.get<Employee[]>('/employees').then((res) => setEmployees(res.data));
  }, []);

  const handleLoad = async () => {
    setLoading(true);
    setLoaded(false);
    try {
      const params: Record<string, string> = {
        from: dateFrom,
        to: dateTo,
      };
      if (selectedEmpId !== '') {
        params.employee_id = String(selectedEmpId);
      }

      const res = await api.get<EntriesResponse>('/time-entries', { params });
      setEntries(res.data.entries);
      setTotalSeconds(res.data.total_seconds);
      setLoaded(true);
    } catch {
      showAlert('error', 'Ошибка при загрузке отчёта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Отчёты</h2>

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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Фильтры</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Сотрудник</label>
            <select
              value={selectedEmpId}
              onChange={(e) =>
                setSelectedEmpId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
            >
              <option value="">Все</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">С даты</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">По дату</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleLoad}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Загрузка...' : 'Показать'}
          </button>
        </div>
      </div>

      {/* Results */}
      {loaded && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {entries.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">Нет записей за выбранный период</p>
              <p className="text-sm mt-1">Попробуйте изменить фильтры</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">
                        Сотрудник
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Задача</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Начало</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Конец</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">
                        Длительность
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/30 transition-colors`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {entry.employee_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{entry.task_description}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatDateTime(entry.started_at)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {entry.stopped_at ? formatDateTime(entry.stopped_at) : (
                            <span className="text-green-600 font-medium">В работе</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-indigo-600 whitespace-nowrap">
                          {entry.duration_seconds != null
                            ? formatDuration(entry.duration_seconds)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="px-4 py-4 border-t border-gray-200 bg-indigo-50 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Итого записей: <strong>{entries.length}</strong>
                </span>
                <span className="text-sm font-bold text-indigo-700">
                  Общее время: {formatDuration(totalSeconds)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
