import { NextResponse } from "next/server";
import { getUserBookings } from "@/utils/bookings";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const bookings = await getUserBookings(parseInt(userId));

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Fetch Bookings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

