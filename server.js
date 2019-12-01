//const mongoose = require('mongoose').set('debug', true);
const mongoose = require('mongoose');
const express = require('express');
const socketIo = require("socket.io");
const dotenv = require('dotenv'); // Load the project root .env config vars
const fs = require('fs');
var jwt = require('jsonwebtoken');
dotenv.config();

console.log(`Starting EV-Portal on Port ${process.env.PORT}`);

var app = express();
var bodyParser = require('body-parser');

var useSSL = false;
// HTTPS
const server = require('https').createServer({
	/* Let's Encrypt Certs */
	key: fs.readFileSync('privkey.pem'),
	cert: fs.readFileSync('cert.pem'),
	ca: fs.readFileSync('chain.pem'),
}, app);

// HTTP
//const server = require('http').createServer(app);

// Mongo Connection
mongoose.connect(process.env.MONGO_CONN_STR, (err) => {
	if (err) throw err;
	console.log('Mongoose connected');
});

// Mongo Schemas
require('./db/evcontactform.js');
require('./db/evcontactreply.js');
require('./db/evconnecteduser.js');

// Socket Server
if(process.env.SOCKET_ENABLED==="true") {
	// Flush the connected users mongo data
	ConnectedUser.remove({},(error, result) => {
		if(!error) {
			console.log("Flushed connected users from evconnectedusers collection");
		}
	});

	// Socket IO
	const io = socketIo(server);
	function postAuthenticate(socket, data) {
		var token = data.token;
		jwt.verify(token, process.env.JWT_SECRET, function(err, tokenDecoded) {
			
			// JWT Error
			if (err) {
				console.log("(SOCKET) A token has failed authentication for postAuthenticate");
				return;
			}
			// Mongo Insert
			ConnectedUser.create({
				displayName: tokenDecoded.first_name+' '+tokenDecoded.last_name,
				UserId:tokenDecoded.id,
				status: "Online",
				socketID: socket.id,
				lastUpdateDate: Date()
			}, (error, result) => {
				if(error) {
					return false;
				}
				console.log("Added user to evconnectedusers collection. SocketID: ", socket.id);
				// Mongo Find
				ConnectedUser.find({},{ socketID: 1, UserId: 1, displayName: 1 },(error, docs) => {
					if(!error) {
						io.emit("device connected", docs);
					}
				});
			});
		});
	}
	require('socketio-auth') (io, {
		authenticate: function (socket, data, callback) {
			//get credentials sent by the client
			var token = data.token;
			jwt.verify(token, process.env.JWT_SECRET, function(err, tokenDecoded) {
				// JWT Error
				if (err) {
					console.log("(SOCKET) A token has failed authentication for the request.");
					return callback(err);
				}
				// Authenticated
				console.log("(SOCKET) Client Connected", socket.id);
				return callback(null, true);
			});
		},
		postAuthenticate,
		disconnect: function (socket, data, callback) {
			var socketID = socket.id;
			ConnectedUser.deleteOne({ socketID: socketID }, (error, result) => {
				if(!error) {
					console.log("Removed user from evconnectedusers collection, socket ID "+socketID+". Result:");
					console.log(result);
					ConnectedUser.find({},{ socketID: 1, UserId: 1, displayName: 1 },(error, docs) => {
						if(!error) {
							io.emit("device disconnected", docs);
						}
					});
				}
			});
		}
	});
}

app.use(express.static('uploads'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.disable('x-powered-by'); // Do not announce we are using express

// MySQL Conneciton
var User = require('./models/User.js'); // MySQL User Model

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
	return false;
}

// LOGIN ROUTE
app.post('/login', (req, res) => {
	console.log("RECEIVED AUTH POST");
	let email = req.body.email;
	let password = req.body.password;
	let hasRole = false;

	
	var sql = "SELECT `user_id`,`display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users WHERE `email_address` = ? AND `user_pass` = md5(?)";
	User.authUser(req.body.email,req.body.password,function(error, userResult) {
		if(error) {
			console.log(error);
			res.send({ check: false, data: {} });
			return;
		}
		if(userResult.constructor === Array && userResult.length > 0) {
			if(userResult[0].email_address.length > 3) {
				// Check to make sure user has the required roles
				User.getUserRoles(userResult[0].user_id,function(error,rolesResult) {
					if(error) {
						console.log(error);
						res.send({ check: false, data: {} });
						return;
					}
					if(rolesResult.constructor === Array && rolesResult.length > 0) {
						for (var i = 0; i < rolesResult.length; i++) {
							if(rolesResult[i].role_name === "super_admin" || rolesResult[i].role_name === "support_agent" || rolesResult[i].role_name === "support_super") {
								hasRole = true;
							}
						}
						let roleList = rolesResult.map(({ role_name }) => role_name);
						if(hasRole === true) {
							console.log("User Successfully Authenticated");
							// CREATE SESSION TOKEN
							var token = jwt.sign({
								id: userResult[0].user_id,
								first_name: userResult[0].first_name,
								last_name: userResult[0].last_name,
								roles: JSON.stringify(roleList)
							}, process.env.JWT_SECRET, {
								expiresIn: 86400 // expires in 24 hours
							});
							console.log("TOKEN CREATED: "+token);
							res.send({ check: true, token: token, roles: JSON.stringify(rolesResult) });
						} else {
							res.send({ check: false, data: {} });
						}
					} else {
						console.log("User FAILED authentication (No roles found for user)");
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
	User.getUserByID(req.query.id,function(error, userResult) {
		if(error) {
			console.log(error);
			res.send({ success: false });
			return;
		}
		var user_roles = {};
		if(userResult.constructor === Array && userResult.length > 0) {
			User.getUserRoles(req.query.id, function(error, rolesResult){
				if(rolesResult.constructor === Array && rolesResult.length > 0) {
					var user_roles = rolesResult;
				}
				res.send({ success: true, data: JSON.stringify(userResult), roles: JSON.stringify(user_roles) });
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

	User.getUserRoles(req.query.id, function(error, rolesResult){
		if(error) {
			console.log(error);
			res.send({ error: "DB Query Failed" });
			return false;
		}
		if(rolesResult.constructor === Array && rolesResult.length > 0) {
			console.log(JSON.stringify(rolesResult));
			res.send({ success: true, data: JSON.stringify(rolesResult) });
		} else {
			console.log("getuserroles FAILED");
			res.send({ success: false });
		}
	});
});

// SET USER ROLE
app.post('/user/setrole', checkAuth, (req,res) => {
	console.log("RECEIVED SET ROLE POST");
	let user_id = req.body.user_id;
	let role_name = req.body.role_name;
	let enabled = req.body.enabled;
	
	// If enabling, check role doesn't already exist
	if(enabled===true) {
		// Make Sure role_name is valid
		User.insertUserRole(req.body.user_id, req.body.role_name, function(error, result) {
			if(error) {
				console.log(error);
				res.send({ success: false });
				return false;
			}
			console.log("INSERTED USER ROLE");
			res.send({ success: true });
		});
	}
	// If disabling, check role exists to begin with
	if(enabled===false) {
		User.deleteUserRole(req.body.user_id, req.body.role_name, function(error, result) {
			if(error) {
				console.log(error);
				res.send({ success: false });
				return false;
			}
			console.log("DELETED USER ROLE");
			res.send({ success: true });
		});
	}
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
						User.getUserByID(ticketData[0].UID, function(error, userResult){
							if(err) {
								console.log(err);
								return false;
							}
							if(userResult.constructor === Array && userResult.length > 0) {
								res.send({ success: true, data: JSON.stringify(ticketData), user: JSON.stringify(userResult[0]), replies: JSON.stringify(replyData) });
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

// ESCALATE TICKET

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