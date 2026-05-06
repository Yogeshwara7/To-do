import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthService {
  register(username: string, passwordHash: string): User;
  registerWithPassword(username: string, password: string): User;
  usernameExists(username: string): boolean;
  login(username: string, password: string): User | null;
  logout(sessionId: string): void;
  getSessionUser(sessionId: string): User | null;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

interface SessionRow {
  id: string;
  user_id: number;
  created_at: string;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

export function createAuthService(db: Database.Database): AuthService {
  return {
    usernameExists(username: string): boolean {
      const row = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      return row !== undefined;
    },

    registerWithPassword(username: string, password: string): User {
      const hash = bcrypt.hashSync(password, 10);
      const stmt = db.prepare(
        'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING *'
      );
      const row = stmt.get(username, hash) as UserRow;
      return rowToUser(row);
    },

    register(username: string, passwordHash: string): User {
      const stmt = db.prepare(
        'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING *'
      );
      const row = stmt.get(username, passwordHash) as UserRow;
      return rowToUser(row);
    },

    login(username: string, password: string): User | null {
      const userRow = db
        .prepare('SELECT * FROM users WHERE username = ?')
        .get(username) as UserRow | undefined;

      if (!userRow) return null;

      const match = bcrypt.compareSync(password, userRow.password_hash);
      if (!match) return null;

      const sessionId = uuidv4();
      db.prepare('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(
        sessionId,
        userRow.id
      );

      return rowToUser(userRow);
    },

    logout(sessionId: string): void {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    },

    getSessionUser(sessionId: string): User | null {
      const session = db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .get(sessionId) as SessionRow | undefined;

      if (!session) return null;

      const userRow = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(session.user_id) as UserRow | undefined;

      return userRow ? rowToUser(userRow) : null;
    },
  };
}
