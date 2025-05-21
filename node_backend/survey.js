const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
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

// --------------------------- ROUTES -----------------------------

// Fetch Work Orders Coming to Survey
router.get('/survey-coming', (req, res) => {
  const query = `
    SELECT * 
FROM work_receiving 
WHERE work_order_id NOT IN (SELECT work_order_id FROM survey) 
  AND current_department = 'Survey' 
  AND job_type != 'New Meters';

  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Database query error');
    }
    console.log('Survey Coming Data:', results);
    res.json(results);
  });
});

// Fetch Survey Data
router.get('/survey-data', (req, res) => {
  const query = `
    SELECT 
      survey.work_order_id, 
      work_receiving.job_type, 
      work_receiving.sub_section, 
      work_receiving.created_at, 
      work_receiving.file_path,
      survey.handover_date, 
      survey.return_date, 
      survey.remark,
      survey.survey_created_at,
      survey.survey_file_path,
      work_receiving.current_department
    FROM survey
    JOIN work_receiving ON survey.work_order_id = work_receiving.work_order_id
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Database query error');
    }
    console.log('Survey Data:', results);
    res.json(results);
  });
});

// Save Survey Data (handle file upload separately in server.js)
const multer = require('multer');
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
// Since Multer and uploadDir are initialized in server.js,
// we assume you exported `upload` from server.js
// const { upload } = require('./server'); // Adjust the path if needed

router.post('/save-survey', upload.array('survey_file_path'), (req, res) => {
  console.log('Uploaded Files:', req.files);
  console.log('Form Data:', req.body);

  const { work_order_id, handover_date, return_date, remark } = req.body;

  if (!work_order_id || !handover_date || !return_date || !remark) {
    return res.status(400).send('All fields are required');
  }

  // ✅ Save comma-separated file paths
  const documentFilePath = req.files.map(file => file.path).join(',');

  const checkDuplicateQuery = `SELECT COUNT(*) AS count FROM survey WHERE work_order_id = ?`;

  db.query(checkDuplicateQuery, [work_order_id], (err, results) => {
    if (err) {
      console.error('Error checking duplicate:', err);
      return res.status(500).send('Error checking duplicate');
    }

    if (results[0].count > 0) {
      return res.status(400).send('Duplicate entry: Work order already exists in survey');
    }

    db.beginTransaction((err) => {
      if (err) {
        console.error('Transaction start error:', err);
        return res.status(500).send('Transaction start error');
      }

      const insertQuery = `
        INSERT INTO survey (work_order_id, handover_date, return_date, remark, survey_file_path) 
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(insertQuery, [work_order_id, handover_date, return_date, remark, documentFilePath], (err) => {
        if (err) {
          console.error('Error inserting survey data:', err);
          return db.rollback(() => res.status(500).send('Error inserting survey data'));
        }

        const updateQuery = `
          UPDATE work_receiving 
          SET current_department = 'Permission', 
              previous_department = 'Survey'
          WHERE work_order_id = ?
        `;

        db.query(updateQuery, [work_order_id], (err) => {
          if (err) {
            console.error('Error updating department:', err);
            return db.rollback(() => res.status(500).send('Error updating department'));
          }

          db.commit((err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              return db.rollback(() => res.status(500).send('Error committing transaction'));
            }

            console.log(`Survey data saved for Work Order: ${work_order_id}`);
            res.status(200).send('Survey data saved and department updated successfully');
          });
        });
      });
    });
  });
});


// Update Delivery Status
router.put('/api/update-delivery-status', express.json(), (req, res) => {
  const { work_order_id, delivery_status } = req.body;

  if (!work_order_id || !delivery_status) {
    console.error('Missing fields for delivery status update');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const updateQuery = `
    UPDATE work_receiving 
    SET delivery_status = ?
    WHERE work_order_id = ?
  `;

  db.query(updateQuery, [delivery_status, work_order_id], (err, result) => {
    if (err) {
      console.error('Error updating delivery status:', err);
      return res.status(500).json({ error: 'Database update failed' });
    }

    console.log('Delivery status updated successfully');
    res.json({ message: 'Delivery status updated successfully', affectedRows: result.affectedRows });
  });
});

// Update Department to Permission (if needed)
router.post('/update-department', express.json(), (req, res) => {
  const { workOrderId } = req.body;

  if (!workOrderId) {
    return res.status(400).send('Work Order ID is required');
  }

  const updateQuery = `
    UPDATE work_receiving 
    SET current_department = 'Permission' 
    WHERE work_order_id = ?
  `;

  db.query(updateQuery, [workOrderId], (err, result) => {
    if (err) {
      console.error('Error updating department:', err);
      return res.status(500).send('Error updating department');
    }
    console.log('Department updated to Permission for Work Order:', workOrderId);
    res.status(200).send('Department updated');
  });
});


router.get('/survey_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT file_path FROM work_receiving WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].file_path;

    // Convert buffer to string if needed
    if (Buffer.isBuffer(filePath)) {
      filePath = filePath.toString('utf8');
    }

    const filePaths = filePath.split(',');

    if (filePaths.length === 1) {
      // Single file
      const absolutePath = path.resolve(filePaths[0]);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).send('File not found on server');
      }

      return res.download(absolutePath);
    } else {
      // Multiple files — create a zip
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      res.attachment(`files_${fileId}.zip`);
      archive.pipe(res);

      filePaths.forEach(p => {
        const absPath = path.resolve(p);
        if (fs.existsSync(absPath)) {
          archive.file(absPath, { name: path.basename(p) });
        }
      });

      archive.finalize();
    }
  });
});

router.put('/edit-survey/:id', upload.array('survey_file_path'), (req, res) => {
  const workOrderId = req.params.id;
  const { handover_date, return_date, remark } = req.body;

  // Handle the file path, or use null if no file is uploaded
  const documentFilePath = req.files.map(file => file.path).join(','); // ✅ Correct: Get the relative path from Multer

  // Update query
  const query = `
    UPDATE survey 
    SET handover_date = ?, return_date = ?, remark = ?, survey_file_path = ?
    WHERE work_order_id = ?
  `;

  db.query(query, [handover_date, return_date, remark, documentFilePath, workOrderId], (err, results) => {
    if (err) {
      console.error('Error updating work receiving:', err);
      return res.status(500).send('Error updating work receiving');
    }

    // Send success response if query is successful
    res.status(200).send('survey updated successfully');
  });
});
module.exports = router;
