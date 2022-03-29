const inquirer = require('inquirer');
const fs = require('fs');
const utils = require('../utils/utils');
require('dotenv').config()

const prompts = require('../src/prompts');
const createConnection = require('../config/connection');

const mySQLsetup = async () => {
    if (!fs.existsSync('./.env')){ //if a .env file does not already exist, create and populate via user prompts
        await setupFiles();
    }

    return createConnection();
}

async function setupFiles(){
    await inquirer.prompt(prompts.credentials)
    .then((answers)=> {
        fs.writeFileSync('./.env', `dbusername=${answers.dbusername}\ndbpassword=${answers.dbpassword}`);
        process.env.dbusername = answers.dbusername;
        process.env.dbpassword = answers.dbpassword;
    })
}

module.exports = mySQLsetup;