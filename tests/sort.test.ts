import { describe, expect, it } from "vitest";
import { sortTodos } from "@/lib/sort";
import type { Todo } from "@/lib/types";

const todo = (id: number, overrides: Partial<Todo> = {}): Todo => ({
  id,
  title: `Todo ${id}`,
  completed: false,
  createdAt: `2026-01-0${id}T00:00:00.000Z`,
  completedAt: null,
  steps: null,
  ...overrides,
});

describe("sortTodos", () => {
  it("puts completed items after open items", () => {
    const sorted = sortTodos([
      todo(1, { completed: true, completedAt: "2026-02-01T00:00:00.000Z" }),
      todo(2),
      todo(3),
    ]);
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("orders open items oldest first", () => {
    expect(sortTodos([todo(3), todo(1), todo(2)]).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it("orders completed items most recently completed first", () => {
    const sorted = sortTodos([
      todo(1, { completed: true, completedAt: "2026-02-01T00:00:00.000Z" }),
      todo(2, { completed: true, completedAt: "2026-02-03T00:00:00.000Z" }),
      todo(3, { completed: true, completedAt: "2026-02-02T00:00:00.000Z" }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("does not mutate its input", () => {
    const input = [todo(2), todo(1)];
    sortTodos(input);
    expect(input.map((t) => t.id)).toEqual([2, 1]);
  });
});
