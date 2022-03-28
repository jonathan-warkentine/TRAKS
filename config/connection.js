const mysql = require('mysql2');
require('dotenv').config();
const chalk = require('chalk');
const fs = require('fs');

const createConnection = () => {

  let connection;

  if (process.env.dbname){
    connection = mysql.createConnection(
      {
        host: 'localhost',
        user: process.env.dbusername,
        password: process.env.dbpassword,
        database: process.env.dbname
      },
      
      console.info(chalk.green(`\nConnected to the ${process.env.dbname} Database...\n`))
    );
  }

  else{
    connection = mysql.createConnection(
      {
        host: 'localhost',
        user: process.env.dbusername,
        password: process.env.dbpassword
      },
      
      console.info(chalk.green(`\nConnected to MySQL...\n`))
    );
  }
  

  return connection;
}

module.exports = createConnection;
