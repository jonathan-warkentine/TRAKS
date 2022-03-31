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
        await this.chooseTable();
    }

    async chooseTable(){
        await inquirer.prompt(
            {
                name: 'tableSelect',
                type: 'list',
                message: "Choose a Table...",
                choices: async () => {
                    const tableNames = await this.promiseTableNames()
                    return [ ...tableNames, '[ + NEW TABLE ]', '[ back ]'];
                }
            }
        )
        .then(async answer => {
            switch (answer.tableSelect){
                case '[ + NEW TABLE ]':
                    await this.dbAPI.ADD(this);
                    break;
                case '[ back ]':
                    await this.parent.modeSelect(this.database);
                default:
                    await this.modeSelect(answer.tableSelect);
            }    
        });
    }

    async modeSelect(table){
        await inquirer.prompt({
            name: 'modeSelect',
            type: 'list',
            message: `What Would You Like to Do with Table \'${table.toUpperCase()}\'?`,
            choices: [`OPEN TABLE ${table}`, `PRINT TABLE ${table}`,`JOIN TABLE ${table}`, `RENAME TABLE ${table}`, `ADD_FIELD to ${table}`, `REMOVE_FIELD from ${table}`, `DELETE TABLE ${table}`, `[ back ]`],
            filter: modeSelection => {
                if (modeSelection == '[ back ]'){
                    return 'AGAIN';
                }
                else{
                    return modeSelection.slice(0, modeSelection.indexOf(' ')); //Gives us 'OPEN', 'ADD', or 'UPDATE'  
                }
            }
        })
        .then(async answers => {
            await this.dbAPI[answers.modeSelect](this, table.toLowerCase());
        });

        await this.chooseTable();
    }
            
    async promiseTableNames() {
        const [tableNames] = await this.connection.promise().query(`SHOW TABLES`);
        return tableNames.map(tableName => {
            [tableName] = Object.values(tableName);
            return tableName;
        });
    }
    
    async addField(table){
        let more = true;
        let columns = [];
        
        while (more){ //Receive New Column Inputs Until the User Indicates 
            more = await inquirer.prompt([
                {
                    name: 'newColName',
                    type: 'input',
                    message: 'Input New Column Name',
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
                    message: 'Would You Like to Add Another Column to Your Table?'
                }
            ])
            .then(answers => {
                columns.push(answers);
                return answers.more;
            });
        }

        return {'table': table, columns}; 
    }

    async clarifyADD(){
        return await inquirer.prompt(
            {
                name: 'newTableName',
                type: 'input',
                message: 'New Table Name?'
            }
        )
        .then(async answer => {
            return await this.addField(answer.newTableName);
        });
    }

    async clarifyRemoveField(table){
        const colInfo = await this.promiseColInfo(table, true);
        const fkEval = await this.evalForeignKeys(table);     

        let {fieldSelect} = await inquirer.prompt(
            {
                name: 'fieldSelect',
                type: 'checkbox',
                message: 'Choose Field(s) to Remove',
                choices: () => colInfo.map(col => col.Field),
                validate: answers => answers.length? true: "Select at Least One Field! (Use Spacebar)",
                filter: answers => answers.map(answer => colInfo.find(col => col.Field === answer))
            });

        return fieldSelect || colInfo;
    }

    async evalForeignKeys(table){ //returns the name of the table where the FK is sourced, as well as the column name from within that table, or false if there is no FK
        const [[fk]] = await this.connection.promise().query(`
            SELECT
            column_name AS 'foreign_key',
            referenced_table_name AS 'reference_table',
            referenced_column_name AS 'reference_column'
            FROM
            information_schema.key_column_usage
            WHERE
            referenced_table_name IS NOT NULL
            AND table_schema = 'employee_tracker_db'
            AND table_name = '${table}'
        `);
        return fk || false;
    };

    async promiseColInfo(table, includePK=true){
        let [colInfo] = await this.connection.promise().query(`DESCRIBE \`${table}\``);
        return includePK? colInfo: colInfo.filter(col => col.Key!='PRI');
    }

    async promiseRows(table, includePK=true, rowPKid=""){ //can return one row if provided the PK id, or all rows if not; returns false if no rows in table
        
        
        const rowSelector = rowPKid? `WHERE ID=${rowPKid}`: "";
        
        let [rows] = await this.connection.promise().query(`SELECT * FROM ${table} ${rowSelector}`);
        if (rows.length){
            if (includePK && Object.keys(rows[0]).length) return rows;
            else return rows.map( row => {
                return Object.fromEntries(
                    Object.entries(row).slice(1)
                )
            });
        }
        else return false;
    }

    prepADDstatement(clarity){
        const statements = clarity.columns.map(col => `${col.newColName} ${col.newColType} ${col.notNull? "": "NOT NULL"}`)
        return `CREATE TABLE \`${clarity.table}\` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ${statements})`;
    }

    prepNewColStatment(clarity){
        const statements = clarity.columns.map(col => `${col.newColName} ${col.newColType} ${col.notNull? "": "NOT NULL"}`)
        return `ALTER TABLE ${clarity.table} ADD COLUMN ${statements}`;
    }

    prepRemColStatement(table, clarity){
        const statements = clarity.map(field => `DROP COLUMN ${field.Field}`);
        
        return `ALTER TABLE ${table}
        ${statements}`;
    }

    async printTable(table){
        const [tableData] = await this.connection.promise().query(`SELECT * FROM ${table}`)
            console.table("\n",tableData);
    }

    dbAPI = {
        async ADD(parent, table){
            const clarity = await parent.clarifyADD();
            const query = parent.prepADDstatement(clarity)
            console.log(query)
            await parent.connection.promise().query(query)
            .then(() => {
                console.log(chalk.green(`\nNew Table Successfully Added!\n`))
            })
            
            await parent.chooseTable();
        },

        async ADD_FIELD(parent, table) {
            const newFields = await parent.addField(table);

            const query = parent.prepNewColStatment(newFields)
            await parent.connection.promise().query(query)
            .then(() => {
                console.log(chalk.green(`\nNew Field Successfully Added!\n`))
            })
        },

        async REMOVE_FIELD(parent, table){
            const clarity = await parent.clarifyRemoveField(table);
            const query = await parent.prepRemColStatement(table, clarity);
            await parent.connection.promise().query(query)
            .then(() => {
                console.log(chalk.red(`\nField(s) Successfully Removed\n`))
            })
        },
        
        async OPEN(parent, table){
            const databaseTableAPI = new DatabaseTableAPI(parent, table);
            await databaseTableAPI.init();  
        },

        async PRINT(parent, table){
            await parent.printTable(table);

            await parent.modeSelect(table);
        },

        async JOIN(parent, table){
            const fkEval = await parent.evalForeignKeys(table);
            if (fkEval){
                await inquirer.prompt([
                    {
                        name: 'joinWhere',
                        type: 'list',
                        message: `On Which Foreign Key Would You Like to Join Table ${table}?`,
                        choices: [fkEval.foreign_key],
                        filter: () => fkEval
                    }
                ])
                .then(async answer => {
                    const results = await parent.connection.promise().query(`
                        SELECT * FROM ${table}
                        LEFT JOIN ${answer.joinWhere.reference_table} ON ${answer.joinWhere.reference_table}.${answer.joinWhere.reference_column}=${table}.${answer.joinWhere.foreign_key}`
                    );
                    console.table('\n', results[0]);
                })
            }
            else {
                console.log(chalk.yellow('\nError: No Foreign Keys Detected...\n'))
            }
            
            await parent.modeSelect(table);
        },

        async DELETE_FIELDS (){
            console.log(chalk.yellow('\n\'DELETE FIELDS\' Functionality Coming Soon!\n'));
            
            await parent.modeSelect(table);
        },

        async RENAME(parent, table){
            await inquirer.prompt(
                {
                    name: 'rename',
                    type: 'input',
                    message: `What Would You Like to Rename Table \'${table}\' to?`,
                    validate: answer => typeof answer == 'string'? true: 'Name Must Be of Type String!'
                }
            )
            .then(async answer => {
                await parent.connection.promise().query(`ALTER TABLE ${table} RENAME TO ${answer.rename}`);
                console.log(chalk.green('\n Rename Successful! \n'));
            });

            await parent.modeSelect(table);
        },

        async DELETE(parent, table){
            await inquirer.prompt({
                name: 'sure',
                type: 'input',
                message: 'DANGER ZONE: type full table name to continue (or \'x\' to cancel):',
                validate: (answer) => answer.toLowerCase()==table || answer.toLowerCase()=='x'? true: 'Check Your Input and Try Again'
            })
            .then(async answer => {
                if (answer.sure.toLowerCase()==table.toLowerCase()){
                    await parent.connection.promise().query(`DROP TABLE \`${table}\``)
                    .then(() => console.log(chalk.red('\nDELETION SUCCESSFUL\n')));
                }
            })
        },

        async AGAIN(parent){
            await parent.chooseTable();
        }
    }
}

module.exports = DatabaseAPI;