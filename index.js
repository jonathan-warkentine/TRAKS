const setup = require('./config/setup');
const DatabasePromptsAPI = require('./lib/DatabasePromptAPI');

MasterSetup();

async function MasterSetup(){
    const connection = await setup();
    const dbPromptAPI = new DatabasePromptsAPI(connection);
    dbPromptAPI.init();
}


