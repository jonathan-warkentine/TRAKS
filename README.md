# TRAKS
A Simple MySQL Database CLI Built on Node.js

  # Readme Generator

  &nbsp;  

  ---
  ## Description:

  This app streamlines MySQL database interactions. Rather than the clunky, error-prone MySQL command-line, zip around exploring and tweaking your database with this interactive node-based CLI! Using TRAK's fully interactive interface, you can: create/print/update/delete databases, tables, and individual rows, as well as add/remove table fields, and even join tables in any selected database. 

  ![Demo Screenshot](./assets/demo%20screenshot.png)

  &nbsp;  

  ---
  ## Table of Contents:

  - [Installation](#installation)
  - [Usage](#usage)
  - [License](#license)
  - [Contributing](#contributing)
  - [Tests](#tests)
  - [Questions](#questions)

  &nbsp;  

  ---
  ## Installation:

  You must have [node installed](https://nodejs.org/en/download/) on your machine in order to run this app. Run the command `npm i` to install dependencies, which include:
- [ ] console.table
- [ ] mysql2
- [ ] dotenv
- [ ] inquirer
- [ ] asciiart-logo

In addition, you must have [MySQL installed](https://dev.mysql.com/doc/mysql-installation-excerpt/5.7/en/) on your machine, with at least one database. 

  &nbsp;  

  ---
  ## Usage:
  
  This app's usage should be intuitive and self-explanatory. For a complete walkthrough, check out *[this video link](https://youtu.be/O0_1-cKZGAs).*

  TRAKS connects to a MySQL database via the mysql2 npm package. The connection is managed via a .env file, but this is abstracted through a series of setup prompts: the user simply opens the app via `node index.js`, enters their MySQL credentials as prompted one time, and the credentials are saved to the .env file and not needed again.

  After this initial, one-time MySQL setup completes, the user is presented with a welcome splash screen. The subsequent prompts guide a user through either selecting or creating a database (the user can also rename or delete a database, if they wish).  

  ![Choose Database](./assets/select%20database.png)

  After selecting and opening a database, a connection is established to the selected database. The user is then prompted to choose or create a table, or else go back to the database menu.
  
  ![Choose Table](./assets/select%20table.png)

  After selecting a table, the user has several options: **opening** the table (opens an interactive menu in which they can select individual rows), **printing** the table (prints a neatly formatted table to the console), **joining** the table (ask the user to select a foreign key to join on and left joins the table to the selected table, neatly printing the result), **renaming** the table, **adding a customized field** to the table, **removing a field** from the table, or **deleting** the table entirely (after a confirmation prompt to prevent accidental deletions, and validation prevents the deletion of either fields or tables with existing foreign key constraints).

  ![Choose Table Mode](./assets/choose%20table%20mode.png)

  If the user **opens** the table, they are presented with an interactive set of rows. They can **choose** one of the existing rows, **create a new row**, or go back to the table menu. 

  ![Choose Row](./assets/choose%20row.png)

  If the user **chooses** one of the rows, they can choose to **print** that row, **update** that row, **delete** that row, or return to the row selection menu. 

  ![Choose Row Mode](./assets/select%20row%20mode.png)

  If the user chooses to **update** a row, they are prompted to select all of the fields within the row that they desire to update. They are then prompted for values for those selected fields. All foreign keys automatically look up the foreign constraints and offer the user a choice of rows from the referenced table.

  ![Update Row](./assets/update%20row.png)

   All inputs are validated according to type and MySQL entry constraints as necessary, rejecting user inputs with an explanation and the ability to try again rather than throwing an error and crashing the program.

   To report a bug or suggest improvements to the user experience, see the [questions section](#questions) below.

  &nbsp;  

  ---
  ---
  #### *License:*

  [![License: IPL 1.0](https://img.shields.io/badge/License-IPL_1.0-blue.svg)](https://opensource.org/licenses/MIT)

  &nbsp;  

  ---
  #### *How to Contribute:*

  Please see the contact information in the ‘Questions’ section.

  &nbsp;  

  ---

  #### *Tests:*

  No tests have been deployed at this time.

  &nbsp;  

  ---

  #### *Questions?*

  [Find me on GitHub: jonathan-warkentine](https://github.com/jonathan-warkentine)

  Or send an email: [jonathan.warkentine@gmail.com](mailto:jonathan.warkentine@gmail.com)
  
### Outstanding Improvements/Bug Fixes
- [ ] Is there a "local key" equivalent to a foreign key in MySQL?