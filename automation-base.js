class AutomationBase {
    constructor(config) {
        this.config = config;
    }

    validate(json, query = this.config.when) {
        if ('$and' in query) {
            return this.handleLogicalOperator(json, '$and', query.$and);
        }

        if ('$or' in query) {
            return this.handleLogicalOperator(json, '$or', query.$or);
        }

        return Object.entries(query).every(([key, condition]) => {
            if (key.startsWith('$')) {
                throw new Error(`Invalid operator: ${key}`);
            }

            if (typeof condition === 'object' && condition !== null) {
                return this.handleNestedConditions(json, key, condition);
            }

            return json[key] === condition;
        });
    }

    handleLogicalOperator(json, operator, conditions) {
        if (!Array.isArray(conditions) || conditions.length === 0) {
            throw new Error(`${operator} operator expects a non-empty array`);
        }

        if (operator === '$and') {
            return conditions.every(condition => this.validate(json, condition));
        }

        if (operator === '$or') {
            return conditions.some(condition => this.validate(json, condition));
        }

        throw new Error(`Invalid logical operator: ${operator}`);
    }

    handleNestedConditions(json, key, conditions) {
        return Object.entries(conditions).every(([operator, value]) => {
            let jsonValue;

            // TODO: enhance this later
            // "custom_fields->710f1ecb-36ca-4beb-9c84-476a839275be.value"
            const regex = /^(.+)\->(.+)\.(.+)$/;
            const _match = key.match(regex);
            if (_match) {
                jsonValue = json[_match[1]].find(x => x.id === _match[2])[_match[3]];
            } else if (key.includes('[].')) {
                // handle the case where the key is an array
                const [_key, _subKey] = key.split('[].');
                jsonValue = json[_key].map(item => item[_subKey]);
            } else {
                jsonValue = key.split('.').reduce((acc, part) => acc && acc[part], json);
            }

            if (operator === '$exists') {
                return (value === true && jsonValue !== undefined) || (value === false && jsonValue === undefined);
            }

            if (jsonValue === undefined) {
                return false;
            }

            if (operator === '$type') {
                if (typeof value !== 'string') {
                    throw new Error(`Invalid value for $type operator: ${value}`);
                }
                return typeof jsonValue === value.toLowerCase();
            }

            console.log({ operator, jsonValue, value });

            switch (operator) {
                case '$eq': return jsonValue === value;
                case '$ne': return jsonValue !== value;
                case '$gt': return jsonValue > value;
                case '$gte': return jsonValue >= value;
                case '$lt': return jsonValue < value;
                case '$lte': return jsonValue <= value;
                case '$includes':
                    if (!Array.isArray(jsonValue)) {
                        throw new Error(`Invalid value for comparison. ${operator} expects an array.`);
                    } else if (typeof jsonValue[0] === 'string') {
                        return jsonValue.includes(value);
                    } else if (typeof jsonValue[0] === 'object') {
                        // deep compare two objects
                        return jsonValue.some(item => this.deepCompare(item, value));
                    }
                case '$in':
                    return value.includes(jsonValue);
                default:
                    throw new Error(`Invalid operator: ${operator}`);
            }
        });
    }

    deepCompare(obj1, obj2) {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    async run(clickupService, task) {
        throw new Error('run() method must be implemented by automation class');
    }
}

module.exports = AutomationBase; 
