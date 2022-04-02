const inquirer = require('inquirer');
const chalk = require('chalk');

const DatabaseTools = require('./DatabaseTools');
const MySQLinterface = require('./MySQLinterface');
const prompts = require('../src/prompts');

module.exports = class DatabaseInterface extends MySQLinterface{
    constructor(parent, database){
        super();
        this.parent = parent;
        this.database = database;
        this.tools = new DatabaseTools(database);
    }

    async init(){
        await this.tools.init();
        await this.chooseTable();
    }

    async chooseTable(){
        await inquirer.prompt( //don't think we need the await here
            {
                name: 'tableSelect',
                type: 'list',
                message: "Choose a Table...",
                choices: async () => {
                    const tableNames = await this.tools.promiseTableNames()
                    return [ ...tableNames, '[ + NEW TABLE ]', '[ back ]'];
                }
            }
        )
        .then(async answer => {
            switch (answer.tableSelect){
                case '[ + NEW TABLE ]':
                    await this.mode.ADD(this);
                    break;
                case '[ back ]':
                    await this.parent.modeSelect(this.database);
                default:
                    await this.modeSelect(answer.tableSelect.toLowerCase());
            }    
        });

        this.chooseTable();
    }

    async modeSelect(table){
        await inquirer.prompt({
            name: 'modeSelect',
            type: 'list',
            message: `What Would You Like to Do with Table \'${table.toUpperCase()}\'?`,
            choices: [`OPEN TABLE ${table}`, `PRINT TABLE ${table}`,`JOIN TABLE ${table}`, `RENAME TABLE ${table}`, `ADD_FIELD to ${table}`, `REMOVE_FIELD from ${table}`, `DELETE TABLE ${table}`, `[ back ]`],
            filter: modeSelection => modeSelection == '[ back ]'? 'AGAIN': modeSelection.slice(0, modeSelection.indexOf(' '))
        })
        .then(async answers => {
            await this.mode[answers.modeSelect](this, table);
        });

        await this.chooseTable();
    }
    
    async clarifyAddField(table){
        let more = true;
        let columns = [];
        
        while (more){ //Receive New Column Inputs Until the User Indicates 
            more = await inquirer.prompt([
                {
                    name: 'newColName',
                    type: 'input',
                    message: 'Input New Column Name',
                    validate: answer => /^[0-9a-zA-Z]+$/.exec(answer)? true: "Column Names Must be Alphanumeric" //include special character restrictions
                },
                {
                    name: 'newColType',
                    type: 'list',
                    message: 'Choose a Data Type for this New Column',
                    choices: ['INT', 'DECIMAL', 'VARCHAR(30)','TEXT']
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
                message: 'New Table Name?',
                validate: answer => /^[0-9a-zA-Z]+$/.exec(answer)? true: 'Table Names Must be Alphanumeric'
            }
        )
        .then(async answer => await this.clarifyAddField(answer.newTableName));
    }

    async clarifyRemoveField(table){
        const colInfo = await this.tools.promiseColInfo(table, false);
        const fkEval = await this.tools.evalForeignKeys(table);     

        if (colInfo.length){
            let {fieldSelect} = await inquirer.prompt(
            {
                name: 'fieldSelect',
                type: 'checkbox',
                message: 'Choose Field(s) to Remove',
                choices: () => colInfo.map(col => col.Field),
                validate: answers => answers.length? true: "Select at Least One Field! (Use Spacebar)",
                filter: answers => answers.map(answer => colInfo.find(col => col.Field === answer))
            });
            
            return fieldSelect;
        }

        else {return null}
    }


    mode = {
        async ADD(parent, table){
            const clarity = await parent.clarifyADD();
            await parent.tools.addTable(clarity);

            await parent.chooseTable();
        },

        async ADD_FIELD(parent, table) {
            const newFields = await parent.clarifyAddField(table);
            await parent.tools.addFields(newFields);

            await parent.modeSelect(table);
        },

        async REMOVE_FIELD(parent, table){
            const clarity = await parent.clarifyRemoveField(table);
            clarity? await parent.tools.removeFields(table, clarity): console.log(chalk.yellow('\nNo Fields Eligible for Removal\n'));

            await parent.modeSelect(table);
        },
        
        async OPEN(parent, table){
            const DatabaseTableInterface = require('./DatabaseTableInterface');
            const databaseTableInterface = new DatabaseTableInterface(parent, table, parent.database);
            await databaseTableInterface.init();  
        },

        async PRINT(parent, table){
            await parent.tools.printTable(table);

            await parent.modeSelect(table);
        },

        async JOIN(parent, table){
            const fkEval = await parent.tools.evalForeignKeys(table);
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
                    await parent.tools.joinTable(table, answer.joinWhere.reference_table, answer.joinWhere.reference_column, answer.joinWhere.foreign_key);
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
                    validate: answer => typeof answer == 'string' && /^[0-9a-zA-Z]+$/.exec(answer)? true: 'Name Must be Alphanumeric'
                }
            )
            .then(async answer => {
                await parent.tools.renameTable(table, answer.rename);
                await parent.modeSelect(answer.rename);
            });
        },

        async DELETE(parent, table){
            await inquirer.prompt({
                name: 'sure',
                type: 'input',
                message: 'DANGER ZONE: type full table name to continue (or \'x\' to cancel):',
                validate: (answer) => answer.toLowerCase()==table.toLowerCase() || answer.toLowerCase()=='x'? true: 'Check Your Input and Try Again'
            })
            .then(async answer => answer.sure == table.toLowerCase()? await parent.tools.deleteTable(table): modeSelect(table));
        },

        async AGAIN(parent){
            await parent.chooseTable();
        }
    }
}