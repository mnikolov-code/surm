const mongoose = require('mongoose');
const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');
const UserRole = require('./models/UserRole');

mongoose.connect('mongodb://127.0.0.1:27017/software_roles', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const filePath = path.join(__dirname, 'data', 'QC - FORM000086 - Softwares-PCs-Systems-Software Roles-User Rights-Software Users.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const json = xlsx.utils.sheet_to_json(sheet, { defval: '' });

const softwareHeaders = [];
const roleMap = {};

// First pass: find all software columns and their associated roles
const headers = Object.keys(json[0]);
for (let i = 0; i < headers.length; i++) {
  if (headers[i] === 'Software') {
    const softwareName = json[0][headers[i + 1]];
    const pcInv = json[1][headers[i + 1]];
    const labNumber = json[2][headers[i + 1]];
    softwareHeaders.push({
      baseIndex: i + 1,
      software: softwareName,
      pcInv,
      labNumber,
    });
  }
}

// Second pass: map each row
const rolesToSave = [];
for (let row of json.slice(3)) {
  const user = row['User'] || '';
  const username = row['Username'] || '';
  const department = row['Department'] || '';

  for (let sh of softwareHeaders) {
    const software = sh.software || '/';
    const pcInv = sh.pcInv || '/';
    const labNumber = sh.labNumber || '/';

    for (let j = 0; j < 15; j++) {
      const roleKey = headers[sh.baseIndex + j];
      const roleVal = row[roleKey];
      if (roleVal && roleVal.toString().toLowerCase() === 'x') {
        rolesToSave.push({
          username,
          user,
          department,
          software,
          role: roleKey,
          labNumber,
          pcInv,
        });
      }
    }
  }
}

async function importData() {
  await UserRole.deleteMany({});
  await UserRole.insertMany(rolesToSave);
  console.log('✅ Data successfully imported into MongoDB');
  mongoose.disconnect();
}

importData().catch((err) => {
  console.error('❌ Import failed:', err);
});
