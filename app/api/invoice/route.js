import { NextResponse } from "next/server";
import { getBookingDetails } from "@/utils/invoice";
import { generateInvoicePDF } from "@/utils/pdfGenerator";

export async function POST(request) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const booking = await getBookingDetails(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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
