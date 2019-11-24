var mongoose = require('mongoose')

var Messagelogs = new mongoose.Schema({
  ID: String,
  Name: String,
  Message: String,
  Type: String,
  Date: Date
})
module.exports = mongoose.model('Messagelogs', Messagelogs)
