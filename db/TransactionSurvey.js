var mongoose = require('mongoose');

var TransactionSurvey = new mongoose.Schema({
    Question: String,
    Option1:{
        Option1Type: String,
        OptionValue: []
    },
    Option2:{
        Option2Type: String,
        OptionValue: []
    },
    Option3:{
        Option3Type: String,
        OptionValue: []
    }
})

module.exports = mongoose.model('TransactionSurvey', TransactionSurvey)
