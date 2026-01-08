const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'deliverydb',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

module.exports = pool;
