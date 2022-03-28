const cTable = require('console.table');
const chalk = require('chalk');

module.exports = class DatabaseAPI {
    constructor (connection){ //pass in the connection established in connection.js in the config folder
        this.connection = connection;
    }
    
    async promiseTableNames() {
        const [tableNames] = await this.connection.promise().query(`SHOW TABLES`);
        return tableNames.map(tableName => {
            [tableName] = Object.values(tableName);
            return tableName;
        });
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

    tableAPI = { //stored in an object for reference purposes

        async VIEW(parentAPI, table){
            const [tableData] = await parentAPI.connection.promise().query(`SELECT * FROM ${table}`)
            console.table("\n",tableData);
        },
        
        async ADD(parentAPI, table) {
            const colInfo = await parentAPI.promiseColInfo(table, false);
            const newRow = await parentAPI.clarifyAdd(table, colInfo);
            const query = parentAPI.prepareAddStatement(table, newRow);
            
            return parentAPI.connection.promise().query(query)
            .then((results, error) => {
                error? console.log(error): console.log(chalk.green('\nRow Successfully Added!\n'));
            });
        },

        async UPDATE(parentAPI, table) {
            const existingRows = await parentAPI.promiseRows(table);
            const colInfo = await parentAPI.promiseColInfo(table, false);
            const clarifiedUpdate = await parentAPI.clarifyUpdate(table, existingRows, colInfo);

            const query = parentAPI.prepareUpdateStatement(clarifiedUpdate.rowID, clarifiedUpdate.fields, clarifiedUpdate.values, table);
            
            return parentAPI.connection.promise().query(query)
            .then((results, error) => {
                error? console.log(error): console.log(chalk.green('\nUpdate Successful!\n'));
            });
        },

        async DELETE(parentAPI, table) {
            const doomedRow = await parentAPI.clarifyDelete(table);
            const foreignConstraints = await parentAPI.checkForeignConstraints(table, doomedRow.id);
            
            if (foreignConstraints){
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