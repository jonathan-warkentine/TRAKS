const connection = require('./config/connection')
const DatabasePromptAPI = require('./lib/DatabasePromptAPI');

const dbAPI = new DatabasePromptAPI(connection);

dbAPI.init();