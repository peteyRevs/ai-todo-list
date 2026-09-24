import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addTodo,
  deleteTodo,
  generateTodoSteps,
  getTodos,
  setTodoCompleted,
} from "@/actions/todos";
import { AIError, generateSteps } from "@/lib/ai";
import { getDb } from "@/lib/db";
import type { ActionResult, Todo } from "@/lib/types";

vi.mock("@/lib/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai")>()),
  generateSteps: vi.fn(),
}));

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(`Expected success, got: ${result.error}`);
  return result.data;
}

const create = async (title: string) => unwrap(await addTodo(title));
const titles = async () => unwrap(await getTodos()).map((t: Todo) => t.title);

beforeEach(() => {
  getDb().exec("DELETE FROM todos");
  vi.mocked(generateSteps).mockReset();
});

describe("addTodo", () => {
  it("creates a trimmed, incomplete to-do", async () => {
    expect(await create("  Buy milk  ")).toMatchObject({
      title: "Buy milk",
      completed: false,
      steps: null,
    });
    expect(await titles()).toEqual(["Buy milk"]);
  });

  it.each([["   "], ["x".repeat(201)], [undefined], [42]])("rejects %j", async (title) => {
    expect(await addTodo(title)).toMatchObject({ ok: false });
    expect(await titles()).toEqual([]);
  });
});

describe("setTodoCompleted", () => {
  it("sorts completed items to the bottom and back up when reopened", async () => {
    const a = await create("A");
    await create("B");
    await create("C");

    unwrap(await setTodoCompleted(a.id, true));
    expect(await titles()).toEqual(["B", "C", "A"]);

    unwrap(await setTodoCompleted(a.id, false));
    expect(await titles()).toEqual(["A", "B", "C"]);
  });

  it("rejects missing to-dos and invalid arguments", async () => {
    const todo = await create("A");
    expect(await setTodoCompleted(999, true)).toEqual({ ok: false, error: "To-do not found" });
    expect(await setTodoCompleted("1", true)).toMatchObject({ ok: false });
    expect(await setTodoCompleted(todo.id, "yes")).toMatchObject({ ok: false });
  });
});

describe("deleteTodo", () => {
  it("deletes a to-do", async () => {
    const todo = await create("A");
    expect(await deleteTodo(todo.id)).toEqual({ ok: true, data: null });
    expect(await titles()).toEqual([]);
  });

  it("reports a missing to-do", async () => {
    expect(await deleteTodo(999)).toEqual({ ok: false, error: "To-do not found" });
  });
});

describe("generateTodoSteps", () => {
  it("generates steps and stores them on the to-do", async () => {
    vi.mocked(generateSteps).mockResolvedValue(["Step one", "Step two"]);
    const todo = await create("Plan a trip");

    expect(unwrap(await generateTodoSteps(todo.id)).steps).toEqual(["Step one", "Step two"]);
    expect(generateSteps).toHaveBeenCalledWith("Plan a trip");
    expect(unwrap(await getTodos())[0].steps).toEqual(["Step one", "Step two"]);
  });

  it("returns AI errors as values", async () => {
    vi.mocked(generateSteps).mockRejectedValue(new AIError("AI is not configured."));
    const todo = await create("A");
    expect(await generateTodoSteps(todo.id)).toEqual({ ok: false, error: "AI is not configured." });
  });

  it("reports a missing to-do without calling the AI", async () => {
    expect(await generateTodoSteps(999)).toEqual({ ok: false, error: "To-do not found" });
    expect(generateSteps).not.toHaveBeenCalled();
  });
});
