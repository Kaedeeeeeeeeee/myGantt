import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getTasks,
  getTask,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from '../controllers/taskController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/projects/:projectId/tasks', getTasks);
router.post('/projects/:projectId/tasks', createTaskHandler);
router.get('/:id', getTask);
router.put('/:id', updateTaskHandler);
router.delete('/:id', deleteTaskHandler);

export default router;

