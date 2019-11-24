var mongoose = require('mongoose')

var AdminMessage = new mongoose.Schema({
  SenderName: String,
  Subject: String,
  ReceiverId: [],
  Message: String,
  Document: [],
  isUrgent: Boolean,
  Date: Date
})
module.exports = mongoose.model('AdminMessage', AdminMessage)
