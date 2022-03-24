const inquirer = require('inquirer');
const getPrompts = require('./src/prompts');
const {connection} = require('./config/connection')
const DatabaseAPI = require('./lib/Database');
const cTable = require('console.table');

const dbAPI = new DatabaseAPI(connection);

dbAPI.init()
.then( () => {
    inquirer
        .prompt(dbAPI.promisePrompts())
})

// dbAPI.promisePrompts()
// .then((prompts) => {
//     inquirer
//     .prompt(prompts)        
// })
// inquirer
//     .prompt(prompts)
//     .then(answers => {
//         // addMember(answers);
//         // answers.more? this.build(): this.assembleHTML();
//     });


