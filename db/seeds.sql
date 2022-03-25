INSERT INTO department (name)
VALUES ("Engineering"),
       ("Marketing"),
       ("HR"),
       ("Sales");

INSERT INTO position (title, salary, department_id)
VALUES ("CTO", 150000, 1),
       ("Marketing Associate", 60000, 2);

INSERT INTO employee (first_name, last_name, position_id, manager_id)
VALUES ("Arthur", "Miller", 1, NULL),
       ("Simone", "de Beauvoir", 2, 1);