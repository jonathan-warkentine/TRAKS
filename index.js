const connection = require('./config/connection')
const DatabasePromptAPI = require('./lib/DatabasePromptAPI');

const dbAPI = new DatabasePromptAPI(connection);




// ------------------------------------//
// dbAPI.promiseColInfo('employee', false)
// .then((result)=>console.log(result.map(res => res.Field)))


// dbAPI.addDepartment('test department1213')
// .then(()=> dbAPI.printAllDepartments())


// dbAPI.checkForeignConstraints('department', 10)
// .then((result) => console.log(result))

dbAPI.startPrompts();