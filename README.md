## Installation and Configuration

To install, run

### `npm install`

Create a .env file in the root project directory, add and modify the following configuration:
```
PORT=1234
MONGO_CONN_STR=mongodb://mongouser:mongopassword@mongohost:27017/database
JWT_SECRET=provideauniqueseceretstringhere
MYSQL_HOST=mysqlhost
MYSQL_DB=mysqldb
MYSQL_USER=mysqluser
MYSQL_PASS=mysqlpass
```
## Starting the server

In the project directory, you can run:

### `npm start`