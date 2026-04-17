import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, unique } from "drizzle-orm/pg-core";
  import { createInsertSchema } from "drizzle-zod";
  import { z } from "zod";

  export const admins = pgTable("admins", {
    admin_id: text("admin_id").primaryKey(),
    admin_name: text("admin_name").notNull(),
    college_name: text("college_name").notNull(),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    is_verified: boolean("is_verified").default(false),
    otp_code: text("otp_code"),
    otp_expires_at: timestamp("otp_expires_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  });

  export const elections = pgTable("elections", {
    election_id: serial("election_id").primaryKey(),
    admin_id: text("admin_id").notNull(),
    election_name: text("election_name").notNull(),
    semester_tag: text("semester_tag"),
    batch_tag: text("batch_tag"),
    total_students: integer("total_students").default(126),
    final_courses_per_student: integer("final_courses_per_student").default(2),
    faculty_count: integer("faculty_count").default(4),
    min_class_size: integer("min_class_size").default(45),
    max_class_size: integer("max_class_size").default(75),
    window_start: timestamp("window_start"),
    window_end: timestamp("window_end"),
    status: text("status").default('NOT_STARTED'), // ENUM('NOT_STARTED','ACTIVE','PAUSED','STOPPED')
    current_round: integer("current_round").default(0),
    field_config: json("field_config"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  });

  export const students = pgTable("students", {
    student_id: serial("student_id").primaryKey(),
    register_number: text("register_number").notNull().unique(),
    full_student_id: text("full_student_id").notNull().unique(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    section: text("section").notNull().default('A'),
    batch_year: text("batch_year"),
    admin_id: text("admin_id").notNull(),
    election_id: integer("election_id"),
    is_approved: boolean("is_approved").default(true),
    is_verified: boolean("is_verified").default(true),
    created_at: timestamp("created_at").defaultNow(),
  });

  export const pending_registrations = pgTable("pending_registrations", {
    pending_id: serial("pending_id").primaryKey(),
    name: text("name").notNull(),
    register_number: text("register_number").notNull(),
    email: text("email").notNull(),
    password_hash: text("password_hash").notNull(),
    section: text("section").notNull(),
    admin_id: text("admin_id").notNull(),
    otp_code: text("otp_code"),
    otp_expires_at: timestamp("otp_expires_at"),
    is_email_verified: boolean("is_email_verified").default(false),
    status: text("status").default('PENDING'), // ENUM('PENDING','APPROVED','REJECTED')
    requested_at: timestamp("requested_at").defaultNow(),
    reviewed_at: timestamp("reviewed_at"),
  });

  export const election_invites = pgTable("election_invites", {
    invite_id: serial("invite_id").primaryKey(),
    election_id: integer("election_id").notNull(),
    admin_id: text("admin_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    register_number: text("register_number"),
    section: text("section"),
    batch_year: text("batch_year"),
    metadata_json: text("metadata_json"),
    password_hash: text("password_hash"),
    otp_code: text("otp_code"),
    otp_expires_at: timestamp("otp_expires_at"),
    is_verified: boolean("is_verified").default(false),
    student_id: integer("student_id"),
    invited_at: timestamp("invited_at").defaultNow(),
    completed_at: timestamp("completed_at"),
  }, (t) => [unique("election_invites_unique").on(t.election_id, t.email)]);

  export const courses = pgTable("courses", {
    course_id: serial("course_id").primaryKey(),
    election_id: integer("election_id").notNull(),
    course_name: text("course_name").notNull(),
    subject_code: text("subject_code"),
    description: text("description"),
    total_seats: integer("total_seats").default(126),
    min_enrollment: integer("min_enrollment").default(45),
    max_enrollment: integer("max_enrollment").default(75),
    classes_per_course: integer("classes_per_course").default(1),
    credit_weight: decimal("credit_weight", { precision: 3, scale: 1 }).default('3.0'),
    is_active: boolean("is_active").default(true),
    is_burst: boolean("is_burst").default(false),
    confirmed_count: integer("confirmed_count").default(0),
    created_at: timestamp("created_at").defaultNow(),
  });

  export const course_library = pgTable("course_library", {
    library_course_id: serial("library_course_id").primaryKey(),
    admin_id: text("admin_id").notNull(),
    library_key: text("library_key").notNull(),
    course_name: text("course_name").notNull(),
    subject_code: text("subject_code"),
    description: text("description"),
    min_enrollment: integer("min_enrollment").default(45),
    max_enrollment: integer("max_enrollment").default(75),
    classes_per_course: integer("classes_per_course").default(1),
    credit_weight: decimal("credit_weight", { precision: 3, scale: 1 }).default('3.0'),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  }, (t) => [unique("course_library_admin_key_unique").on(t.admin_id, t.library_key)]);

  export const seats = pgTable("seats", {
    seat_id: serial("seat_id").primaryKey(),
    seat_number: integer("seat_number").notNull(),
    seat_code: text("seat_code").notNull(),
    election_id: integer("election_id").notNull(),
    course_id: integer("course_id"),
    student_token_id: integer("student_token_id"),
    is_available: boolean("is_available").default(true),
    booked_at: timestamp("booked_at"),
  });

  export const student_tokens = pgTable("student_tokens", {
    token_id: serial("token_id").primaryKey(),
    student_id: integer("student_id").notNull(),
    election_id: integer("election_id").notNull(),
    token_number: integer("token_number").notNull(),
    token_code: text("token_code").notNull().unique(),
    course_id: integer("course_id"),
    seat_id: integer("seat_id"),
    status: text("status").default('UNUSED'), // ENUM('UNUSED','BOOKED','CONFIRMED','BURST','AUTO')
    timestamp_booked: timestamp("timestamp_booked"),
    round_confirmed: integer("round_confirmed"),
    is_auto_assigned: boolean("is_auto_assigned").default(false),
  });

  export const allocation_rounds = pgTable("allocation_rounds", {
    round_id: serial("round_id").primaryKey(),
    election_id: integer("election_id").notNull(),
    round_number: integer("round_number").notNull(),
    courses_confirmed: json("courses_confirmed"),
    courses_burst: json("courses_burst"),
    students_confirmed: integer("students_confirmed").default(0),
    students_in_pool: integer("students_in_pool").default(0),
    capacity_settings: json("capacity_settings"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow(),
  }, (t) => [unique("allocation_rounds_election_round_unique").on(t.election_id, t.round_number)]);

  export const final_assignments = pgTable("final_assignments", {
    assignment_id: serial("assignment_id").primaryKey(),
    student_id: integer("student_id").notNull(),
    election_id: integer("election_id").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  });

  export const assignment_details = pgTable("assignment_details", {
    detail_id: serial("detail_id").primaryKey(),
    assignment_id: integer("assignment_id").notNull(),
    slot_number: integer("slot_number").notNull(),
    course_id: integer("course_id").notNull(),
    seat_id: integer("seat_id").notNull(),
    token_id: integer("token_id").notNull(),
    round_number: integer("round_number").notNull(),
  });

  export const election_cav = pgTable("election_cav", {
    cav_id: serial("cav_id").primaryKey(),
    election_id: integer("election_id").notNull().unique(),
    election_code: text("election_code").notNull().unique(),
    join_link: text("join_link").notNull(),
    is_active: boolean("is_active").default(true),
    expires_at: timestamp("expires_at"),
    generated_at: timestamp("generated_at").defaultNow(),
  });

  export const election_participants = pgTable("election_participants", {
    participant_id: serial("participant_id").primaryKey(),
    election_id: integer("election_id").notNull(),
    student_id: integer("student_id").notNull(),
    display_name: text("display_name").notNull(),
    name_updated: boolean("name_updated").default(false),
    applied_at: timestamp("applied_at").defaultNow(),
    status: text("status").default('PENDING'), // ENUM('PENDING','CONFIRMED','REJECTED')
    confirmed_at: timestamp("confirmed_at"),
  });

  export const election_messages = pgTable("election_messages", {
    message_id: serial("message_id").primaryKey(),
    election_id: integer("election_id").notNull(),
    student_id: integer("student_id").notNull(),
    message_type: text("message_type").default('INFO'), // ENUM('CONFIRMATION','REJECTION','INFO','RESULT')
    title: text("title").notNull(),
    body: text("body").notNull(),
    is_read: boolean("is_read").default(false),
    expires_at: timestamp("expires_at"),
    created_at: timestamp("created_at").defaultNow(),
  });

  export const election_choice_results = pgTable("election_choice_results", {
    result_id: serial("result_id").primaryKey(),
    election_id: integer("election_id").notNull(),
    student_id: integer("student_id").notNull(),
    token_number: integer("token_number").notNull(),
    course_id: integer("course_id").notNull(),
    original_status: text("original_status").notNull(),
    is_auto_assigned: boolean("is_auto_assigned").default(false),
    seat_id: integer("seat_id"),
    round_confirmed: integer("round_confirmed"),
    token_code: text("token_code").notNull(),
    locked_at: timestamp("locked_at").defaultNow(),
  }, (t) => [unique("election_choice_results_unique").on(t.election_id, t.student_id, t.token_number)]);

  export const allocation_sessions = pgTable("allocation_sessions", {
    session_id: serial("session_id").primaryKey(),
    election_id: integer("election_id").notNull(),
    session_name: text("session_name").notNull(),
    notes: text("notes"),
    is_final: boolean("is_final").default(false),
    finalized_at: timestamp("finalized_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  });

  export const allocation_overrides = pgTable("allocation_overrides", {
    override_id: serial("override_id").primaryKey(),
    session_id: integer("session_id").notNull(),
    election_id: integer("election_id").notNull(),
    student_id: integer("student_id").notNull(),
    token_number: integer("token_number").notNull(),
    course_id: integer("course_id").notNull(),
    reason: text("reason"),
    created_at: timestamp("created_at").defaultNow(),
  });

  export const allocation_steps = pgTable("allocation_steps", {
    step_id: serial("step_id").primaryKey(),
    election_id: integer("election_id").notNull(),
    step_number: integer("step_number").notNull(),
    action_type: text("action_type").notNull(), // ENUM('BURST','CONFIRM','OVERRIDE','NOTE')
    course_id: integer("course_id"),
    course_name: text("course_name"),
    reason: text("reason"),
    cascade_count: integer("cascade_count").default(0),
    confirm_count: integer("confirm_count").default(0),
    snapshot_json: text("snapshot_json"),
    created_by: text("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  });
  
export const insertAdminsSchema = createInsertSchema(admins);
export type InsertAdmins = z.infer<typeof insertAdminsSchema>;
export type Admins = typeof admins.$inferSelect;

export const insertElectionsSchema = createInsertSchema(elections);
export type InsertElections = z.infer<typeof insertElectionsSchema>;
export type Elections = typeof elections.$inferSelect;

export const insertStudentsSchema = createInsertSchema(students);
export type InsertStudents = z.infer<typeof insertStudentsSchema>;
export type Students = typeof students.$inferSelect;

export const insertPendingRegistrationsSchema = createInsertSchema(pending_registrations);
export type InsertPendingRegistrations = z.infer<typeof insertPendingRegistrationsSchema>;
export type PendingRegistrations = typeof pending_registrations.$inferSelect;

export const insertElectionInvitesSchema = createInsertSchema(election_invites);
export type InsertElectionInvites = z.infer<typeof insertElectionInvitesSchema>;
export type ElectionInvites = typeof election_invites.$inferSelect;

export const insertCoursesSchema = createInsertSchema(courses);
export type InsertCourses = z.infer<typeof insertCoursesSchema>;
export type Courses = typeof courses.$inferSelect;

export const insertCourseLibrarySchema = createInsertSchema(course_library);
export type InsertCourseLibrary = z.infer<typeof insertCourseLibrarySchema>;
export type CourseLibrary = typeof course_library.$inferSelect;

export const insertSeatsSchema = createInsertSchema(seats);
export type InsertSeats = z.infer<typeof insertSeatsSchema>;
export type Seats = typeof seats.$inferSelect;

export const insertStudentTokensSchema = createInsertSchema(student_tokens);
export type InsertStudentTokens = z.infer<typeof insertStudentTokensSchema>;
export type StudentTokens = typeof student_tokens.$inferSelect;

export const insertAllocationRoundsSchema = createInsertSchema(allocation_rounds);
export type InsertAllocationRounds = z.infer<typeof insertAllocationRoundsSchema>;
export type AllocationRounds = typeof allocation_rounds.$inferSelect;

export const insertFinalAssignmentsSchema = createInsertSchema(final_assignments);
export type InsertFinalAssignments = z.infer<typeof insertFinalAssignmentsSchema>;
export type FinalAssignments = typeof final_assignments.$inferSelect;

export const insertAssignmentDetailsSchema = createInsertSchema(assignment_details);
export type InsertAssignmentDetails = z.infer<typeof insertAssignmentDetailsSchema>;
export type AssignmentDetails = typeof assignment_details.$inferSelect;

export const insertElectionCavSchema = createInsertSchema(election_cav);
export type InsertElectionCav = z.infer<typeof insertElectionCavSchema>;
export type ElectionCav = typeof election_cav.$inferSelect;

export const insertElectionParticipantsSchema = createInsertSchema(election_participants);
export type InsertElectionParticipants = z.infer<typeof insertElectionParticipantsSchema>;
export type ElectionParticipants = typeof election_participants.$inferSelect;

export const insertElectionMessagesSchema = createInsertSchema(election_messages);
export type InsertElectionMessages = z.infer<typeof insertElectionMessagesSchema>;
export type ElectionMessages = typeof election_messages.$inferSelect;

export const insertElectionChoiceResultsSchema = createInsertSchema(election_choice_results);
export type InsertElectionChoiceResults = z.infer<typeof insertElectionChoiceResultsSchema>;
export type ElectionChoiceResults = typeof election_choice_results.$inferSelect;

export const insertAllocationSessionsSchema = createInsertSchema(allocation_sessions);
export type InsertAllocationSessions = z.infer<typeof insertAllocationSessionsSchema>;
export type AllocationSessions = typeof allocation_sessions.$inferSelect;

export const insertAllocationOverridesSchema = createInsertSchema(allocation_overrides);
export type InsertAllocationOverrides = z.infer<typeof insertAllocationOverridesSchema>;
export type AllocationOverrides = typeof allocation_overrides.$inferSelect;

export const insertAllocationStepsSchema = createInsertSchema(allocation_steps);
export type InsertAllocationSteps = z.infer<typeof insertAllocationStepsSchema>;
export type AllocationSteps = typeof allocation_steps.$inferSelect;

