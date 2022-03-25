const inquirer = require('inquirer');
const generalPrompts = require('./src/prompts');
const connection = require('./config/connection')
const DatabasePromptAPI = require('./lib/DatabasePromptAPI');
const cTable = require('console.table');

const dbAPI = new DatabasePromptAPI(connection);

// dbAPI.printTable('employee');
dbAPI.add();
// dbAPI.addDepartment('test department1213')
// .then(()=> dbAPI.printAllDepartments())




