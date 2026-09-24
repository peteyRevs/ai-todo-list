export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  /** AI-generated steps, cached once generated. */
  steps: string[] | null;
};
