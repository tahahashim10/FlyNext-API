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


    const { bookingId } = await request.json();
    if (!bookingId || isNaN(bookingId)) {
      return NextResponse.json({ error: "bookingId must be a number" }, { status: 400 });
    }

    const booking = await getBookingDetails(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Ensure the booking belongs to the authenticated user.
    if (booking.userId !== tokenData.userId) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to access this booking." }, { status: 403 });
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
