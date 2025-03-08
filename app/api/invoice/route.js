import { NextResponse } from "next/server";
import { getBookingDetails } from "@/utils/invoice";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { verifyToken } from "@/utils/auth";

export async function POST(request) {
  // Verify token
  const tokenData = verifyToken(request);
  if (!tokenData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { bookingId, bookingType } = await request.json();
    if (!bookingId || isNaN(bookingId)) {
      return NextResponse.json({ error: "bookingId must be a number." }, { status: 400 });
    }
    if (!bookingType || !["hotel", "flight"].includes(bookingType)) {
      return NextResponse.json({ error: "bookingType is required and must be either 'hotel' or 'flight'." }, { status: 400 });
    }

    let booking = await getBookingDetails(bookingId, bookingType);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.userId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to access this booking." }, { status: 403 });
    }

    // make sure the booking is confirmed (payed and finalized) before generating an invoice.
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Invoice can only be generated for confirmed/payed bookings." }, { status: 400 });
    }

    // For flight bookings, fetch additional details from the AFS API.
    if (bookingType === "flight" && booking.flightBookingReference) {
      const baseUrl = process.env.AFS_BASE_URL;
      const apiKey = process.env.AFS_API_KEY;
      if (!baseUrl || !apiKey) {
        return NextResponse.json({ error: "AFS API configuration is missing." }, { status: 500 });
      }
      const url = new URL("/api/bookings/retrieve", baseUrl);
      // We'll use the user's lastName from the booking's user object.
      url.search = new URLSearchParams({
        lastName: booking.user.lastName,
        bookingReference: booking.flightBookingReference
      }).toString();
      
      const res = await fetch(url, {
        headers: { "x-api-key": apiKey },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ error: `AFS API error: ${res.status} - ${errorText}` }, { status: res.status });
      }
      
      const flightDetails = await res.json();
      // Merge flightDetails into the booking object.
      booking = { ...booking, flightDetails };
    }

    const pdfBuffer = await generateInvoicePDF(booking);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice_${booking.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Invoice Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
