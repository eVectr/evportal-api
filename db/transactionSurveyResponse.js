var mongoose = require('mongoose');

var transactionSurveyResponse = new mongoose.Schema({
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
   },
   Question5Response  : {
    question: { type: String },
    answer : { type: String }
   },
   Question6Response  : {
    question: { type: String },
    answer : { type: String }
   },
   Name: String,
   PromotionFeedback: String,
   DirectFeedBack: String
})

module.exports = mongoose.model('transactionSurveyResponse', transactionSurveyResponse)
