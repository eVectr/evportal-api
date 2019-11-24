var mongoose = require('mongoose')
var SupportLogs = new mongoose.Schema({
  Id: String,
  Log: String,
  Date: Date
})
module.exports = mongoose.model('SupportLogs', SupportLogs)
