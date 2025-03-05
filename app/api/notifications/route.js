import { NextResponse } from "next/server";
import prisma from "@/utils/db";

// Retrieve notifications for a given user (can be used by both regular users and hotel owners)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }
    
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const notifications = await prisma.notification.findMany({
      where: { userId: Number(userId) },
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
  try {
    const { notificationId, userId } = await request.json();
    if (!notificationId || !userId) {
      return NextResponse.json(
        { error: "notificationId and userId are required" },
        { status: 400 }
      );
    }

    // Find the notification to update
    const notification = await prisma.notification.findUnique({
      where: { id: Number(notificationId) },
    });
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Verify the notification belongs to the provided userId
    if (notification.userId !== Number(userId)) {
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
