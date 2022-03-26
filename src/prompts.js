module.exports = {
    
    general: [
        {
            name: 'tableSelect',
            type: 'list',
            message: "Let's interact with...",
            choices: ['Error - choice list not populated'], //to be populated when called
            filter: answer => answer.toLowerCase().slice(0, -1) //format for immediate use in MySQL
        },
        {
            name: 'modeSelect',
            type: 'list',
            message: 'I Want to...',
            choices: answers => [`VIEW ${answers.tableSelect.toUpperCase()}(S)`, `ADD ${answers.tableSelect.toUpperCase()}(S)`, `UPDATE ${answers.tableSelect.toUpperCase()}(S)`, `DELETE ${answers.tableSelect.toUpperCase()}(S)`],
            filter: modeSelection => modeSelection.slice(0, modeSelection.indexOf(' ')) //Gives us 'VIEW', 'ADD', or 'UPDATE'
        },        
    ],

    add: [
        {
            // when: answers => answers.modeSelect === 'ADD',
            name: 'addWhat',
            type: 'list',
            message: (answers) => console.log(answers),
            choices: []
        }
    ],

    update: [
        {

        }
    ],

    delete: [
        {

        }
    ],

    done: {
        name: 'done',
        message: 'Done?',
        type: 'confirm'
    }
}