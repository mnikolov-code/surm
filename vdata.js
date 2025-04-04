const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const usersRaw = fs.readFileSync(path.join(__dirname, 'data/users.json'), 'utf-8').replace(/: NaN/g, ': ""');
const users = JSON.parse(usersRaw);

mongoose.connect('mongodb://localhost:27017/softwareRoles');

const User = mongoose.model('User', new mongoose.Schema({
  user: String,
  username: String,
  department: String
}));

const Role = mongoose.model('UserRole', new mongoose.Schema({
  username: String,
  software: String,
  role: String
}), 'user_roles');

const Software = mongoose.model('Software', new mongoose.Schema({
  name: String,
  initialRole: String
}));

async function importData() {
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/users.json')));
  const roles = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/roles_with_software.json')));
  const software = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/software.json')));

  await User.deleteMany({});
  await Role.deleteMany({});
  await Software.deleteMany({});

  await User.insertMany(users);
  await Role.insertMany(roles);
  await Software.insertMany(software);

  console.log('✅ All data imported!');
  mongoose.connection.close();
}

importData();
