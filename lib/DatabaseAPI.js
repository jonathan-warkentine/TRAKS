
const inquirer = require('inquirer');
const chalk = require('chalk');
const logo = require('asciiart-logo');

const utils = require('../utils/utils');
const mySQLsetup = require('../config/setup');
const createConnection = require('../config/connection');
const DataBasePromptAPI = require('./DatabasePromptAPI');

class DatabaseAPI {
    constructor (){
        this.connection;
        this.init();
    }

    async init(){
        this.connection = await mySQLsetup(); //creates an initial connection to MySQL, no database selected. If no MySQL credentials are on file in the .env file, prompts the user for their credentials
        this.printWelcome();
        this.chooseDB();
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
            .right('VERSION 1.1')
            .emptyLine()
            .center('A Simple MySQL Database Command-Line API')
            .render()
        );
    }
    
    async chooseDB(){
        const [dbs] = await this.promiseDatabases();
        await inquirer.prompt({
            name: 'chooseDB',
            message: 'Which Database Would you Like to Interact with?',
            type: 'list',
            choices: ['[+ADD NEW DATABASE]', ...dbs.map(db => utils.getValues(db)).flat()],
        })
        .then(answer => {
            if (answer.chooseDB=='[ADD NEW DATABASE]'){
                this.dbAPI.ADD(this);
            }
            else {
                let dbSelection = answer.chooseDB;
                this.connection.end; //going to reconnect to the database selected

                process.env.dbname = dbSelection;
                this.connection = createConnection();
                this.useDB(dbSelection);
            }
        });
    }

    async promiseDatabases() {
        return this.connection.promise().query('SHOW DATABASES');
    }

    async useDB(db){
        await inquirer.prompt([
            {
                name: 'useHow',
                type: 'list',
                message: `What Would You Like to do with \`${db}\`?`,
                choices: ['USE', 'RENAME', 'DELETE', '[back]'],
                filter: (answer) => answer=='[back]'? 'AGAIN': answer
            }
        ])
        .then((answer) => this.dbAPI[answer.useHow](db, this));
    }

    
    dbAPI = {
        async USE(db, parent){
            const databaseTableAPI = new DataBasePromptAPI(parent.connection);
            await databaseTableAPI.init();
        },

        async RENAME(db, parent){
            console.log('\n\'RENAME\' Functionality Coming Soon!\n');
            parent.useDB(db);
        },

        async DELETE(db, parent){
            await inquirer.prompt({
                name: 'sure',
                type: 'input',
                message: 'DANGER ZONE: type full database name to continue (or \'x\' to cancel):',
                validate: (answer) => answer.toLowerCase()==db || answer.toLowerCase()=='x'? true: false
            })
            .then((answer) => {
                if (answer.sure==db){
                    return parent.connection.promise().query(`DROP DATABASE IF EXISTS \`${db}\``)
                    .then(() => console.log(chalk.red('\nDELETION SUCCESSFUL\n')));
                }
            })
            .then(() => parent.useDB(db));
        },

        async ADD(parent){
            await inquirer.prompt({
                name: 'dbName',
                type: 'input',
                message: 'What Would You Like to Call Your New Database?'
                //needs validation (no spaces eg)
            })
            .then(answer => {
                parent.connection.promise().query(`CREATE DATABASE \`${answer.dbName}\``)
                .then(() => console.log(chalk.green(`\nDatabase \`${answer.dbName}\` Successfully Created!\n`)))
            })
            
            parent.chooseDB();
        },

        async AGAIN(db, parent){
            parent.chooseDB();
        }
    }
}

module.exports = DatabaseAPI;