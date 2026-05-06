import Database from 'better-sqlite3';
import { ALL_MIGRATIONS } from './schema';

let _db: Database.Database | null = null;

export function getDb(path: string = 'todo.db'): Database.Database {
  if (_db) return _db;
  _db = new Database(path);
  // Enable WAL mode for better concurrent read performance
  _db.pragma('journal_mode = WAL');
  // Enforce foreign key constraints
  _db.pragma('foreign_keys = ON');
  runMigrations(_db);
  return _db;
}

export function createDb(path: string = ':memory:'): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function runMigrations(db: Database.Database): void {
  for (const migration of ALL_MIGRATIONS) {
    db.exec(migration);
  }
}
