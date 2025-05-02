const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const nodemailer = require('nodemailer');

// MySQL Database Connection
const db = mysql.createConnection({
  host: 'shinkansen.proxy.rlwy.net',
  user: 'root',
  password: 'XjSGGFPPsszznJyxanyHBVzUeppoFkKn',
  database: 'railway',
  port: process.env.MYSQL_PORT || '44942'

});
// Root route to avoid "Cannot GET /" error
router.get('/api/user', (req, res) => {
    res.json({ message: 'Welcome to the user API!' });
  });
  

// Set up Nodemailer transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rb4733164@gmail.com', // your email address
    pass: 'avqi dffd sfju bjcn',   // your email password (consider using OAuth2 for better security)
  },
});

// Function to send email
const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: 'rb4733164@gmail.com', // use your actual email
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

// Add a new user and send a confirmation email
// Add a new user and send a confirmation email
router.post('/api/save_users', (req, res) => {
    const { name, email, password } = req.body;  // Add this line
    console.log("Received data:", req.body);
    const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';

    db.query(query, [name, email, password], (err, results) => {
        if (err) {
            console.error('Error adding user:', err);
            return res.status(500).send('Server error');
        }

        // Send confirmation email
        const subject = 'User Registration Confirmation';
        const text = `Hello ${name},\n\nYour registration was successful!\n\nThank you for joining us.`;
        sendEmail(email, subject, text); // Send email after adding user

        return res.status(201).send('User added successfully');
    });
});

// Get all users
router.get('/api/users', (req, res) => {
  const query = 'SELECT * FROM users';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).send('Server error');
    }
    res.json(results);
  });
});

// Update user details
router.put('/api/users/:id', (req, res) => {
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
router.delete('/api/users/:id', (req, res) => {
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
router.get('/api/users', (req, res) => {
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
module.exports = router;
