import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { verifyToken } from "@/utils/auth";

// Helper: Validate URL format.
function isValidUrl(string) {
  const urlRegex = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
  return urlRegex.test(string);
}

export async function PUT(request) {
  // Verify token from request headers.
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized: No valid token provided." }, { status: 401 });
  }

  try {
    const { firstName, lastName, phoneNumber, profilePicture } = await request.json();

    // Validate inputs.
    if (firstName !== undefined && (typeof firstName !== "string" || firstName.trim() === "")) {
      return NextResponse.json({ error: "First name must be a non-empty string." }, { status: 400 });
    }
    if (lastName !== undefined && (typeof lastName !== "string" || lastName.trim() === "")) {
      return NextResponse.json({ error: "Last name must be a non-empty string." }, { status: 400 });
    }
    if (phoneNumber !== undefined) {
      if (typeof phoneNumber !== "string" || phoneNumber.trim() === "") {
        return NextResponse.json({ error: "Phone number must be a non-empty string." }, { status: 400 });
      }
      const phoneRegex = /^\+?\d{10,15}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        return NextResponse.json({ error: "Phone number must be valid (10 to 15 digits, optional '+' prefix)." }, { status: 400 });
      }
    }
    if (profilePicture !== undefined) {
      if (typeof profilePicture !== "string" || profilePicture.trim() === "" || !isValidUrl(profilePicture)) {
        return NextResponse.json({ error: "Profile picture must be a valid URL." }, { status: 400 });
      }
    }

    // Check if user exists.
    const existingUser = await prisma.user.findUnique({
      where: { id: tokenData.userId },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const dataClause = {};
    if (firstName !== undefined) dataClause.firstName = firstName;
    if (lastName !== undefined) dataClause.lastName = lastName;
    if (phoneNumber !== undefined) dataClause.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) dataClause.profilePicture = profilePicture;

    const updatedUser = await prisma.user.update({
      where: { id: tokenData.userId },
      data: dataClause,
    });

    return NextResponse.json({ message: "Profile updated successfully", updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Edit profile error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
