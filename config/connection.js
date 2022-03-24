const mysql = require('mysql2/promise');
require('dotenv').config();

exports.connection = mysql.createConnection(
    {
      host: 'localhost',
      user: process.env.usrnm,
      password: process.env.pw,
      database: process.env.dbname,
    },
    
    console.log(`\nConnected to the ${process.env.dbname} database.\n`)

  );
