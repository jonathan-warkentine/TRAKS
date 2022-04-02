const mysql = require('mysql2');
require('dotenv').config();
const chalk = require('chalk');
const fs = require('fs');

module.exports = connection = async database => {

  let connection;

  if (database){
    connection = mysql.createConnection(
      {
        host: 'localhost',
        user: process.env.dbusername,
        password: process.env.dbpassword,
        database: database
      },
      
      console.info(chalk.green(`\nConnected to the ${database} Database...\n`))
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

    return connection;
  }
  

  return connection;
};
