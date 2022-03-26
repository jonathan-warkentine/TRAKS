-- SELECT * FROM information_schema.TABLE_CONSTRAINTS 
-- WHERE information_schema.TABLE_CONSTRAINTS.CONSTRAINT_TYPE = 'FOREIGN KEY' 
-- AND information_schema.TABLE_CONSTRAINTS.TABLE_NAME = 'employee';



--  SHOW CREATE TABLE employee;



-- SELECT i.TABLE_NAME, i.CONSTRAINT_TYPE, i.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME 
-- FROM information_schema.TABLE_CONSTRAINTS i 
-- LEFT JOIN information_schema.KEY_COLUMN_USAGE k ON i.CONSTRAINT_NAME = k.CONSTRAINT_NAME 
-- WHERE i.CONSTRAINT_TYPE = 'FOREIGN KEY' 
-- AND i.TABLE_SCHEMA = DATABASE()
-- AND i.TABLE_NAME = 'position';

-- select * from INFORMATION_SCHEMA.TABLE_CONSTRAINTS i where CONSTRAINT_TYPE = 'FOREIGN KEY' AND i.TABLE_NAME = 'position';

select
    column_name as 'foreign_key',
    referenced_table_name as 'reference_table',
    referenced_column_name as 'reference_column'
from
    information_schema.key_column_usage
where
    referenced_table_name is not null
    and table_schema = 'employee_tracker_db'
    and table_name = 'employee';