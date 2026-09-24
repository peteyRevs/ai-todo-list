import { z } from "zod";

export const TITLE_MAX_LENGTH = 200;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters`);

export const idSchema = z.number().int().positive();

export const completedSchema = z.boolean();
