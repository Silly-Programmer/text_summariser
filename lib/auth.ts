import "server-only";
import { auth } from "@clerk/nextjs/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** Use at the top of every server action / route handler. Throws if not signed in. */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError();
  return userId;
}
