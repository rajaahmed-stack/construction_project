const fs = require('fs'); // Add this at the top of your file
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const archiver = require('archiver');


// MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'mysql.railway.internal',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'wPchUnlzWGmWGJZdUJCwhIWfNYYBYPMi',
  database: process.env.MYSQL_DATABASE || 'railway'
});


db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to MySQL database.');
  }
});

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
const uploadDirectory = 'uploads';

if (!fs.existsSync(uploadDirectory)){
  fs.mkdirSync(uploadDirectory);
}
// Create the upload object
const upload = multer({ storage: storage });


// Upload and Save Permission Document
router.post('/upload-and-save-pdocument', upload.single('Document'), (req, res) => {
  try {
    console.log('Request Body:', req.body);
    console.log('Uploaded File:', req.file);

    const { work_order_id, permission_number, request_date, permission_renewal, start_date, end_date, delivery_status } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document uploaded.' });
    }

    const documentFilePath = path.join('uploads', req.file.filename);

    // Check all fields
    if (!work_order_id || !permission_number || !request_date || !permission_renewal || !start_date || !end_date) {
      console.error('Missing required fields.');
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const insertQuery = `
      INSERT INTO permissions 
      (work_order_id, permission_number, request_date, Document, permission_renewal, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const insertValues = [work_order_id, permission_number, request_date, documentFilePath, permission_renewal, start_date, end_date];

    db.query(insertQuery, insertValues, (err, result) => {
      if (err) {
        console.error('Error saving data to database:', err);
        return res.status(500).json({ success: false, message: 'Error saving data to database', error: err });
      }

      console.log('Data inserted successfully:', result);

      const updateQuery = `
        UPDATE permissions
        SET Document_complete = ?
        WHERE work_order_id = ?
      `;
      const updateValues = [true, work_order_id];

      db.query(updateQuery, updateValues, (err, updateResult) => {
        if (err) {
          console.error('Error updating Document_complete:', err);
          return res.status(500).json({ success: false, message: 'Error updating document completion' });
        }

        const departmentUpdateQuery = `
          UPDATE work_receiving
          SET current_department = 'Safety', delivery_status = ?
          WHERE work_order_id = ?
        `;
        db.query(departmentUpdateQuery, [delivery_status, work_order_id], (err, departmentUpdateResult) => {
          if (err) {
            console.error('Error updating department:', err);
            return res.status(500).json({ success: false, message: 'Error updating department' });
          }

          console.log('Everything saved and updated successfully.');
          res.status(200).json({ success: true, message: 'File uploaded and all data saved successfully' });
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get Incoming Permission Data
router.get('/permission-coming', (req, res) => {
  const query = `
    SELECT 
      survey.work_order_id, 
      work_receiving.job_type, 
      work_receiving.sub_section, 
      work_receiving.file_path, 
      survey.survey_file_path
    FROM survey 
    LEFT JOIN work_receiving ON survey.work_order_id = work_receiving.work_order_id
    WHERE survey.work_order_id NOT IN (SELECT work_order_id FROM permissions)
      AND work_receiving.current_department = 'Permission'
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching incoming permission data:', err);
      return res.status(500).json({ error: 'Error fetching data' });
    }
    res.json(results);
  });
});

// Get Existing Permission Data
router.get('/permission-data', (req, res) => {
  const query = `
    SELECT 
      permissions.*, 
      work_receiving.current_department, 
      work_receiving.job_type, 
      work_receiving.sub_section, 
      work_receiving.file_path, 
      survey.survey_created_at, 
      survey.survey_file_path, 
      permissions.Document,
      permissions.permission_created_at,
      permissions.Document_complete
    FROM permissions
    JOIN work_receiving ON permissions.work_order_id = work_receiving.work_order_id
    LEFT JOIN survey ON permissions.work_order_id = survey.work_order_id
    ORDER BY permissions.request_date DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching permission data:', err);
      return res.status(500).json({ error: 'Error fetching data' });
    }
    res.json(results);
  });
});

// Update Department After Saving
router.post('/update-permissiondepartment', (req, res) => {
  const { workOrderId } = req.body;

  if (!workOrderId) {
    return res.status(400).json({ error: 'Missing workOrderId' });
  }

  const updateQuery = `
    UPDATE work_receiving
    SET current_department = 'Safety'
    WHERE work_order_id = ?
  `;
  db.query(updateQuery, [workOrderId], (updateErr) => {
    if (updateErr) {
      console.error('Error updating department:', updateErr);
      return res.status(500).json({ error: 'Error updating department' });
    }

    console.log('Permission data saved successfully and department updated');
    res.status(200).json({ message: 'Permission data saved successfully and department updated' });
  });
});

// Update Delivery Status
router.put('/update-pdelivery-status', (req, res) => {
  const { work_order_id, delivery_status } = req.body;

  if (!work_order_id || !delivery_status) {
    console.error('Missing required fields');
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

    if (result.affectedRows === 0) {
      console.warn('No records updated. Check if work_order_id exists:', work_order_id);
      return res.status(404).json({ error: 'Work order not found' });
    }

    console.log('Database updated successfully:', result);
    res.json({ message: 'Delivery status updated successfully', affectedRows: result.affectedRows });
  });
});

// Download Permission File
// Download Permission File
// router.get('/permission_download/:id', (req, res) => {
//   const fileId = req.params.id;

//   db.query(`
   
//     SELECT survey_file_path FROM survey WHERE work_order_id = ?
//   `, [fileId, fileId], (err, results) => {
//     if (err) {
//       console.error('Database error:', err);
//       return res.status(500).send('Database error');
//     }

//     if (!results.length) {
//       console.error('No results found for the work_order_id:', fileId);
//       return res.status(404).send('File not found');
//     }

//     // Convert from Buffer to string
//     const rawFilePath = results[0].file_path?.toString('utf8') || results[0].survey_file_path?.toString('utf8');
//     if (!rawFilePath || typeof rawFilePath !== 'string' || rawFilePath.trim() === '') {
//       console.error('File path is empty or invalid:', rawFilePath);
//       return res.status(404).send('File path is empty or invalid');
//     }

//     const safeFilePath = path.normalize(rawFilePath);
//     const absolutePath = path.join(__dirname, '..', safeFilePath);

//     console.log('Raw DB file path:', rawFilePath);
//     console.log('Normalized path:', safeFilePath);
//     console.log('Absolute path:', absolutePath);

//     if (!fs.existsSync(absolutePath)) {
//       console.error('File does not actually exist on disk:', absolutePath);
//       return res.status(404).send('File does not exist');
//     }

//     res.download(absolutePath, (err) => {
//       if (err) {
//         console.error('Error sending file:', err);
//         return res.status(500).send('Error downloading file');
//       }
//     });
//   });
// });
router.get('/permission_download/:id', (req, res) => {
  const fileId = req.params.id;

  const queries = [
    { sql: 'SELECT file_path FROM work_receiving WHERE work_order_id = ?', key: 'file_path' },
    { sql: 'SELECT survey_file_path FROM survey WHERE work_order_id = ?', key: 'survey_file_path' }
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
router.put('/edit-permission/:id', upload.single('Document'), (req, res) => {
  const workOrderId = req.params.id;
  const { permission_number, request_date, permission_renewal, start_date, end_date } = req.body;

  // Handle the file path, or use null if no file is uploaded
  const documentFilePath = req.file ? path.join('uploads', req.file.filename) : null;

  // Update query
  const query = `
    UPDATE permissions 
    SET permission_number = ?, request_date = ?, permission_renewal = ?, start_date = ?,  end_date = ?, Document = ?
    WHERE work_order_id = ?
  `;

  db.query(query, [permission_number, request_date, permission_renewal, start_date, end_date,  documentFilePath, workOrderId], (err, results) => {
    if (err) {
      console.error('Error updating work receiving:', err);
      return res.status(500).send('Error updating work receiving');
    }

    // Send success response if query is successful
    res.status(200).send('Work receiving updated successfully');
  });
});

module.exports = router;
