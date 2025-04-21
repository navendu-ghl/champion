const axios = require('axios');

const ELASTIC_URL = 'https://es-app-user-highlevel-staging-private-user:WVgALvjX7Y9!5Hxyck@vpc-highlevel-staging-private-5wwmxidjayhf6poeu4hzdf45sq.us-east-1.es.amazonaws.com';
const INDEX_NAME = 'calendars_clickup_automation_logs';

async function sendLog(data) {
    console.log("Sending log to Elasticsearch...", data);
    const index = `${INDEX_NAME}-${new Date().toISOString().split('T')[0]}`;

    try {
        await axios.post(
            `${ELASTIC_URL}/${index}/_doc`,
            {
                timestamp: new Date(),
                ...data
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        console.error('Error sending log to Elasticsearch:', JSON.stringify(error));
    }
}

module.exports = {
    sendLog
}; 