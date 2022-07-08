const chalk = require('chalk');

class MySQLtools {
    constructor(){
        this.utils = require('../../utils/utils');
        this.createConnection = require('../../config/setup');
        this.connection;
    }

    async init(){
        this.connection = await this.createConnection(); //creates an initial connection to MySQL, no database selected. If no MySQL credentials are on file in the .env file, prompts the user for their credentials
    }

    async promiseDatabases() {
        return this.connection.promise().query('SHOW DATABASES');
    }

    async ADD(dbName){
        this.connection.promise().query(
            `CREATE DATABASE ??`,
            [dbName]    
        )
        .then((result, error) => {
            error? console.log(chalk.red(error)): console.log(chalk.green(`\nDatabase \`${dbName}\` Successfully Created!\n`))
        })
    }
        
    async DELETE(database){
        await this.connection.promise().query(
            `DROP DATABASE IF EXISTS ??`,
            [database]
        )
        .then((result, error) => {
            error? console.log(chalk.red(error)): console.log(chalk.red('\nDELETION SUCCESSFUL\n'));
        })
    }
}

module.exports = MySQLtools;