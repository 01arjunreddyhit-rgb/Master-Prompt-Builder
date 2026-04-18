// routes/index.ts — all routes consolidated
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { auth, adminOnly, studentOnly  } from '../middleware/auth';

import * as authCtrl from '../controllers/authController';
import * as adminCtrl from '../controllers/adminController';
import * as courseCtrl from '../controllers/courseController';
import * as electionCtrl from '../controllers/electionController';
import * as studentCtrl from '../controllers/studentController';
import * as allocCtrl from '../controllers/allocationController';
import * as cavCtrl from '../controllers/cavController';
import * as resultCtrl from '../controllers/resultController';
import * as facultyCtrl from '../controllers/facultyController';
import * as crCtrl from '../controllers/classRoomController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const bookingLimiter = rateLimit({ windowMs: 60000, max: 20, message: { success: false, message: 'Too many booking attempts.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60000, max: 20, message: { success: false, message: 'Too many attempts.' } });

// ── AUTH ──────────────────────────────────────────────────────
router.post('/auth/admin/register',      authLimiter, authCtrl.adminRegister);
router.post('/auth/admin/login',         authLimiter, authCtrl.adminLogin);
router.post('/auth/student/register',    authLimiter, authCtrl.studentSelfRegister);
router.post('/auth/student/login',       authLimiter, authCtrl.studentLogin);
router.post('/auth/forgot-password',     authLimiter, authCtrl.forgotPassword);
router.post('/auth/reset-password',      authLimiter, authCtrl.resetPassword);
router.post('/auth/verify-otp',          authCtrl.verifyOTP);
router.post('/auth/resend-otp',          authCtrl.resendOTP);

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
router.post('/admin/elections/:election_id/inject-test-votes', auth, adminOnly, adminCtrl.injectTestVotes);

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

// ── FACULTY & CLASS ROOMS ─────────────────────────────────────
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
router.post('/elections',                auth, adminOnly, electionCtrl.createElection);
router.post('/elections/:source_election_id/copy', auth, adminOnly, electionCtrl.copyElection);
router.put('/elections/:election_id',    auth, adminOnly, electionCtrl.updateElection);
router.get('/elections',                 auth, adminOnly, electionCtrl.getElections);
router.get('/elections/:election_id/status',     auth, electionCtrl.getElectionStatus);
router.get('/elections/:election_id/checklist',  auth, adminOnly, electionCtrl.getChecklist);
router.post('/elections/:election_id/init',      auth, adminOnly, electionCtrl.initElection);
router.post('/elections/:election_id/start',     auth, adminOnly, electionCtrl.startElection);
router.post('/elections/:election_id/pause',     auth, adminOnly, electionCtrl.pauseElection);
router.post('/elections/:election_id/resume',    auth, adminOnly, electionCtrl.resumeElection);
router.post('/elections/:election_id/stop',      auth, adminOnly, electionCtrl.stopElection);
router.delete('/elections/:election_id',         auth, adminOnly, electionCtrl.deleteElection);
// Instruction 3: Schedule
router.post('/elections/:election_id/schedule',  auth, adminOnly, electionCtrl.scheduleElection);
// Universal pool calculation
router.get('/elections/:election_id/pool-calc',  auth, adminOnly, electionCtrl.getPoolCalculation);
// Eligible Participant List (Invite email list)
router.get('/elections/:election_id/invitees',   auth, adminOnly, electionCtrl.getInvitees);
router.post('/elections/:election_id/invitees',  auth, adminOnly, electionCtrl.saveInvitees);
// Q2: Field schema config (admin defines columns before CSV upload)
router.get('/elections/:election_id/invite-field-config',  auth, adminOnly, electionCtrl.getInvitees); // returns field_keys too
router.post('/elections/:election_id/invite-field-config', auth, adminOnly, electionCtrl.saveInviteFieldConfig);
// Q2: Institution CSV (Eligible Participant List upload) — ?preview=true for pool preview first
router.post('/elections/:election_id/institution-csv', auth, adminOnly, upload.single('file'), electionCtrl.uploadInstitutionCSV);
// Q2: Token Burst Control (6 modes)
router.post('/elections/:election_id/bust',      auth, adminOnly, electionCtrl.bustTokens);
router.get('/elections/:election_id/bust-history', auth, adminOnly, electionCtrl.getBustHistory);
router.post('/elections/:election_id/inject-fast', auth, adminOnly, electionCtrl.triggerInjection);
// Q2: Unified Reasons Repository
router.get('/reasons',                           auth, adminOnly, electionCtrl.getReasons);
router.post('/reasons',                          auth, adminOnly, electionCtrl.addReason);
router.delete('/reasons/:reason_id',             auth, adminOnly, electionCtrl.deleteReason);
router.put('/reasons/:reason_id/default',        auth, adminOnly, electionCtrl.setDefaultReason);


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

// ── RESULTS ──────────────────────────────────────────────────
router.get('/results/:election_id/choices',            auth, adminOnly, resultCtrl.getChoiceResults);
router.get('/results/:election_id/sessions',           auth, adminOnly, resultCtrl.getSessions);
router.post('/results/:election_id/sessions',          auth, adminOnly, resultCtrl.createSession);
router.get('/results/sessions/:session_id',            auth, adminOnly, resultCtrl.getSessionDetail);
router.post('/results/sessions/:session_id/finalize',  auth, adminOnly, resultCtrl.finalizeSession);

// ── CAV — public ─────────────────────────────────────────────
router.get('/join/:code',                      cavCtrl.resolveCode);

// ── CAV — student ────────────────────────────────────────────
router.post('/cav/apply',                      auth, studentOnly, cavCtrl.applyViaCode);
router.post('/cav/confirm-participation',      auth, studentOnly, cavCtrl.confirmParticipation);
router.post('/cav/form',                       auth, studentOnly, cavCtrl.submitUninvitedForm);
router.put('/cav/name',                        auth, studentOnly, cavCtrl.updateDisplayName);
router.get('/cav/participation',               auth, studentOnly, cavCtrl.getMyParticipation);
router.get('/cav/messages',                    auth, studentOnly, cavCtrl.getMyMessages);
router.put('/cav/messages/:message_id/read',   auth, studentOnly, cavCtrl.markRead);

// ── CAV — admin ──────────────────────────────────────────────
router.get('/cav/:election_id',                auth, adminOnly, cavCtrl.getOrCreateCAV);
router.post('/cav/:election_id/regenerate',    auth, adminOnly, cavCtrl.regenerateCAV);
router.get('/cav/:election_id/participants',   auth, adminOnly, cavCtrl.getParticipants);
router.post('/cav/participants/bulk-review',   auth, adminOnly, cavCtrl.bulkReviewParticipants);
router.post('/cav/participants/:participant_id/review',  auth, adminOnly, cavCtrl.reviewParticipant);
router.put('/cav/participants/:participant_id/details',  auth, adminOnly, cavCtrl.updateParticipantDetails);

// ── Discovery ────────────────────────────────────────────────
router.get('/search/elections',           electionCtrl.searchElections);
router.get('/search/admin/:admin_id',     electionCtrl.getAdminProfile);
router.get('/admins/:admin_id/profile',   electionCtrl.getAdminProfile);

export default router;
