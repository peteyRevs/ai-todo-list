import { parseJson } from "@/lib/http";
import { createTodo, listTodos } from "@/lib/todos";
import { createTodoSchema } from "@/lib/validation";

export async function GET() {
  return Response.json(listTodos());
}

export async function POST(request: Request) {
  const parsed = await parseJson(request, createTodoSchema);
  if ("error" in parsed) return parsed.error;
  return Response.json(createTodo(parsed.data.title), { status: 201 });
}
