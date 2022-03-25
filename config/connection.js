const mysql = require('mysql2');
require('dotenv').config();
const chalk = require('chalk');

module.exports = mysql.createConnection(
    {
      host: 'localhost',
      user: process.env.usrnm,
      password: process.env.pw,
      database: process.env.dbname,
    },
    
    console.info(chalk.green(`\nConnected to the ${process.env.dbname} database...\n`))

  );
