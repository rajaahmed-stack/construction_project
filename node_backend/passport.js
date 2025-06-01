const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const mysql = require('mysql2/promise');
require('dotenv').config();
const archiver = require('archiver'); // Ensure archiver is imported

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT,
      });

      const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [jwt_payload.id]);
      if (rows.length > 0) {
        return done(null, rows[0]);
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);
