import { describe, it, expect } from 'vitest';
import { isValidTitle, isValidCredentials } from '../../src/services/validator';

describe('isValidTitle', () => {
  it('returns true for a normal title', () => {
    expect(isValidTitle('Buy groceries')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidTitle('')).toBe(false);
  });

  it('returns false for a whitespace-only string (spaces)', () => {
    expect(isValidTitle('   ')).toBe(false);
  });

  it('returns false for a tab-only string', () => {
    expect(isValidTitle('\t\t')).toBe(false);
  });

  it('returns false for a newline-only string', () => {
    expect(isValidTitle('\n\n')).toBe(false);
  });

  it('returns false for mixed whitespace', () => {
    expect(isValidTitle(' \t\n ')).toBe(false);
  });

  it('returns true for a title with surrounding whitespace', () => {
    expect(isValidTitle('  hello  ')).toBe(true);
  });

  it('returns true for a single character', () => {
    expect(isValidTitle('a')).toBe(true);
  });
});

describe('isValidCredentials', () => {
  it('returns true for valid username and password', () => {
    expect(isValidCredentials('alice', 'secret123')).toBe(true);
  });

  it('returns false when username is empty', () => {
    expect(isValidCredentials('', 'secret123')).toBe(false);
  });

  it('returns false when password is empty', () => {
    expect(isValidCredentials('alice', '')).toBe(false);
  });

  it('returns false when both are empty', () => {
    expect(isValidCredentials('', '')).toBe(false);
  });

  it('returns false when username is whitespace-only', () => {
    expect(isValidCredentials('   ', 'secret123')).toBe(false);
  });

  it('returns false when password is whitespace-only', () => {
    expect(isValidCredentials('alice', '   ')).toBe(false);
  });

  it('returns false when both are whitespace-only', () => {
    expect(isValidCredentials('  ', '\t')).toBe(false);
  });

  it('returns true for credentials with surrounding whitespace', () => {
    expect(isValidCredentials(' alice ', ' pass ')).toBe(true);
  });
});
