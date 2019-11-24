var mongoose = require('mongoose');

var ContactForm = new mongoose.Schema({
    Reason:String,
    UserId:String,
    Transaction_Number: String,
    Name: String,
    Email: String,
    Subject: String,
    Message: String,
    Case_No: String,
    Document: Array,
    Image:  Array,
    Link: Array,
    date:Date,
    Status:String,
    Template:String,
    Type:String,
    AssignTo:[]

});

module.exports = mongoose.model('ContactForm', ContactForm)