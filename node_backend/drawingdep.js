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
router.post('/upload-workExecution-file/:fieldName', upload.single('file'), (req, res) => {
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
router.post('/upload-and-save-drawingdocument', (req, res, next) => {
  upload.fields([{ name: 'drawing', maxCount: 30 }])(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).send('File upload error.');
    } else if (err) {
      console.error('Unknown upload error:', err);
      return res.status(500).send('Unknown upload error.');
    }

    console.log(req.files);
    console.log(req.body);

    const { work_order_id } = req.body;
    const drawingFiles = req.files['drawing'] ? req.files['drawing'].map(f => f.filename) : [];

    const drawingFilenames = JSON.stringify(drawingFiles); // Store as JSON array

    const insertQuery = `
      INSERT INTO drawing_department (work_order_id, drawing)
      VALUES (?, ?)
    `;
    const insertValues = [work_order_id, drawingFilenames];

    db.query(insertQuery, insertValues, (err, result) => {
      if (err) {
        console.error('Error saving data to database:', err);
        return res.status(500).json({ success: false, message: 'Error saving data to the database' });
      }
      const updatedQuery = `
      UPDATE drawing_department
      SET drawing_completed = ?
      WHERE work_order_id = ?
    `;
    const updatedValues = [true, work_order_id];
 
    db.query(updatedQuery, updatedValues, (err, updateResult) => {
      if (err) {
        console.error('Error updating certificate completion status:', err);
        return res.status(500).json({ success: false, message: 'Error updating completion status' });
      }

      const query = `
        UPDATE work_receiving
        SET current_department = 'GIS'
        WHERE work_order_id = ?
      `;

      db.query(query, [work_order_id], (err, result) => {
        if (err) {
          console.error('Error updating department:', err);
          return res.status(500).json({ success: false, message: 'Error updating department' });
        }

        console.log('Department updated to GIS for work order:', work_order_id);
        res.status(200).json({ success: true, message: 'Files uploaded, data saved, and department updated successfully' });
      });
    });
  });
});
});


// Fetch workExecution Coming Data
router.get('/drawingdep-coming', (req, res) => {
    const query = `
  -- Part 1: Existing Work Orders from work_execution
  SELECT  
      we.work_order_id, 
      we.permission_number,
      wr.job_type, 
      wr.sub_section,
      wr.file_path,
      s.survey_file_path,
      p.Document
  FROM work_execution we
  LEFT JOIN work_receiving wr ON we.work_order_id = wr.work_order_id
  LEFT JOIN survey s ON we.work_order_id = s.work_order_id
  LEFT JOIN permissions p ON we.work_order_id = p.work_order_id
  WHERE we.work_order_id NOT IN (
          SELECT work_order_id FROM drawing_department
      )
  AND wr.current_department IN ('PermissionClosing', 'WorkClosing', 'Drawing', 'Laboratory')

  UNION

  -- Part 2: Work Orders with job_type = 'New Meters' directly from work_receiving
  SELECT  
      wr.work_order_id, 
      NULL AS permission_number,
      wr.job_type, 
      wr.sub_section,
      wr.file_path,
      s.survey_file_path,
      p.Document
  FROM work_receiving wr
  LEFT JOIN survey s ON wr.work_order_id = s.work_order_id
  LEFT JOIN permissions p ON wr.work_order_id = p.work_order_id
  WHERE wr.job_type = 'New Meters'
  AND wr.work_order_id NOT IN (
          SELECT work_order_id FROM drawing_department
      )

  UNION

  -- Part 3: Work Orders from lab which are also in invoice
  SELECT 
      lab.work_order_id,
      NULL AS permission_number,
      wr.job_type,
      wr.sub_section,
      NULL AS file_path,
      NULL AS survey_file_path,
      NULL AS Document
  FROM lab
  LEFT JOIN work_receiving wr ON lab.work_order_id = wr.work_order_id
  WHERE lab.work_order_id IN (
          SELECT work_order_id FROM invoice
      )
  AND lab.work_order_id NOT IN (
          SELECT work_order_id FROM drawing_department
      );



      `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('Drawing Fetching Data:', results);  // Log the results
      res.json(results);
    }
  });
});

router.get('/drawing-data', (req, res) => {
  const query = `
    SELECT drawing_department.work_order_id,
           drawing_department.drawing,
           drawing_department.d_created_at,
           work_receiving.job_type, 
           work_receiving.sub_section,
           work_receiving.current_department,
           work_receiving.file_path,
           survey.survey_file_path,
           work_execution.workexe_created_at
    
    FROM drawing_department
    LEFT JOIN work_receiving 
    ON drawing_department.work_order_id = work_receiving.work_order_id
    LEFT JOIN work_execution 
    ON drawing_department.work_order_id = work_execution.work_order_id
    LEFT JOIN survey 
    ON drawing_department.work_order_id = survey.work_order_id
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('Drawing Data:', results);  // Log the results
      res.json(results);
    }
  });
});

// Update work order department
router.post('/update-Ddepartment', express.json(), (req, res) => {
  const { workOrderId } = req.body;
  const query = `
    UPDATE work_receiving 
    SET current_department = 'GIS' ,  previous_department = 'Drawing'
    WHERE work_order_id = ?
  `;
  db.query(query, [workOrderId], (err, result) => {
    if (err) {
      console.error('Error updating department:', err);
      res.status(500).send('Error updating department');
    } else {
      res.status(200).send('Department updated');
    }
  });
});
router.put("/update-ddelivery-status", (req, res) => {
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


router.get('/drawing_download/:id', (req, res) => {
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
    { sql: 'SELECT trench FROM work_execution WHERE work_order_id = ?', key: 'trench' }
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


const util = require('util');
db.query = util.promisify(db.query);





module.exports = router;


