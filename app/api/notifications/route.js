import { NextResponse } from 'next/server';
import { prisma } from '@/utils/db';

/**
 * {
 *   "userId": 1,         // Hotel owner's user ID
 *   "hotelName": "Hotel ABC",
 *   "bookingId": 12345
 * }
 */
export async function POST(request) {
  try {
    const { userId, hotelName, bookingId } = await request.json();

    // Validate required fields.
    if (!userId || !hotelName || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, hotelName, and bookingId are required.' },
        { status: 400 }
      );
    }

    // Construct the notification message.
    const message = `New booking (ID: ${bookingId}) has been made for your hotel: ${hotelName}.`;

    // Create a new notification. The "read" field will default to false.
    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/notifications?userId=1
 * Returns all notifications for the specified hotel owner
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Ensure the userId query parameter is provided.
    if (!userId) {
      return NextResponse.json(
        { error: 'Query parameter "userId" is required.' },
        { status: 400 }
      );
    }

    // Retrieve notifications for the specified user, ordered by creation date descending.
    const notifications = await prisma.notification.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notifications, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
