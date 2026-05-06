import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '../../src/db/db';
import { createTaskService, AuthorizationError, NotFoundError } from '../../src/services/task.service';
import type Database from 'better-sqlite3';

function makeDb(): Database.Database {
  return createDb(':memory:');
}

/** Insert a user directly and return its id */
function insertUser(db: Database.Database, username = 'alice'): number {
  const row = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id")
    .get(username, 'hash') as { id: number };
  return row.id;
}

describe('TaskService', () => {
  let db: Database.Database;
  let tasks: ReturnType<typeof createTaskService>;
  let userId: number;

  beforeEach(() => {
    db = makeDb();
    tasks = createTaskService(db);
    userId = insertUser(db, 'alice');
  });

  // ── createTask ────────────────────────────────────────────────────────────

  describe('createTask()', () => {
    it('creates a task with status pending', () => {
      const task = tasks.createTask(userId, 'Buy milk');
      expect(task.status).toBe('pending');
    });

    it('stores the provided title and description', () => {
      const task = tasks.createTask(userId, 'Buy milk', 'Full-fat please');
      expect(task.title).toBe('Buy milk');
      expect(task.description).toBe('Full-fat please');
    });

    it('defaults description to empty string when omitted', () => {
      const task = tasks.createTask(userId, 'Buy milk');
      expect(task.description).toBe('');
    });

    it('assigns the correct userId', () => {
      const task = tasks.createTask(userId, 'Buy milk');
      expect(task.userId).toBe(userId);
    });

    it('returns a task with a numeric id', () => {
      const task = tasks.createTask(userId, 'Buy milk');
      expect(task.id).toBeTypeOf('number');
    });
  });

  // ── getTasks ──────────────────────────────────────────────────────────────

  describe('getTasks()', () => {
    it('returns empty pending and completed arrays when user has no tasks', () => {
      const result = tasks.getTasks(userId);
      expect(result.pending).toEqual([]);
      expect(result.completed).toEqual([]);
    });

    it('places a new task in pending', () => {
      tasks.createTask(userId, 'Task A');
      const { pending, completed } = tasks.getTasks(userId);
      expect(pending).toHaveLength(1);
      expect(completed).toHaveLength(0);
    });

    it('moves task to completed after toggle', () => {
      const task = tasks.createTask(userId, 'Task A');
      tasks.toggleStatus(task.id, userId);
      const { pending, completed } = tasks.getTasks(userId);
      expect(pending).toHaveLength(0);
      expect(completed).toHaveLength(1);
    });

    it('only returns tasks belonging to the requesting user', () => {
      const otherId = insertUser(db, 'bob');
      tasks.createTask(userId, 'Alice task');
      tasks.createTask(otherId, 'Bob task');

      const { pending } = tasks.getTasks(userId);
      expect(pending).toHaveLength(1);
      expect(pending[0].title).toBe('Alice task');
    });
  });

  // ── updateTask ────────────────────────────────────────────────────────────

  describe('updateTask()', () => {
    it('updates title and description', () => {
      const task = tasks.createTask(userId, 'Old title', 'Old desc');
      const updated = tasks.updateTask(task.id, userId, 'New title', 'New desc');
      expect(updated.title).toBe('New title');
      expect(updated.description).toBe('New desc');
    });

    it('defaults description to empty string when omitted', () => {
      const task = tasks.createTask(userId, 'Title', 'Some desc');
      const updated = tasks.updateTask(task.id, userId, 'Title');
      expect(updated.description).toBe('');
    });

    it('throws AuthorizationError when userId does not match owner', () => {
      const otherId = insertUser(db, 'bob');
      const task = tasks.createTask(userId, 'Alice task');
      expect(() => tasks.updateTask(task.id, otherId, 'Hacked')).toThrow(AuthorizationError);
    });

    it('throws NotFoundError for a non-existent task', () => {
      expect(() => tasks.updateTask(9999, userId, 'Title')).toThrow(NotFoundError);
    });
  });

  // ── toggleStatus ──────────────────────────────────────────────────────────

  describe('toggleStatus()', () => {
    it('flips pending to completed', () => {
      const task = tasks.createTask(userId, 'Task');
      const toggled = tasks.toggleStatus(task.id, userId);
      expect(toggled.status).toBe('completed');
    });

    it('flips completed back to pending', () => {
      const task = tasks.createTask(userId, 'Task');
      tasks.toggleStatus(task.id, userId);
      const toggled = tasks.toggleStatus(task.id, userId);
      expect(toggled.status).toBe('pending');
    });

    it('throws AuthorizationError when userId does not match owner', () => {
      const otherId = insertUser(db, 'bob');
      const task = tasks.createTask(userId, 'Task');
      expect(() => tasks.toggleStatus(task.id, otherId)).toThrow(AuthorizationError);
    });

    it('throws NotFoundError for a non-existent task', () => {
      expect(() => tasks.toggleStatus(9999, userId)).toThrow(NotFoundError);
    });
  });

  // ── deleteTask ────────────────────────────────────────────────────────────

  describe('deleteTask()', () => {
    it('removes the task from the database', () => {
      const task = tasks.createTask(userId, 'Task to delete');
      tasks.deleteTask(task.id, userId);
      const { pending } = tasks.getTasks(userId);
      expect(pending).toHaveLength(0);
    });

    it('throws AuthorizationError when userId does not match owner', () => {
      const otherId = insertUser(db, 'bob');
      const task = tasks.createTask(userId, 'Task');
      expect(() => tasks.deleteTask(task.id, otherId)).toThrow(AuthorizationError);
    });

    it('throws NotFoundError for a non-existent task', () => {
      expect(() => tasks.deleteTask(9999, userId)).toThrow(NotFoundError);
    });
  });
});
