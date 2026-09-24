import type { NextRequest } from "next/server";
import { AIError, generateSteps } from "@/lib/ai";
import { errorResponse, parseId } from "@/lib/http";
import { getTodo, setSteps } from "@/lib/todos";

/** Generates (or regenerates) AI steps for a to-do and stores them on the item. */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/todos/[id]/steps">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return errorResponse("Invalid id", 400);

  const todo = getTodo(id);
  if (!todo) return errorResponse("To-do not found", 404);

  try {
    const steps = await generateSteps(todo.title);
    const updated = setSteps(id, steps);
    // The item may have been deleted while the AI request was in flight.
    return updated ? Response.json(updated) : errorResponse("To-do not found", 404);
  } catch (error) {
    if (error instanceof AIError) return errorResponse(error.message, error.status);
    console.error("Failed to generate steps", error);
    return errorResponse("Failed to generate steps", 500);
  }
}
