const inquirer = require('inquirer');
const logo = require('asciiart-logo');
const fs = require('fs');
const utils = require('../utils/utils');
require('dotenv').config()

const prompts = require('../src/prompts');
const createConnection = require('../config/connection');

let connection;

const setup = async () => {
    printWelcome();
    
    if (!fs.existsSync('./.env')){ //if a .env file does not already exist, create and populate via user prompts
        await setupFiles();
    }

    connection = createConnection();
    await chooseDB();

    connection = createConnection(); //reconnecting, this time with a database ready in our process.env.dbname
    return connection;
}

function printWelcome() {
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

async function setupFiles(){
    await inquirer.prompt(prompts.credentials)
    .then((answers)=> {
        fs.writeFileSync('./.env', `dbusername=${answers.dbusername}\ndbpassword=${answers.dbpassword}`);
        process.env.dbusername = answers.dbusername;
        process.env.dbpassword = answers.dbpassword;
    })
}

async function promiseDatabases() {
    return connection.promise().query('SHOW DATABASES');
}

async function chooseDB(){
    const [dbs] = await promiseDatabases();
    await inquirer.prompt({
        name: 'chooseDB',
        message: 'Which Database Would you Like to Interact with?',
        type: 'list',
        choices: dbs.map(db => utils.getValues(db)).flat(),
    })
    .then(answer => {
        process.env.dbname = answer.chooseDB;
    });

    connection.end(); //we are going to reconnect to a particular database now, no longer need this connection 
}

module.exports = setup;