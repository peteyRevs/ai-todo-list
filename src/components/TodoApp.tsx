"use client";

import { useState } from "react";
import {
  addTodo,
  deleteTodo,
  generateTodoSteps,
  getTodos,
  setTodoCompleted,
} from "@/actions/todos";
import { sortTodos } from "@/lib/sort";
import type { ActionResult, Todo } from "@/lib/types";
import { TITLE_MAX_LENGTH } from "@/lib/validation";
import TodoItem from "./TodoItem";

type Props = {
  initialTodos: Todo[];
  aiEnabled: boolean;
};

function toggleMember(set: Set<number>, id: number, member: boolean): Set<number> {
  const next = new Set(set);
  if (member) next.add(id);
  else next.delete(id);
  return next;
}

export default function TodoApp({ initialTodos, aiEnabled }: Props) {
  const [todos, setTodos] = useState(initialTodos);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const update = (fn: (todos: Todo[]) => Todo[]) => setTodos((prev) => sortTodos(fn(prev)));
  const replace = (todo: Todo) => update((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));

  /** Runs a server action, showing its error (or a network failure) in the banner. */
  async function run<T>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
    setError(null);
    let result: ActionResult<T>;
    try {
      result = await action();
    } catch {
      result = { ok: false, error: "Could not reach the server. Please try again." };
    }
    if (!result.ok) setError(result.error);
    return result;
  }

  // After a failed optimistic update, the server is the source of truth.
  async function resync() {
    const result = await getTodos().catch(() => null);
    if (result?.ok) setTodos(result.data);
  }

  async function onAdd(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || adding) return;
    setAdding(true);
    const result = await run(() => addTodo(title));
    if (result.ok) {
      update((prev) => [...prev, result.data]);
      setTitle("");
    }
    setAdding(false);
  }

  async function onToggle(todo: Todo) {
    const completed = !todo.completed;
    replace({ ...todo, completed, completedAt: completed ? new Date().toISOString() : null });
    const result = await run(() => setTodoCompleted(todo.id, completed));
    if (result.ok) replace(result.data);
    else await resync();
  }

  async function onDelete(id: number) {
    update((prev) => prev.filter((t) => t.id !== id));
    const result = await run(() => deleteTodo(id));
    if (!result.ok) await resync();
  }

  async function onGenerate(id: number) {
    setGenerating((s) => toggleMember(s, id, true));
    setExpanded((s) => toggleMember(s, id, true));
    const result = await run(() => generateTodoSteps(id));
    if (result.ok) replace(result.data);
    setGenerating((s) => toggleMember(s, id, false));
  }

  function onWand(todo: Todo) {
    if (todo.steps) {
      setExpanded((s) => toggleMember(s, todo.id, !s.has(todo.id)));
    } else {
      void onGenerate(todo.id);
    }
  }

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:py-20">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">To-do</h1>
        <p className="mt-1 text-sm text-stone-500" aria-live="polite">
          {todos.length === 0
            ? "Nothing here yet."
            : `${remaining} of ${todos.length} remaining`}
        </p>
      </header>

      <form onSubmit={onAdd} className="mb-4 flex gap-2">
        <label htmlFor="new-todo" className="sr-only">
          New to-do
        </label>
        <input
          id="new-todo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="What needs doing?"
          autoComplete="off"
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-stone-700 dark:bg-stone-900"
        />
        <button
          type="submit"
          disabled={adding || !title.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="font-medium">
            ✕
          </button>
        </div>
      )}

      <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            aiEnabled={aiEnabled}
            generating={generating.has(todo.id)}
            expanded={expanded.has(todo.id)}
            onToggle={() => onToggle(todo)}
            onDelete={() => onDelete(todo.id)}
            onWand={() => onWand(todo)}
            onRegenerate={() => onGenerate(todo.id)}
          />
        ))}
        {todos.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-stone-500">
            Add your first to-do above.
          </li>
        )}
      </ul>
    </main>
  );
}
