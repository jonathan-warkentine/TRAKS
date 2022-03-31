
const inquirer = require('inquirer');
const chalk = require('chalk');
const logo = require('asciiart-logo');

const utils = require('../utils/utils');
const mySQLsetup = require('../config/setup');
const createConnection = require('../config/connection');
const DatabaseAPI = require('./DatabaseAPI');

class MySQLapi {
    constructor (){
        this.connection;
        this.init();
    }

    async init(){
        this.connection = await mySQLsetup(); //creates an initial connection to MySQL, no database selected. If no MySQL credentials are on file in the .env file, prompts the user for their credentials
        this.printWelcome();
        await this.chooseDatabase();
    }

    printWelcome() {
        console.log(
                logo({
                name: 'TRAKS',
                font: 'Star Wars',
                borderColor: 'grey',
                logoColor: 'bold-green',
                textColor: 'green',
            })
            .emptyLine()
            .right('VERSION 1.2.4')
            .emptyLine()
            .center('A Simple MySQL Database Command-Line Interface')
            .render()
        );
    }
    
    async chooseDatabase(){
        const [databases] = await this.promiseDatabases();
        await inquirer.prompt({
            name: 'chooseDatabase',
            message: 'Choose a Database...',
            type: 'list',
            choices: [...databases.map(database => utils.getValues(database)).flat(), '[ + NEW DATABASE ]'],
        })
        .then(async answer => {
            if (answer.chooseDatabase=='[ + NEW DATABASE ]'){
                await this.modeSelect('ADD');

            }
            else {
                this.connection.end; //going to reconnect to the database selected
                await this.modeSelect(answer.chooseDatabase);
            }
        });
    }

    async modeSelect(database){
        if (database == 'ADD'){
            await this.MySQLapi.ADD(this);
        }
        else {
            await inquirer.prompt([
                {
                    name: 'modeSelect',
                    type: 'list',
                    message: `What Would You Like to do with \`${database}\`?`,
                    choices: [`OPEN DATABASE ${database}`, `RENAME DATABASE ${database}`, `DELETE DATABASE ${database}`, '[ back ]'],
                    filter: (answer) => answer=='[ back ]'? 'AGAIN': answer.slice(0, answer.indexOf(' '))
                }
            ])
            .then(async answer => await this.MySQLapi[answer.modeSelect](database, this))
        }
    }

    async promiseDatabases() {
        return await this.connection.promise().query('SHOW DATABASES');
    }

    
    
    MySQLapi = {
        async ADD(parent){
            await inquirer.prompt({
                name: 'databaseName',
                type: 'input',
                message: 'What Would You Like to Call Your New Database?'
                //needs validation (no spaces eg)
            })
            .then(async answer => {
                await parent.connection.promise().query(`CREATE DATABASE \`${answer.databaseName}\``)
                .then(() => console.log(chalk.green(`\nDatabase \`${answer.databaseName}\` Successfully Created!\n`)))
            })
            
            await parent.chooseDatabase();
        },
        
        async OPEN(database, parent){
            parent.connection = createConnection(database);
            const databaseAPI = new DatabaseAPI(parent, database);
            await databaseAPI.init();
        },

        async RENAME(database, parent){
            console.log(chalk.yellow('\n\'RENAME\' Functionality Coming Soon!\n'));
            await parent.modeSelect(database);
        },

        async DELETE(database, parent){
            await inquirer.prompt({
                name: 'sure',
                type: 'input',
                message: 'DANGER ZONE: type full database name to continue (or \'x\' to cancel):',
                validate: (answer) => answer.toLowerCase()==database || answer.toLowerCase()=='x'? true: 'Check Your Input and Try Again'
            })
            .then(async answer => {
                if (answer.sure.toLowerCase()==database.toLowerCase()){
                    await parent.connection.promise().query(`DROP DATABASE IF EXISTS \`${database}\``)
                    .then(() => console.log(chalk.red('\nDELETION SUCCESSFUL\n')));
                }
            })

            await parent.chooseDatabase();
        },

        async AGAIN(database, parent){
            parent.connection.end;
            parent.connection = createConnection();
            await parent.chooseDatabase();
        }
    }
}

module.exports = MySQLapi;