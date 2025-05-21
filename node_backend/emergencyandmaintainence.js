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
router.get('/e&m', (req, res) => {
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
router.post('/save-emergency_and_maintainence', upload.array('file_path'), (req, res) => {
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

            res.status(200).send('Emergency & Maintainence data saved successfully');
          });
        });
      });
    });
  });
});
router.get('/api/em_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT file_path FROM emergency_and_maintainence WHERE work_order_id = ?', [fileId], (err, results) => {
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
router.delete('/delete-emergency-maintainence/:id', (req, res) => {
  const workOrderId = req.params.id;

  const queries = [
    'DELETE FROM store WHERE work_order_id = ?',
    'DELETE FROM invoice WHERE work_order_id = ?',
    'DELETE FROM work_closing WHERE work_order_id = ?',
    'DELETE FROM emergency_and_maintainence WHERE work_order_id = ?'
  ];

  let completed = 0;
  let hasError = false;

  queries.forEach((sql) => {
    if (hasError) return;

    db.query(sql, [workOrderId], (err, result) => {
      if (err) {
        hasError = true;
        console.error('Error deleting work receiving:', err);
        return res.status(500).send('Error deleting work receiving');
      }

      completed++;
      if (completed === queries.length && !hasError) {
        res.status(200).send('Emergency & Maintainence deleted successfully');
      }
    });
  });
});

router.put('/edit-emergency-maintainence/:id', upload.array('file_path'), (req, res) => {
  const workOrderId = req.params.id;
  const { jobType, subSection, receivingDate, endDate, estimatedValue, current_department, delivery_status,remarks } = req.body;
  const documentFilePath = req.files.map(file => file.path).join(','); // ✅ Correct: Get the relative path from Multer

  const query = `
    UPDATE emergency_and_maintainence 
    SET job_type = ?, sub_section = ?, receiving_date = ?, end_date = ?, estimated_value = ?, 
   file_path = ?, remarks = ?
    WHERE work_order_id = ?
  `;

  db.query(query, [jobType, subSection, receivingDate, endDate, estimatedValue, current_department, delivery_status, documentFilePath, remarks, workOrderId], (err, results) => {
    if (err) {
      console.error('Error updating work receiving:', err);
      return res.status(500).send('Error updating work receiving');
    }

    res.status(200).send('Work receiving updated successfully');
  });
});


module.exports = router;
