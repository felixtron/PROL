// ─────────────────────────────────────────────────────────────────────────────
// App-Level Types (NOT duplicating Prisma — these are for frontend/API use)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Branding
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantBranding {
  logo: string | null;
  primaryColor: string;
  accentColor: string;
  favicon: string | null;
  customCss: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Course Card (catalog / listings)
// ─────────────────────────────────────────────────────────────────────────────

export interface CourseCard {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  priceInCents: number;
  currency: string;
  professorName: string;
  studentsCount: number;
  rating: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalStudents: number;
  totalRevenue: number;
  activeCourses: number;
  completionRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson With Progress (student course player)
// ─────────────────────────────────────────────────────────────────────────────

export type LessonProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface LessonWithProgress {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  position: number;
  type: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT";
  videoDurationSeconds: number | null;
  isFree: boolean;
  // Progress info
  status: LessonProgressStatus;
  videoPositionSeconds: number;
  completedAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Stop Content (discriminated union by type)
// ─────────────────────────────────────────────────────────────────────────────

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionStopContent {
  type: "QUESTION";
  question: string;
  options: QuestionOption[];
  explanation: string | null;
}

export interface ReflectionStopContent {
  type: "REFLECTION";
  prompt: string;
  minLength: number | null;
}

export interface ExerciseStopContent {
  type: "EXERCISE";
  instructions: string;
  hints: string[];
  sampleAnswer: string | null;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface PollStopContent {
  type: "POLL";
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export type InteractiveStopContent =
  | QuestionStopContent
  | ReflectionStopContent
  | ExerciseStopContent
  | PollStopContent;

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic API Response
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: Pagination;
}
