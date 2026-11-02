import express from 'express';
import cors from 'cors';
import { initSchema } from './db';
import employeesRouter from './routes/employees';
import timeEntriesRouter from './routes/timeEntries';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Initialize DB schema
initSchema();

// Routes
app.use('/api/employees', employeesRouter);
app.use('/api/time-entries', timeEntriesRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Time-tracker server running on http://localhost:${PORT}`);
});

export default app;
