import { NextResponse } from "next/server";
import prisma from "@/utils/db";

// Note: similar to exercise 4

export async function PUT(request, { params }) {
    const { id } = await params; 
    const { firstName, lastName, phoneNumber, profilePicture } = await request.json();

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