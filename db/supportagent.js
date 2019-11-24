var mongoose = require('mongoose')

var SupportAgent = new mongoose.Schema({
  FirstName: String,
  LastName: String,
  Password: String,
  Email: String,
  TicketId: [],
  TicketType: [],
  Type:String,
  Date:Date
})
module.exports = mongoose.model('SupportAgent', SupportAgent)
