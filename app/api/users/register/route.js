import prisma from "@/utils/db";
import { NextResponse } from "next/server";
import { hashPassword } from "@/utils/auth";

// Note: this file is very similar to Exercise 6

export async function POST(request) {
    try {
        const { username, password, role } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });
        if (existingUser) {
            return NextResponse.json({ error: `${username} already exists` }, { status: 400 });
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Create the user
        const createdUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || "USER", // default to "USER" if role is not provided
            },
        });

        // Return the created user (excluding the password)
        return NextResponse.json(
            {
                user: {
                    id: createdUser.id,
                    username: createdUser.username,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


