const cTable = require('console.table');
const chalk = require('chalk');
const inquirer = require('inquirer');

const utils = require('../utils/utils');

class DatabaseTableAPI {
    constructor (parent, table){ //pass in the connection established in connection.js in the config folder
        this.table = table;
        this.parent = parent;
        this.connection = parent.connection;
    }

    async init(){
        await this.chooseRow();
    }

    async chooseRow(){
        await inquirer.prompt(
            {
                name: 'rowSelect',
                type: 'list',
                message: "Choose a Row...",
                choices: async () => {
                    const rows = await this.parent.promiseRows(this.table)
                    return [...rows? rows.map(row => JSON.stringify(row)): [],'[ + NEW ROW ]', '[ back ]'];
                }
            }
        )
        .then(async answer => {
            switch (answer.rowSelect){
                case '[ + NEW ROW ]':
                    await this.rowAPI.ADD(this);
                    break;
                case '[ back ]':
                    await this.rowAPI.AGAIN(this);
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
                await this.rowAPI[answers.modeSelect](this, row);
            }
            else {await this.chooseRow();} 
        });

        const [refreshedRow] = await this.parent.promiseRows(this.table, true, row.id);
        await this.modeSelect(refreshedRow);
    }

    async promiseColNames(includePK=true){ 
        const colInfo = await this.promiseColInfo(this.table, includePK);
        return colInfo.map(col => col.Field);
    }

    async promiseColInfo(includePK=true){
        let [colInfo] = await this.connection.promise().query(`DESCRIBE \`${this.table}\``);
        return includePK? colInfo: colInfo.filter(col => col.Key!='PRI');
    }

    async clarifyUpdate(row){
        let values = [];
        const colInfo = await this.promiseColInfo(false);
        const fkEval = await this.evalForeignKeys(this.table);     
        
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

        for await (let field of utils.getValues(fieldSelect)){
            await inquirer.prompt([
            {
                when: () => fkEval.foreign_key != field.Field,
                name: field.Field,
                type: 'input',
                message: () => `Update Value for Field "${field.Field.toUpperCase()}"`,
                validate: (answer) => utils.validateType(answer, field.Type) && /^[0-9a-zA-Z]+$/.exec(answer)? true: `This field only accepts input of type ${field.Type}!`
            },
            {
                when: () => fkEval.foreign_key == field.Field,
                name: field.Field,
                type: 'list',
                choices: async () => {
                    const options = await this.parent.promiseRows(fkEval.reference_table, true);
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
        return {rowID: row.id, fields: [...fieldSelect.map(field => field.Field)], values: [...values]};
    }

    async clarifyAdd(){
        const colInfo = await this.promiseColInfo(false);

        let values = {};
        const fkEval = await this.evalForeignKeys();
        
        for await (let field of utils.getValues(colInfo)){
            await inquirer.prompt(
                [{
                    when: () => fkEval.foreign_key != field.Field, 
                    name: field.Field,
                    type: 'input',
                    message: () => `Input Value for Field "${field.Field.toUpperCase()}"`,
                    validate: answer => utils.validateType(answer, field.Type) && /^[0-9a-zA-Z]+$/.exec(answer)? true: `This field only accepts input of type ${field.Type}!`
                },
                {
                    when: () => fkEval.foreign_key == field.Field,
                    name: field.Field,
                    type: 'list',
                    choices: async () => {
                        const options = await this.parent.promiseRows(fkEval.reference_table, true);
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

    prepareAddStatement(values){ //formats values according to type for entry into MySQL
        let fieldNames = Object.keys(values).join(', ');
        let fieldValues = Object.values(values).map(value => isNaN(value)? `'${value}'`: value).join(', ');

        return `INSERT INTO \`${this.table}\` (${fieldNames}) VALUES (${fieldValues})`;
    }

    prepareUpdateStatement(rowID, fields, values){
        values = values.map(value => {
            if (typeof value == 'string'){
                return `"${value}"`;
            }
            else {return value}
        })

        const statements = fields.map((field, i) => `${field} = ${values[i]}`);

        return `UPDATE ${this.table} SET ${statements} WHERE id = ${rowID}`;
    }

    async evalForeignKeys(){ //returns the name of the table where the FK is sourced, as well as the column name from within that table, or false if there is no FK
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
            AND table_name = '${this.table}'
        `);
        return fk || false;
    };

    async checkForeignConstraints(rowID){ //returns rows in referenced tables where there are foreign key constraints for a particular row. If no row ID is provided, returns tables with tied foreign keys or false if no such constraints exist
        const [[constraints]] = await this.connection.promise().query(`
            SELECT
                TABLE_NAME,
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
                REFERENCED_TABLE_NAME = '${this.table}'
        `);

        if (constraints && rowID) {
            const [results] = await this.connection.promise().query(`
                SELECT * FROM ${constraints.TABLE_NAME} 
                WHERE
                    ${constraints.COLUMN_NAME} = '${rowID}'
            `);
            
            results.forEach(result => result.FROM_TABLE = constraints.TABLE_NAME);
            return results || false;
        }

        return constraints || false;
    }

    rowAPI = { //stored in an object for reference purposes
      
        async ADD(parent, row) {
            const newRow = await parent.clarifyAdd();
            const query = parent.prepareAddStatement(newRow);
            
            await parent.connection.promise().query(query)
            .then((results, error) => {
                error? console.log(error): console.log(chalk.green('\nRow Successfully Added!\n'));
            });
        },

        async PRINT(parent, row) {
            console.table('\n',[row]);
            await parent.modeSelect(row);
        },

        async UPDATE(parent, row) {
            const clarifiedUpdate = await parent.clarifyUpdate(row);
            const query = parent.prepareUpdateStatement(clarifiedUpdate.rowID, clarifiedUpdate.fields, clarifiedUpdate.values);
            
            await parent.connection.promise().query(query)
            .then((results, error) => {
                error? console.log(error): console.log(chalk.green('\nUpdate Successful!\n'));
            });
        },

        async DELETE(parent, row) {
            const foreignConstraints = await parent.checkForeignConstraints(row.id);
            
            if (foreignConstraints.length){
                console.log(chalk.red (`\nERROR: Foreign Constraint Detected: the Following Rows Have Their Foreign Keys Tied to the Row You Want to Delete: \n`))
                foreignConstraints.forEach(constraint => {
                    console.log(chalk.red (JSON.stringify(constraint)))
                });
                console.log('\n');
            }
            else{
                await parent.connection.promise().query(`DELETE FROM \`${parent.table}\` WHERE id = ${row.id}`)
                .then(() => console.log(chalk.red(`\nRow Succesfully Removed...\n`)));
            }

            await parent.chooseRow();
        },

        async AGAIN(parent){
            await parent.parent.modeSelect(parent.table);
        }
    }
}

module.exports = DatabaseTableAPI;