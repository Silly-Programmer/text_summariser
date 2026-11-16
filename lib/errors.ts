import "server-only";
import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth";

/** An error whose message is safe to show to the user. */
export class AppError extends Error {
  constructor(message: string, public status = 400, public code?: string) {
    super(message);
  }
}

/** Turn any thrown value into a JSON response. Use in every route handler's catch. */
export function errorResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (e instanceof AppError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/** Message to store/show when a background job fails. */
export function userMessage(e: unknown, fallback: string) {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error && (e as { userFacing?: boolean }).userFacing) return e.message;
  console.error(e);
  return fallback;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
