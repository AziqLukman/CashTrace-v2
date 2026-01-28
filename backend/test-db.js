// backend/test-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing connection to:', process.env.DB_NAME);
  try {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cashtrace'
    });
    console.log('✅ Success! Connected to database.');
    
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('Tables:', rows.map(r => Object.values(r)[0]));
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
  }
}

testConnection();
