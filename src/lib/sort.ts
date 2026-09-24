import type { Todo } from "./types";

/**
 * Open items first (oldest first, in the order they were added), then
 * completed items (most recently completed first). Shared by the server
 * query and the client so optimistic updates land in the same position.
 */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.completed && b.completed) {
      const byCompleted = (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
      if (byCompleted !== 0) return byCompleted;
      return b.id - a.id;
    }
    return a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
  });
}
