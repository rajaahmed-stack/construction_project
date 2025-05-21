const fs = require('fs'); // Add this at the top of your file
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const router = express.Router();
const multer = require('multer');
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
router.post('/upload-and-save-pdocument', upload.array('Document'), (req, res) => {
  try {
    console.log('Request Body:', req.body);
    console.log('Uploaded File:', req.files);

    const { work_order_id, permission_number, request_date, start_date, end_date, delivery_status } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No document uploaded.' });
    }
    

    const documentFilePath = req.files.map(file => path.join('uploads', file.filename)).join(',');


    // Check all fields
    if (!work_order_id || !permission_number || !request_date ||   !start_date || !end_date) {
      console.error('Missing required fields.');
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const insertQuery = `
      INSERT INTO permissions 
      (work_order_id, permission_number, request_date, Document, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const insertValues = [work_order_id, permission_number, request_date, documentFilePath, start_date, end_date];

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
          SET current_department = 'Safety', delivery_status = ?, previous_department = 'Permission'
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
       AND work_receiving.job_type != 'New Meters';
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


router.get('/permission1_download/:id', (req, res) => {
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
router.get('/permission2_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT survey_file_path FROM survey WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].survey_file_path;

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

      res.attachment(`survey_files_${fileId}.zip`);
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
router.put('/edit-permission/:id', upload.array('Document'), (req, res) => {
  const workOrderId = req.params.id;
  const { permission_number, request_date,  start_date, end_date } = req.body;

  // Handle the file path, or use null if no file is uploaded
  const documentFilePath = req.files.map(file => file.path).join(','); // ✅ Correct: Get the relative path from Multer

  // Update query
  const query = `
    UPDATE permissions 
    SET permission_number = ?, request_date = ?,  start_date = ?,  end_date = ?, Document = ?
    WHERE work_order_id = ?
  `;

  db.query(query, [permission_number, request_date,  start_date, end_date,  documentFilePath, workOrderId], (err, results) => {
    if (err) {
      console.error('Error updating work receiving:', err);
      return res.status(500).send('Error updating work receiving');
    }

    // Send success response if query is successful
    res.status(200).send('Work receiving updated successfully');
  });
});

module.exports = router;
