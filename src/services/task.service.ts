import type Database from 'better-sqlite3';

export interface Task {
  id: number;
  userId: number;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface TaskService {
  createTask(userId: number, title: string, description?: string): Task;
  getTasks(userId: number): { pending: Task[]; completed: Task[] };
  updateTask(taskId: number, userId: number, title: string, description?: string): Task;
  toggleStatus(taskId: number, userId: number): Task;
  deleteTask(taskId: number, userId: number): void;
}

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Task not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

interface TaskRow {
  id: number;
  user_id: number;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTaskService(db: Database.Database): TaskService {
  return {
    createTask(userId: number, title: string, description = ''): Task {
      const row = db
        .prepare(
          'INSERT INTO tasks (user_id, title, description, status) VALUES (?, ?, ?, ?) RETURNING *'
        )
        .get(userId, title, description, 'pending') as TaskRow;
      return rowToTask(row);
    },

    getTasks(userId: number): { pending: Task[]; completed: Task[] } {
      const rows = db
        .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at ASC')
        .all(userId) as TaskRow[];

      const pending: Task[] = [];
      const completed: Task[] = [];

      for (const row of rows) {
        const task = rowToTask(row);
        if (task.status === 'pending') {
          pending.push(task);
        } else {
          completed.push(task);
        }
      }

      return { pending, completed };
    },

    updateTask(taskId: number, userId: number, title: string, description = ''): Task {
      const existing = db
        .prepare('SELECT * FROM tasks WHERE id = ?')
        .get(taskId) as TaskRow | undefined;

      if (!existing) throw new NotFoundError();
      if (existing.user_id !== userId) throw new AuthorizationError();

      const row = db
        .prepare(
          `UPDATE tasks SET title = ?, description = ?, updated_at = datetime('now')
           WHERE id = ? RETURNING *`
        )
        .get(title, description, taskId) as TaskRow;

      return rowToTask(row);
    },

    toggleStatus(taskId: number, userId: number): Task {
      const existing = db
        .prepare('SELECT * FROM tasks WHERE id = ?')
        .get(taskId) as TaskRow | undefined;

      if (!existing) throw new NotFoundError();
      if (existing.user_id !== userId) throw new AuthorizationError();

      const newStatus = existing.status === 'pending' ? 'completed' : 'pending';

      const row = db
        .prepare(
          `UPDATE tasks SET status = ?, updated_at = datetime('now')
           WHERE id = ? RETURNING *`
        )
        .get(newStatus, taskId) as TaskRow;

      return rowToTask(row);
    },

    deleteTask(taskId: number, userId: number): void {
      const existing = db
        .prepare('SELECT * FROM tasks WHERE id = ?')
        .get(taskId) as TaskRow | undefined;

      if (!existing) throw new NotFoundError();
      if (existing.user_id !== userId) throw new AuthorizationError();

      db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    },
  };
}
