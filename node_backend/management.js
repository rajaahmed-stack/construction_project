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
const uploadDir = path.join(__dirname, 'uploads');

// Ensure that the uploads directory exists
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use the directory where you want to store the files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp to avoid name collisions
  }
});

const upload = multer({ storage: storage });


// Fetch workExecution Coming Data
router.get('/management-data', (req, res) => {
    const query = `
        SELECT 
        work_receiving.work_order_id, 
        work_receiving.current_department,
        work_receiving.sub_section, 
        work_receiving.job_type, 
        work_receiving.delivery_status 
        FROM work_receiving 
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
// Search by Work Order ID
router.get('/search-workorder/:workOrderId', (req, res) => {
  const { workOrderId } = req.params;
  const query = `
    SELECT 
      work_order_id, 
      current_department,
      sub_section, 
      job_type, 
      delivery_status 
    FROM work_receiving 
    WHERE work_order_id = ?
  `;

  db.query(query, [workOrderId], (err, results) => {
    if (err) {
      console.error("Search query error:", err);
      res.status(500).send("Error searching work order");
    } else {
      res.json(results);
    }
  });
});
// Search filter by department
router.get('/search-filter', (req, res) => {
  const { value } = req.query;

  if (!value) {
    return res.status(400).send('Missing department value');
  }

  const allowedValues = [
    'Work Receiving',
    'Survey',
    'Permission',
    'Safety',
    'Work Execution',
    'Permission Closing',
    'Work Closing',
    'Drawing',
    'GIS',
    'Store',
  ];

  if (!allowedValues.includes(value)) {
    return res.status(400).send('Invalid department value');
  }

  let query = '';

  switch (value) {
    case 'Work Receiving':
      query = `
        SELECT 
          work_order_id, 
          current_department, 
          sub_section, 
          job_type, 
          delivery_status 
        FROM work_receiving
      `;
      break;

    case 'Survey':
      query = `SELECT * FROM survey`;
      break;

    case 'Permission':
      query = `SELECT * FROM permissions`;
      break;

    case 'Safety':
      query = `SELECT * FROM safety_department`;
      break;

    case 'Work Execution':
      query = `SELECT * FROM work_execution`;
      break;

    case 'Permission Closing':
      query = `SELECT * FROM permission_closing`;
      break;

    case 'Work Closing':
      query = `SELECT * FROM work_closing`;
      break;

    case 'Drawing':
      query = `SELECT * FROM drawing_department`;
      break;

    case 'GIS':
      query = `SELECT * FROM gis_department`;
      break;

    case 'Store':
      query = `SELECT * FROM store`;
      break;

    default:
      return res.status(400).send('Invalid department');
  }

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching department data:', err);
      res.status(500).send('Error fetching department data');
    } else {
      res.json(results);
    }
  });
});


module.exports = router;
