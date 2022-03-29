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