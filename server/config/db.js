const mysql = require('mysql2/promise');
const config = require('./env');

const pool = mysql.createPool(config.db);

module.exports = pool;
