import { z } from "zod";

export const TITLE_MAX_LENGTH = 200;

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(TITLE_MAX_LENGTH),
});

export const updateTodoSchema = z.object({
  completed: z.boolean(),
});

export const idSchema = z.coerce.number().int().positive();
