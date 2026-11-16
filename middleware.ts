import { clerkMiddleware } from "@clerk/nextjs/server";

// Public: landing page, sign-in, sign-up. Everything else needs a session.
// (Pages and API routes also check auth themselves via requireUserId().)
const isPublicPath = (pathname: string) =>
  pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicPath(req.nextUrl.pathname)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};