import express from 'express';
import {
  createAttendance,
  deleteAttendance,
  getAllAttendanceByRegistration,
  getAttendanceById,
  updateAttendance,
} from '../controllers/attendanceController.js';

const router = express.Router({ mergeParams: true });

router.get('/', getAllAttendanceByRegistration);
router.post('/', createAttendance);
router.get('/:attendanceId', getAttendanceById);
router.put('/:attendanceId', updateAttendance);
router.delete('/:attendanceId', deleteAttendance);

export default router;
