const express = require('express');
const mysql = require('mysql2');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
// Ensure uploads directory exists





// Middleware to parse JSON
router.use(express.json());
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
// Fetch permissionclosing Coming Data
router.get('/workclosing-coming', (req, res) => {
    const query = `
   (
  SELECT 
    pc.work_order_id, 
    pc.permission_number,
    wr.job_type, 
    wr.file_path, 
    wr.sub_section,
    s.survey_file_path,
    p.Document
  FROM permission_closing pc
  LEFT JOIN work_receiving wr 
    ON pc.work_order_id = wr.work_order_id AND wr.current_department = 'WorkClosing'
  LEFT JOIN survey s 
    ON pc.work_order_id = s.work_order_id
  LEFT JOIN permissions p 
    ON pc.work_order_id = p.work_order_id
  WHERE pc.work_order_id NOT IN (SELECT work_order_id FROM work_closing)
    AND wr.job_type != 'New Meters'
)

UNION ALL

(
  SELECT 
    eam.work_order_id, 
    NULL AS permission_number,
    NULL AS job_type,
    eam.file_path,
    NULL AS sub_section,
    NULL AS survey_file_path,
    NULL AS Document
  FROM emergency_and_maintainence eam
  LEFT JOIN work_receiving wr 
    ON eam.work_order_id = wr.work_order_id AND wr.current_department = 'WorkClosing'
  WHERE eam.work_order_id NOT IN (SELECT work_order_id FROM work_closing)
)

    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        res.status(500).send('Database query error');
      } else {
        console.log('Permission Closing Coming Data:', results);  // Log the results
        res.json(results);
      }
    });
  });

// Fetch workClosing Data
router.get('/workClosing-data', (req, res) => {
    const query = `
      SELECT work_closing.work_order_id,
             work_receiving.job_type, 
             work_receiving.sub_section,
             work_receiving.file_path,
             survey.survey_file_path,
             permissions.Document,
             work_closing.mubahisa,
             permission_closing.pc_created_at,
             work_closing.wc_created_at

      FROM work_closing
      LEFT JOIN work_receiving 
      ON work_closing.work_order_id = work_receiving.work_order_id
      LEFT JOIN survey 
      ON work_closing.work_order_id = survey.work_order_id
      LEFT JOIN permissions 
      ON work_closing.work_order_id = permissions.work_order_id
      LEFT JOIN permission_closing 
      ON work_closing.work_order_id = permission_closing.work_order_id
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        res.status(500).send('Database query error');
      } else {
        console.log('Work Closing Fetching Data:', results);  // Log the results
  
        res.json(results);
      }
    });
  });

// Combined route for file upload and data saving
router.post('/upload-and-save-wcdocument', upload.fields([
  { name: 'mubahisa', maxCount: 20 },
]), (req, res) => {
  console.log(req.files);
  console.log(req.body);

  const { work_order_id } = req.body;
  const Mubahisa = req.files['mubahisa'] ? req.files['mubahisa'].map(file => file.filename) : null;

  // Insert file information and work order details into the database
  const insertQuery = `
    INSERT INTO work_closing 
    (work_order_id, mubahisa)
    VALUES (?, ?)
  `;
  const insertValues = [work_order_id,  Mubahisa];

  db.query(insertQuery, insertValues, (err, result) => {
    if (err) {
      console.error('Error saving data to database:', err);
      return res.status(500).json({ success: false, message: 'Error saving data to the database' });
    }

    // Update current department in work_receiving
    const query = `
      UPDATE work_receiving 
      SET current_department = 'Invoice', previous_department = 'WorkClosing' 
      WHERE work_order_id = ?
    `;

    db.query(query, [work_order_id], (err, result) => {
      if (err) {
        console.error('Error updating department:', err);
        return res.status(500).json({ success: false, message: 'Error updating department' });
      }

      console.log('Department updated to Invoice for work order:', work_order_id);
      res.status(200).json({ success: true, message: 'File uploaded, data saved, and department updated successfully' });
    });
  });
});

// Update work order department to Permission
router.post('/update-wcdepartment', express.json(), (req, res) => {
  const { workOrderId } = req.body;
  const query = `
    UPDATE work_receiving 
    SET current_department = 'Invoice'
    WHERE work_order_id = ?
  `;
  db.query(query, [workOrderId], (err, result) => {
    if (err) {
      console.error('Error updating department:', err);
      res.status(500).send('Error updating department');
    } else {
      console.log('Department updated to Permission for work order:', workOrderId);
      res.status(200).send('Department updated');
    }
  });
});
// Update work order department to Permission

router.put("/update-wcdelivery-status", (req, res) => {
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

router.get('/workclosing_download/:id', (req, res) => {
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
    { sql: 'SELECT work_closing_certificate FROM permission_closing WHERE work_order_id = ?', key: 'work_closing_certificate' },
    { sql: 'SELECT final_closing_certificate FROM permission_closing WHERE work_order_id = ?', key: 'final_closing_certificate' }
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
router.put('/edit-workclosing/:id', upload.fields([
  { name: 'mubahisa', maxCount: 20}
]), (req, res) => {
  const workOrderId = req.params.id;
  // const { submission_date, resubmission_date, approval_date } = req.body;

  // Validate required fields
  // if (!workOrderId || !submission_date || !resubmission_date || !approval_date) {
    // return res.status(400).json({ error: 'Missing required fields' });
  // }

  // Handle file paths
  const mubahisaFile = req.files['mubahisa']
    ? req.files['mubahisa'].map(file => file.filename)
    : null;

  // Update query
  const query = `
    UPDATE work_closing 
    SET 
     
      mubahisa = ?
    WHERE work_order_id = ?
  `;

  const queryValues = [
    JSON.stringify(mubahisaFile), // Assuming mubahisa is an array of file names
    workOrderId
  ];

  db.query(query, queryValues, (err, results) => {
    if (err) {
      console.error('Error updating work closing:', err);
      return res.status(500).json({ error: 'Database update failed' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Work order not found or no changes made' });
    }

    // Send success response
    res.status(200).json({ message: 'Work closing updated successfully' });
  });
});

module.exports = router;
