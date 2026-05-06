import { Router, Request, Response, NextFunction } from 'express';
import type { TaskService } from '../services/task.service';
import { AuthorizationError, NotFoundError } from '../services/task.service';
import { isValidTitle } from '../services/validator';

/**
 * Auth guard middleware — redirects to /auth/login if no session userId.
 * Requirement 1.3
 */
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.redirect('/auth/login');
    return;
  }
  next();
}

export function createTaskRouter(taskService: TaskService): Router {
  const router = Router();

  // Apply auth guard to all task routes
  router.use(requireAuth);

  // GET /tasks — fetch and render task list (pending + completed sections)
  // Requirements: 4.1, 4.2, 4.3
  router.get('/', (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { pending, completed } = taskService.getTasks(userId);
    res.render('tasks', { pending, completed, error: null });
  });

  // POST /tasks — create task (validate title, reject whitespace)
  // Requirements: 2.1, 2.2
  router.post('/', (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { title, description } = req.body as { title?: string; description?: string };

    if (!title || !isValidTitle(title)) {
      const { pending, completed } = taskService.getTasks(userId);
      res.status(400).render('tasks', {
        pending,
        completed,
        error: 'Title cannot be empty or whitespace.',
      });
      return;
    }

    taskService.createTask(userId, title.trim(), description?.trim() ?? '');
    res.redirect('/tasks');
  });

  // POST /tasks/:id/edit — update task (validate title, check ownership)
  // Requirements: 3.3, 3.4, 3.6
  router.post('/:id/edit', (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const taskId = parseInt(req.params.id, 10);
    const { title, description } = req.body as { title?: string; description?: string };

    if (!title || !isValidTitle(title)) {
      res.status(400).send('Title cannot be empty or whitespace.');
      return;
    }

    try {
      taskService.updateTask(taskId, userId, title.trim(), description?.trim() ?? '');
      res.redirect('/tasks');
    } catch (err) {
      if (err instanceof AuthorizationError) {
        res.status(403).send('Forbidden: you do not own this task.');
      } else if (err instanceof NotFoundError) {
        res.status(404).send('Task not found.');
      } else {
        throw err;
      }
    }
  });

  // POST /tasks/:id/toggle — toggle status (check ownership)
  // Requirements: 3.1, 3.2, 3.6
  router.post('/:id/toggle', (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const taskId = parseInt(req.params.id, 10);

    try {
      taskService.toggleStatus(taskId, userId);
      res.redirect('/tasks');
    } catch (err) {
      if (err instanceof AuthorizationError) {
        res.status(403).send('Forbidden: you do not own this task.');
      } else if (err instanceof NotFoundError) {
        res.status(404).send('Task not found.');
      } else {
        throw err;
      }
    }
  });

  // POST /tasks/:id/delete — delete task (check ownership)
  // Requirements: 3.5, 3.6
  router.post('/:id/delete', (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const taskId = parseInt(req.params.id, 10);

    try {
      taskService.deleteTask(taskId, userId);
      res.redirect('/tasks');
    } catch (err) {
      if (err instanceof AuthorizationError) {
        res.status(403).send('Forbidden: you do not own this task.');
      } else if (err instanceof NotFoundError) {
        res.status(404).send('Task not found.');
      } else {
        throw err;
      }
    }
  });

  return router;
}
