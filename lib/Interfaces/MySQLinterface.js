const chalk = require('chalk');
const inquirer = require('inquirer');
const logo = require('asciiart-logo');

const MySQLtools = require('../Tools/MySQLtools');

module.exports = class MySQLinterface{
    constructor (){
        this.tools = new MySQLtools();
    }

    async init(){
        await this.tools.init(); //'await' important
        this.printWelcome();
        await this.chooseDatabase();
    }

    printWelcome() {
        const packagejson = require('../../package.json');
        console.log(
                logo({
                name: `${packagejson.name}`,
                font: 'Star Wars',
                borderColor: 'grey',
                logoColor: 'bold-green',
                textColor: 'green',
            })
            .emptyLine()
            .right(`VERSION ${packagejson.version}`)
            .emptyLine()
            .center('A Simple MySQL Database Command-Line Interface')
            .render()
        );
    }
    
    async chooseDatabase(){
        const [databases] = await this.tools.promiseDatabases();
        await inquirer.prompt({
            name: 'chooseDatabase',
            message: 'Choose a Database...',
            type: 'list',
            choices: [...databases.map(database => this.tools.utils.objValues(database)).flat(), '[ + ] NEW DATABASE ', '[ x ] close program'],
        })
        .then(async answer => {
            if (answer.chooseDatabase=='[ + ] NEW DATABASE'){
                await this.modes.ADD(this);
            }
            else if ((answer.chooseDatabase=='[ x ] close program')){
                console.info(chalk.green(`\nDisconnecting from MySQL...`))
                this.tools.connection.end;
                console.log( chalk.green('\nGoodbye! 👋 \n\n') );
                process.exit();
            }
            else {
                this.tools.connection.end; //going to reconnect to the database selected
                await this.modeSelect(answer.chooseDatabase);
            }
        });
    }

    async modeSelect(database){
        await inquirer.prompt([
            {
                name: 'modeSelect',
                type: 'list',
                message: `What Would You Like to do with \`${database}\`?`,
                choices: [`OPEN DATABASE ${database}`, `RENAME DATABASE ${database}`, `DELETE DATABASE ${database}`, '[ <- ] back'],
                filter: (answer) => answer=='[ <- ] back'? 'AGAIN': answer.slice(0, answer.indexOf(' '))
            }
        ])
        .then(async answer => await this.modes[answer.modeSelect](database, this));
    }

    modes = {

        async ADD(parent){
            await inquirer.prompt({
                name: 'databaseName',
                type: 'input',
                message: 'What Would You Like to Call Your New Database?',
                validate: answer => /^[0-9a-zA-Z_]+$/.exec(answer)? true: 'Database Name Must be Alphanumeric'
            })
            .then(async answer => {
                await parent.tools.ADD(answer.databaseName);
            });
            
            await parent.chooseDatabase();
        },
        
        async OPEN(database, parent){
            const DatabaseInterface = require('./DatabaseInterface');
            const databaseAPI = new DatabaseInterface(parent, database);
            await databaseAPI.init();
        },

        async RENAME(database, parent){
            console.log(chalk.yellow('\n\'RENAME\' Functionality Coming Soon!\n'));
            await parent.modeSelect(database);
        },

        async DELETE(database, parent){
            await inquirer.prompt({
                name: 'sure',
                type: 'input',
                message: 'DANGER ZONE: type full database name to continue (or \'x\' to cancel):',
                validate: answer => answer.toLowerCase()==database.toLowerCase() || answer.toLowerCase()=='x'? true: 'Check Your Input and Try Again'
            })
            .then(async answer => {
                if (answer.sure.toLowerCase()==database.toLowerCase()){
                    await parent.tools.DELETE(database);
                }
            })

            await parent.chooseDatabase();
        },

        async AGAIN(database, parent){
            await parent.chooseDatabase();
        }
    }
}