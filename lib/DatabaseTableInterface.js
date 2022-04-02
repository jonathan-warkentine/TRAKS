const cTable = require('console.table');
const inquirer = require('inquirer');
const chalk = require('chalk');

const DatabaseTableTools = require('./DatabaseTableTools');
const DatabaseInterface = require('./DatabaseInterface');

module.exports = class DatabaseTableInterface extends DatabaseInterface {
    constructor (parent, table, database){ //pass in the connection established in connection.js in the config folder
        super(parent, database);
        this.tools = new DatabaseTableTools(database, table, parent.tools.connection);
        this.table = table;
        this.primaryKey;
    }

    async init(){
        this.primaryKey = await this.tools.findPK(this.table);
        await this.chooseRow();
    }

    async chooseRow(){
        await inquirer.prompt(
            {
                name: 'rowSelect',
                type: 'list',
                message: "Choose a Row...",
                choices: async () => {
                    const rows = await this.tools.promiseRows(this.table)
                    return [...rows? rows.map(row => JSON.stringify(row)): [],'[ + NEW ROW ]', '[ back ]'];
                }
            }
        )
        .then(async answer => {
            switch (answer.rowSelect){
                case '[ + NEW ROW ]':
                    await this.mode.ADD(this);
                    break;
                case '[ back ]':
                    await this.mode.AGAIN(this);
                    break;
                default:
                    await this.modeSelect(JSON.parse(answer.rowSelect));
            }    
        });
    }

    async modeSelect(row){
        await inquirer.prompt({
            name: 'modeSelect',
            type: 'list',
            message: `What Would You Like to Do with your Row Selection?`,
            choices: [`PRINT row`, `UPDATE row`, `DELETE row`, `[ back ]`],
            filter: modeSelection => modeSelection.slice(0, modeSelection.indexOf(' ')) //Gives us 'VIEW', 'ADD', or 'UPDATE'
        })
        .then(async answers => {
            if (answers.modeSelect != '[') {
                await this.mode[answers.modeSelect](this, row);
            }
            else {await this.chooseRow();} 
        });

        
    }

    async promiseColNames(includePK=true){ 
        const colInfo = await this.tools.promiseColInfo(this.table, includePK);
        return colInfo.map(col => col.Field);
    }

    async clarifyUpdate(row){
        let values = [];
        const colInfo = await this.tools.promiseColInfo(this.table, false);
        const fkEval = await this.tools.evalForeignKeys(this.table);

        if (colInfo.length){ //if there's no non-pk fields, returns null
            let {fieldSelect} = await inquirer.prompt(
                {
                    when: () => colInfo.length > 1,
                    name: 'fieldSelect',
                    type: 'checkbox',
                    message: 'Choose Field(s) to Update',
                    choices: () => colInfo.map(col => col.Field),
                    validate: answers => answers.length? true: "Select at Least One Field! (Use Spacebar)",
                    filter: answers => answers.map(answer => colInfo.find(col => col.Field === answer))
                });
    
            fieldSelect = fieldSelect || colInfo; //if the table only has one field available, no selection needed by user
    
            for await (let field of this.tools.utils.objValues(fieldSelect)){
                await inquirer.prompt([
                {
                    when: () => fkEval.foreign_key != field.Field,
                    name: field.Field,
                    type: 'input',
                    message: () => `Update Value for Field "${field.Field.toUpperCase()}"`,
                    validate: answer => this.tools.utils.validateType(answer, field.Type) && /^[0-9a-zA-Z_]+$/.exec(answer)? true: `This field only accepts input of type ${field.Type}!`
                },
                {
                    when: () => fkEval.foreign_key == field.Field,
                    name: field.Field,
                    type: 'list',
                    choices: async () => {
                        const options = await this.tools.promiseRows(fkEval.reference_table, true);
                        return options.map(option => JSON.stringify(option));
                    },
                    message: () => `Update Value for Field "${field.Field.toUpperCase()}"`,
                    filter: (answer) => {
                        let foreignPKid = JSON.parse(answer);
                        return foreignPKid.id;
                    }
                }
                ]).then(answer => values.push(answer[field.Field]));
            } 
            return {rowID: row[this.primaryKey], fields: [...fieldSelect.map(field => field.Field)], values: [...values]};
        }

        else {return null};
    }

    async clarifyAdd(){
        const colInfo = await this.tools.promiseColInfo(this.table, false);

        let values = {};
        const fkEval = await this.tools.evalForeignKeys(this.table);
        
        for await (let field of this.tools.utils.objValues(colInfo)){
            await inquirer.prompt(
                [{
                    when: () => fkEval.foreign_key != field.Field, 
                    name: field.Field,
                    type: 'input',
                    message: () => `Input Value for Field "${field.Field.toUpperCase()}"`,
                    validate: answer => this.tools.utils.validateType(answer, field.Type) && /^[0-9a-zA-Z_]+$/.exec(answer)? true: `This field only accepts input of type ${field.Type}!`
                },
                {
                    when: () => fkEval.foreign_key == field.Field,
                    name: field.Field,
                    type: 'list',
                    choices: async () => {
                        const options = await this.tools.promiseRows(fkEval.reference_table, true);
                        return options.map(option => JSON.stringify(option));
                    },
                    message: () => `Select Value for Field "${field.Field.toUpperCase()}"`,
                    filter: answer => {
                        let foreignPKid = JSON.parse(answer);
                        return foreignPKid.id;
                    }
                }]
                ).then(answer => values[field.Field]=answer[field.Field]);
        }
        return values;
    }

    
    mode = { //stored in an object for reference purposes
      
        async ADD(parent, row) {
            const newRow = await parent.clarifyAdd();
            await parent.tools.addRow(newRow);
            await parent.chooseRow();
        },

        async PRINT(parent, row) {
            console.table('\n',[row]);
            await parent.modeSelect(row);
        },

        async UPDATE(parent, row) {
            const clarifiedUpdate = await parent.clarifyUpdate(row);
            if (clarifiedUpdate){
                await parent.tools.updateRow(clarifiedUpdate, parent.primaryKey);
                const [refreshedRow] = await parent.tools.promiseRows(parent.table, true, row.id);
                await parent.modeSelect(refreshedRow);
            } 
            else{
                console.log(chalk.yellow('\nNo Non-Primary-Key Fields Available for Update\n'));
                await parent.modeSelect(row);
            }
        },

        async DELETE(parent, row) {
            await parent.tools.deleteRow(row[primaryKey], parent.primaryKey);
            await parent.chooseRow();
        },

        async AGAIN(parent){
            await parent.parent.modeSelect(parent.table);
        }
    }
}