import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Standard success response */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

/** Standard error response */
export function err(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}

/** Parse Zod errors into a user-friendly message */
export function zodErr(e: ZodError) {
  const message = e.errors.map(x => `${x.path.join(".")}: ${x.message}`).join(", ");
  return err(message, 400);
}

/** Rate limit exceeded response with headers */
export function rateLimited(resetInMs: number) {
  return NextResponse.json(
    { data: null, error: "Too many requests — please slow down" },
    {
      status: 429,
      headers: {
        "Retry-After":              String(Math.ceil(resetInMs / 1000)),
        "X-RateLimit-Reset":        String(Date.now() + resetInMs),
      },
    }
  );
}

/** Unauthorized */
export const unauthorized = () => err("Unauthorized", 401);

/** Forbidden */
export const forbidden = () => err("Forbidden", 403);

/** Not found */
export const notFound = (resource = "Resource") => err(`${resource} not found`, 404);

/** Internal server error — logs the real error, returns generic message */
export function serverError(e: unknown, context?: string) {
  console.error(`[Server Error]${context ? ` (${context})` : ""}:`, e);
  return err("Internal server error", 500);
}
