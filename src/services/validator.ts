/**
 * Validates that a task title is non-empty after trimming whitespace.
 * Requirements: 2.2, 3.4
 */
export function isValidTitle(title: string): boolean {
  return title.trim().length > 0;
}

/**
 * Validates that both username and password are non-empty after trimming whitespace.
 * Requirements: 1.5
 */
export function isValidCredentials(username: string, password: string): boolean {
  return username.trim().length > 0 && password.trim().length > 0;
}
