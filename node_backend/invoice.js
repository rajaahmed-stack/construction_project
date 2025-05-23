const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const multer = require('multer');
const archiver = require('archiver'); // Ensure archiver is imported

// Database Connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'shinkansen.proxy.rlwy.net',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'XjSGGFPPsszznJyxanyHBVzUeppoFkKn',
  database: process.env.MYSQL_DATABASE || 'railway',
  port: process.env.MYSQL_PORT || '44942'

});


db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to the database');
  }
});
// Setup multer for file storage
// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Create the upload object
const upload = multer({ storage: storage });

router.get('/invoice-coming', (req, res) => {
    const query = `
    -- First Part: GIS Department
  SELECT  
      gis_department.work_order_id, 
      NULL AS permission_number,                
      work_receiving.job_type, 
      work_receiving.sub_section,
      NULL AS file_path,                        
      NULL AS survey_file_path,
      gis_department.gis AS Document            
  FROM gis_department 
  LEFT JOIN work_receiving 
      ON gis_department.work_order_id = work_receiving.work_order_id
  WHERE gis_department.work_order_id NOT IN 
      (SELECT work_order_id FROM store) 
    AND gis_department.work_order_id IN 
      (SELECT work_order_id FROM invoice)
    AND work_receiving.current_department = 'Store'

  UNION ALL

  -- Second Part: Emergency and Maintenance
  SELECT 
      eam.work_order_id, 
      NULL AS permission_number,
      eam.job_type,
      eam.sub_section,
      eam.file_path,
      NULL AS survey_file_path,
      NULL AS Document
  FROM emergency_and_maintainence eam
  LEFT JOIN work_receiving wr 
      ON eam.work_order_id = wr.work_order_id
  WHERE eam.work_order_id IN 
      (SELECT work_order_id FROM work_closing)
    AND eam.work_order_id NOT IN 
      (SELECT work_order_id FROM invoice)
    AND (wr.current_department IS NULL OR wr.current_department != 'Store')
    AND eam.job_type IN ('Cabinet', 'Meter')

  UNION ALL

  -- ✅ Third Part: Laboratory (not in invoice)
  SELECT 
      lab.work_order_id,
      NULL AS permission_number,
      wr.job_type,
      wr.sub_section,
      NULL AS file_path,
      NULL AS survey_file_path,
      NULL AS Document
  FROM lab 
  LEFT JOIN work_receiving wr 
      ON lab.work_order_id = wr.work_order_id
  WHERE lab.work_order_id NOT IN 
      (SELECT work_order_id FROM invoice)
    AND (wr.current_department IS NULL OR wr.current_department IN ('PermissionClosing', 'WorkClosing'));





  
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        res.status(500).send('Database query error');
      } else {
        console.log('Invoice Fetching Data:', results);  // Log the results
        res.json(results);
      }
    });
  });
  router.get('/invoice-data', (req, res) => {
    const query = `
      SELECT invoice.work_order_id,
             work_receiving.job_type, 
             work_receiving.sub_section,
             work_receiving.current_department,
             work_receiving.file_path,
             invoice.po_number,
             invoice.files,
             invoice.invoice_created_at,
             safety_department.safety_created_at,
             survey.survey_file_path
            
      FROM invoice
      LEFT JOIN work_receiving 
      ON invoice.work_order_id = work_receiving.work_order_id
      LEFT JOIN safety_department 
      ON invoice.work_order_id = safety_department.work_order_id
      LEFT JOIN survey 
      ON invoice.work_order_id = survey.work_order_id
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        res.status(500).send('Database query error');
      } else {
        console.log('Invoice Data:', results);  // Log the results
        res.json(results);
      }
    });
  });
  // router.post('/upload-and-save-invoice', (req, res) => {
  //   upload.single('files')(req, res, function (err) {
  //     if (err instanceof multer.MulterError) {
  //       console.error('Multer error:', err);
  //       return res.status(400).send('File upload error.');
  //     } else if (err) {
  //       console.error('Unknown upload error:', err);
  //       return res.status(500).send('Unknown upload error.');
  //     }
  
  //     const { work_order_id, po_number } = req.body;
  //     const fileBuffer = req.file ? req.file.buffer : null;
  
  //     if (!work_order_id || !po_number || !fileBuffer) {
  //       return res.status(400).json({ success: false, message: 'Missing required fields or file' });
  //     }
  
  //     const insertQuery = `
  //       INSERT INTO invoice (work_order_id, po_number, files)
  //       VALUES (?, ?, ?)
  //     `;
  //     const insertValues = [work_order_id, po_number, fileBuffer];
  
  //     db.query(insertQuery, insertValues, (err, result) => {
  //       if (err) {
  //         console.error('Error saving invoice to database:', err);
  //         return res.status(500).json({ success: false, message: 'Database error while saving invoice' });
  //       }
  
  //       const updateQuery = `
  //         UPDATE work_receiving
  //         SET current_department = 'Completed'
  //         WHERE work_order_id = ?
  //       `;
  
  //       db.query(updateQuery, [work_order_id], (err) => {
  //         if (err) {
  //           console.error('Error updating work_receiving:', err);
  //           return res.status(500).json({ success: false, message: 'Failed to update current department' });
  //         }
  
  //         console.log('Invoice saved and department updated for work order:', work_order_id);
  //         return res.status(200).json({ success: true, message: 'Invoice uploaded and department updated successfully' });
  //       });
  //     });
  //   });
  // });
  const generateInvoicePDF = (invoiceData, savePath) => {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(savePath);
      doc.pipe(stream);
  
      doc.fontSize(20).text("ConstructionPro Pvt Ltd", { align: 'center' });
      doc.fontSize(14).text("Empowering the Future of Infrastructure", { align: 'center' }).moveDown();
      doc.fontSize(16).text(`Invoice ID: ${invoiceData.invoice_id || 'TBD'}`);
      doc.text(`Work Order ID: ${invoiceData.work_order_id}`);
      doc.text(`PO Number: ${invoiceData.po_number}`).moveDown();
      doc.text("Thank you for your business!", { align: "center" });
  
      doc.end();
  
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  };
  
  router.post('/upload-and-save-invoice', upload.fields([
    { name: 'files', maxCount: 30 },
  ]), async (req, res) => {
    console.log(req.files);
    console.log(req.body);
  
    const { work_order_id, po_number } = req.body;
    const fileBuffer = req.files['files'] ? req.files['files'].map(file => file.filename) : [];
  
    if (!work_order_id || !po_number || fileBuffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields or file' });
    }
  
    const insertQuery = `
      INSERT INTO invoice (work_order_id, po_number, files)
      VALUES (?, ?, ?)
    `;
    const insertValues = [work_order_id, po_number, JSON.stringify(fileBuffer)];
  
    db.query(insertQuery, insertValues, async (err, result) => {
      if (err) {
        console.error('Error saving data to database:', err);
        return res.status(500).json({ success: false, message: 'Error saving data to the database' });
      }
  
      const invoiceData = {
        invoice_id: result.insertId,
        work_order_id,
        po_number
      };
  
      const savePath = path.join('uploads', `invoice_${work_order_id}.pdf`);
  
      try {
        await generateInvoicePDF(invoiceData, savePath);
      } catch (err) {
        console.error('Error generating PDF:', err);
        return res.status(500).json({ success: false, message: 'Error generating invoice PDF' });
      }
  
      const updateQuery = `
        UPDATE work_receiving
        SET current_department = 'Store', previous_department = 'Invoice'
        WHERE work_order_id = ?
      `;
  
      db.query(updateQuery, [work_order_id], (err) => {
        if (err) {
          console.error('Error updating department:', err);
          return res.status(500).json({ success: false, message: 'Error updating department' });
        }
  
        console.log('Department updated to Completed for work order:', work_order_id);
        res.status(200).json({ success: true, message: 'Files uploaded, data saved, PDF generated, and department updated successfully' });
      });
    });
  });
  
  router.get('/download-invoice/:work_order_id', (req, res) => {
    const { work_order_id } = req.params;
    const filePath = path.join('uploads', `invoice_${work_order_id}.pdf`);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) return res.status(404).send('Invoice not found');
      res.download(filePath);
    });
  });
  
  module.exports = router;
  