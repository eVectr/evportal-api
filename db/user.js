var mongoose = require('mongoose')

var UserSchema = new mongoose.Schema({
  Name: String,
  Password: String,
  Type: String
})

module.exports = mongoose.model('UserSchema', UserSchema)
