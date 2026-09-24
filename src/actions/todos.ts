"use server";

import { z } from "zod";
import { AIError, generateSteps } from "@/lib/ai";
import * as db from "@/lib/todos";
import type { ActionResult, Todo } from "@/lib/types";
import { completedSchema, idSchema, titleSchema } from "@/lib/validation";

// Server actions are reachable by direct POST requests, so every argument is
// validated here rather than trusting the client's types.

const NOT_FOUND = "To-do not found";

function invalid(error: z.ZodError): { ok: false; error: string } {
  return { ok: false, error: error.issues[0]?.message ?? "Invalid request" };
}

export async function getTodos(): Promise<ActionResult<Todo[]>> {
  return { ok: true, data: db.listTodos() };
}

export async function addTodo(title: unknown): Promise<ActionResult<Todo>> {
  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) return invalid(parsed.error);
  return { ok: true, data: db.createTodo(parsed.data) };
}

export async function setTodoCompleted(
  id: unknown,
  completed: unknown,
): Promise<ActionResult<Todo>> {
  const parsed = z.tuple([idSchema, completedSchema]).safeParse([id, completed]);
  if (!parsed.success) return invalid(parsed.error);
  const todo = db.setCompleted(...parsed.data);
  return todo ? { ok: true, data: todo } : { ok: false, error: NOT_FOUND };
}

export async function deleteTodo(id: unknown): Promise<ActionResult<null>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  return db.deleteTodo(parsed.data) ? { ok: true, data: null } : { ok: false, error: NOT_FOUND };
}

/** Generates (or regenerates) AI steps for a to-do and stores them on the item. */
export async function generateTodoSteps(id: unknown): Promise<ActionResult<Todo>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);

  const todo = db.getTodo(parsed.data);
  if (!todo) return { ok: false, error: NOT_FOUND };

  try {
    const steps = await generateSteps(todo.title);
    // The item may have been deleted while the AI request was in flight.
    const updated = db.setSteps(todo.id, steps);
    return updated ? { ok: true, data: updated } : { ok: false, error: NOT_FOUND };
  } catch (error) {
    if (error instanceof AIError) return { ok: false, error: error.message };
    console.error("Failed to generate steps", error);
    return { ok: false, error: "Failed to generate steps" };
  }
}
