import express from 'express';
import {
  createEventSession,
  deleteEventSession,
  getAllEventSessions,
  getAttendancesBySession,
  getEventSessionById,
  updateEventSession,
} from '../controllers/eventSessionsController.js';

const router = express.Router({ mergeParams: true });

router.get('/', getAllEventSessions);
router.post('/', createEventSession);
router.get('/:id', getEventSessionById);
router.put('/:id', updateEventSession);
router.delete('/:id', deleteEventSession);
router.get('/:sessionId/attendance', getAttendancesBySession);

export default router;
