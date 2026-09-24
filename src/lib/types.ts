export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  /** AI-generated steps, cached once generated. */
  steps: string[] | null;
};

/**
 * Server actions return expected errors as values: Next.js hides the
 * message of errors thrown from server actions in production builds.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
