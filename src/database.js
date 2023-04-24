const mysql  = require('mysql2');

var connection = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'assessment'
});

module.exports = connection;