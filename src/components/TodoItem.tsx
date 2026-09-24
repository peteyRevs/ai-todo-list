import type { Todo } from "@/lib/types";
import { Spinner, TrashIcon, WandIcon } from "./icons";

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

export default function TodoItem({
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
