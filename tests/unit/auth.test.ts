import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createDb } from '../../src/db/db';
import { createAuthService } from '../../src/services/auth.service';
import type Database from 'better-sqlite3';

const SALT_ROUNDS = 10;

function makeDb(): Database.Database {
  return createDb(':memory:');
}

describe('AuthService', () => {
  let db: Database.Database;
  let auth: ReturnType<typeof createAuthService>;

  beforeEach(() => {
    db = makeDb();
    auth = createAuthService(db);
  });

  describe('register()', () => {
    it('creates a user and returns it', () => {
      const hash = bcrypt.hashSync('password123', SALT_ROUNDS);
      const user = auth.register('alice', hash);

      expect(user.id).toBeTypeOf('number');
      expect(user.username).toBe('alice');
      expect(user.passwordHash).toBe(hash);
      expect(user.createdAt).toBeTruthy();
    });

    it('throws on duplicate username', () => {
      const hash = bcrypt.hashSync('pass', SALT_ROUNDS);
      auth.register('alice', hash);
      expect(() => auth.register('alice', hash)).toThrow();
    });
  });

  describe('login()', () => {
    it('returns user on valid credentials', () => {
      const hash = bcrypt.hashSync('secret', SALT_ROUNDS);
      auth.register('bob', hash);

      const user = auth.login('bob', 'secret');
      expect(user).not.toBeNull();
      expect(user!.username).toBe('bob');
    });

    it('inserts a session row on successful login', () => {
      const hash = bcrypt.hashSync('secret', SALT_ROUNDS);
      const registered = auth.register('bob', hash);
      auth.login('bob', 'secret');

      const session = db
        .prepare('SELECT * FROM sessions WHERE user_id = ?')
        .get(registered.id) as { id: string; user_id: number } | undefined;

      expect(session).toBeDefined();
      expect(session!.user_id).toBe(registered.id);
    });

    it('returns null for wrong password', () => {
      const hash = bcrypt.hashSync('correct', SALT_ROUNDS);
      auth.register('carol', hash);

      const result = auth.login('carol', 'wrong');
      expect(result).toBeNull();
    });

    it('does not insert a session row on bad credentials', () => {
      const hash = bcrypt.hashSync('correct', SALT_ROUNDS);
      const registered = auth.register('carol', hash);
      auth.login('carol', 'wrong');

      const session = db
        .prepare('SELECT * FROM sessions WHERE user_id = ?')
        .get(registered.id);

      expect(session).toBeUndefined();
    });

    it('returns null for non-existent user', () => {
      const result = auth.login('nobody', 'pass');
      expect(result).toBeNull();
    });
  });

  describe('logout()', () => {
    it('removes the session row', () => {
      const hash = bcrypt.hashSync('pass', SALT_ROUNDS);
      auth.register('dave', hash);
      auth.login('dave', 'pass');

      const session = db
        .prepare('SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ?)')
        .get('dave') as { id: string } | undefined;

      expect(session).toBeDefined();
      auth.logout(session!.id);

      const after = db
        .prepare('SELECT id FROM sessions WHERE id = ?')
        .get(session!.id);
      expect(after).toBeUndefined();
    });

    it('does nothing for an unknown session id', () => {
      expect(() => auth.logout('nonexistent-session-id')).not.toThrow();
    });
  });

  describe('getSessionUser()', () => {
    it('returns the user for a valid session', () => {
      const hash = bcrypt.hashSync('pass', SALT_ROUNDS);
      auth.register('eve', hash);
      auth.login('eve', 'pass');

      const session = db
        .prepare('SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ?)')
        .get('eve') as { id: string };

      const user = auth.getSessionUser(session.id);
      expect(user).not.toBeNull();
      expect(user!.username).toBe('eve');
    });

    it('returns null for an unknown session id', () => {
      const user = auth.getSessionUser('bad-session-id');
      expect(user).toBeNull();
    });

    it('returns null after logout', () => {
      const hash = bcrypt.hashSync('pass', SALT_ROUNDS);
      auth.register('frank', hash);
      auth.login('frank', 'pass');

      const session = db
        .prepare('SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ?)')
        .get('frank') as { id: string };

      auth.logout(session.id);
      const user = auth.getSessionUser(session.id);
      expect(user).toBeNull();
    });
  });
});
