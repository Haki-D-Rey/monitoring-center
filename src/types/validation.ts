// src/types/validation.ts
import type { ZodObject, infer as zInfer } from "zod";
import type { Request } from "express";

export type ZodSchemaLike = ZodObject;

export type ValidatedRequest<TSchema extends ZodSchemaLike> = Request & {
  validated: zInfer<TSchema>;
};
