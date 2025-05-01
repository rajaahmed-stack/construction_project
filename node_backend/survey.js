const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

// Database Connection
const db = mysql.createConnection({
  host: 'mysql.railway.internal',
  user: 'root',
  password: 'wPchUnlzWGmWGJZdUJCwhIWfNYYBYPMi',
  database: 'railway'
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
    SELECT * FROM work_receiving 
    WHERE work_order_id NOT IN 
      (SELECT work_order_id FROM survey) 
    AND current_department = 'Survey'
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

router.post('/save-survey', upload.single('survey_file_path'), (req, res) => {
  console.log('Uploaded File:', req.file);
  console.log('Form Data:', req.body);

  const { work_order_id, handover_date, return_date, remark } = req.body;
  const documentFilePath = req.file ? req.file.path : null; // ✅ Correct: Get the relative path from Multer

  if (!work_order_id || !handover_date || !return_date || !remark) {
    return res.status(400).send('All fields are required');
  }

  // Check for duplicate
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

      fs.readFile(documentFilePath, (err, fileData) => {
        if (err) {
          console.error('Error reading file:', err);
          return db.rollback(() => res.status(500).send('Error reading uploaded file'));
        }

        const insertQuery = `
          INSERT INTO survey (work_order_id, handover_date, return_date, remark, survey_file_path) 
          VALUES (?, ?, ?, ?, ?)
        `;

        db.query(insertQuery, [work_order_id, handover_date, return_date, remark, fileData], (err) => {
          if (err) {
            console.error('Error inserting survey data:', err);
            return db.rollback(() => res.status(500).send('Error inserting survey data'));
          }

          const updateQuery = `
            UPDATE work_receiving 
            SET current_department = 'Permission' 
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

// Download Survey File
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

    if (Buffer.isBuffer(filePath)) {
      filePath = filePath.toString('utf8');
    }

    const absolutePath = path.join(__dirname, filePath);

    res.download(absolutePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error downloading file');
      }
    });
  });
});
router.put('/edit-survey/:id', upload.single('survey_file_path'), (req, res) => {
  const workOrderId = req.params.id;
  const { handover_date, return_date, remark } = req.body;

  // Handle the file path, or use null if no file is uploaded
  const documentFilePath = req.file ? path.join('uploads', req.file.filename) : null;

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
    res.status(200).send('Work receiving updated successfully');
  });
});
module.exports = router;
