const mongoose = require('mongoose');
var evConnectedUserSchema = new  mongoose.Schema({
    displayName: String,
	UserId:Number,
	status: String,
	socketID: String,
	lastUpdateDate: Date
});
ConnectedUser = mongoose.model('evConnectedUser', evConnectedUserSchema);