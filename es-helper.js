const elasticsearch = require('elasticsearch');

const ELASTICSEARCH_DATA_WAREHOUSE_URL = (process.env.ELASTICSEARCH_DB_CREDENTIALS || {}).ELASTICSEARCH_DATA_WAREHOUSE_URL;
const INDEX_NAME = 'calendars_clickup_automation_logs';

async function sendLog(data) {
    if (!ELASTICSEARCH_DATA_WAREHOUSE_URL) {
        console.error('ELASTIC_URL is not set');
        return;
    }

    const calendarEventESClient = new elasticsearch.Client({
        hosts: ELASTICSEARCH_DATA_WAREHOUSE_URL
      })
    console.log("Sending log to Elasticsearch...", data);
    const index = `${INDEX_NAME}-${new Date().toISOString().split('T')[0]}`;

    try {
        calendarEventESClient.index({
            index,
            body: {
                timestamp: new Date(),
                ...data
            }
        })
    } catch (error) {
        console.error('Error sending log to Elasticsearch:', JSON.stringify(error));
    }
}

module.exports = {
    sendLog
}; 