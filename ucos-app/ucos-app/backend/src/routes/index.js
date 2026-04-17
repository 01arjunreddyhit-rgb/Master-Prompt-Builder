// routes/index.js — all routes consolidated
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { auth, adminOnly, studentOnly } = require('../middleware/auth');

const authCtrl = require('../controllers/authController');
const adminCtrl = require('../controllers/adminController');
// (profile + password added below)
const courseCtrl = require('../controllers/courseController');
const electionCtrl = require('../controllers/electionController');
const studentCtrl = require('../controllers/studentController');
// (changePassword added below)
const allocCtrl = require('../controllers/allocationController');
const cavCtrl = require('../controllers/cavController');
const resultCtrl = require('../controllers/resultController');

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

// ── ADMIN — STUDENTS ──────────────────────────────────────────
router.get('/admin/pending',             auth, adminOnly, adminCtrl.getPending);
router.post('/admin/pending/:pending_id',auth, adminOnly, adminCtrl.reviewPending);
router.post('/admin/students/upload',    auth, adminOnly, upload.single('file'), adminCtrl.uploadStudentsCSV);
router.post('/admin/students/import-master', auth, adminOnly, upload.single('file'), adminCtrl.importMasterAllocationData);
router.get('/admin/students',            auth, adminOnly, adminCtrl.getStudents);
router.get('/admin/students/:student_id',auth, adminOnly, adminCtrl.getStudentById);
router.delete('/admin/students/:student_id', auth, adminOnly, adminCtrl.deleteStudent);
router.put('/admin/profile',  auth, adminOnly, adminCtrl.updateProfile);
router.put('/admin/password', auth, adminOnly, adminCtrl.changePassword);

// ── COURSES ───────────────────────────────────────────────────
router.post('/courses',                  auth, adminOnly, courseCtrl.createCourse);
router.get('/courses',                   auth, courseCtrl.getCourses);
router.put('/courses/:course_id',        auth, adminOnly, courseCtrl.updateCourse);
router.delete('/courses/:course_id',     auth, adminOnly, courseCtrl.deleteCourse);

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
router.get('/allocation/:election_id/verify',         auth, adminOnly, allocCtrl.verifyAllocation);
router.get('/allocation/:election_id/export',         auth, adminOnly, allocCtrl.exportCSV);
router.post('/allocation/:election_id/email',         auth, adminOnly, allocCtrl.sendResultEmails);
router.get('/allocation/:election_id/unallocated',    auth, adminOnly, allocCtrl.getUnallocated);
router.post('/allocation/:election_id/arrange',       auth, adminOnly, allocCtrl.manualArrange);
router.get('/allocation/:election_id/steps',          auth, adminOnly, allocCtrl.getSteps);
router.get('/allocation/:election_id/abacus',         auth, adminOnly, allocCtrl.getAbacusSummary);

// ── RESULTS (two-store system) ────────────────────────────────
// Choice results — immutable snapshot locked at election stop
router.get('/results/:election_id/choices',            auth, adminOnly, resultCtrl.getChoiceResults);
// Allocation sessions — named, versioned admin work
router.get('/results/:election_id/sessions',           auth, adminOnly, resultCtrl.getSessions);
router.post('/results/:election_id/sessions',          auth, adminOnly, resultCtrl.createSession);
router.get('/results/sessions/:session_id',            auth, adminOnly, resultCtrl.getSessionDetail);
router.post('/results/sessions/:session_id/finalize',  auth, adminOnly, resultCtrl.finalizeSession);
router.post('/results/sessions/:session_id/override',  auth, adminOnly, resultCtrl.saveOverride);
router.get('/results/sessions/:session_id/export',     auth, adminOnly, resultCtrl.exportSession);

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

module.exports = router;
