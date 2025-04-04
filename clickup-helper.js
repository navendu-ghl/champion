const customItemsData = require('./data/custom-items.json');

class ClickUpHelper {
    constructor(customFieldsData) {
        this.customFieldsData = customFieldsData;
        this.customItemsData = customItemsData;
    }

    getCustomFieldId(fieldName) {
        return this.customFieldsData.find(field => field.name === fieldName)?.id;
    }

    getCustomFieldOptionId(fieldName, optionName) {
        const options = this.customFieldsData.find(field => field.name === fieldName)?.type_config?.options || [];
        return options.find(option => option.name === optionName)?.id;
    }

    getCurrentQuarter() {
        const quarterOptions = this.customFieldsData.find(field => field.name === "⏳ Delivery Quarter")?.type_config?.options.map(option => option.name);

        // find quarter from quarterOptions based on current date
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const quarter = Math.ceil((currentMonth + 1) / 3);
        return quarterOptions.find(option => option.name === `${currentYear} - Q${quarter}`);
    }

    getCustomItemId(itemName) {
        return this.customItemsData.find(item => item.name === itemName)?.id;
    }

    copyCustomFields(task, customFieldsToCopy = []) {
        const _customFieldIdsToCopy = customFieldsToCopy.map(field => this.getCustomFieldId(field));
        const result = [];
        task.custom_fields.forEach(customField => {
            if (_customFieldIdsToCopy.includes(customField.id)) {
                if (customField.type === 'drop_down') {
                    const options = customField.type_config.options;
                    const value = options.find(option => option.orderindex === customField.value)?.id;
                    if (value) {
                        result.push({ key: customField.id, value });
                    }
                } else {
                    result.push({ key: customField.id, value: customField.value });
                }
            }

        });

        return result;
    }
}

module.exports = ClickUpHelper;