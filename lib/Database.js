
const cTable = require('console.table');
const chalk = require('chalk');

const promptData = require('../src/prompts');

module.exports = class DatabaseAPI {
    constructor (connection){ //pass in the connection established in connection.js in the config folder
        this.connection = connection;
        this.tableNames = [];
        this.tables = {};
        // this.init();
    }

    async init() {
        return this.promiseTableNames()
        .then(result => {
            this.tableNames = result;
        })
        .then(() => this.tableNames.forEach(tableName => this.tables[tableName] = []))
        .then(() => this.promiseAllTables())
        .then(() => console.log(chalk.green("\nAll Tables Successfully Loaded from Database.\n")))
    }

    printAllTables() {
        this.tableNames.forEach( tableName => {
            console.table(this.tables[tableName]);
        })
    }

    async printAllDepartments() {
        const allDepartments = await this.connection.promise().query('SELECT * FROM `employee`')
        console.table(allDepartments[0])
    }

    async promiseTableNames () {
        await this.connection;
        this.connection.execute('SHOW TABLES').then((result) => {
            result = result[0].map(table => Object.values(table)).flat();
            return result;
        });
    }

    async promiseEmployees () {
        return this.connection.execute('SELECT * FROM `employee`').then((result) => {
            return (result[0].map(employee => employee.first_name));
        });
    }

    promisePrompts () {
        console.log(promptData[0])
        return promptData[1];
    }

    async promiseTableData (tableName) {
        return this.connection.execute(`SELECT * FROM ${tableName}`)
        .then(data => {
            this.loadTable(data[0], tableName);
            return data[0];
        })
    }

    async promiseAllTables () {
        
        let tablePromises = [];
        this.tableNames.forEach(tableName => {
            this.promiseTableData(tableName)
            // .then((tableData) => this.tables[tableName] = tableData)
            tablePromises.push(this.promiseTableData(tableName));
        })

        return Promise.all(tablePromises)
    }

    loadTable(data, tableName) {    
        this.tables[tableName] = data;
    }


}