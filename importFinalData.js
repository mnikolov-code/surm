const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');

mongoose.connect('mongodb://localhost:27017/softwareRoles');

const Role = mongoose.model('UserRole', new mongoose.Schema({
  username: String,
  user: String,
  software: String,
  role: String,
  labNumber: String,
  pcInv: String,
  department: String
}), 'user_roles');

async function importData() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'user_roles_from_excel_final.json'), 'utf-8');
    const data = JSON.parse(raw);

    await Role.deleteMany({});
    await Role.insertMany(data);

    console.log(`✅ Imported ${data.length} entries!`);
  } catch (err) {
    console.error('❌ Import failed:', err);
  } finally {
    mongoose.connection.close();
  }
}

importData();
