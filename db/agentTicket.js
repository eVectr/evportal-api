var mongoose = require('mongoose');

var AgentTicket = new mongoose.Schema({
    Id:String,
    Ticket:String
})
module.exports = mongoose.model('AgentTicket', AgentTicket)
