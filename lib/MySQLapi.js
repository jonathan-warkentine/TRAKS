
const inquirer = require('inquirer');
const chalk = require('chalk');
const logo = require('asciiart-logo');

const utils = require('../utils/utils');
const mySQLsetup = require('../config/setup');
const createConnection = require('../config/connection');
const DatabaseRowAPI = require('./DatabaseAPI');

class MySQLapi {
    constructor (){
        this.connection;
        this.init();
    }

    async init(){
        this.connection = await mySQLsetup(); //creates an initial connection to MySQL, no database selected. If no MySQL credentials are on file in the .env file, prompts the user for their credentials
        this.printWelcome();
        const dbChoice = await this.chooseDatabase();
        this.useHow(dbChoice);
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
            .right('VERSION 1.2.1')
            .emptyLine()
            .center('A Simple MySQL Database Command-Line API')
            .render()
        );
    }
    
    async chooseDatabase(){
        const [databases] = await this.promiseDatabases();
        return await inquirer.prompt({
            name: 'chooseDatabase',
            message: 'Choose a Database...',
            type: 'list',
            choices: ['[+ADD NEW DATABASE]', ...databases.map(database => utils.getValues(database)).flat()],
        })
        .then(answer => {
            if (answer.chooseDatabase=='[+ADD NEW DATABASE]'){
                return 'ADD';
            }
            else {
                this.connection.end; //going to reconnect to the database selected
                return answer.chooseDatabase;
            }
        });
    }

    async useHow(database){
        if (database == 'ADD'){
            this.MySQLapi.ADD(this);
        }
        else {
            await inquirer.prompt([
                {
                    name: 'useHow',
                    type: 'list',
                    message: `What Would You Like to do with \`${database}\`?`,
                    choices: [`VIEW ${database}`, `RENAME ${database}`, `DELETE ${database}`, '[back]'],
                    filter: (answer) => answer=='[back]'? 'AGAIN': answer.slice(0, answer.indexOf(' '))
                }
            ])
            .then(answer => this.MySQLapi[answer.useHow](database, this))
        }
    }

    async promiseDatabases() {
        return this.connection.promise().query('SHOW DATABASES');
    }

    
    
    MySQLapi = {
        async ADD(parent){
            await inquirer.prompt({
                name: 'databaseName',
                type: 'input',
                message: 'What Would You Like to Call Your New Database?'
                //needs validation (no spaces eg)
            })
            .then(answer => {
                parent.connection.promise().query(`CREATE DATABASE \`${answer.databaseName}\``)
                .then(() => console.log(chalk.green(`\nDatabase \`${answer.databaseName}\` Successfully Created!\n`)))
            })
            
            parent.chooseDatabase();
        },
        
        async VIEW(database, parent){
            parent.connection = createConnection(database);
            const databaseTableAPI = new DatabaseRowAPI(parent, database);
            await databaseTableAPI.init();
        },

        async RENAME(database, parent){
            console.log('\n\'RENAME\' Functionality Coming Soon!\n');
            parent.useHow(database);
        },

        async DELETE(database, parent){
            await inquirer.prompt({
                name: 'sure',
                type: 'input',
                message: 'DANGER ZONE: type full database name to continue (or \'x\' to cancel):',
                validate: (answer) => answer.toLowerCase()==database || answer.toLowerCase()=='x'? true: 'Check Your Input and Try Again'
            })
            .then((answer) => {
                if (answer.sure.toLowerCase()==database.toLowerCase()){
                    parent.connection.promise().query(`DROP DATABASE IF EXISTS \`${database}\``)
                    .then(() => console.log(chalk.red('\nDELETION SUCCESSFUL\n')));
                }
            })

            parent.chooseDatabase();
        },

        async AGAIN(database, parent){
            parent.chooseDatabase();
        }
    }
}

module.exports = MySQLapi;