
const promptData = [
 
    ['fred', 'bob'],

    [
        {
            name: 'purpose',
            type: 'list',
            message: 'What would you like to do?',
            choices: ['View All Departments', 'View All Roles', 'View All Employees', 'Add a Department', 'Add a Role', 'Add an Employee', 'Update an Employee Role']
        },
        {
            when: answers => answers.purpose === 'Update an Employee Role',
            name: 'EmployeeSelect',
            type: 'list',
            message: "Which Employee's Role Would You Like to Update?",
            choices: this[0]
        }
    ]
]

module.exports = promptData;

