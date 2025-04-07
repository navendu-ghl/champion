const customFieldsData = require('../data/custom-fields.json');

function getCustomFieldId(fieldName) {
    return customFieldsData.find(field => field.name === fieldName)?.id
}

function getCustomFieldOptionId(fieldName, optionName) {
    return customFieldsData.find(field => field.name === fieldName)?.options.find(option => option.name === optionName)?.id
}

module.exports = {
    getCustomFieldId,
    getCustomFieldOptionId
}