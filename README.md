# Falco Time Tracker

Веб-приложение для учёта рабочего времени сотрудников.  
Позволяет добавлять сотрудников, запускать/останавливать таймеры с описанием задач, просматривать отчёты за произвольный период и сохраняет все данные в SQLite.

---

## Стек

| Слой | Технология |
|---|---|
| Backend | Node.js 20+ · Express 4 · TypeScript 5 · better-sqlite3 |
| Frontend | React 19 · TypeScript 5 · Vite 6 · Tailwind CSS 3 · Axios |
| БД | SQLite (файл `server/data/timetracker.db`) |

---

## Запуск

### Предварительные требования

- Node.js ≥ 20 (проверено на Node 24)
- npm ≥ 9

### 1. Установить зависимости

```bash
# В корне репозитория
npm run install:all
```

Или по отдельности:

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Запустить сервер (порт 3001)

```bash
cd server
npm run dev
```

### 3. Запустить клиент (порт 5173)

В отдельном терминале:

```bash
cd client
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173).

### 4. Сборка для продакшена

```bash
cd server && npm run build   # → server/dist/
cd client && npm run build   # → client/dist/
```

---

## Тесты

Интеграционные тесты API (22 сценария):

```bash
# Сервер должен быть запущен
cd server
bash test-api.sh
```

**Покрытые сценарии:**
- Пустой список сотрудников
- Добавление сотрудников
- Попытка добавить дубликат → 409
- Запуск таймера
- Повторный запуск таймера при уже активном → 409
- Получение активного таймера
- Отсутствие таймера у другого сотрудника → `null`
- Остановка таймера + вычисление длительности
- Попытка остановить уже остановленный таймер → 409
- **Повторный запуск таймера после остановки** — работает корректно
- Отчёт за период с фильтрацией
- **Пустой отчёт** за несуществующий период → `{ entries: [], total_seconds: 0 }`
- Список сотрудников с итоговым временем
- Удаление сотрудника (каскадно удаляет его записи)
- Удаление несуществующего → 404
- Отсутствие обязательных полей → 400

---

## Использованные ИИ-инструменты

| Инструмент | Роль |
|---|---|
| **Antigravity (Google DeepMind)** | Оркестрация: планирование архитектуры, параллельный запуск субагентов, аудит кода, написание тестов и README |
| **Claude Sonnet 4.6 (Thinking)** | Генерация кода backend и frontend через субагенты |

Весь код написан нейросетью и отревьюирован/исправлен агентом-оркестром.

---

## Примеры запросов к ИИ

### Запрос 1 — Backend

> Создай Node.js + Express + TypeScript бэкенд для учёта рабочего времени.  
> База данных: SQLite через `better-sqlite3`.  
> Эндпоинты: сотрудники (CRUD), запуск/остановка таймера, список записей с фильтрами.  
> Активный таймер = запись без `stopped_at`. При остановке вычисляй длительность через `julianday()`.  
> Возвращай 409, если сотрудник уже имеет активный таймер.

**Результат:** полный рабочий бэкенд за один запрос.

---

### Запрос 2 — Frontend

> Создай React + TypeScript + Vite + Tailwind CSS фронтенд для трекера времени.  
> 3 вкладки: Сотрудники, Учёт времени, Отчёты.  
> На вкладке «Учёт времени»: выбор сотрудника, отображение активного таймера в реальном времени (setInterval), форма запуска.  
> Прокси Vite `/api` → `http://localhost:3001`.

**Результат:** полный SPA с живым счётчиком времени.

---

### Запрос 3 — Тесты

> Напиши bash-скрипт с интеграционными тестами API: добавление сотрудников, старт/стоп таймера, повторный запуск, пустой отчёт, граничные случаи.  
> Используй `curl` и `python3` для парсинга JSON. Счётчик PASS/FAIL.

**Результат:** `test-api.sh` — 22 теста, все зелёные.

---

## Найденные и исправленные ошибки

### 1. Несоответствие URL в API (Frontend ↔ Backend)

**Проблема:** Субагент-фронтенд сгенерировал URL, которых не существует на сервере:

| Компонент | Вызов фронтенда (неверно) | Реальный эндпоинт бэкенда |
|---|---|---|
| `TimerPage` | `GET /employees/:id/entries?limit=10` | `GET /time-entries?employee_id=` |
| `TimerPage` | `POST /entries` | `POST /time-entries/start` |
| `TimerPage` | `PATCH /entries/:id/stop` | `POST /time-entries/:id/stop` |
| `ReportsPage` | `GET /entries` | `GET /time-entries` |

**Исправление:** вручную скорректированы все четыре вызова. Заодно `TimerPage.loadEntriesForEmployee` переделан: вместо одного несуществующего запроса — два параллельных (`/active` + `/time-entries`) через `Promise.all`.

---

### 2. `better-sqlite3` не собирался под Node.js 24

**Проблема:** версия `^9.4.3` требует C++17, но заголовки Node 24 требуют C++20 → ошибка нативной компиляции.

**Исправление:** обновлён до `better-sqlite3@^11.10.0`, у которого есть prebuilt-бинарники для Node 24 arm64. Добавлено `allowScripts` в `package.json`.

---

### 3. Путь к файлу БД при разных режимах запуска

**Проблема:** `DATA_DIR = path.join(__dirname, '..', 'data')` даёт разный абсолютный путь в `tsx` (относительно `src/`) и `node dist/` (относительно `dist/`). Данные создавались в одном месте, читались из другого.

**Исправление:** добавлен явный комментарий, документирующий поведение. При обоих режимах `..` от `src/` и `..` от `dist/` ведут в `server/` → `data/`, поэтому путь одинаков: `server/data/timetracker.db`. Поведение проверено тестами.

---

## Структура проекта

```
falco-jobster/
├── server/                    # Express API
│   ├── src/
│   │   ├── index.ts           # Точка входа, CORS, маршруты
│   │   ├── db.ts              # SQLite подключение + схема
│   │   └── routes/
│   │       ├── employees.ts   # CRUD сотрудников
│   │       └── timeEntries.ts # Таймеры и записи
│   ├── data/                  # SQLite файл (создаётся автоматически)
│   ├── test-api.sh            # Интеграционные тесты
│   ├── package.json
│   └── tsconfig.json
├── client/                    # React SPA
│   ├── src/
│   │   ├── App.tsx            # Вкладки
│   │   ├── api.ts             # Axios instance
│   │   ├── types.ts           # TypeScript типы
│   │   ├── utils.ts           # formatDuration, formatDateTime
│   │   └── components/
│   │       ├── EmployeesPage.tsx
│   │       ├── TimerPage.tsx
│   │       └── ReportsPage.tsx
│   ├── vite.config.ts         # Proxy /api → :3001
│   ├── package.json
│   └── tsconfig.json
├── package.json               # Корневые скрипты
├── .gitignore
└── README.md
```

---

## API Reference

```
GET    /api/employees                        # Список сотрудников с total_seconds
POST   /api/employees                        # Создать { name, position }
DELETE /api/employees/:id                    # Удалить (каскадно)

GET    /api/time-entries/active?employee_id= # Активный таймер или null
POST   /api/time-entries/start               # Старт { employee_id, task_description }
POST   /api/time-entries/:id/stop            # Стоп, вычисляет duration_seconds
GET    /api/time-entries?employee_id=&from=&to= # Список с фильтрами + total_seconds
DELETE /api/time-entries/:id                 # Удалить запись
```
