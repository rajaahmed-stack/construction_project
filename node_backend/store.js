const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const archiver = require('archiver'); // Ensure archiver is imported

// MySQL Database Connection
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

// Backend route for handling file uploads
router.post('/upload-store-file/:fieldName', upload.single('file'), (req, res) => {
  const { file } = req;
  const fieldName = req.params.fieldName;
  
  if (!file) {
    console.log("No file uploaded!");
    return res.status(400).send('No file uploaded');
  }
  console.log('Uploaded file:', file);  // Log the uploaded file to check it

  // Return the file path after uploading
  const filePath = path.join('uploads', file.filename);
  res.json({ filePath });
});
// Combined route for file upload and data saving
router.post('/upload-and-save-storedocument', upload.fields([
  { name: 'material_return', maxCount: 1 },
  { name: 'material_recieving', maxCount: 1 },
  { name: 'material_pending', maxCount: 1 },
]), (req, res) => {
  console.log(req.files);
  console.log(req.body);

  const { work_order_id } = req.body;
  const material_return = req.files['material_return'] ? req.files['material_return'][0].filename : null;
  const material_recieving = req.files['material_recieving'] ? req.files['material_recieving'][0].filename : null;
  const material_pending = req.files['material_pending'] ? req.files['material_pending'][0].filename : null;

  const insertQuery = `
    INSERT INTO store 
    (work_order_id, material_return, material_recieving, material_pending)
    VALUES (?, ?, ?, ?)
  `;
  const insertValues = [work_order_id, material_return, material_recieving, material_pending];

  db.query(insertQuery, insertValues, (err, result) => {
    if (err) {
      console.error('Error saving data to database:', err);
      return res.status(500).json({ success: false, message: 'Error saving data to the database' });
    }

    console.log('Data saved successfully to store:', result);
    return res.status(200).json({ success: true, message: 'Data saved successfully' });
  });
});

// Fetch gis Department Coming Data
router.get('/gisdepstore-coming', (req, res) => {
    const query = `
      SELECT gis_department.work_order_id, 
      gis_department.gis,
      work_receiving.job_type, 
      work_receiving.sub_section
    FROM gis_department 
    LEFT JOIN work_receiving 
    ON gis_department.work_order_id = work_receiving.work_order_id
    WHERE gis_department.work_order_id NOT IN 
    (SELECT work_order_id FROM store) 
    AND current_department = 'Store'
      `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('GIS Fetching Data:', results);  // Log the results
      res.json(results);
    }
  });
});

router.get('/store-data', (req, res) => {
  const query = `
    SELECT store.work_order_id,
           store.material_return, 
           store.material_receiving, 
           store.material_pending,
           store.sstore_created_at,
           gis_department.g_created_at,
           gis_department.gis
    
    FROM store
    LEFT JOIN work_receiving 
    ON store.work_order_id = work_receiving.work_order_id
    LEFT JOIN gis_department 
    ON store.work_order_id = gis_department.work_order_id
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('GIS Data:', results);  // Log the results
      res.json(results);
    }
  });
});

// Update work order department
router.post('/update-gisdepartment', express.json(), (req, res) => {
  const { workOrderId } = req.body;
  const query = `
    UPDATE work_receiving 
    SET current_department = 'Store' 
    WHERE work_order_id = ?
  `;
  db.query(query, [workOrderId], (err, result) => {
    if (err) {
      console.error('Error updating department:', err);
      res.status(500).send('Error updating department');
    } else {
      res.json({ success: true, message: 'Department updated' });
    }
  });
});
router.put("/update-storedelivery-status", (req, res) => {
  const { work_order_id, delivery_status } = req.body;

  console.log("Received request to update:", req.body); // Debugging log

  if (!work_order_id || !delivery_status) {
    console.error("Missing required fields");
    return res.status(400).json({ error: "Missing required fields" });
  }

  const updateQuery = `
    UPDATE work_receiving 
    SET delivery_status = ?
    WHERE work_order_id = ?
  `;

  db.query(updateQuery, [delivery_status, work_order_id], (err, result) => {
    if (err) {
      console.error("Error updating delivery status:", err);
      return res.status(500).json({ error: "Database update failed" });
    }

    if (result.affectedRows === 0) {
      console.warn("No records updated. Check if work_order_id exists:", work_order_id);
      return res.status(404).json({ error: "Work order not found" });
    }

    console.log("Database updated successfully:", result);
    res.json({ message: "Delivery status updated successfully", affectedRows: result.affectedRows });
  });
});
router.get('/store_download/:id', (req, res) => {
  const fileId = req.params.id;

  const queries = [
    { sql: 'SELECT file_path FROM work_receiving WHERE work_order_id = ?', key: 'file_path' },
    { sql: 'SELECT survey_file_path FROM survey WHERE work_order_id = ?', key: 'survey_file_path' },
    { sql: 'SELECT Document FROM permissions WHERE work_order_id = ?', key: 'Document' },
    { sql: 'SELECT safety_signs FROM safety_department WHERE work_order_id = ?', key: 'safety_signs' },
    { sql: 'SELECT safety_barriers FROM safety_department WHERE work_order_id = ?', key: 'safety_barriers' },
    { sql: 'SELECT safety_lights FROM safety_department WHERE work_order_id = ?', key: 'safety_lights' },
    { sql: 'SELECT safety_boards FROM safety_department WHERE work_order_id = ?', key: 'safety_boards' },
    { sql: 'SELECT permissions FROM safety_department WHERE work_order_id = ?', key: 'permissions' },
    { sql: 'SELECT safety_documentation FROM safety_department WHERE work_order_id = ?', key: 'safety_documentation' },
    { sql: 'SELECT asphalt FROM work_execution WHERE work_order_id = ?', key: 'asphalt' },
    { sql: 'SELECT milling FROM work_execution WHERE work_order_id = ?', key: 'milling' },
    { sql: 'SELECT concrete FROM work_execution WHERE work_order_id = ?', key: 'concrete' },
    { sql: 'SELECT deck3 FROM work_execution WHERE work_order_id = ?', key: 'deck3' },
    { sql: 'SELECT deck2 FROM work_execution WHERE work_order_id = ?', key: 'deck2' },
    { sql: 'SELECT deck1 FROM work_execution WHERE work_order_id = ?', key: 'deck1' },
    { sql: 'SELECT sand FROM work_execution WHERE work_order_id = ?', key: 'sand' },
    { sql: 'SELECT backfilling FROM work_execution WHERE work_order_id = ?', key: 'backfilling' },
    { sql: 'SELECT cable_lying FROM work_execution WHERE work_order_id = ?', key: 'cable_lying' },
    { sql: 'SELECT trench FROM work_execution WHERE work_order_id = ?', key: 'trench' },
    { sql: 'SELECT drawing FROM drawing_department WHERE work_order_id = ?', key: 'drawing' },
    { sql: 'SELECT gis FROM gis_department WHERE work_order_id = ?', key: 'gis' }
  ];

  let files = [];
  let completed = 0;

  queries.forEach((q, index) => {
    db.query(q.sql, [fileId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Database error');
      }

      if (results.length > 0 && results[0][q.key]) {
        let filePath = results[0][q.key];
        if (Buffer.isBuffer(filePath)) {
          filePath = filePath.toString('utf8');
        }
        const absolutePath = path.join(__dirname, '..', filePath);
        files.push({ path: absolutePath, name: path.basename(absolutePath) });
      }

      completed++;

      // After both queries finish
      if (completed === queries.length) {
        if (files.length === 0) {
          return res.status(404).send('No files found to download');
        }

        // Create zip archive
        res.setHeader('Content-Disposition', 'attachment; filename=documents.zip');
        res.setHeader('Content-Type', 'application/zip');

        const archive = archiver('zip');
        archive.pipe(res);

        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            archive.file(file.path, { name: file.name });
          }
        });

        archive.finalize();
      }
    });
  });
});

module.exports = router;


