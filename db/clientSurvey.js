var mongoose = require('mongoose');

var ClientSurvey = new mongoose.Schema({
    Question: String,
    Option1:{
        Option1Type: String,
        OptionValue: []
    }
})

module.exports = mongoose.model('ClientSurvey', ClientSurvey)
