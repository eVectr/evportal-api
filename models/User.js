'user strict';
var sql = require('../mysql.js');
var User = function(user){
    this.user = user.user;
    this.status = user.status;
    this.created_at = new Date();
};

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

module.exports = User;