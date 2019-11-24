var mongoose = require('mongoose');
 
module.exports = mongoose.connect('mongodb://contact:contact@ds337377.mlab.com:37377/contact',  (err) => {
   if (err) throw err;
   console.log('DB connected');
 
});