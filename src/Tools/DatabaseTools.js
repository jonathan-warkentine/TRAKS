const cTable = require('console.table');
const chalk = require('chalk');
const mysql = require('mysql2');

const MySQLtools = require('./MySQLtools');
const RawListPrompt = require('inquirer/lib/prompts/rawlist');

module.exports = class DatabaseTools extends MySQLtools{
    constructor(database){
        super();
        this.database = database;
    }

    async init(){ //replaces the inhereted init() method
        this.connection = await this.createConnection(this.database); //creates an initial 
        // connection to MySQL, no database selected. If no MySQL credentials are on file 
        // in the .env file, prompts the user for their credentials
    }

    async evalForeignKeys(table){ //returns the name of the table where the FK is sourced, 
        // as well as the column name from within that table, or false if there is no FK
        const [[fk]] = await this.connection.promise().query(`
            SELECT
            column_name AS 'foreign_key',
            referenced_table_name AS 'reference_table',
            referenced_column_name AS 'reference_column'
            FROM
            information_schema.key_column_usage
            WHERE
            referenced_table_name IS NOT NULL
            AND table_schema = ?
            AND table_name = ?`,
            [this.database, table]);
        return fk || false;
    };

    async findPK(table){

        let query = "SHOW KEYS FROM ?? WHERE Key_name = 'PRIMARY'";
        const inserts = [table];
        query = mysql.format(query, inserts);

        const [[pk]] = await this.connection.promise().query(query);

        return pk.Column_name;
    }

    async promiseTableNames() {
        const [tableNames] = await this.connection.promise().query(`SHOW TABLES`);
        return tableNames.map(tableName => {
            [tableName] = Object.values(tableName);
            return tableName;
        });
    }

    async promiseColInfo(table, includePK=true){
        let [colInfo] = await this.connection.promise().query(
            `DESCRIBE ??`,
            [table]
        );
        return includePK? colInfo: colInfo.filter(col => col.Key!='PRI');
    }

    async promiseRows(table, includePK=true, rowPKid=null){ //can return one row if 
        // provided the PK id, or all rows if not; returns false if no rows in table
        
        let query = rowPKid? `SELECT * FROM ?? WHERE ID = ?`: `SELECT * FROM ??`;
        const inserts = rowPKid? [table, rowPKid]: [table];
        query = mysql.format(query, inserts);

        let [rows] = await this.connection.promise().query(query);
        
        if (rows.length){
            if (includePK && Object.keys(rows[0]).length) return rows;
            else return rows.map( row => {
                return Object.fromEntries(
                    Object.entries(row).slice(1)
                )
            });
        }
        else return false;
    }

    prepADDstatement(clarity){
        // const statements = clarity.columns.map(col => `\`${col.newColName}\` ${col.newColType} ${col.notNull? "": "NOT NULL"}`)
        // return `CREATE TABLE \`${clarity.table}\` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ${statements})`;

        // TODO: colType doesn't work, creates incorrect MySQL syntax
        let query = `CREATE TABLE ?? (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ${clarity.columns.map(c => c.notNull? `?? ${c.newColType}`: `?? ${c.newColType} NOT NULL`)})`;
        const inserts = [clarity.table, ...clarity.columns.map(c => c.newColName)];
        query = mysql.format(query, inserts);

        return query;        
    }

    async addTable(clarity){
        const query = this.prepADDstatement(clarity);
        await this.connection.promise().query(query)
        .then((results, error) => {
            error? console.log(chalk.red(error)): console.log(chalk.green(`\nNew Table Successfully Added!\n`));
        })
    }

    async addFields(newFields){
        const query = this.prepNewColStatment(newFields);
        await this.connection.promise().query(query)
        .then((results, error) => {
            error? console.log(chalk.red(error)): console.log(chalk.green(`\nNew Field(s) Successfully Added!\n`));
        });
    }

    prepNewColStatment(clarity){
        // TODO: colType doesn't work, creates incorrect MySQL syntax
        let query = `ALTER TABLE ?? ${clarity.columns.map(c => c.notNull? `ADD COLUMN ?? ${c.newColType}`: `ADD COLUMN ?? ${c.newColType} NOT NULL`)}`;
        const inserts = [clarity.table, ...clarity.columns.map(c => c.newColName)];
        query = mysql.format(query, inserts);

        return query;
    }

    prepRemColStatement(table, clarity){
        let query = `ALTER TABLE ?? ${clarity.map(field => `DROP COLUMN ??`)}`;
        const inserts = [table, ...clarity.map(field => field.Field)];
        query = mysql.format(query, inserts);

        return query;
    }

    async removeFields(table, fields){
        const query = this.prepRemColStatement(table, fields);
        await this.connection.promise().query(query)
        .then((results, error) => {
            error? console.log(chalk.red(error)): console.log(chalk.red(`\nField(s) Successfully Removed\n`));
        });
    }

    async printTable(table){
        const [tableData] = await this.connection.promise().query(
            `SELECT * FROM ??`,
            [table]
        );
        tableData.length? console.table("\n",tableData): console.log(chalk.yellow('\n', `No Rows in Table '${table}'!`, '\n'));
    }

    async renameTable(table, newTableName){
        await this.connection.promise().query(
            `ALTER TABLE ?? RENAME TO ??`,
            [table, newTableName]
        )
        .then((results, error) => error? console.log(chalk.red(error)): console.log(chalk.green('\nTable Succesfully Renamed!\n')));
    }

    async deleteTable(table){
        await this.connection.promise().query(
            `DROP TABLE ??`,
            [table]
        )
        .then((results, error) => {
            error? console.log(chalk.red(error)): console.log(chalk.red('\nDELETION SUCCESSFUL\n'));
        })
    }

    async joinTable(table, refTable, refCol, fkID){
        const results = await this.connection.promise().query(`
            SELECT * FROM ??
            LEFT JOIN ?? ON  ??.?? = ??.??`,
            [table, refTable, refTable, refCol, table, fkID]
        );
        console.table('\n', results[0]);
    }
}