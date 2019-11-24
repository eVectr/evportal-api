var mongoose = require('mongoose')
var TicketAssign = new mongoose.Schema({
  Id: String,
  Name: String
})
module.exports = mongoose.model('TicketAssign', TicketAssign)
