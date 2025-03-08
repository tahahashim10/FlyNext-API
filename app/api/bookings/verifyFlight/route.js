import { NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";

export async function GET(request) {
  
  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse query parameters from the request URL.
    const { searchParams } = new URL(request.url);
    const lastName = searchParams.get("lastName");
    const bookingReference = searchParams.get("bookingReference");

    if (!lastName || typeof lastName !== "string" || lastName.trim() === "" ||
        !bookingReference || typeof bookingReference !== "string" || bookingReference.trim() === "") {
      return NextResponse.json({ error: "Missing or invalid lastName or bookingReference query parameters" }, { status: 400 });
    }


    // Get the AFS configuration from the environment
    const baseUrl = process.env.AFS_BASE_URL;
    const apiKey = process.env.AFS_API_KEY;
    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: "AFS API configuration is missing" },
        { status: 500 }
      );
    }

    // Build URL for the AFS API GET /api/bookings/retrieve endpoint.
    const url = new URL("/api/bookings/retrieve", baseUrl);
    url.search = new URLSearchParams({ lastName, bookingReference }).toString();

    // Call the AFS API
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 404) {
        // Clean error message for not found
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: `AFS API error: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Verify Flight Booking Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
