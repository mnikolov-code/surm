// importData.js
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const UserRole = require('./models/UserRole');

mongoose.connect('mongodb://127.0.0.1:27017/softwareRoles');


const filePath = path.join(__dirname, 'data', 'user_roles.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const softwareNames = [];
const pcInvs = [];
const labNumbers = [];

// Extract software + hardware meta
for (let col = 0; col < data[0].length; col++) {
  if (data[0][col] === 'Software') {
    softwareNames.push(data[0][col + 1]);
    pcInvs.push(data[2][col + 1] || '/');
    labNumbers.push(data[3][col + 1] || '/');
  }
}

const roleStartRow = 18; // this is where role headers start
const headers = data[roleStartRow];

const entries = [];

for (let i = roleStartRow + 1; i < data.length; i++) {
  const row = data[i];
  const username = row[2];
  const user = row[1];
  const department = row[3];

  for (let col = 0; col < row.length; col++) {
    if (row[col] && row[col].toString().toLowerCase() === 'x') {
      const roleName = headers[col];
      let swIndex = -1;
      // Find to which software this role belongs
      for (let s = 0; s < softwareNames.length; s++) {
        const baseCol = 5 + s * 15; // Assuming 15 role columns per software
        if (col >= baseCol && col < baseCol + 15) {
          swIndex = s;
          break;
        }
      }

      if (swIndex !== -1) {
        entries.push({
          username,
          user,
          department,
          software: softwareNames[swIndex],
          role: roleName,
          labNumber: labNumbers[swIndex],
          pcInv: pcInvs[swIndex],
        });
      }
    }
  }
}

async function importData() {
  await UserRole.deleteMany({});
  await UserRole.insertMany(entries);
  console.log('✅ Imported', entries.length, 'user-role records!');
  mongoose.disconnect();
}

importData().catch(console.error);
