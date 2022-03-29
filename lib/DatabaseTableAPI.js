const cTable = require('console.table');
const chalk = require('chalk');

module.exports = class DatabaseTableAPI {
    constructor (parentAPI, connection){ //pass in the connection established in connection.js in the config folder
        this.connection = connection;
    }

    async init(){

        
    }

    async chooseRow(){
        
    }

    async promiseColNames(table, includePK=true){ 
        const colInfo = await this.promiseColInfo(table, includePK);
        return colInfo.map(col => col.Field);
    }

    async promiseColInfo(table, includePK=true){
        let [colInfo] = await this.connection.promise().query(`DESCRIBE \`${table}\``);
        return includePK? colInfo: colInfo.filter(col => col.Key!='PRI');
    }

    async promiseRows(table, includePK=true, rowPKid=""){ //can return one row if provided the PK id, or all rows if not
        const rowSelector = rowPKid? `WHERE ID=${rowPKid}`: "";
        
        let [rows] = await this.connection.promise().query(`SELECT * FROM ${table} ${rowSelector}`);
        
        if (includePK && Object.keys(rows[0]).length) return rows;
        else return rows.map( row => {
            return Object.fromEntries(
                Object.entries(row).slice(1)
            )
        });
    }

    async clarifyDelete(table){
        let rows = await this.promiseRows(table);
        return await inquirer.prompt({
            name: 'deleteWhat',
            type: 'list',
            message: 'Select a Record for Deletion',
            choices: () => {
                return rows.map(row => JSON.stringify(row));
            },
        })
        .then((answer) => {
            return JSON.parse(answer.deleteWhat);
        })
    }

    async clarifyUpdate(table, existingRows, colInfo){
        let values = [];
        const fkEval = await this.evalForeignKeys(table);
        
        const {rowSelection} = await inquirer.prompt({
            name: 'rowSelection',
            type: 'list',
            message: 'Choose a Row to Modify',
            choices: async () => existingRows.map(option => JSON.stringify(option)),
            filter: (answer) => JSON.parse(answer)
        })        
        
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

    async clarifyAdd(table){
        const colInfo = await this.promiseColInfo(table, false);

        let values = {};
        const fkEval = await this.evalForeignKeys(table);
        
        for await (let field of utils.getValues(colInfo)){
            await inquirer.prompt(
                [{
                    when: () => fkEval.foreign_key != field.Field, 
                    name: field.Field,
                    type: 'input',
                    message: () => `Input Value for Field "${field.Field.toUpperCase()}"`,
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
                    message: () => `Select Value for Field "${field.Field.toUpperCase()}"`,
                    filter: (answer) => {
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

    async checkForeignConstraints(table, rowID){ //returns rows in referenced tables where there are foreign key constraints for a particular row. If no row ID is provided, returns tables with tied foreign keys or false if no such constraints exist
        const [[constraints]] = await this.connection.promise().query(`
            SELECT
                TABLE_NAME,
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
                REFERENCED_TABLE_NAME = '${table}'
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
      
        async ADD(parentAPI, table) {
            const newRow = await parentAPI.clarifyAdd(table, colInfo);
            const query = parentAPI.prepareAddStatement(table, newRow);
            
            return parentAPI.connection.promise().query(query)
            .then((results, error) => {
                error? console.log(error): console.log(chalk.green('\nRow Successfully Added!\n'));
            });
        },

        // async VIEW(parentAPI, row){
        //     const [tableData] = await parentAPI.connection.promise().query(`SELECT * FROM ${table}`)
        //     console.table("\n",tableData);
        // },

        // async UPDATE(parentAPI, table) {
        //     const existingRows = await parentAPI.promiseRows(table);
        //     const colInfo = await parentAPI.promiseColInfo(table, false);
        //     const clarifiedUpdate = await parentAPI.clarifyUpdate(table, existingRows, colInfo);

        //     const query = parentAPI.prepareUpdateStatement(clarifiedUpdate.rowID, clarifiedUpdate.fields, clarifiedUpdate.values, table);
            
        //     return parentAPI.connection.promise().query(query)
        //     .then((results, error) => {
        //         error? console.log(error): console.log(chalk.green('\nUpdate Successful!\n'));
        //     });
        // },

        async DELETE(parentAPI, table) {
            const doomedRow = await parentAPI.clarifyDelete(table);
            const foreignConstraints = await parentAPI.checkForeignConstraints(table, doomedRow.id);
            
            if (foreignConstraints.length){
                console.log(chalk.red (`\nERROR: Foreign Constraint Detected: the Following Rows Have Their Foreign Keys Tied to the Row You Want to Delete: \n`))
                foreignConstraints.forEach(constraint => {
                    console.log(chalk.red (JSON.stringify(constraint)))
                });
                console.log('\n');
            }
            else{
                return parentAPI.connection.promise().query(`DELETE FROM \`${table}\` WHERE id = ${doomedRow.id}`)
                .then(() => console.log(chalk.red(`\n${table[0].toUpperCase()}${table.slice(1)} Succesfully Removed...\n`)));
            }
        }
    }
}