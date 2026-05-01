import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Check if the user is logged in (example: by checking a cookie)
    const token = request.cookies.get("fortrust_token");
    const isLoggedIn = Boolean(token);
    const { pathname } = request.nextUrl;

    // If logged in and trying to access the login page (root), redirect to dashboard
    if (isLoggedIn && pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    // If not logged in and token exists, remove the token cookie
    if (!isLoggedIn && token) {
        const response = NextResponse.next();
        response.cookies.set("fortrust_token", "", { expires: new Date(0), path: "/" });
        return response;
    }

    // Otherwise, continue
    return NextResponse.next();
}

// Specify the matcher for the middleware
export const config = {
    // Apply middleware to all routes except Next.js internals and static files
    matcher: [
        "/((?!_next|api|static|favicon.ico).*)",
    ],
};
