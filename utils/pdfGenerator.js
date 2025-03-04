import PDFDocument from "pdfkit";

export async function generateInvoicePDF(booking) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    let buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // Invoice Header
    doc.fontSize(20).text("Trip Invoice", { align: "center" }).moveDown(2);

    // Booking Details
    doc.fontSize(12).text(`Invoice ID: ${booking.id}`);
    doc.text(`Booking Date: ${new Date(booking.createdAt).toDateString()}`);
    doc.text(`Status: ${booking.status}`).moveDown(1);

    if (booking.hotel) {
      doc.fontSize(14).text("Hotel Details").moveDown(0.5);
      doc.fontSize(12).text(`Hotel: ${booking.hotel.name}`);
      doc.text(`Location: ${booking.hotel.location}`);
      doc.text(`Check-in: ${new Date(booking.checkIn).toDateString()}`);
      doc.text(`Check-out: ${new Date(booking.checkOut).toDateString()}`);

      if (booking.room) {
        doc.text(`Room: ${booking.room.name}`);
        doc.text(`Price per Night: $${booking.room.pricePerNight}`);
      }

      doc.moveDown(1);
    }

    doc.text("Thank you for booking with us!", { align: "center" });

    doc.end();
  });
}