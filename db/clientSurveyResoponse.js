var mongoose = require('mongoose');

var ClientSurveyResponse = new mongoose.Schema({
   UserId:String,
   Question1Response  : {
    question: { type: String },
    answer : { type: String }
   },
   Question2Response  : {
    question: { type: String },
    answer : { type: String }
   },
   Question3Response  : {
    question: { type: String },
    answer : { type: String }
   },
   Question4Response  : {
    question: { type: String },
    answer : { type: String }
   }
})

module.exports = mongoose.model('ClientSurveyResponse', ClientSurveyResponse)
