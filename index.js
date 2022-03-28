const inquirer = require('inquirer');
const connection = require('./config/connection')
const DatabasePromptAPI = require('./lib/DatabasePromptAPI');
const cTable = require('console.table');

const dbAPI = new DatabasePromptAPI(connection);

dbAPI.promiseColInfo('employee', false)
.then((result)=>console.log(result))

// dbAPI.startPrompts();
// dbAPI.addDepartment('test department1213')
// .then(()=> dbAPI.printAllDepartments())




