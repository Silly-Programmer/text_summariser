import "server-only";
import { AI_LIMITS } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { countActiveQuizzes } from "@/lib/db/quizzes";
import { countActiveSummaries } from "@/lib/db/summaries";

/** Stops one user from starting dozens of AI jobs at once (protects the AI quota). */
export async function assertCanStartAiJob(userId: string) {
  const [s, q] = await Promise.all([countActiveSummaries(userId), countActiveQuizzes(userId)]);
  if (s + q >= AI_LIMITS.maxActiveJobs) {
    throw new AppError("You already have several summaries or quizzes being written. Wait for one to finish, then try again.", 429, "too_many_jobs");
  }
}
