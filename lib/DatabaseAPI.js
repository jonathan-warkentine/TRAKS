const inquirer = require('inquirer');
const chalk = require('chalk');

const DatabaseTableAPI = require('./DatabaseTableAPI');
const prompts = require('../src/prompts');
const utils = require('../utils/utils');


class DatabaseAPI {
    constructor(parent, database){
        this.parent = parent;
        this.database = database;
        this.connection = parent.connection;
    }

    async init(){
        this.chooseTable();
    }

    async chooseTable(){
        await inquirer.prompt(
            {
                name: 'tableSelect',
                type: 'list',
                message: "Choose a Table...",
                choices: async () => {
                    const tableNames = await this.promiseTableNames()
                    return ['[+ADD TABLE]', ...tableNames, '[back]'];
                }
            }
        )
        .then(answer => {
            switch (answer.tableSelect){
                case '[+ADD TABLE]':
                    this.dbAPI.ADD(this);
                    break;
                case '[back]':
                    this.dbAPI.AGAIN(this);
                default:
                    this.modeSelect(answer.tableSelect);
            }    
        });
    }

    async modeSelect(table){
        await inquirer.prompt({
            name: 'modeSelect',
            type: 'list',
            message: `What Would You Like to Do with \'${table.toUpperCase()}\'?`,
            choices: [`VIEW ${table}`, `UPDATE ${table}`, `DELETE ${table}`, `[back]`],
            filter: modeSelection => modeSelection.slice(0, modeSelection.indexOf(' ')) //Gives us 'VIEW', 'ADD', or 'UPDATE'  
        })
        .then(answers => {
            return this.dbAPI[answers.modeSelect](this, table.toLowerCase());
        })
    }
            
    async promiseTableNames() {
        const [tableNames] = await this.connection.promise().query(`SHOW TABLES`);
        return tableNames.map(tableName => {
            [tableName] = Object.values(tableName);
            return tableName;
        });
    }
    
    async clarifyADD(){
        let more = true;
        let results = {
            columns: []
        };
        
        await inquirer.prompt(
            {
                name: 'newTableName',
                type: 'input',
                message: 'New Table Name?'
            }
        )
        .then(answer => results = {...answer, ...results})

        while (more){ //Receive New Column Inputs Until the User Indicates 
            more = await inquirer.prompt([
                {
                    name: 'newColName',
                    type: 'input',
                    message: 'Choose a Name for this New Column',
                    validate: answer => answer.includes(" ")? "Column Names Cannot Contain Spaces": true //include special character restrictions
                },
                {
                    name: 'newColType',
                    type: 'list',
                    message: 'Choose a Data Type for this New Column',
                    choices: ['INT', 'DECIMAL(0,10)', 'VARCHAR(30)','TEXT']
                },
                {
                    name: 'notNull',
                    type: 'confirm',
                    message: 'Can this Column Contain Instances of \'Null\'?',
                },
                {
                    name: 'more',
                    type: 'confirm',
                    message: 'Would You Like to Add Another Column to Your New Table?'
                }
            ])
            .then(answers => {
                results.columns.push(answers);
                return answers.more;
            });
        }

        return results; 
    }

    prepareADDstatement(clarity){
        const statements = clarity.columns.map(col => `${col.newColName} ${col.newColType} ${col.notNull? "": "NOT NULL"}`)
        return `CREATE TABLE \`${clarity.newTableName}\` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ${statements})`;
    }

    // async done(){
    //     inquirer.prompt(prompts.done)
    //     .then((answer) => answer.done? process.exit(): this.chooseTable());
    // }


    dbAPI = {
        async ADD(parent, table){
            const clarity = await parent.clarifyADD();
            const query = parent.prepareADDstatement(clarity)
            await parent.connection.promise().query(query)
            .then(() => {
                console.log(chalk.green(`\nNew Table Successfully Added!\n`))
            })
            
            parent.chooseTable();
        },
        
        async VIEW(parent, table){
            const [tableData] = await parent.connection.promise().query(`SELECT * FROM ${table}`)
            console.table("\n",tableData);
        },

        async UPDATE(parent, table) {
            console.log(chalk.yellow('\nUPDATE Functionality Coming Soon!\n'));
            parent.modeSelect(table);
            // const existingRows = await parent.promiseRows(table);
            // const colInfo = await parent.promiseColInfo(table, false);
            // const clarifiedUpdate = await parent.clarifyUpdate(table, existingRows, colInfo);

            // const query = parent.prepareUpdateStatement(clarifiedUpdate.rowID, clarifiedUpdate.fields, clarifiedUpdate.values, table);
            
            // return parent.connection.promise().query(query)
            // .then((results, error) => {
            //     error? console.log(error): console.log(chalk.green('\nUpdate Successful!\n'));
            // });
        },

        async DELETE(parent, table){
            await inquirer.prompt({
                name: 'sure',
                type: 'input',
                message: 'DANGER ZONE: type full table name to continue (or \'x\' to cancel):',
                validate: (answer) => answer.toLowerCase()==table || answer.toLowerCase()=='x'? true: 'Check Your Input and Try Again'
            })
            .then(answer => {
                if (answer.sure.toLowerCase()==table.toLowerCase()){
                    parent.connection.promise().query(`DROP TABLE \`${table}\``)
                    .then(() => console.log(chalk.red('\nDELETION SUCCESSFUL\n')));
                }
            })
            .then(() => parent.chooseTable());
        },

        async AGAIN(parent){
            parent.parent.chooseDatabase();
        }
    }
}

module.exports = DatabaseAPI;