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

// Create a new notification (for example, when a new itinerary is booked or when an external change occurs)
export async function POST(request) {
  try {
    const { userId, message } = await request.json();
    if (!userId || !message) {
      return NextResponse.json({ error: "userId and message are required" }, { status: 400 });
    }
    const notification = await prisma.notification.create({
      data: {
        userId: Number(userId),
        message,
      },
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Create Notification Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Mark a notification as read
export async function PATCH(request) {
  try {
    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    }
    const updated = await prisma.notification.update({
      where: { id: Number(notificationId) },
      data: { read: true },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Mark Notification as Read Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
