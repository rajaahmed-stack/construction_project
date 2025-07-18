// Updated server.js with fixes for health check, database readiness, and startup issues
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const bcrypt = require('bcryptjs');

console.log("🟢 server.js started loading...");


const app = express();
const port = process.env.PORT || 5000;

let db;
let isReady = false;
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['https://mmcmadina.com'],
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: ['Content-Type']
}));

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = (to, subject, text) => {
  transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text }, (err, info) => {
    if (err) console.error('Email error:', err);
    else console.log('Email sent:', info.response);
  });
};

// Create database connection
const createDbConnection = async () => {
  const db = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
    waitForConnections: true,
    connectionLimit: 10
  });
  await db.getConnection();
  console.log('✅ Database connected');
  return db;
};

// Health check route
// app.get('/health', async (req, res) => {
//   if (!isReady) {
//     return res.status(503).json({ status: 'starting', message: 'App is initializing' });
//   }
//   try {
//     await db.query('SELECT 1');
//     res.status(200).json({ status: 'healthy', database: 'connected', uptime: process.uptime() });
//   } catch (err) {
//     res.status(500).json({ status: 'unhealthy', error: err.message });
//   }
// });

// Temporary simple health check for fast response
app.get('/simple-health', (req, res) => {
  res.status(200).send('OK');
});

// Email API
// app.post('/api/send-email', (req, res) => {
//   const { to, subject, text } = req.body;
//   sendEmail(to, subject, text);
//   res.status(200).send('Email request received');
// });

// // Register user
// app.post('/api/usermanagement/save_users', async (req, res) => {
//   const { name, email, password, username } = req.body;
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const query = 'INSERT INTO users (name, email, password, department) VALUES (?, ?, ?, ?)';

//   db.query(query, [name, email, hashedPassword, username], (err) => {
//     if (err) return res.status(500).send('Server error');
//     sendEmail(email, 'User Registration', `Username: ${username}\nPassword: ${password}`);
//     res.send('User registered');
//   });
// });

// // Update user
// app.put('/api/users/:id', async (req, res) => {
//   const { id } = req.params;
//   const { name, email, password } = req.body;
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const query = 'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?';

//   db.query(query, [name, email, hashedPassword, id], (err) => {
//     if (err) return res.status(500).send('Server error');
//     res.send('User updated successfully');
//   });
// });

// // Delete user
// app.delete('/api/delete-users/:id', (req, res) => {
//   const { id } = req.params;
//   db.query('DELETE FROM users WHERE id = ?', [id], (err) => {
//     if (err) return res.status(500).send('Server error');
//     res.send('User deleted successfully');
//   });
// });

// // Get all users
// app.get('/api/users', (req, res) => {
//   db.query('SELECT * FROM users', (err, results) => {
//     if (err) return res.status(500).send('Error fetching users');
//     res.json(results);
//   });
// });

// Import and use modular routes
app.use('/api/survey', require('./survey'));
app.use('/api/permission', require('./permission'));
app.use('/api/safety', require('./safety'));
app.use('/api/work-execution', require('./workExecution'));
app.use('/api/permission-closing', require('./permissionclosing'));
app.use('/api/work-closing', require('./workclosing'));
app.use('/api/drawing-department', require('./drawingdep'));
app.use('/api/gis', require('./gis'));
app.use('/api/management', require('./management'));
app.use('/api/store', require('./store'));
app.use('/api/invoice', require('./invoice'));
app.use('/api/laboratory', require('./lab'));
app.use('/api/eam', require('./emergencyandmaintainence'));
app.use('/api/usermanagement', require('./usermanagement'));

// Startup only after DB is ready
createDbConnection().then(pool => {
  db = pool;
  console.log("🟢 Starting server on port", port);
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
    isReady = true;
    clearTimeout(startupTimeout);
  });
}).catch(err => {
  console.error('❌ Failed to connect to database:', err);
  console.error("❌ DB connection failed:", err.message);
  process.exit(1);
});

// Timeout if DB is not ready
const startupTimeout = setTimeout(() => {
  if (!isReady) {
    console.error('❌ Startup timed out');
    process.exit(1);
  }
}, 25000);
