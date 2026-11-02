import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Employee, TimeEntry } from '../types';
import { formatDuration, formatDateTime } from '../utils';

interface Alert {
  type: 'success' | 'error';
  message: string;
}

export default function TimerPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [taskDesc, setTaskDesc] = useState('');
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showAlert = (type: Alert['type'], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Load employees
  useEffect(() => {
    api.get<Employee[]>('/employees').then((res) => {
      setEmployees(res.data);
    });
  }, []);

  // Load entries for selected employee
  useEffect(() => {
    if (selectedId === '') {
      setActiveEntry(null);
      setRecentEntries([]);
      return;
    }
    loadEntriesForEmployee(selectedId);
  }, [selectedId]);

  const loadEntriesForEmployee = async (empId: number) => {
    setLoadingEntries(true);
    try {
      // Fetch active timer and recent completed entries in parallel
      const [activeRes, entriesRes] = await Promise.all([
        api.get<TimeEntry | null>(`/time-entries/active?employee_id=${empId}`),
        api.get<{ entries: TimeEntry[]; total_seconds: number }>(
          `/time-entries?employee_id=${empId}`
        ),
      ]);
      setActiveEntry(activeRes.data);
      setRecentEntries(
        entriesRes.data.entries.filter((e) => e.stopped_at !== null).slice(0, 10)
      );
    } catch {
      showAlert('error', 'Не удалось загрузить записи');
    } finally {
      setLoadingEntries(false);
    }
  };

  // Real-time elapsed counter
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (activeEntry) {
      const startMs = new Date(activeEntry.started_at).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeEntry]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId === '' || !taskDesc.trim()) return;
    if (activeEntry) {
      showAlert('error', 'У сотрудника уже запущен таймер. Сначала остановите его.');
      return;
    }
    setStarting(true);
    try {
      await api.post('/time-entries/start', {
        employee_id: selectedId,
        task_description: taskDesc.trim(),
      });
      setTaskDesc('');
      showAlert('success', 'Таймер запущен');
      await loadEntriesForEmployee(selectedId as number);
    } catch {
      showAlert('error', 'Ошибка при запуске таймера');
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;
    setStopping(true);
    try {
      await api.post(`/time-entries/${activeEntry.id}/stop`);
      showAlert('success', 'Таймер остановлен');
      await loadEntriesForEmployee(selectedId as number);
    } catch {
      showAlert('error', 'Ошибка при остановке таймера');
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Учёт времени</h2>

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

      {/* Employee selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Выберите сотрудника</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Выберите сотрудника —</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} — {emp.position}
            </option>
          ))}
        </select>
      </div>

      {selectedId !== '' && (
        <>
          {/* Active timer */}
          {loadingEntries ? (
            <div className="text-center py-8 text-gray-400">Загрузка...</div>
          ) : activeEntry ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">
                  Активный таймер
                </span>
              </div>
              <p className="text-gray-700">
                <span className="font-medium">Задача:</span> {activeEntry.task_description}
              </p>
              <p className="text-4xl font-bold text-indigo-700 font-mono">
                {formatDuration(elapsed)}
              </p>
              <p className="text-xs text-gray-500">
                Начало: {formatDateTime(activeEntry.started_at)}
              </p>
              <button
                onClick={handleStop}
                disabled={stopping}
                className="mt-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {stopping ? 'Остановка...' : '⏹ Стоп'}
              </button>
            </div>
          ) : (
            /* Start timer form */
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Запустить таймер</h3>
              <form onSubmit={handleStart} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Описание задачи"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  required
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={starting || !taskDesc.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {starting ? 'Запуск...' : '▶ Старт'}
                </button>
              </form>
            </div>
          )}

          {/* Recent entries */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Последние записи</h3>
            {recentEntries.length === 0 ? (
              <p className="text-gray-400 text-sm">Нет завершённых записей</p>
            ) : (
              <div className="space-y-2">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{entry.task_description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(entry.started_at)}
                        {entry.stopped_at ? ` → ${formatDateTime(entry.stopped_at)}` : ''}
                      </p>
                    </div>
                    <div className="text-indigo-600 font-semibold text-xs ml-4 whitespace-nowrap">
                      {entry.duration_seconds != null
                        ? formatDuration(entry.duration_seconds)
                        : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
