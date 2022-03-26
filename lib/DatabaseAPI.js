
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
        let [colNames] = await this.connection.promise().query(`SHOW COLUMNS FROM ${table}`);
        if (includePK) return colNames.map(col => col.Field);
        else return colNames.map(col => col.Field).slice(1);
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

    formatValues(values){ //formats values according to type for entry into MySQL
        return values.map(value => {
            if (typeof value == 'string'){
                return `"${value}"`;
            }
            else {return value}
        })
        .join(", ")
    }

    async evalForeignKeys(table){ //returns the name of the table where the FK is sources, as well as the column name from within that table, or false if there is no FK
        const [[fk]] = await this.connection.promise().query(`
            select
            column_name as 'foreign_key',
            referenced_table_name as 'reference_table',
            referenced_column_name as 'reference_column'
            from
            information_schema.key_column_usage
            where
            referenced_table_name is not null
            and table_schema = 'employee_tracker_db'
            and table_name = '${table}'
        `);
        if (fk) return fk;
        else {return false};
    };

    tableAPI = {

        async VIEW(parentAPI, table){
            const [tableData] = await parentAPI.connection.promise().query(`SELECT * FROM ${table}`)
            console.table("\n",tableData, "\n");
        },
        
        async ADD(parentAPI, table) {
            const colNames = await parentAPI.promiseColNames(table, false);
            const colNamesFormatted = colNames.join(", ");
            const newRow = await parentAPI.clarifyAdd(table, colNames);
            const newRowFormatted = parentAPI.formatValues(newRow);
            
            parentAPI.connection.query(`INSERT INTO \`${table}\` (${colNamesFormatted}) VALUES (${newRowFormatted})`);
        },

        async UPDATE(parentAPI, table) {
            const colNames = await parentAPI.promiseColNames(table, false);
            const [rowSelction, newRow] = await parentAPI.clarifyUpdate(table, colNames);
            const newRowFormatted = parentAPI.formatValues(newRow);
            
            parentAPI.connection.query(`UPDATE ${table} SET column1 = value1, column2 = value2, ... WHERE condition`);
        },

        async DELETE(parentAPI, table) {
            let doomedRow = await parentAPI.clarifyDelete(table);
            await parentAPI.connection.promise().query(`DELETE FROM ${table} WHERE id = ${doomedRow.id}`);
            
            console.log(chalk.blue(`\n${table[0].toUpperCase()}${table.slice(1)} Succesfully Removed...\n`));
        }
    }
}