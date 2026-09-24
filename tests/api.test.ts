import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as collection from "@/app/api/todos/route";
import * as item from "@/app/api/todos/[id]/route";
import * as steps from "@/app/api/todos/[id]/steps/route";
import { AIError, generateSteps } from "@/lib/ai";
import { getDb } from "@/lib/db";
import type { Todo } from "@/lib/types";

vi.mock("@/lib/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai")>()),
  generateSteps: vi.fn(),
}));

const url = "http://localhost/api/todos";
const ctx = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
const json = (method: string, body: unknown) =>
  new NextRequest(url, { method, body: JSON.stringify(body) });

async function create(title: string): Promise<Todo> {
  const res = await collection.POST(json("POST", { title }));
  expect(res.status).toBe(201);
  return res.json();
}

async function list(): Promise<Todo[]> {
  return (await collection.GET()).json();
}

beforeEach(() => {
  getDb().exec("DELETE FROM todos");
  vi.mocked(generateSteps).mockReset();
});

describe("POST /api/todos", () => {
  it("creates a trimmed, incomplete to-do", async () => {
    const todo = await create("  Buy milk  ");
    expect(todo).toMatchObject({ title: "Buy milk", completed: false, steps: null });
    expect(await list()).toHaveLength(1);
  });

  it.each([{ title: "   " }, { title: "x".repeat(201) }, {}])("rejects %j", async (body) => {
    const res = await collection.POST(json("POST", body));
    expect(res.status).toBe(400);
    expect(await list()).toHaveLength(0);
  });

  it("rejects malformed JSON", async () => {
    const res = await collection.POST(new NextRequest(url, { method: "POST", body: "{" }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/todos/:id", () => {
  it("sorts completed items to the bottom and back up when reopened", async () => {
    const a = await create("A");
    const b = await create("B");
    const c = await create("C");

    await item.PATCH(json("PATCH", { completed: true }), ctx(a.id));
    expect((await list()).map((t) => t.title)).toEqual(["B", "C", "A"]);

    await item.PATCH(json("PATCH", { completed: false }), ctx(a.id));
    expect((await list()).map((t) => t.title)).toEqual(["A", "B", "C"]);
    expect(b.id).toBeLessThan(c.id);
  });

  it("returns 404 for a missing to-do and 400 for a bad id or body", async () => {
    expect((await item.PATCH(json("PATCH", { completed: true }), ctx(999))).status).toBe(404);
    expect((await item.PATCH(json("PATCH", { completed: true }), ctx("abc"))).status).toBe(400);
    const todo = await create("A");
    expect((await item.PATCH(json("PATCH", { completed: "yes" }), ctx(todo.id))).status).toBe(400);
  });
});

describe("DELETE /api/todos/:id", () => {
  it("deletes a to-do", async () => {
    const todo = await create("A");
    const res = await item.DELETE(new NextRequest(url, { method: "DELETE" }), ctx(todo.id));
    expect(res.status).toBe(204);
    expect(await list()).toHaveLength(0);
  });

  it("returns 404 when the to-do does not exist", async () => {
    const res = await item.DELETE(new NextRequest(url, { method: "DELETE" }), ctx(999));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/todos/:id/steps", () => {
  const post = (id: number) => steps.POST(new NextRequest(url, { method: "POST" }), ctx(id));

  it("generates steps and stores them on the to-do", async () => {
    vi.mocked(generateSteps).mockResolvedValue(["Step one", "Step two"]);
    const todo = await create("Plan a trip");

    const res = await post(todo.id);
    expect(res.status).toBe(200);
    expect((await res.json()).steps).toEqual(["Step one", "Step two"]);
    expect(generateSteps).toHaveBeenCalledWith("Plan a trip");
    expect((await list())[0].steps).toEqual(["Step one", "Step two"]);
  });

  it("passes AI errors through with their status", async () => {
    vi.mocked(generateSteps).mockRejectedValue(new AIError("AI is not configured.", 503));
    const todo = await create("A");

    const res = await post(todo.id);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "AI is not configured." });
  });

  it("returns 404 for a missing to-do without calling the AI", async () => {
    expect((await post(999)).status).toBe(404);
    expect(generateSteps).not.toHaveBeenCalled();
  });
});
