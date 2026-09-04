-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'CHURNED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'PROFESSOR', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'MULTI', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('CLOUDFLARE', 'VIMEO_URL', 'VIMEO_UPLOAD', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "InteractiveStopType" AS ENUM ('QUESTION', 'REFLECTION', 'EXERCISE', 'POLL');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'REFUNDED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LessonProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'OXXO', 'SPEI');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WorkshopType" AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "WorkshopPrerequisite" AS ENUM ('NONE', 'MODULE_STARTED', 'MODULE_COMPLETED');

-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AdvisoryAudience" AS ENUM ('COMPANY', 'USERS');

-- CreateEnum
CREATE TYPE "AdvisorySessionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "EvaluationSectionType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "EvaluationAnswerValue" AS ENUM ('POSITIVE', 'PARTIAL', 'NEGATIVE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "EvaluationQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'OPEN_TEXT', 'MULTI_FACTOR', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "EvaluationFactor" AS ENUM ('STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvaluationKind" AS ENUM ('DAFO', 'DIAGNOSTIC', 'GUIDELINES', 'STAKEHOLDERS', 'ROLES');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ENROLLMENT', 'PAYMENT', 'COURSE_UPDATE', 'WORKSHOP', 'CERTIFICATE', 'SYSTEM', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AIJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CertificateTemplate" AS ENUM ('IBIZA', 'CLASSIC');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AIJobType" AS ENUM ('COURSE_OUTLINE', 'VIDEO_TRANSCRIPTION', 'LESSON_CONTENT', 'COURSE_ENRICHMENT', 'DRAFT_REFINEMENT', 'LESSON_REGENERATION', 'MODULE_REGENERATION', 'COHERENCE_CHECK');

-- CreateEnum
CREATE TYPE "CourseDraftStatus" AS ENUM ('BRIEFING', 'REFINING', 'GENERATING', 'READY', 'PUBLISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SurveyQuestionType" AS ENUM ('RATING_STARS', 'MULTIPLE_CHOICE', 'SCALE_LABELED', 'OPEN_TEXT');

-- CreateEnum
CREATE TYPE "SurveyCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SurveyAudienceKind" AS ENUM ('COMPANY_LEADER', 'SPECIFIC_USERS', 'COMPANY_ALL');

-- CreateEnum
CREATE TYPE "SurveyRecipientStatus" AS ENUM ('PENDING', 'SENT', 'RESPONDED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SurveyTrigger" AS ENUM ('MANUAL', 'COURSE_COMPLETED', 'CERTIFICATE_ISSUED');

-- CreateEnum
CREATE TYPE "SurveyResultsAudience" AS ENUM ('NONE', 'LEADER', 'PARTICIPANTS');

-- CreateEnum
CREATE TYPE "DraftOperationType" AS ENUM ('BRIEFING_SUBMITTED', 'REFINEMENT_GENERATED', 'REFINEMENT_EDITED', 'OUTLINE_GENERATED', 'OUTLINE_ACCEPTED', 'LESSON_REGENERATED', 'MODULE_REGENERATED', 'LESSON_SPLIT', 'LESSONS_MERGED', 'COHERENCE_CHECKED', 'MANUAL_EDIT');

-- CreateEnum
CREATE TYPE "Dc3DeliveryMode" AS ENUM ('ONLINE', 'LIVE');

-- CreateEnum
CREATE TYPE "Dc3Status" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Dc3PrintAction" AS ENUM ('ISSUED', 'PRINTED');

-- CreateEnum
CREATE TYPE "ManualStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ManualAssignmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ManualItemKind" AS ENUM ('STEP', 'SELF_CHECK');

-- CreateEnum
CREATE TYPE "ManualDocumentKind" AS ENUM ('FILE', 'PROCEDIMIENTO', 'REGISTRO');

-- CreateEnum
CREATE TYPE "CompanyDocumentStatus" AS ENUM ('BORRADOR', 'VIGENTE', 'OBSOLETO');

-- CreateEnum
CREATE TYPE "EvidenceRequirementKind" AS ENUM ('FILE', 'RISK_MATRIX', 'EVALUATION_LINK');

-- CreateEnum
CREATE TYPE "EvidencePeriodicity" AS ENUM ('ONCE', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'NEEDS_CORRECTION', 'APPROVED');

-- CreateEnum
CREATE TYPE "EvidenceReviewAction" AS ENUM ('SUBMIT', 'START_REVIEW', 'APPROVE', 'REQUEST_CORRECTION', 'COMMENT', 'REQUEST_DELETION', 'APPROVE_DELETION', 'REJECT_DELETION');

-- CreateEnum
CREATE TYPE "ComplianceActivityStatus" AS ENUM ('OPEN', 'COMPLETED', 'NOT_APPLICABLE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskAssessmentStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "RiskItemType" AS ENUM ('RISK', 'OPPORTUNITY');

-- CreateEnum
CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'RETURNED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "custom_domain" TEXT,
    "revenue_share_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "trial_ends_at" TIMESTAMP(3),
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "stripe_account_id" TEXT,
    "logo" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#6366f1',
    "accent_color" TEXT NOT NULL DEFAULT '#f59e0b',
    "favicon" TEXT,
    "custom_css" TEXT,
    "contact_email" TEXT,
    "phone" TEXT,
    "social_links" JSONB,
    "workshops_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "companies_enabled" BOOLEAN NOT NULL DEFAULT true,
    "evaluations_enabled" BOOLEAN NOT NULL DEFAULT false,
    "surveys_enabled" BOOLEAN NOT NULL DEFAULT false,
    "advisory_enabled" BOOLEAN NOT NULL DEFAULT true,
    "documents_enabled" BOOLEAN NOT NULL DEFAULT false,
    "documents_menu_label" TEXT,
    "ai_plan" TEXT NOT NULL DEFAULT 'none',
    "ai_credits_balance" INTEGER NOT NULL DEFAULT 0,
    "ai_monthly_allotment" INTEGER NOT NULL DEFAULT 0,
    "ai_allotment_reset_at" TIMESTAMP(3),
    "certificate_prefix" TEXT NOT NULL DEFAULT 'PROL',
    "google_calendar_user_id" TEXT,
    "google_calendar_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "tenant_id" TEXT,
    "company_id" TEXT,
    "stripe_customer_id" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "must_reset_password" BOOLEAN NOT NULL DEFAULT false,
    "disabled_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "dc3_full_name" TEXT,
    "curp" TEXT,
    "dc3_occupation_code" TEXT,
    "dc3_job_position" TEXT,
    "dc3_confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "id_token" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "professor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "preview_video_url" TEXT,
    "price_in_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "category" TEXT,
    "tags" JSONB,
    "total_duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "certificate_template" "CertificateTemplate",
    "certificate_code" TEXT,
    "certificate_course_name" TEXT,
    "certificate_description" TEXT,
    "certificate_signer_name" TEXT,
    "dc3_enabled" BOOLEAN NOT NULL DEFAULT false,
    "dc3_course_name" TEXT,
    "dc3_thematic_area_code" TEXT,
    "dc3_duration_hours" INTEGER,
    "dc3_delivery_mode" "Dc3DeliveryMode" NOT NULL DEFAULT 'ONLINE',
    "dc3_instructor_name" TEXT,
    "dc3_training_agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_collaborators" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "parent_module_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "type" "LessonType" NOT NULL DEFAULT 'VIDEO',
    "video_url" TEXT,
    "video_provider" "VideoProvider" DEFAULT 'CLOUDFLARE',
    "video_raw_url" TEXT,
    "video_hash" TEXT,
    "video_duration_seconds" INTEGER,
    "content" JSONB,
    "transcript" JSONB,
    "summary" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_status" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactive_stops" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "timestamp_seconds" INTEGER NOT NULL,
    "type" "InteractiveStopType" NOT NULL,
    "content" JSONB NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interactive_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passing_score" INTEGER NOT NULL DEFAULT 80,
    "questions" JSONB NOT NULL,
    "time_limit" INTEGER,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "is_final_exam" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "dc3_edition_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progresses" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "status" "LessonProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "video_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactive_stop_responses" (
    "id" TEXT NOT NULL,
    "lesson_progress_id" TEXT NOT NULL,
    "interactive_stop_id" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "is_correct" BOOLEAN,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactive_stop_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "notes" TEXT,
    "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "grade" INTEGER,
    "feedback" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "revenue_share_rate" DOUBLE PRECISION NOT NULL,
    "prol_fee" INTEGER NOT NULL,
    "creator_receives" INTEGER NOT NULL,
    "stripe_fee" INTEGER NOT NULL,
    "stripe_payment_id" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "voucher_url" TEXT,
    "voucher_expires_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "module_id" TEXT,
    "professor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "WorkshopType" NOT NULL DEFAULT 'IN_PERSON',
    "location_name" TEXT,
    "location_address" TEXT,
    "location_map_url" TEXT,
    "meeting_url" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "max_attendees" INTEGER NOT NULL,
    "min_attendees" INTEGER NOT NULL DEFAULT 3,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "prerequisite" "WorkshopPrerequisite" NOT NULL DEFAULT 'NONE',
    "cancellation_hrs" INTEGER NOT NULL DEFAULT 24,
    "recurring_rule" TEXT,
    "parent_workshop_id" TEXT,
    "recurrence_frequency" "RecurrenceFrequency",
    "status" "WorkshopStatus" NOT NULL DEFAULT 'SCHEDULED',
    "google_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_bookings" (
    "id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "waitlist_position" INTEGER,
    "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "workshop_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_attendances" (
    "id" TEXT NOT NULL,
    "workshop_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL,
    "checked_in_by" TEXT NOT NULL,
    "checked_out_at" TIMESTAMP(3),
    "feedback" TEXT,
    "rating" INTEGER,

    CONSTRAINT "workshop_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisory_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "WorkshopType" NOT NULL DEFAULT 'VIRTUAL',
    "audience" "AdvisoryAudience" NOT NULL DEFAULT 'COMPANY',
    "company_id" TEXT,
    "location_name" TEXT,
    "location_address" TEXT,
    "location_map_url" TEXT,
    "meeting_url" TEXT,
    "google_event_id" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "parent_session_id" TEXT,
    "recurrence_frequency" "RecurrenceFrequency",
    "status" "AdvisorySessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "invited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisory_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisory_session_participants" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisory_session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "course_name" TEXT NOT NULL,
    "professor_name" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "final_exam_score" INTEGER,
    "pdf_url" TEXT,
    "metadata" JSONB,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_counters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_agents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stps_registry" TEXT,
    "rfc" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dc3_course_editions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "duration_hours" INTEGER,
    "instructor_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dc3_course_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dc3_certificates" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT,
    "folio" TEXT NOT NULL,
    "status" "Dc3Status" NOT NULL DEFAULT 'ACTIVE',
    "worker_name" TEXT NOT NULL,
    "worker_curp" TEXT NOT NULL,
    "occupation_code" TEXT NOT NULL,
    "occupation_label" TEXT NOT NULL,
    "job_position" TEXT,
    "employer_name" TEXT NOT NULL,
    "employer_rfc" TEXT NOT NULL,
    "legal_rep_name" TEXT NOT NULL,
    "workers_rep_name" TEXT,
    "course_name" TEXT NOT NULL,
    "duration_hours" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "thematic_area_code" TEXT NOT NULL,
    "thematic_area_label" TEXT NOT NULL,
    "training_agent_name" TEXT NOT NULL,
    "training_agent_registry" TEXT,
    "instructor_name" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by_id" TEXT NOT NULL,
    "print_count" INTEGER NOT NULL DEFAULT 0,
    "last_printed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "dc3_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dc3_print_logs" (
    "id" TEXT NOT NULL,
    "dc3_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "Dc3PrintAction" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dc3_print_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dc3_counters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dc3_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "contact_email" TEXT,
    "seats_limit" INTEGER,
    "allow_member_invitations" BOOLEAN NOT NULL DEFAULT false,
    "leader_id" TEXT,
    "dc3_legal_name" TEXT,
    "dc3_rfc" TEXT,
    "dc3_legal_rep_name" TEXT,
    "dc3_workers_rep_name" TEXT,
    "dc3_confirmed_at" TIMESTAMP(3),
    "dc3_confirmed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_invitations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_course_assignments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "company_course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generation_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "AIJobType" NOT NULL,
    "status" "AIJobStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_drafts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "professor_id" TEXT NOT NULL,
    "status" "CourseDraftStatus" NOT NULL DEFAULT 'BRIEFING',
    "topic" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'intermediate',
    "module_count" INTEGER NOT NULL,
    "lessons_per_module" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "refinement" JSONB,
    "outline" JSONB,
    "outline_model" TEXT,
    "outline_tokens" INTEGER,
    "total_cost_cents" INTEGER NOT NULL DEFAULT 0,
    "credits_consumed" INTEGER NOT NULL DEFAULT 0,
    "published_course_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "course_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_draft_versions" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_draft_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_draft_operations" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "type" "DraftOperationType" NOT NULL,
    "target" TEXT,
    "input" JSONB,
    "output" JSONB,
    "model" TEXT,
    "tokens_in" INTEGER,
    "tokens_out" INTEGER,
    "cost_cents" INTEGER,
    "credits" INTEGER,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_draft_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_credits_ledger" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "balance" INTEGER NOT NULL,
    "draft_id" TEXT,
    "operation_id" TEXT,
    "stripe_payment_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_credits_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "methodology" TEXT,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "kind" "EvaluationKind" NOT NULL DEFAULT 'DAFO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_sections" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EvaluationSectionType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "evaluation_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_questions" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "type" "EvaluationQuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "options" JSONB,
    "min_selections" INTEGER,
    "max_selections" INTEGER,
    "allow_not_applicable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "evaluation_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_assignments" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_participants" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_submissions" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_answers" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" "EvaluationAnswerValue",
    "text" TEXT,
    "factors" "EvaluationFactor"[] DEFAULT ARRAY[]::"EvaluationFactor"[],
    "selected_option_indexes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "evaluation_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "professor_id" TEXT NOT NULL,
    "company_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "public_slug" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "results_share_token" TEXT,
    "default_duration_days" INTEGER NOT NULL DEFAULT 30,
    "default_reminder_days" INTEGER[] DEFAULT ARRAY[7, 2]::INTEGER[],
    "trigger" "SurveyTrigger" NOT NULL DEFAULT 'MANUAL',
    "trigger_course_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "type" "SurveyQuestionType" NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "options" JSONB,
    "section" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "allow_not_applicable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_campaigns" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audience" "SurveyAudienceKind" NOT NULL DEFAULT 'COMPANY_ALL',
    "company_id" TEXT,
    "course_id" TEXT,
    "workshop_id" TEXT,
    "advisory_session_id" TEXT,
    "project_label" TEXT,
    "opens_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "reminder_days_before" INTEGER[] DEFAULT ARRAY[7, 2]::INTEGER[],
    "status" "SurveyCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "share_token" TEXT,
    "results_share_token" TEXT,
    "results_audience" "SurveyResultsAudience" NOT NULL DEFAULT 'NONE',
    "results_published_at" TIMESTAMP(3),
    "results_published_by" TEXT,
    "results_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_recipients" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "token" TEXT NOT NULL,
    "status" "SurveyRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "last_reminded_at" TIMESTAMP(3),
    "reminders_sent" INTEGER NOT NULL DEFAULT 0,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "recipient_id" TEXT,
    "email" TEXT NOT NULL,
    "respondent_company_id" TEXT,
    "respondent_company_name" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "rating_value" INTEGER,
    "selected_option_index" INTEGER,
    "text" TEXT,
    "not_applicable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manuals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "norma_label" TEXT,
    "description" TEXT,
    "cover_image" TEXT,
    "status" "ManualStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_chapters" (
    "id" TEXT NOT NULL,
    "manual_id" TEXT NOT NULL,
    "parent_chapter_id" TEXT,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_sections" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content_html" TEXT NOT NULL DEFAULT '',
    "estimated_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_section_items" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "kind" "ManualItemKind" NOT NULL,
    "text" TEXT NOT NULL,
    "help_text" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_section_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_documents" (
    "id" TEXT NOT NULL,
    "manual_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_file_key" TEXT,
    "base_file_name" TEXT,
    "base_file_size" INTEGER,
    "base_mime_type" TEXT,
    "uploaded_by" TEXT,
    "kind" "ManualDocumentKind" NOT NULL DEFAULT 'FILE',
    "content_html" TEXT,
    "template_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_section_documents" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "manual_section_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_requirements" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "kind" "EvidenceRequirementKind" NOT NULL DEFAULT 'FILE',
    "periodicity" "EvidencePeriodicity" NOT NULL DEFAULT 'ONCE',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "reminder_days_before" INTEGER[] DEFAULT ARRAY[14, 3]::INTEGER[],
    "tool_config" JSONB,
    "evaluation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_assignments" (
    "id" TEXT NOT NULL,
    "manual_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "consultant_id" TEXT,
    "status" "ManualAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_by" TEXT NOT NULL,
    "notes" TEXT,
    "drive_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_item_checks" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "checked_by" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_item_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_documents" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code_override" TEXT,
    "kind" "ManualDocumentKind" NOT NULL DEFAULT 'FILE',
    "content_html" TEXT,
    "name_override" TEXT,
    "status" "CompanyDocumentStatus" NOT NULL DEFAULT 'VIGENTE',
    "source_template_version" INTEGER,
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "file_key" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "notes" TEXT,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_activities" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "period_number" INTEGER NOT NULL DEFAULT 1,
    "period_label" TEXT,
    "due_at" TIMESTAMP(3),
    "status" "ComplianceActivityStatus" NOT NULL DEFAULT 'OPEN',
    "reminder_days_before" INTEGER[] DEFAULT ARRAY[14, 3]::INTEGER[],
    "reminders_sent" INTEGER NOT NULL DEFAULT 0,
    "last_reminded_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidences" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "kind" "EvidenceRequirementKind" NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "notes" TEXT,
    "file_key" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "form_snapshot" JSONB,
    "risk_assessment_id" TEXT,
    "evaluation_submission_id" TEXT,
    "uploaded_by" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "deletion_requested_at" TIMESTAMP(3),
    "deletion_requested_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_reviews" (
    "id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "action" "EvidenceReviewAction" NOT NULL,
    "comment" TEXT,
    "from_status" "EvidenceStatus",
    "to_status" "EvidenceStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "requirement_id" TEXT,
    "title" TEXT NOT NULL,
    "period_label" TEXT,
    "status" "RiskAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB,
    "created_by" TEXT,
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_items" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "type" "RiskItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "level" TEXT,
    "actions" TEXT,
    "responsible" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_custom_domain_key" ON "tenants"("custom_domain");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_custom_domain_idx" ON "tenants"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "courses_tenant_id_idx" ON "courses"("tenant_id");

-- CreateIndex
CREATE INDEX "courses_professor_id_idx" ON "courses"("professor_id");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_tenant_id_status_idx" ON "courses"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "courses_tenant_id_slug_key" ON "courses"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "course_collaborators_course_id_idx" ON "course_collaborators"("course_id");

-- CreateIndex
CREATE INDEX "course_collaborators_user_id_idx" ON "course_collaborators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_collaborators_course_id_user_id_key" ON "course_collaborators"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "modules_course_id_idx" ON "modules"("course_id");

-- CreateIndex
CREATE INDEX "modules_course_id_position_idx" ON "modules"("course_id", "position");

-- CreateIndex
CREATE INDEX "modules_parent_module_id_idx" ON "modules"("parent_module_id");

-- CreateIndex
CREATE INDEX "lessons_module_id_idx" ON "lessons"("module_id");

-- CreateIndex
CREATE INDEX "lessons_module_id_position_idx" ON "lessons"("module_id", "position");

-- CreateIndex
CREATE INDEX "interactive_stops_lesson_id_idx" ON "interactive_stops"("lesson_id");

-- CreateIndex
CREATE INDEX "interactive_stops_lesson_id_timestamp_seconds_idx" ON "interactive_stops"("lesson_id", "timestamp_seconds");

-- CreateIndex
CREATE INDEX "quizzes_lesson_id_idx" ON "quizzes"("lesson_id");

-- CreateIndex
CREATE INDEX "enrollments_tenant_id_idx" ON "enrollments"("tenant_id");

-- CreateIndex
CREATE INDEX "enrollments_student_id_idx" ON "enrollments"("student_id");

-- CreateIndex
CREATE INDEX "enrollments_course_id_idx" ON "enrollments"("course_id");

-- CreateIndex
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");

-- CreateIndex
CREATE INDEX "enrollments_dc3_edition_id_idx" ON "enrollments"("dc3_edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_course_id_key" ON "enrollments"("student_id", "course_id");

-- CreateIndex
CREATE INDEX "lesson_progresses_enrollment_id_idx" ON "lesson_progresses"("enrollment_id");

-- CreateIndex
CREATE INDEX "lesson_progresses_lesson_id_idx" ON "lesson_progresses"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progresses_enrollment_id_lesson_id_key" ON "lesson_progresses"("enrollment_id", "lesson_id");

-- CreateIndex
CREATE INDEX "interactive_stop_responses_lesson_progress_id_idx" ON "interactive_stop_responses"("lesson_progress_id");

-- CreateIndex
CREATE INDEX "interactive_stop_responses_interactive_stop_id_idx" ON "interactive_stop_responses"("interactive_stop_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_enrollment_id_idx" ON "quiz_attempts"("enrollment_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts"("quiz_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_lesson_id_idx" ON "assignment_submissions"("lesson_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_enrollment_id_idx" ON "assignment_submissions"("enrollment_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_status_idx" ON "assignment_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_enrollment_id_lesson_id_key" ON "assignment_submissions"("enrollment_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_payments_stripe_payment_id_key" ON "course_payments"("stripe_payment_id");

-- CreateIndex
CREATE INDEX "course_payments_tenant_id_idx" ON "course_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "course_payments_student_id_idx" ON "course_payments"("student_id");

-- CreateIndex
CREATE INDEX "course_payments_course_id_idx" ON "course_payments"("course_id");

-- CreateIndex
CREATE INDEX "course_payments_status_idx" ON "course_payments"("status");

-- CreateIndex
CREATE INDEX "course_payments_stripe_payment_id_idx" ON "course_payments"("stripe_payment_id");

-- CreateIndex
CREATE INDEX "workshops_tenant_id_idx" ON "workshops"("tenant_id");

-- CreateIndex
CREATE INDEX "workshops_course_id_idx" ON "workshops"("course_id");

-- CreateIndex
CREATE INDEX "workshops_professor_id_idx" ON "workshops"("professor_id");

-- CreateIndex
CREATE INDEX "workshops_status_idx" ON "workshops"("status");

-- CreateIndex
CREATE INDEX "workshops_start_time_idx" ON "workshops"("start_time");

-- CreateIndex
CREATE INDEX "workshops_tenant_id_status_idx" ON "workshops"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "workshops_parent_workshop_id_idx" ON "workshops"("parent_workshop_id");

-- CreateIndex
CREATE INDEX "workshop_bookings_workshop_id_idx" ON "workshop_bookings"("workshop_id");

-- CreateIndex
CREATE INDEX "workshop_bookings_student_id_idx" ON "workshop_bookings"("student_id");

-- CreateIndex
CREATE INDEX "workshop_bookings_status_idx" ON "workshop_bookings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_bookings_workshop_id_student_id_key" ON "workshop_bookings"("workshop_id", "student_id");

-- CreateIndex
CREATE INDEX "workshop_attendances_workshop_id_idx" ON "workshop_attendances"("workshop_id");

-- CreateIndex
CREATE INDEX "workshop_attendances_student_id_idx" ON "workshop_attendances"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_attendances_workshop_id_student_id_key" ON "workshop_attendances"("workshop_id", "student_id");

-- CreateIndex
CREATE INDEX "advisory_sessions_tenant_id_idx" ON "advisory_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "advisory_sessions_advisor_id_idx" ON "advisory_sessions"("advisor_id");

-- CreateIndex
CREATE INDEX "advisory_sessions_company_id_idx" ON "advisory_sessions"("company_id");

-- CreateIndex
CREATE INDEX "advisory_sessions_start_time_idx" ON "advisory_sessions"("start_time");

-- CreateIndex
CREATE INDEX "advisory_sessions_status_idx" ON "advisory_sessions"("status");

-- CreateIndex
CREATE INDEX "advisory_sessions_parent_session_id_idx" ON "advisory_sessions"("parent_session_id");

-- CreateIndex
CREATE INDEX "advisory_session_participants_session_id_idx" ON "advisory_session_participants"("session_id");

-- CreateIndex
CREATE INDEX "advisory_session_participants_user_id_idx" ON "advisory_session_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "advisory_session_participants_session_id_user_id_key" ON "advisory_session_participants"("session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_enrollment_id_key" ON "certificates"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_folio_key" ON "certificates"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_hash_key" ON "certificates"("hash");

-- CreateIndex
CREATE INDEX "certificates_tenant_id_idx" ON "certificates"("tenant_id");

-- CreateIndex
CREATE INDEX "certificates_folio_idx" ON "certificates"("folio");

-- CreateIndex
CREATE INDEX "certificates_hash_idx" ON "certificates"("hash");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_counters_tenant_id_year_key" ON "certificate_counters"("tenant_id", "year");

-- CreateIndex
CREATE INDEX "training_agents_tenant_id_idx" ON "training_agents"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "training_agents_tenant_id_name_key" ON "training_agents"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "dc3_course_editions_tenant_id_idx" ON "dc3_course_editions"("tenant_id");

-- CreateIndex
CREATE INDEX "dc3_course_editions_course_id_idx" ON "dc3_course_editions"("course_id");

-- CreateIndex
CREATE INDEX "dc3_course_editions_company_id_idx" ON "dc3_course_editions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "dc3_certificates_enrollment_id_key" ON "dc3_certificates"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "dc3_certificates_folio_key" ON "dc3_certificates"("folio");

-- CreateIndex
CREATE INDEX "dc3_certificates_tenant_id_idx" ON "dc3_certificates"("tenant_id");

-- CreateIndex
CREATE INDEX "dc3_certificates_company_id_idx" ON "dc3_certificates"("company_id");

-- CreateIndex
CREATE INDEX "dc3_certificates_folio_idx" ON "dc3_certificates"("folio");

-- CreateIndex
CREATE INDEX "dc3_certificates_status_idx" ON "dc3_certificates"("status");

-- CreateIndex
CREATE INDEX "dc3_print_logs_dc3_id_idx" ON "dc3_print_logs"("dc3_id");

-- CreateIndex
CREATE INDEX "dc3_print_logs_user_id_idx" ON "dc3_print_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dc3_counters_tenant_id_year_key" ON "dc3_counters"("tenant_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "companies_leader_id_key" ON "companies"("leader_id");

-- CreateIndex
CREATE INDEX "companies_tenant_id_idx" ON "companies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tenant_id_slug_key" ON "companies"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "company_invitations_token_key" ON "company_invitations"("token");

-- CreateIndex
CREATE INDEX "company_invitations_company_id_idx" ON "company_invitations"("company_id");

-- CreateIndex
CREATE INDEX "company_invitations_email_idx" ON "company_invitations"("email");

-- CreateIndex
CREATE INDEX "company_invitations_token_idx" ON "company_invitations"("token");

-- CreateIndex
CREATE INDEX "company_invitations_status_idx" ON "company_invitations"("status");

-- CreateIndex
CREATE INDEX "company_course_assignments_company_id_idx" ON "company_course_assignments"("company_id");

-- CreateIndex
CREATE INDEX "company_course_assignments_course_id_idx" ON "company_course_assignments"("course_id");

-- CreateIndex
CREATE INDEX "company_course_assignments_is_active_idx" ON "company_course_assignments"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "company_course_assignments_company_id_course_id_key" ON "company_course_assignments"("company_id", "course_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "ai_generation_jobs_tenant_id_idx" ON "ai_generation_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_generation_jobs_user_id_idx" ON "ai_generation_jobs"("user_id");

-- CreateIndex
CREATE INDEX "ai_generation_jobs_status_idx" ON "ai_generation_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "course_drafts_published_course_id_key" ON "course_drafts"("published_course_id");

-- CreateIndex
CREATE INDEX "course_drafts_tenant_id_idx" ON "course_drafts"("tenant_id");

-- CreateIndex
CREATE INDEX "course_drafts_professor_id_idx" ON "course_drafts"("professor_id");

-- CreateIndex
CREATE INDEX "course_drafts_status_idx" ON "course_drafts"("status");

-- CreateIndex
CREATE INDEX "course_drafts_tenant_id_status_idx" ON "course_drafts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "course_draft_versions_draft_id_idx" ON "course_draft_versions"("draft_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_draft_versions_draft_id_version_key" ON "course_draft_versions"("draft_id", "version");

-- CreateIndex
CREATE INDEX "course_draft_operations_draft_id_idx" ON "course_draft_operations"("draft_id");

-- CreateIndex
CREATE INDEX "course_draft_operations_type_idx" ON "course_draft_operations"("type");

-- CreateIndex
CREATE INDEX "course_draft_operations_created_at_idx" ON "course_draft_operations"("created_at");

-- CreateIndex
CREATE INDEX "ai_credits_ledger_tenant_id_idx" ON "ai_credits_ledger"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_credits_ledger_tenant_id_created_at_idx" ON "ai_credits_ledger"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_credits_ledger_draft_id_idx" ON "ai_credits_ledger"("draft_id");

-- CreateIndex
CREATE INDEX "evaluations_tenant_id_idx" ON "evaluations"("tenant_id");

-- CreateIndex
CREATE INDEX "evaluations_tenant_id_status_idx" ON "evaluations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "evaluation_sections_evaluation_id_idx" ON "evaluation_sections"("evaluation_id");

-- CreateIndex
CREATE INDEX "evaluation_questions_section_id_idx" ON "evaluation_questions"("section_id");

-- CreateIndex
CREATE INDEX "evaluation_assignments_evaluation_id_idx" ON "evaluation_assignments"("evaluation_id");

-- CreateIndex
CREATE INDEX "evaluation_assignments_company_id_idx" ON "evaluation_assignments"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_assignments_evaluation_id_company_id_key" ON "evaluation_assignments"("evaluation_id", "company_id");

-- CreateIndex
CREATE INDEX "evaluation_participants_assignment_id_idx" ON "evaluation_participants"("assignment_id");

-- CreateIndex
CREATE INDEX "evaluation_participants_user_id_idx" ON "evaluation_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_participants_assignment_id_user_id_key" ON "evaluation_participants"("assignment_id", "user_id");

-- CreateIndex
CREATE INDEX "evaluation_submissions_participant_id_idx" ON "evaluation_submissions"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_submissions_participant_id_version_key" ON "evaluation_submissions"("participant_id", "version");

-- CreateIndex
CREATE INDEX "evaluation_answers_submission_id_idx" ON "evaluation_answers"("submission_id");

-- CreateIndex
CREATE INDEX "evaluation_answers_question_id_idx" ON "evaluation_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_answers_submission_id_question_id_key" ON "evaluation_answers"("submission_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "surveys_public_slug_key" ON "surveys"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "surveys_results_share_token_key" ON "surveys"("results_share_token");

-- CreateIndex
CREATE INDEX "surveys_tenant_id_idx" ON "surveys"("tenant_id");

-- CreateIndex
CREATE INDEX "surveys_company_id_idx" ON "surveys"("company_id");

-- CreateIndex
CREATE INDEX "surveys_professor_id_idx" ON "surveys"("professor_id");

-- CreateIndex
CREATE INDEX "surveys_tenant_id_status_idx" ON "surveys"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "surveys_trigger_trigger_course_id_idx" ON "surveys"("trigger", "trigger_course_id");

-- CreateIndex
CREATE INDEX "survey_questions_survey_id_position_idx" ON "survey_questions"("survey_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "survey_campaigns_share_token_key" ON "survey_campaigns"("share_token");

-- CreateIndex
CREATE UNIQUE INDEX "survey_campaigns_results_share_token_key" ON "survey_campaigns"("results_share_token");

-- CreateIndex
CREATE INDEX "survey_campaigns_survey_id_idx" ON "survey_campaigns"("survey_id");

-- CreateIndex
CREATE INDEX "survey_campaigns_tenant_id_idx" ON "survey_campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "survey_campaigns_company_id_idx" ON "survey_campaigns"("company_id");

-- CreateIndex
CREATE INDEX "survey_campaigns_course_id_idx" ON "survey_campaigns"("course_id");

-- CreateIndex
CREATE INDEX "survey_campaigns_status_closes_at_idx" ON "survey_campaigns"("status", "closes_at");

-- CreateIndex
CREATE INDEX "survey_campaigns_tenant_id_status_idx" ON "survey_campaigns"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "survey_recipients_token_key" ON "survey_recipients"("token");

-- CreateIndex
CREATE INDEX "survey_recipients_campaign_id_idx" ON "survey_recipients"("campaign_id");

-- CreateIndex
CREATE INDEX "survey_recipients_user_id_idx" ON "survey_recipients"("user_id");

-- CreateIndex
CREATE INDEX "survey_recipients_status_idx" ON "survey_recipients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "survey_recipients_campaign_id_email_key" ON "survey_recipients"("campaign_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_recipient_id_key" ON "survey_responses"("recipient_id");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_idx" ON "survey_responses"("survey_id");

-- CreateIndex
CREATE INDEX "survey_responses_campaign_id_idx" ON "survey_responses"("campaign_id");

-- CreateIndex
CREATE INDEX "survey_responses_respondent_company_id_idx" ON "survey_responses"("respondent_company_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_campaign_id_email_key" ON "survey_responses"("campaign_id", "email");

-- CreateIndex
CREATE INDEX "survey_answers_question_id_idx" ON "survey_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_answers_response_id_question_id_key" ON "survey_answers"("response_id", "question_id");

-- CreateIndex
CREATE INDEX "manuals_tenant_id_idx" ON "manuals"("tenant_id");

-- CreateIndex
CREATE INDEX "manuals_tenant_id_status_idx" ON "manuals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "manual_chapters_manual_id_position_idx" ON "manual_chapters"("manual_id", "position");

-- CreateIndex
CREATE INDEX "manual_chapters_parent_chapter_id_idx" ON "manual_chapters"("parent_chapter_id");

-- CreateIndex
CREATE INDEX "manual_sections_chapter_id_position_idx" ON "manual_sections"("chapter_id", "position");

-- CreateIndex
CREATE INDEX "manual_section_items_section_id_kind_position_idx" ON "manual_section_items"("section_id", "kind", "position");

-- CreateIndex
CREATE INDEX "manual_documents_manual_id_idx" ON "manual_documents"("manual_id");

-- CreateIndex
CREATE UNIQUE INDEX "manual_documents_manual_id_code_key" ON "manual_documents"("manual_id", "code");

-- CreateIndex
CREATE INDEX "manual_section_documents_document_id_idx" ON "manual_section_documents"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "manual_section_documents_section_id_document_id_key" ON "manual_section_documents"("section_id", "document_id");

-- CreateIndex
CREATE INDEX "evidence_requirements_section_id_position_idx" ON "evidence_requirements"("section_id", "position");

-- CreateIndex
CREATE INDEX "evidence_requirements_evaluation_id_idx" ON "evidence_requirements"("evaluation_id");

-- CreateIndex
CREATE INDEX "manual_assignments_company_id_idx" ON "manual_assignments"("company_id");

-- CreateIndex
CREATE INDEX "manual_assignments_tenant_id_idx" ON "manual_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "manual_assignments_manual_id_idx" ON "manual_assignments"("manual_id");

-- CreateIndex
CREATE UNIQUE INDEX "manual_assignments_manual_id_company_id_key" ON "manual_assignments"("manual_id", "company_id");

-- CreateIndex
CREATE INDEX "manual_item_checks_assignment_id_idx" ON "manual_item_checks"("assignment_id");

-- CreateIndex
CREATE INDEX "manual_item_checks_item_id_idx" ON "manual_item_checks"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "manual_item_checks_assignment_id_item_id_key" ON "manual_item_checks"("assignment_id", "item_id");

-- CreateIndex
CREATE INDEX "company_documents_company_id_idx" ON "company_documents"("company_id");

-- CreateIndex
CREATE INDEX "company_documents_document_id_idx" ON "company_documents"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_documents_document_id_company_id_version_key" ON "company_documents"("document_id", "company_id", "version");

-- CreateIndex
CREATE INDEX "compliance_activities_status_due_at_idx" ON "compliance_activities"("status", "due_at");

-- CreateIndex
CREATE INDEX "compliance_activities_assignment_id_idx" ON "compliance_activities"("assignment_id");

-- CreateIndex
CREATE INDEX "compliance_activities_requirement_id_idx" ON "compliance_activities"("requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_activities_assignment_id_requirement_id_period_n_key" ON "compliance_activities"("assignment_id", "requirement_id", "period_number");

-- CreateIndex
CREATE INDEX "evidences_assignment_id_status_idx" ON "evidences"("assignment_id", "status");

-- CreateIndex
CREATE INDEX "evidences_activity_id_idx" ON "evidences"("activity_id");

-- CreateIndex
CREATE INDEX "evidences_status_idx" ON "evidences"("status");

-- CreateIndex
CREATE INDEX "evidences_risk_assessment_id_idx" ON "evidences"("risk_assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidences_activity_id_version_key" ON "evidences"("activity_id", "version");

-- CreateIndex
CREATE INDEX "evidence_reviews_evidence_id_created_at_idx" ON "evidence_reviews"("evidence_id", "created_at");

-- CreateIndex
CREATE INDEX "risk_assessments_company_id_status_idx" ON "risk_assessments"("company_id", "status");

-- CreateIndex
CREATE INDEX "risk_assessments_tenant_id_idx" ON "risk_assessments"("tenant_id");

-- CreateIndex
CREATE INDEX "risk_assessments_assignment_id_idx" ON "risk_assessments"("assignment_id");

-- CreateIndex
CREATE INDEX "risk_items_assessment_id_position_idx" ON "risk_items"("assessment_id", "position");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_dc3_training_agent_id_fkey" FOREIGN KEY ("dc3_training_agent_id") REFERENCES "training_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_collaborators" ADD CONSTRAINT "course_collaborators_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_collaborators" ADD CONSTRAINT "course_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_collaborators" ADD CONSTRAINT "course_collaborators_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_parent_module_id_fkey" FOREIGN KEY ("parent_module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactive_stops" ADD CONSTRAINT "interactive_stops_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_dc3_edition_id_fkey" FOREIGN KEY ("dc3_edition_id") REFERENCES "dc3_course_editions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progresses" ADD CONSTRAINT "lesson_progresses_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progresses" ADD CONSTRAINT "lesson_progresses_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactive_stop_responses" ADD CONSTRAINT "interactive_stop_responses_lesson_progress_id_fkey" FOREIGN KEY ("lesson_progress_id") REFERENCES "lesson_progresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactive_stop_responses" ADD CONSTRAINT "interactive_stop_responses_interactive_stop_id_fkey" FOREIGN KEY ("interactive_stop_id") REFERENCES "interactive_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_payments" ADD CONSTRAINT "course_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_payments" ADD CONSTRAINT "course_payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_payments" ADD CONSTRAINT "course_payments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_parent_workshop_id_fkey" FOREIGN KEY ("parent_workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_bookings" ADD CONSTRAINT "workshop_bookings_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_bookings" ADD CONSTRAINT "workshop_bookings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_attendances" ADD CONSTRAINT "workshop_attendances_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_attendances" ADD CONSTRAINT "workshop_attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_sessions" ADD CONSTRAINT "advisory_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_sessions" ADD CONSTRAINT "advisory_sessions_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_sessions" ADD CONSTRAINT "advisory_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_sessions" ADD CONSTRAINT "advisory_sessions_parent_session_id_fkey" FOREIGN KEY ("parent_session_id") REFERENCES "advisory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_session_participants" ADD CONSTRAINT "advisory_session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "advisory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_session_participants" ADD CONSTRAINT "advisory_session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_counters" ADD CONSTRAINT "certificate_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_agents" ADD CONSTRAINT "training_agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_course_editions" ADD CONSTRAINT "dc3_course_editions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_course_editions" ADD CONSTRAINT "dc3_course_editions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_course_editions" ADD CONSTRAINT "dc3_course_editions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_certificates" ADD CONSTRAINT "dc3_certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_certificates" ADD CONSTRAINT "dc3_certificates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_certificates" ADD CONSTRAINT "dc3_certificates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_certificates" ADD CONSTRAINT "dc3_certificates_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_print_logs" ADD CONSTRAINT "dc3_print_logs_dc3_id_fkey" FOREIGN KEY ("dc3_id") REFERENCES "dc3_certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_print_logs" ADD CONSTRAINT "dc3_print_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dc3_counters" ADD CONSTRAINT "dc3_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_dc3_confirmed_by_id_fkey" FOREIGN KEY ("dc3_confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_course_assignments" ADD CONSTRAINT "company_course_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_course_assignments" ADD CONSTRAINT "company_course_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_course_assignments" ADD CONSTRAINT "company_course_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_drafts" ADD CONSTRAINT "course_drafts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_drafts" ADD CONSTRAINT "course_drafts_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_draft_versions" ADD CONSTRAINT "course_draft_versions_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "course_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_draft_operations" ADD CONSTRAINT "course_draft_operations_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "course_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_credits_ledger" ADD CONSTRAINT "ai_credits_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_sections" ADD CONSTRAINT "evaluation_sections_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_questions" ADD CONSTRAINT "evaluation_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "evaluation_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_assignments" ADD CONSTRAINT "evaluation_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_participants" ADD CONSTRAINT "evaluation_participants_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "evaluation_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_participants" ADD CONSTRAINT "evaluation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_participants" ADD CONSTRAINT "evaluation_participants_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_submissions" ADD CONSTRAINT "evaluation_submissions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "evaluation_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_submissions" ADD CONSTRAINT "evaluation_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_answers" ADD CONSTRAINT "evaluation_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "evaluation_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_answers" ADD CONSTRAINT "evaluation_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "evaluation_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_trigger_course_id_fkey" FOREIGN KEY ("trigger_course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_advisory_session_id_fkey" FOREIGN KEY ("advisory_session_id") REFERENCES "advisory_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_results_published_by_fkey" FOREIGN KEY ("results_published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_recipients" ADD CONSTRAINT "survey_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_recipients" ADD CONSTRAINT "survey_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "survey_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_respondent_company_id_fkey" FOREIGN KEY ("respondent_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manuals" ADD CONSTRAINT "manuals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manuals" ADD CONSTRAINT "manuals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_chapters" ADD CONSTRAINT "manual_chapters_manual_id_fkey" FOREIGN KEY ("manual_id") REFERENCES "manuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_chapters" ADD CONSTRAINT "manual_chapters_parent_chapter_id_fkey" FOREIGN KEY ("parent_chapter_id") REFERENCES "manual_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_sections" ADD CONSTRAINT "manual_sections_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "manual_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_section_items" ADD CONSTRAINT "manual_section_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "manual_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_documents" ADD CONSTRAINT "manual_documents_manual_id_fkey" FOREIGN KEY ("manual_id") REFERENCES "manuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_documents" ADD CONSTRAINT "manual_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_section_documents" ADD CONSTRAINT "manual_section_documents_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "manual_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_section_documents" ADD CONSTRAINT "manual_section_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "manual_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_requirements" ADD CONSTRAINT "evidence_requirements_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "manual_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_requirements" ADD CONSTRAINT "evidence_requirements_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_assignments" ADD CONSTRAINT "manual_assignments_manual_id_fkey" FOREIGN KEY ("manual_id") REFERENCES "manuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_assignments" ADD CONSTRAINT "manual_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_assignments" ADD CONSTRAINT "manual_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_assignments" ADD CONSTRAINT "manual_assignments_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_assignments" ADD CONSTRAINT "manual_assignments_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_item_checks" ADD CONSTRAINT "manual_item_checks_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "manual_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_item_checks" ADD CONSTRAINT "manual_item_checks_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "manual_section_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_item_checks" ADD CONSTRAINT "manual_item_checks_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "manual_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_activities" ADD CONSTRAINT "compliance_activities_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "manual_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_activities" ADD CONSTRAINT "compliance_activities_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "evidence_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "compliance_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "manual_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_risk_assessment_id_fkey" FOREIGN KEY ("risk_assessment_id") REFERENCES "risk_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_evaluation_submission_id_fkey" FOREIGN KEY ("evaluation_submission_id") REFERENCES "evaluation_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_deletion_requested_by_fkey" FOREIGN KEY ("deletion_requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "manual_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "evidence_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_items" ADD CONSTRAINT "risk_items_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "risk_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

