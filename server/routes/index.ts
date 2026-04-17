// routes/index.js — all routes consolidated
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { auth, adminOnly, studentOnly  } from '../middleware/auth';

import * as authCtrl from '../controllers/authController';
import * as adminCtrl from '../controllers/adminController';
// (profile + password added below)
import * as courseCtrl from '../controllers/courseController';
import * as electionCtrl from '../controllers/electionController';
import * as studentCtrl from '../controllers/studentController';
// (changePassword added below)
import * as allocCtrl from '../controllers/allocationController';
import * as cavCtrl from '../controllers/cavController';
import * as resultCtrl from '../controllers/resultController';
import * as facultyCtrl from '../controllers/facultyController';
import * as crCtrl from '../controllers/classRoomController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Rate limiters
const bookingLimiter = rateLimit({ windowMs: 60000, max: 20, message: { success: false, message: 'Too many booking attempts.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60000, max: 20, message: { success: false, message: 'Too many attempts.' } });

// ── AUTH ──────────────────────────────────────────────────────
router.post('/auth/admin/register',      authLimiter, authCtrl.adminRegister);
router.post('/auth/admin/login',         authLimiter, authCtrl.adminLogin);
router.post('/auth/student/register',    authLimiter, authCtrl.studentSelfRegister);
router.post('/auth/student/login',       authLimiter, authCtrl.studentLogin);
router.post('/auth/verify-otp',          authCtrl.verifyOTP);
router.post('/auth/resend-otp',          authCtrl.resendOTP);

// Dormant future routes kept intentionally out of the live app:
// router.post('/auth/invite/start', authLimiter, authCtrl.startInvitedStudentRegistration);
// router.post('/auth/invite/verify', authCtrl.verifyInvitedStudentOTP);
// Reason: we are preserving the current student self-registration flow in production.

// ── ADMIN — STUDENTS ──────────────────────────────────────────
router.get('/admin/pending',             auth, adminOnly, adminCtrl.getPending);
router.post('/admin/pending/bulk-review',auth, adminOnly, adminCtrl.bulkReviewPending);
router.post('/admin/pending/:pending_id',auth, adminOnly, adminCtrl.reviewPending);
router.post('/admin/students/upload',    auth, adminOnly, upload.single('file'), adminCtrl.uploadStudentsCSV);
router.get('/admin/students',            auth, adminOnly, adminCtrl.getStudents);
router.get('/admin/students/:student_id',auth, adminOnly, adminCtrl.getStudentById);
router.post('/admin/students/bulk-delete', auth, adminOnly, adminCtrl.bulkDeleteStudents);
router.delete('/admin/students/:student_id', auth, adminOnly, adminCtrl.deleteStudent);
router.put('/admin/profile',  auth, adminOnly, adminCtrl.updateProfile);
router.put('/admin/password', auth, adminOnly, adminCtrl.changePassword);

// ── COURSES ───────────────────────────────────────────────────
router.post('/courses',                  auth, adminOnly, courseCtrl.createCourse);
router.get('/courses',                   auth, courseCtrl.getCourses);
router.put('/courses/:course_id',        auth, adminOnly, courseCtrl.updateCourse);
router.delete('/courses/:course_id',     auth, adminOnly, courseCtrl.deleteCourse);

// ── COURSE LIBRARY ────────────────────────────────────────────
router.get('/courses/library',           auth, adminOnly, courseCtrl.getCourseLibrary);
router.post('/courses/library',          auth, adminOnly, courseCtrl.createLibraryCourse);
router.put('/courses/library/:id',       auth, adminOnly, courseCtrl.updateLibraryCourse);
router.delete('/courses/library/:id',    auth, adminOnly, courseCtrl.deleteLibraryCourse);

// ── CLASS ROOMS & FACULTY ────────────────────────────────────
router.get('/faculty',                   auth, adminOnly, facultyCtrl.getFaculty);
router.post('/faculty',                  auth, adminOnly, facultyCtrl.createFaculty);
router.put('/faculty/:faculty_id',       auth, adminOnly, facultyCtrl.updateFaculty);
router.delete('/faculty/:faculty_id',    auth, adminOnly, facultyCtrl.deleteFaculty);

router.get('/class-rooms',               auth, adminOnly, crCtrl.getClassRooms);
router.post('/class-rooms',              auth, adminOnly, crCtrl.createClassRoom);
router.put('/class-rooms/:room_id',      auth, adminOnly, crCtrl.updateClassRoom);
router.delete('/class-rooms/:room_id',   auth, adminOnly, crCtrl.deleteClassRoom);

router.get('/room-tickets',              auth, adminOnly, crCtrl.getRoomTickets);
router.post('/room-tickets',             auth, adminOnly, crCtrl.createRoomTicket);
router.delete('/room-tickets/:ticket_id',auth, adminOnly, crCtrl.deleteRoomTicket);

// ── ELECTIONS ─────────────────────────────────────────────────
router.post('/elections',                        auth, adminOnly, electionCtrl.createElection);
router.put('/elections/:election_id',            auth, adminOnly, electionCtrl.updateElection);
router.get('/elections',                         auth, adminOnly, electionCtrl.getElections);
router.get('/elections/:election_id/status',     auth, electionCtrl.getElectionStatus);
router.get('/elections/:election_id/checklist',  auth, adminOnly, electionCtrl.getChecklist);
router.post('/elections/:election_id/init',      auth, adminOnly, electionCtrl.initElection);
router.post('/elections/:election_id/start',     auth, adminOnly, electionCtrl.startElection);
router.post('/elections/:election_id/pause',     auth, adminOnly, electionCtrl.pauseElection);
router.post('/elections/:election_id/resume',    auth, adminOnly, electionCtrl.resumeElection);
router.post('/elections/:election_id/stop',      auth, adminOnly, electionCtrl.stopElection);
router.delete('/elections/:election_id',        auth, adminOnly, electionCtrl.deleteElection);

// ── STUDENT ───────────────────────────────────────────────────
router.get('/student/dashboard',         auth, studentOnly, studentCtrl.getStudentDashboard);
router.get('/student/bookings',          auth, studentOnly, studentCtrl.getStudentBookings);
router.post('/student/book',             auth, studentOnly, bookingLimiter, studentCtrl.bookSeat);
router.get('/student/results',           auth, studentOnly, studentCtrl.getStudentResults);
router.put('/student/password',          auth, studentOnly, studentCtrl.changePassword);

// ── ALLOCATION ────────────────────────────────────────────────
router.get('/allocation/:election_id/pool',           auth, adminOnly, allocCtrl.getRoundPool);
router.post('/allocation/confirm',                    auth, adminOnly, allocCtrl.confirmCourse);
router.post('/allocation/burst',                      auth, adminOnly, allocCtrl.burstCourse);
router.post('/allocation/advanced-burst',             auth, adminOnly, allocCtrl.advancedBurst);
router.get('/allocation/:election_id/verify',         auth, adminOnly, allocCtrl.verifyAllocation);
router.get('/allocation/:election_id/export',         auth, adminOnly, allocCtrl.exportCSV);
router.post('/allocation/:election_id/email',         auth, adminOnly, allocCtrl.sendResultEmails);
router.get('/allocation/:election_id/unallocated',    auth, adminOnly, allocCtrl.getUnallocated);
router.post('/allocation/:election_id/arrange',       auth, adminOnly, allocCtrl.manualArrange);
router.get('/allocation/:election_id/steps',          auth, adminOnly, allocCtrl.getSteps);
router.get('/allocation/:election_id/abacus',         auth, adminOnly, allocCtrl.getAbacusSummary);
router.get('/allocation/:election_id/assistant',      auth, adminOnly, allocCtrl.getAssistantAnalytics);

// ── RESULTS (two-store system) ────────────────────────────────
// Choice results — immutable snapshot locked at election stop
router.get('/results/:election_id/choices',            auth, adminOnly, resultCtrl.getChoiceResults);
// Allocation sessions — named, versioned admin work
router.get('/results/:election_id/sessions',           auth, adminOnly, resultCtrl.getSessions);
router.post('/results/:election_id/sessions',          auth, adminOnly, resultCtrl.createSession);

router.get('/results/sessions/:session_id',            auth, adminOnly, resultCtrl.getSessionDetail);
router.post('/results/sessions/:session_id/finalize',  auth, adminOnly, resultCtrl.finalizeSession);
// ── CAV — public ──────────────────────────────────────────────
router.get('/join/:code',                      cavCtrl.resolveCode);

// ── CAV — student ────────────────────────────────────────────
router.post('/cav/apply',                      auth, studentOnly, cavCtrl.applyViaCode);
router.put('/cav/name',                        auth, studentOnly, cavCtrl.updateDisplayName);
router.get('/cav/participation',               auth, studentOnly, cavCtrl.getMyParticipation);
router.get('/cav/messages',                    auth, studentOnly, cavCtrl.getMyMessages);
router.put('/cav/messages/:message_id/read',   auth, studentOnly, cavCtrl.markRead);

// ── CAV — admin ──────────────────────────────────────────────
router.get('/cav/:election_id',                auth, adminOnly, cavCtrl.getOrCreateCAV);
router.post('/cav/:election_id/regenerate',    auth, adminOnly, cavCtrl.regenerateCAV);
router.get('/cav/:election_id/participants',   auth, adminOnly, cavCtrl.getParticipants);
router.post('/cav/participants/:participant_id/review', auth, adminOnly, cavCtrl.reviewParticipant);

export default router;

// Discovery
router.get('/search/elections', electionCtrl.searchElections);
router.get('/admins/:admin_id/profile', electionCtrl.getAdminProfile);
