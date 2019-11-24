var mongoose = require('mongoose');

var Conversation = new mongoose.Schema({
    ConvId:String,
    ReceiverId:String,
    ReceiverName:String,
    SenderId:String,
    SenderName:String,
    Message: String,
    Date: Date
})
module.exports = mongoose.model('Conversation', Conversation)
