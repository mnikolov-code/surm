const mongoose = require('mongoose');

const UserRoleSchema = new mongoose.Schema({
  username: String,
  user: String,
  department: String,
  software: String,
  role: String,
  labNumber: String,
  pcInv: String
});

module.exports = mongoose.model('UserRole', UserRoleSchema);
