import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateInvoicePDF(booking) {
  // Create a new PDF document.
  const pdfDoc = await PDFDocument.create();
  // Embed a standard font (Times Roman).
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  // Add a blank page to the document.
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;

  // Build the invoice text content.
  let invoiceText = "Trip Invoice\n\n";
  invoiceText += `Invoice ID: ${booking.id}\n`;
  invoiceText += `Booking Date: ${new Date(booking.createdAt).toDateString()}\n`;
  invoiceText += `Status: ${booking.status}\n\n`;

  // Check if this is a hotel booking (has hotel data).
  if (booking.hotel) {
    invoiceText += "Hotel Details:\n";
    invoiceText += `Hotel: ${booking.hotel.name}\n`;
    invoiceText += `Location: ${booking.hotel.location}\n`;
    invoiceText += `Check-in: ${booking.checkIn ? new Date(booking.checkIn).toDateString() : "N/A"}\n`;
    invoiceText += `Check-out: ${booking.checkOut ? new Date(booking.checkOut).toDateString() : "N/A"}\n`;
    if (booking.room) {
      invoiceText += `Room: ${booking.room.name}\n`;
      invoiceText += `Price per Night: $${booking.room.pricePerNight}\n`;
    }
    invoiceText += "\n";
  }
  
  // If it's a flight booking or a combined booking, include flight details.
  if (booking.flightBookingReference) {
    invoiceText += "Flight Booking:\n";
    invoiceText += `Booking Reference: ${booking.flightBookingReference}\n`;
    // Optionally, if you store flightIds as JSON, you can display them:
    if (booking.flightIds) {
      invoiceText += `Flight IDs: ${JSON.stringify(booking.flightIds)}\n`;
    }
    invoiceText += "\n";
  }

  invoiceText += "Thank you for booking with us!";

  // Draw the text on the page.
  page.drawText(invoiceText, {
    x: 50,
    y: height - 50 - fontSize * 1.5,
    size: fontSize,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
    lineHeight: fontSize * 1.5,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
