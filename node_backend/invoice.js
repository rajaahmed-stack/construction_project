const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

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
// Serve static files from uploads directory
router.use('/invoices', express.static(path.join(__dirname, '../uploads')));

// Create the upload object
router.get('/invoice-coming', (req, res) => {
    const query = `
     SELECT 
    work_closing.work_order_id, 
    NULL AS permission_number,
    work_receiving.job_type, 
    work_receiving.sub_section,
    work_receiving.file_path,
    survey.survey_file_path,
    NULL AS Document
    FROM work_closing 
    LEFT JOIN work_receiving 
    ON work_closing.work_order_id = work_receiving.work_order_id
    LEFT JOIN survey 
    ON work_closing.work_order_id = survey.work_order_id
    WHERE work_closing.work_order_id NOT IN 
    (SELECT work_order_id FROM invoice) 
    AND work_receiving.current_department = 'Invoice'

    UNION ALL

    SELECT 
    eam.work_order_id, 
    NULL AS permission_number,
    NULL AS job_type,
    NULL AS sub_section,
    eam.file_path,
    NULL AS survey_file_path,
    NULL AS Document
    FROM emergency_and_maintainence eam
    LEFT JOIN work_receiving wr 
    ON eam.work_order_id = wr.work_order_id
    WHERE eam.work_order_id NOT IN 
    (SELECT work_order_id FROM invoice)
    AND wr.current_department = 'Invoice';

  
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
  router.post('/upload-and-save-invoice', upload.single('files'), (req, res) => {
    const { work_order_id, po_number } = req.body;
    const file = req.file;
  
    if (!file) return res.status(400).send('No file uploaded.');
  
    const filePath = `/api/invoice/invoices/${file.filename}`; // public access path
  
    const insertQuery = `
      INSERT INTO invoice (work_order_id, po_number, files)
      VALUES (?, ?, ?)
    `;
  
    db.query(insertQuery, [work_order_id, po_number, filePath], (err, result) => {
      if (err) {
        console.error("Database insert error:", err);
        return res.status(500).send("Failed to save invoice.");
      }
  
      res.status(200).send("Invoice saved successfully.");
    });
  });
  module.exports = router;
