
const cTable = require('console.table');
const chalk = require('chalk');

const promptData = require('../src/prompts');

module.exports = class DatabaseAPI {
    constructor (connection){ //pass in the connection established in connection.js in the config folder
        this.connection = connection;
    }
    
    async getTableNames() {
        let tableNames = await this.connection.promise().query(`SHOW TABLES`);
        tableNames = tableNames[0].map(tableName => Object.values(tableName)).flat();
        console.log(tableNames);
    }

    async printTable(tableName) {
        const [tableData] = await this.connection.promise().query(`SELECT * FROM ${tableName}`)
        console.table(tableData);
    }

    async addDepartment(deptName) {
        this.connection.query(`INSERT INTO department (name) VALUES ("${deptName}")`) 
    }
}