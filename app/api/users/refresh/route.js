// app/api/users/refresh/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken"; 

const SECRET_KEY = process.env.JWT_SECRET;

// copied logic from Exercise 6
export async function POST(request) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken || typeof refreshToken !== "string" || refreshToken.trim() === "") {
      return NextResponse.json({ error: "Refresh token is required" }, { status: 400 });
    }

    let decoded;
    try {
      // Verify the refresh token using jwt.verify 
      decoded = jwt.verify(refreshToken, SECRET_KEY);
    } catch (error) {
      console.error("Refresh token verification failed:", error);
      return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    const newAccessToken = jwt.sign(
        {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
        },
        SECRET_KEY,
        { expiresIn: "15m" } 
    );

    return NextResponse.json({ accessToken: newAccessToken }, { status: 200 });
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
