const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver'); // Ensure archiver is imported

const generateInvoicePDF = (invoiceData, savePath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();

    const stream = fs.createWriteStream(savePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text("ConstructionPro Pvt Ltd", { align: 'center' })
      .fontSize(14)
      .text("Empowering the Future of Infrastructure", { align: 'center' })
      .moveDown();

    // Invoice details
    doc
      .fontSize(16)
      .text(`Invoice ID: ${invoiceData.invoice_id || 'TBD'}`)
      .text(`Work Order ID: ${invoiceData.work_order_id}`)
      .text(`PO Number: ${invoiceData.po_number}`)
      .moveDown();

    doc.text("Thank you for your business!", { align: "center" });

    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
};

module.exports = generateInvoicePDF;
