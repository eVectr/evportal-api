var mongoose = require('mongoose')
var UserMessagelogs = new mongoose.Schema({
  Id: String,
  SenderName: String,
  ReceiverName: String,
  Message: String,
  Date: Date
})
module.exports = mongoose.model('UserMessagelogs', UserMessagelogs)
