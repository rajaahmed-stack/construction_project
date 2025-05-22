// backend/middleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Make sure to load env variables

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']; // expects Bearer TOKEN
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user; // user info from token
    next();
  });
};

module.exports = authenticateToken;
