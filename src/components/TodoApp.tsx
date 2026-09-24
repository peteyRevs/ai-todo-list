"use client";

import { useState } from "react";
import { sortTodos } from "@/lib/sort";
import type { Todo } from "@/lib/types";
import { TITLE_MAX_LENGTH } from "@/lib/validation";

type Props = {
  initialTodos: Todo[];
  aiEnabled: boolean;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
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

  // After a failed optimistic update, the server is the source of truth.
  async function resync(err: unknown) {
    setError(err instanceof Error ? err.message : "Something went wrong");
    try {
      setTodos(await request<Todo[]>("/api/todos"));
    } catch {
      // Keep the error already shown.
    }
  }

  async function addTodo(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    setError(null);
    try {
      const todo = await request<Todo>("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: trimmed }),
      });
      update((prev) => [...prev, todo]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add to-do");
    } finally {
      setAdding(false);
    }
  }

  async function toggleTodo(todo: Todo) {
    const completed = !todo.completed;
    setError(null);
    replace({ ...todo, completed, completedAt: completed ? new Date().toISOString() : null });
    try {
      replace(
        await request<Todo>(`/api/todos/${todo.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed }),
        }),
      );
    } catch (err) {
      await resync(err);
    }
  }

  async function deleteTodo(id: number) {
    setError(null);
    update((prev) => prev.filter((t) => t.id !== id));
    try {
      await request(`/api/todos/${id}`, { method: "DELETE" });
    } catch (err) {
      await resync(err);
    }
  }

  const setMember = (set: Set<number>, id: number, member: boolean) => {
    const next = new Set(set);
    if (member) next.add(id);
    else next.delete(id);
    return next;
  };

  async function generateSteps(id: number) {
    setError(null);
    setGenerating((s) => setMember(s, id, true));
    setExpanded((s) => setMember(s, id, true));
    try {
      replace(await request<Todo>(`/api/todos/${id}/steps`, { method: "POST" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate steps");
    } finally {
      setGenerating((s) => setMember(s, id, false));
    }
  }

  function onWand(todo: Todo) {
    if (todo.steps) {
      setExpanded((s) => setMember(s, todo.id, !s.has(todo.id)));
    } else {
      void generateSteps(todo.id);
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

      <form onSubmit={addTodo} className="mb-4 flex gap-2">
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
            onToggle={() => toggleTodo(todo)}
            onDelete={() => deleteTodo(todo.id)}
            onWand={() => onWand(todo)}
            onRegenerate={() => generateSteps(todo.id)}
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

type TodoItemProps = {
  todo: Todo;
  aiEnabled: boolean;
  generating: boolean;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onWand: () => void;
  onRegenerate: () => void;
};

function TodoItem({
  todo,
  aiEnabled,
  generating,
  expanded,
  onToggle,
  onDelete,
  onWand,
  onRegenerate,
}: TodoItemProps) {
  const checkboxId = `todo-${todo.id}`;
  const wandLabel = !aiEnabled
    ? "AI steps unavailable: GEMINI_API_KEY is not set"
    : todo.steps
      ? expanded
        ? "Hide AI steps"
        : "Show AI steps"
      : "Suggest steps with AI";

  return (
    <li className="group">
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={todo.completed}
          onChange={onToggle}
          className="size-5 shrink-0 cursor-pointer accent-violet-600"
        />
        <label
          htmlFor={checkboxId}
          className={`min-w-0 flex-1 cursor-pointer wrap-break-word ${
            todo.completed ? "text-stone-400 line-through" : ""
          }`}
        >
          {todo.title}
        </label>
        <button
          onClick={onWand}
          disabled={!aiEnabled || generating}
          title={wandLabel}
          aria-label={wandLabel}
          aria-expanded={todo.steps ? expanded : undefined}
          className={`rounded-md p-1.5 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-violet-950 ${
            todo.steps ? "text-violet-600" : "text-stone-400 hover:text-violet-600"
          }`}
        >
          {generating ? <Spinner /> : <WandIcon />}
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          aria-label={`Delete "${todo.title}"`}
          className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          <TrashIcon />
        </button>
      </div>

      {expanded && (generating || todo.steps) && (
        <div className="mx-4 mb-3 rounded-lg bg-violet-50 px-4 py-3 text-sm dark:bg-violet-950/40">
          {generating ? (
            <p className="text-stone-500">Thinking up some steps…</p>
          ) : (
            <>
              <ol className="list-decimal space-y-1 pl-5">
                {todo.steps?.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <button
                onClick={onRegenerate}
                className="mt-2 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
              >
                Regenerate
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function WandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3 21 12-12M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6zM8 3l.6 1.4L10 5l-1.4.6L8 7l-.6-1.4L6 5l1.4-.6z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
