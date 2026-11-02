export interface Employee {
  id: number;
  name: string;
  position: string;
  created_at: string;
  total_seconds: number;
}

export interface TimeEntry {
  id: number;
  employee_id: number;
  employee_name: string;
  task_description: string;
  started_at: string;
  stopped_at: string | null;
  duration_seconds: number | null;
}

export interface EntriesResponse {
  entries: TimeEntry[];
  total_seconds: number;
}
