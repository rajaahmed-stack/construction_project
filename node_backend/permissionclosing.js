const express = require('express');
const mysql = require('mysql2');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'fb06fa8653c3',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'wPchUnlzWGmWGJZdUJCwhIWfNYYBYPMi',
  database: process.env.MYSQL_DATABASE || 'railway'
});


db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to the database');
  }
});
// Ensure uploads directory exists


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


// Middleware to parse JSON
router.use(express.json());

// Fetch permissionclosing Coming Data
router.get('/permissionclosing-coming', (req, res) => {
    const query = `
    SELECT 
    work_execution.work_order_id, 
    work_execution.permission_number, 
    work_receiving.job_type, 
    work_receiving.file_path, 
    work_receiving.sub_section, 
    survey.survey_file_path, 
    permissions.Document
    FROM 
        work_execution
    LEFT JOIN 
        work_receiving 
        ON work_execution.work_order_id = work_receiving.work_order_id
    LEFT JOIN 
        survey 
        ON work_execution.work_order_id = survey.work_order_id
    LEFT JOIN 
        permissions 
        ON work_execution.work_order_id = permissions.work_order_id
    WHERE 
        work_execution.work_order_id NOT IN 
            (SELECT work_order_id FROM permission_closing) 
        AND work_receiving.current_department = 'PermissionClosing';

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

// Fetch PermissionClosing Data
router.get('/PermissionClosing-data', (req, res) => {
    const query = `
    SELECT permission_closing.work_order_id,
    permission_closing.permission_number,
    work_receiving.job_type, 
    work_receiving.sub_section,
    work_receiving.current_department,
    work_receiving.file_path,
    permission_closing.closing_date,
    permission_closing.permission_number,
    permission_closing.penalty_reason,
    permission_closing.work_closing_certificate_completed,
    permission_closing.final_closing_certificate_completed,
    permission_closing.penalty_amount,
    permission_closing.pc_created_at,
    work_execution.workexe_created_at,
    survey.survey_file_path,
    permissions.Document
    FROM permission_closing
    LEFT JOIN work_receiving 
    ON permission_closing.work_order_id = work_receiving.work_order_id
    LEFT JOIN work_execution 
    ON work_execution.work_order_id = work_receiving.work_order_id  -- Added JOIN for work_execution
    LEFT JOIN survey 
    ON survey.work_order_id = work_receiving.work_order_id  -- Added JOIN for survey
    LEFT JOIN permissions 
    ON permissions.work_order_id = work_receiving.work_order_id  -- Added JOIN for permissions
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        res.status(500).send('Database query error');
      } else {
        console.log('Permission Closing Fetching Data:', results);  // Log the results
  
        res.json(results);
      }
    });
  });

// Combined route for file upload and data saving
router.post('/upload-and-save-pcdocument', upload.fields([
  { name: 'Work_closing_certificate', maxCount: 1 },
  { name: 'final_closing_certificate', maxCount: 1 }
]), (req, res) => {
  console.log(req.files);
  console.log(req.body);

  const { work_order_id, permission_number, closing_date, penalty_reason, penalty_amount } = req.body;
  const workClosingCertificate = req.files['Work_closing_certificate'] ? req.files['Work_closing_certificate'][0].filename : null;
  const finalClosingCertificate = req.files['final_closing_certificate'] ? req.files['final_closing_certificate'][0].filename : null;

  // Insert file information and work order details into the database
  const insertQuery = `
    INSERT INTO permission_closing 
    (work_order_id, permission_number, closing_date, penalty_reason, penalty_amount, Work_closing_certificate, final_closing_certificate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const insertValues = [work_order_id, permission_number, closing_date, penalty_reason, penalty_amount, workClosingCertificate, finalClosingCertificate];

  db.query(insertQuery, insertValues, (err, result) => {
    if (err) {
      console.error('Error saving data to database:', err);
      return res.status(500).json({ success: false, message: 'Error saving data to the database' });
    }

    // Update completion status for certificates
    const updateQuery = `
      UPDATE permission_closing
      SET work_closing_certificate_completed = ?, final_closing_certificate_completed = ?
      WHERE work_order_id = ?
    `;
    const updateValues = [true, true, work_order_id];

    db.query(updateQuery, updateValues, (err, updateResult) => {
      if (err) {
        console.error('Error updating certificate completion status:', err);
        return res.status(500).json({ success: false, message: 'Error updating completion status' });
      }

      // Update current department in work_receiving
      const query = `
        UPDATE work_receiving 
        SET current_department = 'WorkClosing'
        WHERE work_order_id = ?
      `;

      db.query(query, [work_order_id], (err, result) => {
        if (err) {
          console.error('Error updating department:', err);
          return res.status(500).json({ success: false, message: 'Error updating department' });
        }

        console.log('Department updated to WorkClosing for work order:', work_order_id);
        res.status(200).json({ success: true, message: 'File uploaded, data saved, and department updated successfully' });
      });
    });
  });
});

// Update work order department to Permission
router.post('/update-pcdepartment', (req, res) => {
  const { workOrderId } = req.body;
  const query = `
    UPDATE work_receiving 
    SET current_department = 'WorkClosing' 
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
router.put("/update-pcdelivery-status", (req, res) => {
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

router.get('/permissionclosing_download/:id', async (req, res) => {
  console.log('Work Execution download API triggered');

  const fileId = req.params.id;

  // Query the database for the file paths
  const query = `
    SELECT file_path FROM work_receiving WHERE work_order_id = ?
    UNION 
    SELECT survey_file_path FROM survey WHERE work_order_id = ?
    UNION 
    SELECT Document FROM permissions WHERE work_order_id = ?
    UNION 
    SELECT safety_signs FROM safety_department WHERE work_order_id = ?
    UNION 
    SELECT safety_barriers FROM safety_department WHERE work_order_id = ?
    UNION 
    SELECT safety_lights FROM safety_department WHERE work_order_id = ?
    UNION 
    SELECT safety_boards FROM safety_department WHERE work_order_id = ?
    UNION 
    SELECT permissions FROM safety_department WHERE work_order_id = ?
    UNION 
    SELECT safety_documentation FROM safety_department WHERE work_order_id = ?
    UNION 
    SELECT asphalt FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT milling FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT concrete FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT deck3 FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT deck2 FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT deck1 FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT sand FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT backfilling FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT cable_lying FROM work_execution WHERE work_order_id = ?
    UNION 
    SELECT trench FROM work_execution WHERE work_order_id = ?
  `;

  const params = Array(19).fill(fileId); // Ensures that the same fileId is used for all placeholders

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (!results.length) {
      return res.status(404).send('File not found');
    }

    // Find the first non-null file path from the results
    let filePath = results.find(row => {
      return Object.values(row)[0] !== null;
    })?.[Object.keys(results[0])[0]];

    if (!filePath) {
      return res.status(404).send('File not found');
    }

    // Check if the filePath is a Buffer, and convert it to a string if so
    if (Buffer.isBuffer(filePath)) {
      filePath = filePath.toString('utf8');
    }

    // Resolve the full file path for downloading
    const absolutePath = path.resolve(__dirname, '..', filePath);

    console.log(`Downloading file from: ${absolutePath}`);

    // Attempt to download the file
    res.download(absolutePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        return res.status(500).send('Error downloading file');
      }
    });
  });
});
router.get('/permissionclosing_download/:id', (req, res) => {
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


module.exports = router;
