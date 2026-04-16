export {
  generateCourseOutline,
} from "./pipelines/course-outline";
export type {
  CourseOutline,
  CourseOutlineModule,
  CourseOutlineLesson,
  GenerateCourseOutlineInput,
} from "./pipelines/course-outline";

export {
  submitVideoForTranscription,
  checkTranscriptionStatus,
  enhanceTranscript,
} from "./pipelines/video-processing";
export type {
  VideoProcessingResult,
  InteractiveStop,
  QuizSuggestion,
  ProcessVideoInput,
} from "./pipelines/video-processing";

export {
  generateLessonContent,
} from "./pipelines/lesson-content";
export type {
  GenerateLessonContentInput,
  LessonContentResult,
} from "./pipelines/lesson-content";

export {
  enrichCourse,
} from "./pipelines/course-enrichment";
export type {
  CourseEnrichmentResult,
  EnrichmentSuggestion,
} from "./pipelines/course-enrichment";
