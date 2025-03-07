import prisma from "@/utils/db";
import { NextResponse } from "next/server";
import { hashPassword } from "@/utils/auth";

// Note: this file is very similar to Exercise 6

export async function POST(request) {
    try {
        const { firstName, lastName, email, password, phoneNumber, profilePicture, role } = await request.json();

        // Validate required fields and types
        if (!firstName || typeof firstName !== "string" || firstName.trim() === "") {
            return NextResponse.json({ error: "First name is required and must be a non-empty string" }, { status: 400 });
        }
        if (!lastName || typeof lastName !== "string" || lastName.trim() === "") {
            return NextResponse.json({ error: "Last name is required and must be a non-empty string" }, { status: 400 });
        }
        if (!email || typeof email !== "string" || email.trim() === "") {
            return NextResponse.json({ error: "Email is required and must be a non-empty string" }, { status: 400 });
        }
        if (!password || typeof password !== "string" || password.trim() === "") {
            return NextResponse.json({ error: "Password is required and must be a non-empty string" }, { status: 400 });
        }
        // validate email format with a regex
        // source: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
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
