module.exports = {
    objValues(object) {
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
            case 'tinyint(1)':
                return attempt==0 || attempt==1;
            default:
                return attempt? true: false;
        }
    }
}



