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
router.get('/api/e&m', (req, res) => {
  const query = 'SELECT * FROM emergency_and_maintainence';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      res.json(results);
    }
  });
});

// Save work_receiving data
router.post('/api/save-emergency_and_maintainence', upload.array('file_path'), (req, res) => {
  const { workOrderList, jobType, subSection, receivingDate, endDate, estimatedValue, remarks } = req.body;
const documentFilePath = req.files?.map(file => path.join('uploads', file.filename)).join(',') || null;

  if (!workOrderList || !jobType || !subSection || !receivingDate || !endDate || !estimatedValue || !remarks ) {
    return res.status(400).send('All fields are required');
  }

  const checkDuplicateQuery = `SELECT COUNT(*) AS count FROM emergency_and_maintainence WHERE work_order_id = ?`;

  db.query(checkDuplicateQuery, [workOrderList], (err, results) => {
    if (err) {
      console.error('Error checking duplicate:', err);
      return res.status(500).send('Error checking for duplicate entry');
    }

    if (results[0].count > 0) {
      return res.status(400).send('Duplicate entry: Work order already exists in survey');
    }

    db.beginTransaction((err) => {
      if (err) {
        console.error('Error starting transaction:', err);
        return res.status(500).send('Error initializing transaction');
      }

      const insertQuery = `
        INSERT INTO emergency_and_maintainence 
        (work_order_id, job_type, sub_section, receiving_date, end_date, estimated_value,  file_path, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(insertQuery, [workOrderList, jobType, subSection, receivingDate, endDate, estimatedValue, documentFilePath, remarks], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error saving data:', err);
            res.status(500).send('Database error while saving emergency & maintainence data');
          });
        }

        const updateQuery = `
          UPDATE work_receiving 
          SET current_department = 'WorkClosing' 
          WHERE work_order_id = ?
        `;

        db.query(updateQuery, [workOrderList], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error updating department:', err);
              res.status(500).send('Error updating department');
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error('Transaction commit failed:', err);
                res.status(500).send('Transaction commit failed');
              });
            }

            res.status(200).send('Work Receiving data saved successfully');
          });
        });
      });
    });
  });
});
module.exports = router;
