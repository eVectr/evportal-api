var mongoose = require('mongoose');

var ContactSchema = new mongoose.Schema({
    user_Id: String,
    Name: String,
    Reason: String,
    Message: String,
    Date:Date
});

module.exports = mongoose.model('ContactSchema', ContactSchema)