import { Router, Request, Response } from 'express';
import type { AuthService } from '../services/auth.service';
import { isValidCredentials } from '../services/validator';

// Extend express-session with our custom fields
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  // GET /auth/register — render registration form
  router.get('/register', (req: Request, res: Response) => {
    if (req.session.userId) {
      res.redirect('/tasks');
      return;
    }
    res.render('register', { error: null });
  });

  // POST /auth/register — create account, auto-login, redirect to /tasks
  router.post('/register', (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password || !isValidCredentials(username, password)) {
      res.status(400).render('register', { error: 'Username and password are required.' });
      return;
    }

    if (authService.usernameExists(username.trim())) {
      res.status(409).render('register', { error: 'Username already taken.' });
      return;
    }

    const user = authService.registerWithPassword(username.trim(), password);
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        res.status(500).render('register', { error: 'Session error. Please try again.' });
        return;
      }
      res.redirect('/tasks');
    });
  });

  // GET /auth/login — render login form
  router.get('/login', (req: Request, res: Response) => {
    if (req.session.userId) {
      res.redirect('/tasks');
      return;
    }
    res.render('login', { error: null });
  });

  // POST /auth/login — validate credentials, create session, redirect to /tasks
  router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };

    // Requirement 1.5: reject empty/whitespace credentials
    if (!username || !password || !isValidCredentials(username, password)) {
      res.status(400).render('login', { error: 'Username and password are required.' });
      return;
    }

    // Requirement 1.1 / 1.2: attempt login
    const user = authService.login(username, password);

    if (!user) {
      // Requirement 1.2: invalid credentials — re-render with error
      res.status(401).render('login', { error: 'Invalid username or password.' });
      return;
    }

    // Requirement 1.1: store userId in session and redirect to tasks
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        res.status(500).render('login', { error: 'Session error. Please try again.' });
        return;
      }
      res.redirect('/tasks');
    });
  });

  // POST /auth/logout — destroy session, redirect to /auth/login
  router.post('/logout', (req: Request, res: Response) => {
    // Requirement 1.4: invalidate session
    req.session.destroy((err) => {
      if (err) {
        res.redirect('/tasks');
        return;
      }
      res.redirect('/auth/login');
    });
  });

  return router;
}
