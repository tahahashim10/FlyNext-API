import { NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";

// middleware wrapper to check if the authenticated user ID matches ID in route params
export function withAuth(handler) {
  return async (request) => {
    
    const tokenData = verifyToken(request); // Get token data 

    if (!tokenData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlParts = request.nextUrl.pathname.split("/");
    const id = parseInt(urlParts[urlParts.length - 1]);  

    // Compare token id with route params id 
    if (id !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own profile" }, { status: 403 });
    }

    // If we're good then call the original handler
    return handler(request);
  };
}

