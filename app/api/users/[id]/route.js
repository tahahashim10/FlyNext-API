import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { withAuth } from "@/middlewares/withAuth";

// Note: similar to exercise 4

export async function updateProfile(request) {
    const urlParts = request.nextUrl.pathname.split("/");
    const id = parseInt(urlParts[urlParts.length - 1]);

    const { firstName, lastName, phoneNumber, profilePicture } = await request.json();

    // Validate that provided values are strings
    if (firstName !== undefined && typeof firstName !== "string") {
        return NextResponse.json({ error: "First name must be a string" }, { status: 400 });
    }
    if (lastName !== undefined && typeof lastName !== "string") {
        return NextResponse.json({ error: "Last name must be a string" }, { status: 400 });
    }
    if (phoneNumber !== undefined && typeof phoneNumber !== "string") {
        return NextResponse.json({ error: "Phone number must be a string" }, { status: 400 });
    }
    if (profilePicture !== undefined && typeof profilePicture !== "string") {
        return NextResponse.json({ error: "Profile picture must be a string (URL)" }, { status: 400 });
    }

    // Validate non-empty firstName and lastName if provided
    if (firstName !== undefined && firstName.trim() === "") {
        return NextResponse.json({ error: "First name cannot be empty" }, { status: 400 });
    }
    if (lastName !== undefined && lastName.trim() === "") {
        return NextResponse.json({ error: "Last name cannot be empty" }, { status: 400 });
    }

    try {
        // check if id exists
        const existingUser = await prisma.user.findUnique({
            where: { id: parseInt(id) },
        });
        if(!existingUser) {
            return NextResponse.json({error: "user not found"}, {status: 404})
        }

        const dataClause = {}
        if (firstName !== undefined) dataClause.firstName = firstName;
        if (lastName !== undefined) dataClause.lastName = lastName;
        if (phoneNumber !== undefined) dataClause.phoneNumber = phoneNumber;
        if (profilePicture !== undefined) dataClause.profilePicture = profilePicture;
    

        // might need to add middleware to make sure user is editing only their profile

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: dataClause,
        });

        return NextResponse.json({ message: "Profile updated successfully", updatedUser });

    } catch (error) {
        console.error("Edit profile error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }


}

export const PUT = withAuth(updateProfile);  // export the handler wrapped with the middleware