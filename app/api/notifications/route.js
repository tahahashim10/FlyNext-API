import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { verifyToken } from "@/utils/auth";

// Retrieve notifications for a given user (can be used by both regular users and hotel owners)
export async function GET(request) {

  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    
    const notifications = await prisma.notification.findMany({
      where: { 
        userId: tokenData.userId,
        read: false,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(notifications, { status: 200 });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Mark a notification as read
export async function PATCH(request) {

  // Verify the token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    const id = Number(notificationId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "notificationId must be a valid number." }, { status: 400 });
    }

    // Find the notification to update
    const notification = await prisma.notification.findUnique({
      where: { id: Number(notificationId) },
    });
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Verify the notification belongs to the provided userId
    if (notification.userId !== tokenData.userId) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to update this notification." },
        { status: 403 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id: Number(notificationId) },
      data: { read: true },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Mark Notification as Read Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
