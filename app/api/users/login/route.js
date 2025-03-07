import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET;

// Note: this file is very similar to Exercise 6

export async function POST(request) {

  const { email, password } = await request.json();

  try {
    
    // Validate input: check existence, type, and that they're not empty after trimming.
    if (
      !email || typeof email !== "string" || email.trim() === "" ||
      !password || typeof password !== "string" || password.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Missing or invalid email or password" },
        { status: 400 }
      );
    }

    // source: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({ 
        where: { email } 
    });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, SECRET_KEY, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, SECRET_KEY, { expiresIn: "7d" });

    return NextResponse.json({ accessToken, refreshToken }, { status: 200 });

  } catch (error) {
    console.error("Login error:", error.stack);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });

  }

  
}

