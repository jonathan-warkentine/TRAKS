const inquirer = require('inquirer');
const DatabaseAPI = require('./DatabaseAPI');

module.exports = class DatabaseAPIutils extends DatabaseAPI {
    constructor(connection){
        super(connection);
    }

    async startPrompts(){
        inquirer.
        prompt()
    }

    async add(){
        inquirer.
        prompt(
           { 
                name: 'addWhat',
                type: 'list',
                message: "What Would You Like to Add?",
                choices: ['Add a Department', 'Add a Position', 'Add an Employee']
           }
        )
        .then(answer => {
            switch (answer.addWhat){
                case 'Add a Department':
                    this.getDeptName()
                    .then((answer) => this.addDepartment(answer.deptName))
                    break;
                case 'Add a Position':
                    this.addPosition();
                    break;
                case 'Add an Employee':
                    this.addEmployee();
            }               
        })
    }

    async getDeptName (){
        return inquirer
        .prompt(
            {
                name: 'deptName',
                type: 'input',
                message: 'What is the Name of the Department to Add?',
            }
        )
    }
}