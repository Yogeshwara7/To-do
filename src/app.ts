import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import path from 'path';
import { getDb } from './db/db';
import { createAuthService } from './services/auth.service';
import { createTaskService } from './services/task.service';
import { createAuthRouter } from './routes/auth.router';
import { createTaskRouter } from './routes/task.router';

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing for form submissions
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  })
);

// Services
const db = getDb();
const authService = createAuthService(db);
const taskService = createTaskService(db);

// Routes
app.use('/auth', createAuthRouter(authService));
app.use('/tasks', createTaskRouter(taskService));

// Root redirect → /tasks (auth guard in task router handles unauthenticated users)
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/tasks');
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).send('404 — Page not found.');
});

// 500 error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('500 — Something went wrong.');
});

export { app };

// Start server only when run directly (not imported in tests)
if (require.main === module) {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
