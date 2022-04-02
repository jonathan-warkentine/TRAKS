const chalk  = require('chalk');
const DatabaseTools = require('./DatabaseTools');

module.exports = class DatabaseTableTools extends DatabaseTools{
    constructor(database, table, connection){
        super(database);
        this.table = table;
        this.connection = connection;
    }
    
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
                REFERENCED_TABLE_NAME = \'${this.table}\'
        `);

        if (constraints && rowID) {
            const [results] = await this.connection.promise().query(`
                SELECT * FROM \`${constraints.TABLE_NAME}\`
                WHERE
                    \`${constraints.COLUMN_NAME}\` = ${rowID}
            `);
            
            results.forEach(result => result.FROM_TABLE = constraints.TABLE_NAME);
            return results || false;
        }

        return constraints || false;
    }

    prepAddRowsStatement(values){ //formats values according to type for entry into MySQL
        let fieldNames = Object.keys(values).join(', ');
        let fieldValues = Object.values(values).map(value => isNaN(value)? `${value}`: value).join(', ');

        return `INSERT INTO \`${this.table}\` (${fieldNames}) VALUES (${fieldValues})`;
    }

    prepUpdateRowsStatement(rowID, fields, values){
        const formatValues = values.map(value => {
            if (typeof value == 'string'){
                return `"${value}"`;
            }
            else {return value}
        })

        const statements = fields.map((field, i) => `${field} = ${formatValues[i]}`);

        return `UPDATE \`${this.table}\` SET ${statements} WHERE id = ${rowID}`;
    }

    async updateRow(clarifiedUpdate){
        const query = this.prepUpdateRowsStatement(clarifiedUpdate.rowID, clarifiedUpdate.fields, clarifiedUpdate.values);
            
        await this.connection.promise().query(query)
        .then((results, error) => {
            error? console.log(error): console.log(chalk.green('\nUpdate Successful!\n'));
        });
    }

    async deleteRow(rowID){
        const foreignConstraints = await this.checkForeignConstraints(rowID);
            
        if (foreignConstraints.length){
            console.log(chalk.red (`\nERROR: Foreign Constraint Detected: the Following Rows Have Their Foreign Keys Tied to the Row You Want to Delete: \n`))
            foreignConstraints.forEach(constraint => {
                console.log(chalk.red (JSON.stringify(constraint)))
            });
            console.log('\n');
        }
        else{
            await this.connection.promise().query(`DELETE FROM \`${this.table}\` WHERE id = ${rowID}`)
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