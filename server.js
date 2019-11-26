//const mongoose = require('mongoose').set('debug', true);
const mongoose = require('mongoose');
const express = require('express');
const socketIo = require("socket.io");
const dotenv = require('dotenv'); // Load the project root .env config vars
var jwt = require('jsonwebtoken');
dotenv.config();

console.log(`Starting EV-Portal on Port ${process.env.PORT}`);

var app = express();
var bodyParser = require('body-parser');
const server = require('http').createServer(app);

// Socket IO
const io = socketIo(server);
io.on("connection", socket => {
    console.log("New client connected");

    //Here we listen on a new namespace called "incoming data"
    socket.on("incoming data", (data)=>{
        //Here we broadcast it out to all other sockets EXCLUDING the socket which sent us the data
       socket.broadcast.emit("outgoing data", {num: data});
    });

    //A special namespace "disconnect" for when a client disconnects
    socket.on("disconnect", () => console.log("Client disconnected"));
});

app.use(express.static('uploads'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.disable('x-powered-by'); // Do not announce we are using express

// Mongo Connection
mongoose.connect(process.env.MONGO_CONN_STR, (err) => {
	if (err) throw err
	console.log('Mongoose connected')
});


// Mongo Schemas
require('./db/evcontactform.js');
require('./db/evcontactreply.js');

// MySQL Conneciton
var mysqlConn = require('./mysql.js');
var User = require('./models/User.js'); // User MySQL Model Functions

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	next();
});

// CHECK AUTH FUNCTION
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

// AUTH CHECK
app.post('/auth/check', checkAuth, (req,res) => {
	console.log("RECEIVED AUTH CHECK POST");
	var token = req.headers['x-access-token'];
	jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
		if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		res.status(200).send({auth: true, roles: decoded.roles});
		return false;
	});
});

// USERS - ALL USERS
app.get('/getusers', checkAuth, (req, res) => {
	console.log("GET REQUEST /getusers");
	User.getAllUsers(function(err, users) {
		if(users.constructor === Array && users.length > 0) {
			//console.log(JSON.stringify(rows));
			res.status(200).send({ success: true, data: JSON.stringify(users) });
		} else {
			console.log("getusers FAILED");
			res.send({ success: false });
		}
	});
});

// GET USERS BY ROLE
app.get('/users/role', checkAuth, (req, res) => {
	console.log("GET REQUEST /users/role");
	if (req.query.name === "support_agent") {
		User.getUsersByRole(function(err, users) {
			if(users.constructor === Array && users.length > 0) {
				res.status(200).send({ success: true, data: JSON.stringify(users) });
			} else {
				console.log("getusers FAILED");
				res.send({ success: false });
			}
		});
	}
});

// GET SINGLE USER
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

// GET SINGLE USER'S ROLE
app.get('/getuserroles', checkAuth, (req, res) => {
	console.log("GET REQUEST /getuserroles")
	// MySQL User Select
	if(isNaN(req.query.id)) {
		res.send({ error: "id parameter not numeric" });
		return false;
	}

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
	ContactForm.find({Status: "Open"}).sort('date').exec(function (err, docs) {
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
	console.log("GET REQUEST /support/ticket");
	ContactForm.find({'caseNo':req.query.caseNo}, function (err, ticketData) {
		if (err) {
			console.log('error');
			res.send(err);
		} else {
			// GET TICKET REPLIES
			//console.log(ticketData);
			ContactReply.find({'caseNo':req.query.caseNo}, function (err, replyData) {
				if (err) {
					console.log('error');
					res.send(err);
				} else {
					var user = {};
					if(ticketData[0].Name === undefined && ticketData[0].UID !== undefined) {
						// Lets pull in name and shit from MySQL until it's part of the mongo data
						var sql = "SELECT `user_id`, `display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users WHERE `user_id` = "+ticketData[0].UID;
						mysqlConn.query(sql, function(err, userRow, fields) {
							if(err) {
								console.log(err);
								return false;
							}
							if(userRow.constructor === Array && userRow.length > 0) {
								res.send({ success: true, data: JSON.stringify(ticketData), user: JSON.stringify(userRow[0]), replies: JSON.stringify(replyData) });
							}
						});
					} else {
						res.send({ success: true, data: JSON.stringify(ticketData), user: {}, replies: JSON.stringify(replyData) });
					}
				}
			});
		}
	});
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

// REPLY TO A TICKET
app.post('/support/ticket/reply', checkAuth, (req, res) => {
	var token = req.headers['x-access-token'];
	let caseNo = req.body.caseNo;
	let message = req.body.message;

	if(message.length <= 2) {

	}
	console.log('POST TICKET REPLY: '+caseNo);
	if(typeof caseNo === 'string' && caseNo.length >=5) {
		jwt.verify(token, process.env.JWT_SECRET, function(err, tokenDecoded) {
			if (err) {res.status(401).send({ auth: false, message: 'Failed to authenticate token.' }); return}
			
			// Let's perform additional role check here; allow support, support managers and super admins to reply to a support ticket
			var userRoles = tokenDecoded.roles;
			if(userRoles.includes("super_admin") || userRoles.includes("support_super") || userRoles.includes("support")) {
				ContactReply.create({caseNo: caseNo, senderName: "EV Support", UserId: 0, message: message}, (error, result) => {
					if (!!error) {
						console.log(error);
						res.status(500).send({ success: false });
					}
					
					else {res.status(200).send({ success: true }); return}
				});
			} else {
				res.status(401).send({ success: false });
				return
			}
		});
	}
});

// UPDATE TICKET STATUS
app.post('/support/ticket/update', checkAuth, (req, res) => {
	var token = req.headers['x-access-token'];
	let caseNo = req.body.caseNo;
	let status = req.body.status;

	if(status.length <= 2) {

	}
	console.log('POST TICKET UPDATE STATUS: '+caseNo);
	if(typeof caseNo === 'string' && caseNo.length >=5) {
		jwt.verify(token, process.env.JWT_SECRET, function(err, tokenDecoded) {
			if (err) {res.status(401).send({ auth: false, message: 'Failed to authenticate token.' }); return}
			
			// Let's perform additional role check here; allow support, support managers and super admins to reply to a support ticket
			var userRoles = tokenDecoded.roles;
			if(userRoles.includes("super_admin") || userRoles.includes("support_super") || userRoles.includes("support")) {
				const filter = { caseNo: caseNo };
				const update = { Status: status };
				ContactForm.findOneAndUpdate(filter, update, function(err, doc) {
					if (err) return res.status(500).send({ success: false });
					return res.status(200).send({ success: true });
				});
			} else {
				return res.status(401).send({ success: false });
			}
		});
	}
});

// GET SUPPORT AGENTS
app.get('/getagents', checkAuth, (req, res) => {
	console.log("GET REQUEST /getagents");
	User.getSupportAgents(function(err, users) {
		if(users.constructor === Array && users.length > 0) {
			res.status(200).send({ success: true, data: JSON.stringify(users) });
		} else {
			console.log("getusers FAILED");
			res.send({ success: false });
		}
	});
});

server.listen(process.env.PORT, () => {
	console.log('server connected')
});