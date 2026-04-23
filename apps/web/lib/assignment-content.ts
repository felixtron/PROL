// Plain helpers for ASSIGNMENT lesson content. Lives outside `lib/actions`
// so it can be imported from both server actions ("use server" files only
// allow async exports) and from React components.

export interface AssignmentContent {
  instructions: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  dueAt?: string | null;
}

export function readAssignmentContent(content: unknown): AssignmentContent {
  if (
    content &&
    typeof content === "object" &&
    typeof (content as { instructions?: unknown }).instructions === "string"
  ) {
    return content as AssignmentContent;
  }
  return { instructions: "" };
}
