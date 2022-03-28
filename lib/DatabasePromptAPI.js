const inquirer = require('inquirer');

const DatabaseAPI = require('./DatabaseAPI');
const prompts = require('../src/prompts');
const utils = require('../utils/utils');


class DataBasePromptAPI extends DatabaseAPI {
    constructor(connection){
        super(connection);
    }

    async init(){
        this.startPrompts();
    }

    async startPrompts(){
        await this.injectTableNames();
        await inquirer.prompt(prompts.general)
        .then(answers => {
            return this.tableAPI[answers.modeSelect](this, answers.tableSelect.toLowerCase());
        })
        .then(() => this.done());
    }

    async injectTableNames(){ //injects table names from a connected database into the imported prompts
        const tableNames = await this.promiseTableNames();
        const tbNmAllCapsPlural = tableNames.map(tableName => tableName.toUpperCase());
        
        prompts.general[0].choices = tbNmAllCapsPlural;
    }

    async clarifyDelete(table){
        let rows = await this.promiseRows(table);
        return inquirer.prompt({
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

    async clarifyAdd(table, colInfo){
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
    
    async done(){
        inquirer.prompt(prompts.done)
        .then((answer) => answer.done? process.exit(): this.startPrompts());
    }
}

module.exports = DataBasePromptAPI;