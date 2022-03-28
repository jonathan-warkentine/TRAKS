
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

    prepareAddStatement(values){ //formats values according to type for entry into MySQL
        return values.map(value => {
            if (typeof value == 'string'){
                return `"${value}"`;
            }
            else {return value}
        })
        .join(", ")
    }

    prepareUpdateStatement(rowid, fields, values, table){
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

        return `UPDATE ${table} SET ${statements} WHERE id = ${rowid}`;
    }

    async evalForeignKeys(table){ //returns the name of the table where the FK is sources, as well as the column name from within that table, or false if there is no FK
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
            AND table_name = '\`${table}\`'
        `);
        if (fk) return fk;
        else {return false};
    };

    tableAPI = { //stored in an object for reference purposes

        async VIEW(parentAPI, table){
            const [tableData] = await parentAPI.connection.promise().query(`SELECT * FROM ${table}`)
            console.table("\n",tableData, "\n");
        },
        
        async ADD(parentAPI, table) {
            const colNames = await parentAPI.promiseColNames(table, false);
            const colNamesFormatted = colNames.join(", ");
            const newRow = await parentAPI.clarifyAdd(table, colNames);
            const newRowFormatted = parentAPI.prepareAddStatement(newRow);
            
            return parentAPI.connection.promise().query(`INSERT INTO \`${table}\` (${colNamesFormatted}) VALUES (${newRowFormatted})`);
        },

        async UPDATE(parentAPI, table) {
            const existingRows = await parentAPI.promiseRows(table);
            const colInfo = await parentAPI.promiseColInfo(table, false);
            const clarifiedUpdate = await parentAPI.clarifyUpdate(table, existingRows, colInfo);
            
            const query = parentAPI.prepareUpdateStatement(clarifiedUpdate.rowid, clarifiedUpdate.fields, clarifiedUpdate.values, table);
            
            return parentAPI.connection.promise().query(query)
            .then((results, error) => {
                error? console.log(error): console.log(chalk.green('\nUpdate Successful!\n'));
            });
        },

        async DELETE(parentAPI, table) {
            let doomedRow = await parentAPI.clarifyDelete(table);
            
            return parentAPI.connection.promise().query(`DELETE FROM ${table} WHERE id = ${doomedRow.id}`)
            .then(() => console.log(chalk.red(`\n${table[0].toUpperCase()}${table.slice(1)} Succesfully Removed...\n`)));
        }
    }
}