import { getDb } from "./db";
import { sortTodos } from "./sort";
import type { Todo } from "./types";

type TodoRow = {
  id: number;
  title: string;
  completed: number;
  created_at: string;
  completed_at: string | null;
  steps: string | null;
};

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    steps: row.steps ? (JSON.parse(row.steps) as string[]) : null,
  };
}

export function listTodos(): Todo[] {
  const rows = getDb().prepare("SELECT * FROM todos").all() as TodoRow[];
  return sortTodos(rows.map(toTodo));
}

export function getTodo(id: number): Todo | null {
  const row = getDb().prepare("SELECT * FROM todos WHERE id = ?").get(id) as
    | TodoRow
    | undefined;
  return row ? toTodo(row) : null;
}

export function createTodo(title: string): Todo {
  const row = getDb()
    .prepare("INSERT INTO todos (title, created_at) VALUES (?, ?) RETURNING *")
    .get(title, new Date().toISOString()) as TodoRow;
  return toTodo(row);
}

export function setCompleted(id: number, completed: boolean): Todo | null {
  const row = getDb()
    .prepare(
      "UPDATE todos SET completed = ?, completed_at = ? WHERE id = ? RETURNING *",
    )
    .get(completed ? 1 : 0, completed ? new Date().toISOString() : null, id) as
    | TodoRow
    | undefined;
  return row ? toTodo(row) : null;
}

export function setSteps(id: number, steps: string[]): Todo | null {
  const row = getDb()
    .prepare("UPDATE todos SET steps = ? WHERE id = ? RETURNING *")
    .get(JSON.stringify(steps), id) as TodoRow | undefined;
  return row ? toTodo(row) : null;
}

export function deleteTodo(id: number): boolean {
  return getDb().prepare("DELETE FROM todos WHERE id = ?").run(id).changes > 0;
}
