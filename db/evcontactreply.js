const mongoose = require('mongoose');
var evContactReplySchema = new  mongoose.Schema({
    caseNo: String,
    senderName: String,
	UserId:String,
	message: String,
	date: Date
});
ContactReply = mongoose.model('evContactReply', evContactReplySchema);