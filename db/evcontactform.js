const mongoose = require('mongoose');
var evContactFormSchema = new  mongoose.Schema({
	reasontext:String, //
	UserId:String,
	Transaction_Number: String,
	Name: String,
	Email: String,
	subject: String, //
	message: String, //
	caseNo: String, //
	Document: Array,
	Image:  Array,
	Link: Array,
	date: Date,
	Status:String,
	Template:String,
	Type:String,
	AssignTo:[],
	UID:String
});
ContactForm = mongoose.model('evContactForm', evContactFormSchema);