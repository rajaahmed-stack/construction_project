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
// Combined route for file upload and data saving
router.post('/upload-and-save-gisdocument', upload.fields([
  { name: 'gis', maxCount: 30 }, // allow up to 10 GIS files
]), (req, res) => {
  console.log(req.files);
  console.log(req.body);

  const { work_order_id } = req.body;

  // Handle multiple files — save filenames as JSON string or comma-separated string
  const gisFiles = req.files['gis'] ? req.files['gis'].map(file => file.filename) : [];

  // Convert array to JSON string to store in DB
  const insertQuery = `
    INSERT INTO gis_department 
    (work_order_id, gis)
    VALUES (?, ?)
  `;
  const insertValues = [work_order_id, JSON.stringify(gisFiles)];

  db.query(insertQuery, insertValues, (err, result) => {
    if (err) {
      console.error('Error saving data to database:', err);
      return res.status(500).json({ success: false, message: 'Error saving data to the database' });
    }
    const updatedQuery = `
    UPDATE gis_department
    SET gis_completed = ?
    WHERE work_order_id = ?
  `;
  const updatedValues = [true, work_order_id];

  db.query(updatedQuery, updatedValues, (err, updateResult) => {
    if (err) {
      console.error('Error updating certificate completion status:', err);
      return res.status(500).json({ success: false, message: 'Error updating completion status' });
    }

    const updateQuery = `
      UPDATE work_receiving 
      SET current_department = 'Store' 
      WHERE work_order_id = ?
    `;

    db.query(updateQuery, [work_order_id], (err, result) => {
      if (err) {
        console.error('Error updating department:', err);
        return res.status(500).json({ success: false, message: 'Error updating department' });
      }

      console.log('Department updated to Store for work order:', work_order_id);
      res.status(200).json({ success: true, message: 'Files uploaded, data saved, and department updated successfully' });
    });
  });
});
});

// Fetch workExecution Coming Data
router.get('/gisdep-coming', (req, res) => {
    const query = `
     SELECT 
  drawing_department.work_order_id, 
  drawing_department.drawing,
  work_receiving.job_type, 
  work_receiving.file_path, 
  work_receiving.sub_section
FROM drawing_department 
LEFT JOIN work_receiving 
  ON drawing_department.work_order_id = work_receiving.work_order_id
WHERE 
  (
    drawing_department.work_order_id NOT IN (SELECT work_order_id FROM gis_department) 
    AND current_department = 'GIS'
  )
  OR drawing_department.work_order_id IS NOT NULL

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

router.get('/gis-data', (req, res) => {
  const query = `
    SELECT gis_department.work_order_id,
           gis_department.gis, 
           gis_department.g_created_at, 
           drawing_department.d_created_at
    
    FROM gis_department
    LEFT JOIN work_receiving 
    ON gis_department.work_order_id = work_receiving.work_order_id
    LEFT JOIN drawing_department 
    ON gis_department.work_order_id = drawing_department.work_order_id
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
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Update work order department
router.post('/update-gisdepartment', express.json(), (req, res) => {
  const { workOrderId } = req.body;
  const query = `
    UPDATE work_receiving 
    SET current_department = 'Store', previous_department = 'GIS' 
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
router.put("/update-gdelivery-status", (req, res) => {
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


function setupDownloadRoute(router, routePath, dbQuery, columnName, zipPrefix) {
  router.get(routePath, (req, res) => {
    const fileId = req.params.id;

    db.query(dbQuery, [fileId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Database error');
      }

      if (results.length === 0) {
        return res.status(404).send('File not found');
      }

      let filePath = results[0][columnName];

      if (Buffer.isBuffer(filePath)) {
        filePath = filePath.toString('utf8');
      }

      const filePaths = filePath.split(',');

      if (filePaths.length === 1) {
        const absolutePath = path.resolve(filePaths[0]);
        if (!fs.existsSync(absolutePath)) {
          return res.status(404).send('File not found on server');
        }
        return res.download(absolutePath);
      } else {
        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`${zipPrefix}_${fileId}.zip`);
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
}
setupDownloadRoute(
  router,
  '/gis_download/:id',
  'SELECT drawing FROM drawing_department WHERE work_order_id = ?',
  'drawing',
  'Drawing_files'
);

module.exports = router;


