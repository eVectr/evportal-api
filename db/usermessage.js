var mongoose = require('mongoose')

var UserMessage = new mongoose.Schema({
  Id: String,
  Subject: String,
  SenderId: String,
  SenderName: String,
  ReceiverId: [],
  ReceiverName: [],
  Message: String,
  Date: Date,
  Document: []
})
module.exports = mongoose.model('UserMessage', UserMessage)
