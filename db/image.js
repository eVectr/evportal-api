var mongoose = require('mongoose');

var Image = new mongoose.Schema({
    Image: String
})

module.exports = mongoose.model('Image',Image)