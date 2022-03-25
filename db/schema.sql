DROP DATABASE IF EXISTS employee_tracker_db;
CREATE DATABASE employee_tracker_db;

USE employee_tracker_db;

CREATE TABLE department (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, 
    name VARCHAR(30)
);

CREATE TABLE position (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, 
    title VARCHAR(30), 
    salary DECIMAL, 
    department_id INT,
    FOREIGN KEY (department_id)
    REFERENCES department(id)
);

CREATE TABLE employee (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, 
    first_name VARCHAR(30),
    last_name VARCHAR(30),
    manager_id INT,
    position_id INT,
    FOREIGN KEY (position_id)
    REFERENCES `position`(id)
);
    

