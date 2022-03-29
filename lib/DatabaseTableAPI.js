const cTable = require('console.table');
const chalk = require('chalk');
const inquirer = require('inquirer');

class DatabaseTableAPI {
    constructor (parent, table){ //pass in the connection established in connection.js in the config folder
        this.table = table;
        this.parent = parent;
        this.connection = parent.connection;
    }

    async init(){
        this.chooseRow();
    }

    async chooseRow(){
        await inquirer.prompt(
            {
                name: 'rowSelect',
                type: 'list',
                message: "Choose a Row...",
                choices: async () => {
                    const rows = await this.promiseRows()
                    return [...rows.map(row => JSON.stringify(row)),'[ + NEW ROW ]', '[ back ]'];
                }
            }
        )
        .then(answer => {
            switch (answer.rowSelect){
                case '[ + NEW ROW ]':
                    this.rowAPI.ADD(this);
                    break;
                case '[ back ]':
                    this.rowAPI.AGAIN(this);
                default:
                    this.modeSelect(JSON.parse(answer.rowSelect));
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
        .then(answers => {
            return this.rowAPI[answers.modeSelect](this, row);
        })
    }

    async promiseColNames(includePK=true){ 
        const colInfo = await this.promiseColInfo(this.table, includePK);
        return colInfo.map(col => col.Field);
    }

    async promiseColInfo(includePK=true){
        let [colInfo] = await this.connection.promise().query(`DESCRIBE \`${this.table}\``);
        return includePK? colInfo: colInfo.filter(col => col.Key!='PRI');
    }

    async promiseRows(includePK=true, rowPKid=""){ //can return one row if provided the PK id, or all rows if not
        const rowSelector = rowPKid? `WHERE ID=${rowPKid}`: "";
        
        let [rows] = await this.connection.promise().query(`SELECT * FROM ${this.table} ${rowSelector}`);
        
        if (includePK && Object.keys(rows[0]).length) return rows;
        else return rows.map( row => {
            return Object.fromEntries(
                Object.entries(row).slice(1)
            )
        });
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
                validate: (answer) => utils.validateType(answer, field.Type)? true: `This field only accepts input of type ${field.Type}!`
            },
            {
                when: () => fkEval.foreign_key == field.Field,
                name: field.Field,
                type: 'list',
                choices: async () => {
                    const options = await this.promiseRows(fkEval.reference_table, true);
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
        return {rowID: rowSelection.id, fields: [...fieldSelect.map(field => field.Field)], values: [...values]};
    }

    async clarifyAdd(){
        const colInfo = await this.promiseColInfo(this.table, false);

        let values = {};
        const fkEval = await this.evalForeignKeys();
        
        for await (let field of utils.getValues(colInfo)){
            await inquirer.prompt(
                [{
                    when: () => fkEval.foreign_key != field.Field, 
                    name: field.Field,
                    type: 'input',
                    message: () => `Input Value for Field "${field.Field.toUpperCase()}"`,
                    validate: answer => utils.validateType(answer, field.Type)? true: `This field only accepts input of type ${field.Type}!`
                },
                {
                    when: () => fkEval.foreign_key == field.Field,
                    name: field.Field,
                    type: 'list',
                    choices: async () => {
                        const options = await this.promiseRows(fkEval.reference_table, true);
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

    prepareAddStatement(table, values){ //formats values according to type for entry into MySQL
        let fieldNames = Object.keys(values).join(', ');
        let fieldValues = Object.values(values).map(value => isNaN(value)? `'${value}'`: value).join(', ');

        return `INSERT INTO \`${table}\` (${fieldNames}) VALUES (${fieldValues})`;
    }

    prepareUpdateStatement(rowID, fields, values, table){
        values = values.map(value => {
            if (typeof value == 'string'){
                return `"${value}"`;
            }
            else {return value}
        })

        let statements = [];
        for (let i=0; i<fields.length; i++){
            statements.push(`${fields[i]} = ${values[i]}`)
        }       

        return `UPDATE ${table} SET ${statements} WHERE id = ${rowID}`;
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
      
        async ADD(parent, table) {
            const newRow = await parent.clarifyAdd(table, colInfo);
            const query = parent.prepareAddStatement(table, newRow);
            
            return parent.connection.promise().query(query)
            .then((results, error) => {
                error? console.log(error): console.log(chalk.green('\nRow Successfully Added!\n'));
            });
        },

        async PRINT(parent, row) {
            console.table('\n',[row]);

            parent.chooseRow();
        },

        async UPDATE(parent, row) {
            await parent.clarifyUpdate(row);
            const query = parent.prepareUpdateStatement(clarifiedUpdate.rowID, clarifiedUpdate.fields, clarifiedUpdate.values, table);
            
            return parent.connection.promise().query(query)
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
                return parent.connection.promise().query(`DELETE FROM \`${parent.table}\` WHERE id = ${row.id}`)
                .then(() => console.log(chalk.red(`\n${parent.table[0].toUpperCase()}${parent.table.slice(1)} Succesfully Removed...\n`)));
            }

            parent.chooseRow();
        },

        async AGAIN(parent){
            await parent.parent.chooseTable();
        }
    }
}

module.exports = DatabaseTableAPI;