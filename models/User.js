'user strict';
var sql = require('../mysqlConn.js');
var User = function(user){
    this.user = user.user;
    this.status = user.status;
    this.created_at = new Date();
};

User.authUser = function(email,password,result) {
	var query = "SELECT `user_id`,`display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users WHERE `email_address` = ? AND `user_pass` = md5(?)";
	sql.query(query, [ email, password ], function(err, rows, fields) {
		if(err) {
			console.log("error: ", err);
			result(err, null);
		}
		else {
			result(null, rows);
		}
	});
}

User.getUserByID = function(user_id,result) {
	var query = "SELECT `user_id`, `display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users  WHERE `user_id` = ?";
	sql.query(query, [ user_id ], function(err, rows, fields) {
		if(err) {
			console.log("error: ", err);
			result(err, null);
			return;
		}
		else {
			result(null, rows);
		}
	});
}

User.getAllUsers = function (result) {
	sql.query("SELECT `user_id`, `display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM `users`", function (err, res) {
		if(err) {
			console.log("error: ", err);
			result(err, null);
		}
		else {
			result(null, res);
		}
	});
};

User.getUsersByRole = function (result) {
	sql.query("SELECT users.user_id,users.display_name,users.first_name,users.last_name FROM users WHERE user_id IN (SELECT user_roles.user_id FROM user_roles WHERE role_id=1)", function (err, res) {
		if(err) {
			console.log("error: ", err);
			result(err, null);
		}
		else {
			result(null, res);
		}
	});
};

User.getSupportAgents = function (result) {
	sql.query("SELECT `user_id`, `display_name`,`first_name`,`last_name`,`birth_date`,`email_address` FROM users WHERE user_id IN ((SELECT user_id FROM user_roles WHERE role_id = 1))", function (err, res) {
		if(err) {
			console.log("error: ", err);
			result(err, null);
		}
		else {
			result(null, res);
		}
	});
};

User.getUserRoles = function (user_id,result) {
	var roleSQL = "SELECT types.role_name FROM user_roles roles LEFT JOIN role_types types ON roles.role_id = types.id WHERE `user_id` = ?";
	sql.query(roleSQL, [ user_id ], function(err, rolesResult, fields) {
		if(err) {
			console.log(err);
			//res.send({ check: false, data: {} });
			return err;
		} else {
			result(null, rolesResult);
		}
		
	});
};

User.insertUserRole = function(user_id, role_name, result) {
	var roleSQL = "INSERT INTO user_roles(user_id, role_id) VALUES (?, (SELECT id FROM role_types WHERE role_name = ?));";
	sql.query(roleSQL, [ user_id, role_name ], function(err, rolesResult, fields) {
		if(err) {
			console.log(err);
			return err;
		} else {
			result(null, rolesResult);
		}
	});
}

User.deleteUserRole = function(user_id, role_name, result) {
	var roleSQL = "DELETE FROM user_roles WHERE user_id=? AND role_id = (SELECT id FROM role_types WHERE role_name = ?);";
	sql.query(roleSQL, [ user_id, role_name ], function(err, rolesResult, fields) {
		if(err) {
			console.log(err);
			return err;
		} else {
			result(null, rolesResult);
		}
	});
}
module.exports = User;