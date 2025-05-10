require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const router = express.Router();
const archiver = require('archiver'); // Ensure archiver is imported

const app = express();
const port = 5000;

// Middleware

// Route imports
const surveyRoutes = require('./survey');
const permissionRoutes = require('./permission');
const safetyRoutes = require('./safety');
const workExecutionRoutes = require('./workExecution');
const permissionClosingRoutes = require('./permissionclosing');
const workClosingRoutes = require('./workclosing');
const drawingdepartment = require('./drawingdep');
const gisdepartment = require('./gis');
const management = require('./management');
const store = require('./store');
const usermanagement = require('./usermanagement');

// MySQL connection
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['https://mmcmadina.com'],
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: ['Content-Type']
}));

// MySQL connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'shinkansen.proxy.rlwy.net',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'XjSGGFPPsszznJyxanyHBVzUeppoFkKn',
  database: process.env.MYSQL_DATABASE || 'railway',
  port: process.env.MYSQL_PORT || '44942'

});


db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Database connected: railway');
  }
});

// Ensure uploads directory exists
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });


// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'rb4733164@gmail.com',
    pass: process.env.EMAIL_PASS || 'avqi dffd sfju bjcn',// App password (not your main password)
  },
});

// Function to send email
const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: 'rb4733164@gmail.com',
    to,
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};
app.post('/api/send-email', (req, res) => {
  const { to, subject, text } = req.body;
  sendEmail(to, subject, text);
  res.status(200).send('Email request received');
});

// Root route
app.get('/server', (req, res) => {
  res.send('Welcome to MMC Construction API');
});

// Avoid duplicate GET route for /api/work_receiving
app.get('/api/work_receiving', (req, res) => {
  const query = 'SELECT * FROM work_receiving';
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
app.post('/api/save-work_receiving', upload.single('file_path'), (req, res) => {
  const { workOrderList, jobType, subSection, receivingDate, endDate, estimatedValue, current_department, delivery_status } = req.body;
  const documentFilePath = req.file ? path.join('uploads', req.file.filename) : null;

  if (!workOrderList || !jobType || !subSection || !receivingDate || !endDate || !estimatedValue || !current_department) {
    return res.status(400).send('All fields are required');
  }

  const checkDuplicateQuery = `SELECT COUNT(*) AS count FROM work_receiving WHERE work_order_id = ?`;

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
        INSERT INTO work_receiving 
        (work_order_id, job_type, sub_section, receiving_date, end_date, estimated_value, current_department, delivery_status, file_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(insertQuery, [workOrderList, jobType, subSection, receivingDate, endDate, estimatedValue, current_department, delivery_status, documentFilePath], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error saving data:', err);
            res.status(500).send('Database error while saving work_receiving data');
          });
        }

        const updateQuery = `
          UPDATE work_receiving 
          SET current_department = 'Survey' 
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

// Download file by work_order_id
app.get('/api/download/:id', (req, res) => {
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

// Update current department
app.post('/api/update-current-department', (req, res) => {
  const { workOrderId, currentDepartment } = req.body;

  const query = `
    UPDATE work_receiving
    SET current_department = ?
    WHERE work_order_id = ?
  `;

  db.query(query, [currentDepartment, workOrderId], (err) => {
    if (err) {
      console.error('Error updating current department:', err);
      res.status(500).send('Failed to update current department');
    } else {
      res.status(200).send('Current department updated successfully');
    }
  });
});




// Function to send email


// Add a new user and send a confirmation email
// Add a new user and send a confirmation email
// Add a new user and send confirmation email
app.post('/api/usermanagement/save_users', (req, res) => {
  const { name, email, password, username } = req.body;
  const query = 'INSERT INTO users (name, email, password, department) VALUES (?, ?, ?, ?)';

  db.query(query, [name, email, password, username], (err, results) => {
    if (err) {
      console.error('Error adding user:', err);
      return res.status(500).send('Server error');
    }

    // Send confirmation email with department-specific username and password
    const subject = 'User Registration Confirmation';
    const text = `Hello ${name},\n\nYour registration was successful! Your login details are:\n\nUsername: ${username}\nPassword: ${password}\n\nThank you for joining us.`;
    sendEmail(email, subject, text);

    // Fetch all users after adding the new one
    db.query('SELECT * FROM users', (err, results) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).send('Server error');
      }
      res.status(201).json(results); // Send back the updated list of users
    });
  });
});
// Get all users


// Update user details
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const query = 'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?';

  db.query(query, [name, email, password, id], (err, results) => {
    if (err) {
      console.error('Error updating user:', err);
      return res.status(500).send('Server error');
    }
    res.send('User updated successfully');
  });
});

// Delete a user
app.delete('/api/delete-users/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM users WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).send('Server error');
    }
    res.send('User deleted successfully');
  });
});

// Define API route for fetching users
app.get('/api/users', (req, res) => {
    // Assuming you want to fetch users from a database or some data source
    const query = 'SELECT * FROM users'; // Adjust based on your database schema
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Error fetching users');
        } else {
            res.json(results);
        }
    });
});
// API to return project statistics
app.get("/api/stats", (req, res) => {
  const stats = {};

  const totalQuery = `SELECT COUNT(*) as total FROM work_receiving`;
  const completedQuery = `SELECT COUNT(*) as \`completed\` FROM work_receiving WHERE delivery_status = 'on time'`;
  const delayedQuery = `SELECT COUNT(*) as \`delayed\` FROM work_receiving WHERE delivery_status = 'delayed'`;

  db.query(totalQuery, (err, totalResult) => {
    if (err) return res.status(500).json({ error: err });

    stats.total = totalResult[0].total;

    db.query(completedQuery, (err, completedResult) => {
      if (err) return res.status(500).json({ error: err });

      stats.projectsCompleted = completedResult[0].completed;

      db.query(delayedQuery, (err, delayedResult) => {
        if (err) return res.status(500).json({ error: err });

        stats.ongoingEmergencies = delayedResult[0].delayed;

       

          // ✅ Finally return all stats
          res.json(stats);
        });
      });
    });
  });
  app.get('/api/recent-work-orders', (req, res) => {
    const query = `
      SELECT work_order_id, job_type, sub_section, receiving_date 
      FROM work_receiving 
      ORDER BY receiving_date DESC 
      LIMIT 5
    `;
    
    db.query(query, (error, results) => {
      if (error) {
        console.error("Error fetching recent work orders:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json(results);
    });
  });
  app.get('/api/chart-stats', (req, res) => {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM work_receiving) AS work_receiving,
        (SELECT COUNT(*) FROM survey) AS survey,
        (SELECT COUNT(*) FROM permissions) AS permissions,
        (SELECT COUNT(*) FROM safety_department) AS safety,
        (SELECT COUNT(*) FROM work_execution) AS work_execution,
        (SELECT COUNT(*) FROM permission_closing) AS permission_closing,
        (SELECT COUNT(*) FROM work_closing) AS work_closing,
        (SELECT COUNT(*) FROM drawing_department) AS drawing,
        (SELECT COUNT(*) FROM gis_department) AS gis,
        (SELECT COUNT(*) FROM store) AS store
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching stats:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      res.json(results[0]);
    });
  });
// Delete work receiving entry by work_order_id
app.delete('/api/delete-work-receiving/:id', (req, res) => {
  const workOrderId = req.params.id;

  const queries = [
    'DELETE FROM store WHERE work_order_id = ?',
    'DELETE FROM gis_department WHERE work_order_id = ?',
    'DELETE FROM drawing_department WHERE work_order_id = ?',
    'DELETE FROM work_closing WHERE work_order_id = ?',
    'DELETE FROM permission_closing WHERE work_order_id = ?',
    'DELETE FROM permission_closing WHERE permission_number IN (SELECT permission_number FROM work_execution WHERE work_order_id = ?)',
    'DELETE FROM work_execution WHERE work_order_id = ?',
    'DELETE FROM work_execution WHERE permission_number IN (SELECT permission_number FROM safety_department WHERE work_order_id = ?)',
    'DELETE FROM safety_department WHERE work_order_id = ?',
    'DELETE FROM safety_department WHERE permission_number IN (SELECT permission_number FROM permissions WHERE work_order_id = ?)',
    'DELETE FROM permissions WHERE work_order_id = ?',
    'DELETE FROM survey WHERE work_order_id = ?',
    'DELETE FROM work_receiving WHERE work_order_id = ?'
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
        res.status(200).send('Work receiving deleted successfully');
      }
    });
  });
});

app.put('/api/edit-work-receiving/:id', upload.single('file_path'), (req, res) => {
  const workOrderId = req.params.id;
  const { jobType, subSection, receivingDate, endDate, estimatedValue, current_department, delivery_status } = req.body;
  const documentFilePath = req.file ? path.join('uploads', req.file.filename) : null;

  const query = `
    UPDATE work_receiving 
    SET job_type = ?, sub_section = ?, receiving_date = ?, end_date = ?, estimated_value = ?, 
    current_department = ?, delivery_status = ?, file_path = ?
    WHERE work_order_id = ?
  `;

  db.query(query, [jobType, subSection, receivingDate, endDate, estimatedValue, current_department, delivery_status, documentFilePath, workOrderId], (err, results) => {
    if (err) {
      console.error('Error updating work receiving:', err);
      return res.status(500).send('Error updating work receiving');
    }

    res.status(200).send('Work receiving updated successfully');
  });
});

  // Use all imported routes
app.use('/api/survey', surveyRoutes);
app.use('/api/permission', permissionRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/work-execution', workExecutionRoutes);
app.use('/api/permission-closing', permissionClosingRoutes);
app.use('/api/work-closing', workClosingRoutes);
app.use('/api/drawing-department', drawingdepartment);
app.use('/api/gis', gisdepartment);
app.use('/api/management', management);
app.use('/api/store', store);
app.use('/api/usermanagement', usermanagement);
// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

