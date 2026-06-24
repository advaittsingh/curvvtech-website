import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Rewrite proposal.curvvtech.com/p/:token → /proposals/:token */
/** Rewrite businessos.curvvtech.com|.in → /business-os */
export default function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("proposal.")) {
    const match = request.nextUrl.pathname.match(/^\/p\/([^/]+)\/?$/);
    if (match) {
      const url = request.nextUrl.clone();
      url.pathname = `/proposals/${match[1]}`;
      return NextResponse.rewrite(url);
    }
  }
  if (host.startsWith("businessos.")) {
    const url = request.nextUrl.clone();
    const path = url.pathname === "/" ? "" : url.pathname;
    if (!path.startsWith("/business-os")) {
      url.pathname = `/business-os${path}`;
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/p/:path*",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
