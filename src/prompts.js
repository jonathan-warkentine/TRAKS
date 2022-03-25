
module.exports = [
    {
        name: 'purpose',
        type: 'list',
        message: 'I would like to...',
        choices: ['VIEW', 'ADD', 'UPDATE']
    },
    {
        when: answers => answers.purpose === 'VIEW',
        name: 'tableSelect',
        type: 'list',
        message: "What Would You Like to View?",
        choices: ['DEPARTMENTS', 'POSITIONS', 'EMPLOYEES']
    },
    {
        when: answers => answers.purpose === 'ADD',
        name: 'EmployeeSelect',
        type: 'list',
        message: "What Would You Like to Add?",
        choices: ['A Department', 'A Job Position', 'An Employee']
    },
    {
        when: answers => answers.purpose === 'UPDATE',
        name: 'EmployeeSelect',
        type: 'list',
        message: "What Would You Like to View?",
        choices: ['A Department', 'A Job Position', 'An Employee']
    }
]

