
const mongoose = require('mongoose');
const express = require('express');
//const nodemailer = require('nodemailer');
const mysql = require('mysql');
//const fs = require('fs');

// Load the project root .env config vars
const dotenv = require('dotenv');
dotenv.config();

console.log(`Starting EV-Portal on Port ${process.env.PORT}`);

var jwt = require('jsonwebtoken');
require('./db/evcontactform.js');

var app = express();
var bodyParser = require('body-parser');
const server = require('http').createServer(app);

app.use(express.static('uploads'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mongo Connection
mongoose.connect(process.env.MONGO_CONN_STR, (err) => {
	if (err) throw err
	console.log('Mongoose connected')
});

// MySQL Conneciton
var mysqlConn = mysql.createConnection({
	host     : process.env.MYSQL_HOST,
	database : process.env.MYSQL_DB,
	user     : process.env.MYSQL_USER,
	password : process.env.MYSQL_PASS,
});

//api(app)

app.disable('x-powered-by'); // Do not announce we are using express

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	next();
});

app.get('/test', (req, res) => {
	console.log("get test request");
	var result = [
		{ value: 'ocean', label: 'Ocean', color: '#00B8D9', isFixed: true },
		{ value: 'blue', label: 'Blue', color: '#0052CC', isDisabled: true },
		{ value: 'purple', label: 'Purple', color: '#5243AA' },
		{ value: 'red', label: 'Red', color: '#FF5630', isFixed: true },
		{ value: 'orange', label: 'Orange', color: '#FF8B00' },
		{ value: 'yellow', label: 'Yellow', color: '#FFC400' },
		{ value: 'green', label: 'Green', color: '#36B37E' },
		{ value: 'forest', label: 'Forest', color: '#00875A' },
		{ value: 'slate', label: 'Slate', color: '#253858' },
		{ value: 'silver', label: 'Silver', color: '#666666' },
	];
	res.status(200).send(result);
});

// LOGIN ROUTE
app.post('/login', (req, res) => {
	console.log("RECEIVED AUTH POST");
	let email = req.body.email;
	let password = req.body.password;
	let hasRole = false;

	var sql = "SELECT `user_id`,`display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users WHERE `email_address` = ? AND `user_pass` = md5(?)";
	mysqlConn.query(sql, [ email, password ], function(err, rows, fields) {
		if(err) {
			console.log(err);
			res.send({ check: false, data: {} });
		}
		
		if(rows.constructor === Array && rows.length > 0) {
			if(rows[0].email_address.length > 3) {
				// Check to make sure user has the required roles
				//var roleSQL = "SELECT `role_id` FROM `user_roles` WHERE `user_id` = ?";
				var roleSQL = "SELECT types.role_name FROM user_roles roles LEFT JOIN role_types types ON roles.role_id = types.id WHERE `user_id` = ?";
				mysqlConn.query(roleSQL, [ rows[0].user_id ], function(err, roleRows, fields) {
					if(err) {
						console.log(err);
						res.send({ check: false, data: {} });
					}
					if(roleRows.constructor === Array && roleRows.length > 0) {
						for (var i = 0; i < roleRows.length; i++) {
							if(roleRows[i].role_name === "super_admin" || roleRows[i].role_name === "support_agent" || roleRows[i].role_name === "support_super") {
								hasRole = true;
							}
						}

						let roleList = roleRows.map(({ role_name }) => role_name);
						//console.log(roleList);

						if(hasRole === true) {
							console.log("User Successfully Authenticated");
							// CREATE SESSION TOKEN
							var token = jwt.sign({
								id: rows[0].id,
								roles: JSON.stringify(roleList)
							}, process.env.JWT_SECRET, {
								expiresIn: 86400 // expires in 24 hours
							});
							console.log("TOKEN CREATED: "+token);
							res.send({ check: true, token: token, roles: JSON.stringify(roleRows) });
						} else {
							res.send({ check: false, data: {} });
						}
					} else {
						console.log("User FAILED authentication (No roles found for user)");
						//console.log(roleRows);
						res.send({ check: false, data: {} });
					}
				});
			} else {
				console.log("User FAILED authentication (Bad Email/Password)");
				res.send({ check: false, data: {} });
			}
		} else {
			console.log("User FAILED authentication (No valid user/pass found)");
			res.send({ check: false, data: {} });
		}
	});
});

function checkAuth(req, res, next) {
	var token = req.headers['x-access-token'];
	jwt.verify(token, process.env.JWT_SECRET, function(err, tokenDecoded) {
		if (err) {
			console.log("A token has failed authentication for the request.");
			return res.status(401).send({ auth: false, message: 'Failed to authenticate token.' });
		}
		return next();
	});
	
	// IF A USER ISN'T LOGGED IN return 401 status code
	//res.status(401).send({ auth: false, message: 'Invalid session' });
	return false;
}

// AUTH CHECK --- REMOVE THIS ROUTE AND FUNCTIONALITY ON FRONT-END (now handled by checkAuth middleware)
app.post('/auth/check', checkAuth, (req,res) => {
	console.log("RECEIVED AUTH CHECK POST");
	var token = req.headers['x-access-token'];
	jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
		if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		res.status(200).send({auth: true, roles: decoded.roles});
		return false;
	});
});

// USERS
app.get('/getusers', checkAuth, (req, res) => {
	console.log("GET REQUEST /getusers")
	// MySQL User Select
	var sql = "SELECT `user_id`, `display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users";
	mysqlConn.query(sql, function(err, rows, fields) {
		if(err) {
			console.log(err);
			res.send({ success: false });
		}
		if(rows.constructor === Array && rows.length > 0) {
			//console.log(JSON.stringify(rows));
			res.status(200).send({ success: true, data: JSON.stringify(rows) });
		} else {
			console.log("getusers FAILED");
			res.send({ success: false });
		}
	});
});


// GET USERS BY ROLE
app.get('/users/role', checkAuth, (req, res) => {
	if (req.query.name === "support_agent") {
		var sql = "SELECT users.user_id,users.display_name,users.first_name,users.last_name FROM users WHERE user_id IN (SELECT user_roles.user_id FROM user_roles WHERE role_id=1)";
	}
	
	mysqlConn.query(sql, function(err, rows, fields) {
		if(err) {
			console.log(err);
			res.send({ error: "DB Query Failed" });
			return false;
		}
		if(rows.constructor === Array && rows.length > 0) {
			console.log(JSON.stringify(rows));
			res.send({ success: true, data: JSON.stringify(rows) });
		} else {
			console.log("get users by role FAILED");
			res.send({ success: false });
		}
	});
	return;
});
app.get('/getuser', checkAuth, (req,res) => {
	console.log("GET REQUEST /getuser");
	if(isNaN(req.query.id)) {
		res.send({ error: "id parameter not numeric" });
		return false;
	}
	// MySQL User Select
	var sql = "SELECT `user_id`, `display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users WHERE `user_id` = "+req.query.id;
	mysqlConn.query(sql, function(err, rows, fields) {
		if(err) {
			console.log(err);
			res.send({ success: false });
		}
		if(rows.constructor === Array && rows.length > 0) {
			var user_roles = {};
			//console.log(JSON.stringify(rows));
			var sql = "SELECT * FROM user_roles roles LEFT JOIN role_types types ON roles.role_id = types.id WHERE roles.user_id = "+req.query.id;
			mysqlConn.query(sql, function(err, roles, fields) {
				if(roles.constructor === Array && roles.length > 0) {
					//console.log(JSON.stringify(roles));
					var user_roles = roles;
				}
				res.send({ success: true, data: JSON.stringify(rows), roles: JSON.stringify(user_roles) });
			});
			
		} else {
			console.log("getusers FAILED");
			res.send({ success: false });
		}
	});
});

app.get('/getuserroles', checkAuth, (req, res) => {
	console.log("GET REQUEST /getuserroles")
	// MySQL User Select
	if(isNaN(req.query.id)) {
		res.send({ error: "id parameter not numeric" });
		return false;
	}



	//var sql = "SELECT * FROM user_roles where user_id = "+req.query.id;
	
	//var sql = "SELECT role_types.name AS user, role_types.role_name AS favorite FROM user_roles JOIN role_types ON user_roles.role_id = role_types.id";
	

	var sql = "SELECT role_types.role_name FROM role_types INNER JOIN user_roles ON role_types.id = user_roles.role_id";
	mysqlConn.query(sql, function(err, rows, fields) {
		if(err) {
			console.log(err);
			res.send({ error: "DB Query Failed" });
			return false;
		}
		if(rows.constructor === Array && rows.length > 0) {
			console.log(JSON.stringify(rows));
			res.send({ success: true, data: JSON.stringify(rows) });
		} else {
			console.log("getuserroles FAILED");
			res.send({ success: false });
		}
	});
});

// SET ROLE
app.post('/user/setrole', checkAuth, (req,res) => {
	console.log("RECEIVED SET ROLE POST");
	let user_id = req.body.user_id;
	let role_name = req.body.role_name;
	let enabled = req.body.enabled;
	console.log(user_id+", "+role_name+", "+enabled);
	
	// If enabling, check role doesn't already exist
	if(enabled===true) {
		// Make Sure role_name is valid
		var roleSQL = "INSERT INTO user_roles(user_id, role_id) VALUES ("+user_id+", (SELECT id FROM role_types WHERE role_name = '"+role_name+"'));";
		mysqlConn.query(roleSQL, function(err, result, fields) {
			if(err) {
				console.log(err);
				res.send({ success: false });
				return false;
			}
			console.log("INSERTED USER ROLE");
			res.send({ success: true });
		});
	}
	// If disabling, check role exists to begin with
	if(enabled===false) {
		var roleSQL = "DELETE FROM user_roles WHERE user_id="+user_id+" AND role_id = (SELECT id FROM role_types WHERE role_name = '"+role_name+"');";
		mysqlConn.query(roleSQL, function(err, result, fields) {
			if(err) {
				console.log(err);
				res.send({ success: false });
			}
			console.log("DELETED USER ROLE");
			res.send({ success: true });
		});
	}

	//res.send({ success: false });
});

// GET ALL TICKETS
app.get('/support/tickets', checkAuth, (req, res) => {
	ContactForm.find({}).sort('date').exec(function (err, docs) {
		if (err) {
			console.log('error')
			res.send(err)
		} else {
			//console.log(docs)
			res.send({ success: true, data: JSON.stringify(docs) });
		}
	});
});

// GET SINGLE TICKET
app.get('/support/ticket', checkAuth, (req, res) => {
	ContactForm.find({'caseNo':req.query.caseNo}, function (err, docs) {
		if (err) {
			console.log('error')
			res.send(err)
		} else {
			//console.log(docs);
			var user = {};
			if(docs[0].Name === undefined && docs[0].UID !== undefined) {
				// Lets pull in name and shit from MySQL until it's part of the mongo data
				var sql = "SELECT `user_id`, `display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users WHERE `user_id` = "+docs[0].UID;
				mysqlConn.query(sql, function(err, userRow, fields) {
					if(err) {
						console.log(err);
						return false;
					}
					if(userRow.constructor === Array && userRow.length > 0) {
						res.send({ success: true, data: JSON.stringify(docs), user: JSON.stringify(userRow[0]) });
						/*console.log("TICKET ISSUER USER DETAILS:");
						console.log(user);*/
						//return true;
					}
				});
			} else {
				res.send({ success: true, data: JSON.stringify(docs), user: {} });
			}
		}
	})
});

// DELETE A TICKET
app.post('/support/ticket/delete', checkAuth, (req, res) => {
	var token = req.headers['x-access-token'];
	let caseNo = req.body.caseNo;
	if(typeof caseNo === 'string' && caseNo.length >=5) {
		jwt.verify(token, process.env.JWT_SECRET, function(err, tokenDecoded) {
			if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
			
			// Let's perform additional role check here; allow support managers and super admins to delete support ticket
			var userRoles = tokenDecoded.roles;
			if(userRoles.includes("super_admin") || userRoles.includes("support_super")) {
				ContactForm.deleteOne({ caseNo: caseNo }, function (err) {
					if (err) {
						console.log(err);
						res.status(200).send({ success: false });
					}
				});
			}
			//console.log(userRoles);
			console.log('TICKET DELETE: '+caseNo);
			res.status(200).send({ success: true });
			return;
		});
	}
});

// GET SUPPORT AGENTS
app.get('/getagents', checkAuth, (req, res) => {
	console.log("GET REQUEST /getagents");
	// MySQL User Select
	var sql = "SELECT `user_id`, `display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users WHERE user_id IN ((SELECT user_id FROM user_roles WHERE role_id = 1));";
	mysqlConn.query(sql, function(err, rows, fields) {
		if(err) {
			console.log(err);
			res.send({ success: false });
		}
		if(rows.constructor === Array && rows.length > 0) {
			//console.log(JSON.stringify(rows));
			res.status(200).send({ success: true, data: JSON.stringify(rows) });
		} else {
			console.log("getagents query with no results");
			//res.status(200).send({ success: true, data: JSON.stringify({}) });
			res.send({ success: false });
		}
	});
});

server.listen(process.env.PORT, () => {
	console.log('server connected')
});