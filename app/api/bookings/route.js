import { NextResponse } from "next/server";
import { cancelBooking } from "@/utils/bookings";

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const updatedBooking = await cancelBooking(parseInt(bookingId));

    if (!updatedBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Booking cancelled", booking: updatedBooking }, { status: 200 });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}