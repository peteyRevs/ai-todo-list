import { z } from "zod";
import { idSchema } from "./validation";

export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: errorResponse("Request body must be valid JSON", 400) };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: errorResponse(result.error.issues[0]?.message ?? "Invalid request", 400) };
  }
  return { data: result.data };
}

export function parseId(raw: string): number | null {
  const result = idSchema.safeParse(raw);
  return result.success ? result.data : null;
}
