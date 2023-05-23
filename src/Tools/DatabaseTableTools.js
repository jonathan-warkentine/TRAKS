const chalk  = require('chalk');
const DatabaseTools = require('./DatabaseTools');
const mysql = require('mysql2');

module.exports = class DatabaseTableTools extends DatabaseTools{
    constructor(database, table, connection){
        super(database);
        this.table = table;
        this.connection = connection;
    }
    
    async checkForeignConstraints(rowID){ //returns rows in referenced tables where there are foreign key constraints for a particular row. If no row ID is provided, returns tables with tied foreign keys or false if no such constraints exist
        const [[constraints]] = await this.connection.promise().query(
            `SELECT
                TABLE_NAME,
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
                REFERENCED_TABLE_NAME = ?`,
            [this.table]
        );

        if (constraints && rowID) {
            const [results] = await this.connection.promise().query(`
                SELECT * FROM ??
                WHERE
                    ? = ?
                `,
                [constraints.TABLE_NAME, constraints.COLUMN_NAME, rowID]
            );
            
            results.forEach(result => result.FROM_TABLE = constraints.TABLE_NAME);
            return results || false;
        }

        return constraints || false;
    }

    prepAddRowsStatement(values){ //formats values according to type for entry into MySQL
        let fieldNames = Object.keys(values);
        let fieldValues = Object.values(values);

        let query = `
            INSERT INTO ?? 
                (${fieldValues.map((v, i) => i? ', ??': '??').join(' ')}) 
                VALUES 
                (${fieldValues.map((v, i) => i? ', ?': '?').join(' ')})
        `;

        const inserts = [this.table, ...fieldNames, ...fieldValues];
        query = mysql.format(query, inserts);

        return query;
    }

    prepUpdateRowsStatement(rowID, primaryKey, fields, values){

        let query = `UPDATE ?? SET ${fields.map(field => '?? = ?').join(' ')} WHERE ?? = ?`;
        const inserts = [this.table, ...fields.map( (field, i) => [field, values[i]] ).flat(), primaryKey, rowID];
        query = mysql.format(query, inserts);

        return query;
    }

    async updateRow(clarifiedUpdate, primaryKey){
        const query = this.prepUpdateRowsStatement(clarifiedUpdate.rowID, primaryKey, clarifiedUpdate.fields, clarifiedUpdate.values);
            
        await this.connection.promise().query(query)
        .then((results, error) => {
            error? console.log(error): console.log(chalk.green('\nUpdate Successful!\n'));
        });
    }

    async deleteRow(rowID, primaryKey){
        const foreignConstraints = await this.checkForeignConstraints(rowID);
            
        if (foreignConstraints.length){
            console.log(chalk.red (`\nERROR: Foreign Constraint Detected: the Following Rows Have Their Foreign Keys Tied to the Row You Want to Delete: \n`))
            foreignConstraints.forEach(constraint => {
                console.log(chalk.red (JSON.stringify(constraint)))
            });
            console.log('\n');
        }
        else{
            await this.connection.promise().query(
                `DELETE FROM ?? WHERE ?? = ?`,
                [this.table, primaryKey, rowID]
            )
            .then(() => console.log(chalk.red(`\nRow Succesfully Removed...\n`)));
        }
    }

    async addRow(newRow){
        const query = this.prepAddRowsStatement(newRow);
        this.connection.promise().query(query)
        .then((results, error) => {
            error? console.log(error): console.log(chalk.green('\nRow Successfully Added!\n'));
        });
    }
}