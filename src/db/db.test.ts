import { describe, it, expect } from 'vitest';
import { createDb } from './db';

describe('Database setup', () => {
  it('creates all required tables on startup', () => {
    const db = createDb(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('users');
    expect(names).toContain('tasks');
    expect(names).toContain('sessions');
    db.close();
  });

  it('enforces foreign keys', () => {
    const db = createDb(':memory:');
    expect(() => {
      db.prepare(
        "INSERT INTO tasks (user_id, title) VALUES (999, 'orphan')"
      ).run();
    }).toThrow();
    db.close();
  });
});
