import type { NextRequest } from "next/server";
import { errorResponse, parseId, parseJson } from "@/lib/http";
import { deleteTodo, setCompleted } from "@/lib/todos";
import { updateTodoSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/todos/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return errorResponse("Invalid id", 400);

  const parsed = await parseJson(request, updateTodoSchema);
  if ("error" in parsed) return parsed.error;

  const todo = setCompleted(id, parsed.data.completed);
  return todo ? Response.json(todo) : errorResponse("To-do not found", 404);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/todos/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return errorResponse("Invalid id", 400);

  return deleteTodo(id)
    ? new Response(null, { status: 204 })
    : errorResponse("To-do not found", 404);
}
