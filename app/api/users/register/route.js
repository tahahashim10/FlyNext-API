import prisma from "@/utils/db";
import { NextResponse } from "next/server";
import { hashPassword } from "@/utils/auth";

// Note: this file is very similar to Exercise 6

export async function POST(request) {
    try {
        const { firstName, lastName, email, password, phoneNumber, profilePicture, role } = await request.json();

        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return NextResponse.json({ error: `User with email ${email} already exists` }, { status: 400 });
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Create the user
        const createdUser = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
                phoneNumber,
                profilePicture,
                role: role || "USER", 
            },
        });

        // Return the created user (excluding the password)
        return NextResponse.json(
            {
                user: {
                    id: createdUser.id,
                    firstName: createdUser.firstName,
                    lastName: createdUser.lastName,
                    email: createdUser.email,
                    phoneNumber: createdUser.phoneNumber,
                    profilePicture: createdUser.profilePicture,
                    role: createdUser.role,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


