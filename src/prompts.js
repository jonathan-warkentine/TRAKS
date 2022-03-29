module.exports = {
    credentials: [
        {
            name: 'dbusername',
            type: 'input',
            message: 'Enter Your MySQL Username',

        },
        {
            name: 'dbpassword',
            type: 'password',
            message: 'Enter Your MySQL Password',
        }
    ],
    general: [
        {
            name: 'tableSelect',
            type: 'list',
            message: "Choose a Table...",
            choices: ['Error - choice list not populated'], //to be populated when called
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

    done: {
        name: 'done',
        message: 'Done?',
        type: 'confirm'
    }
}