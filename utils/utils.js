module.exports = {
    getValues(object) {
        return Object.values(object).flat();
    },

    validateType(attempt, desiredType){
        switch (desiredType){
            case 'int':
            case 'decimal(10,0)':
                return !isNaN(attempt) && !attempt.includes(',');
            case 'text':
            case 'varchar(30)':
                return isNaN(attempt) && typeof attempt == 'string';
            default:
                return attempt? true: false;
        }
    }
}



