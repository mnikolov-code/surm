const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const multer = require('multer');

const app = express();


app.use(cors());

// Set the max request size to 50MB (or whatever limit you need)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static('public')); // Serve static files (HTML, JS, CSS)

const excelDir = path.join(__dirname, 'data');

// Configure Multer for file uploads
const upload = multer({
  dest: path.join(excelDir, 'uploads/'), // Temporary folder for uploads
  fileFilter: (req, file, cb) => {
    // Allow only Excel files (.xlsx)
    if (!file.originalname.match(/\.(xlsx)$/)) {
      return cb(new Error('Please upload an Excel file.'));
    }
    cb(null, true);
  },
});

function logToFile(message) {
  const logFilePath = path.join(__dirname, 'data', 'srv_logs.txt'); // Локација на srv_logs.txt
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString(); // Формат на датумот: YYYY-MM-DDTHH:mm:ss.sssZ
  
  // Подготовка на лог порка
  const logMessage = `[${formattedDate}] ${message}\n`;

  // Запишување на логовите во фајлот
  fs.appendFileSync(logFilePath, logMessage, 'utf8');

  // Логирање на серверската конзола исто така
  console.log(logMessage);
}

// 🟡 GET: Fetch available Excel files
app.get('/api/excel/files', (req, res) => {
  fs.readdir(excelDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read Excel directory.' });
    }

    const excelFiles = files.filter(file => file.endsWith('.xlsx'));
    res.json({ excelFiles });
  });
});


// 🟡 GET: Fetch Excel data for a specific file
app.get('/api/excel/:filename', (req, res) => {
  const filename = req.params.filename;
  const excelPath = path.join(excelDir, filename);

  try {
    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const headers = Object.keys(data[0] || {});
    res.json({ headers, data });
  } catch (err) {
    res.status(500).json({ error: `Failed to read file: ${filename}` });
  }
});

// 🟢 POST: Save updated data to Excel file (save changes)
app.post('/api/excel/save/:filename', (req, res) => {
  const filename = req.params.filename;
  const updatedData = req.body.data;  // This contains the modified data
  const excelPath = path.join(excelDir, filename);

  try {
    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Read existing data into a JSON object
    const currentData = XLSX.utils.sheet_to_json(ws, { defval: '' });

    // Ensure "Забелешка" column is updated in the existing data
    updatedData.forEach((updatedRow) => {
      if (!updatedRow.hasOwnProperty('Забелешка')) {
        updatedRow["Забелешка"] = '';  // Default empty string if not present
      }

      const rowIndex = currentData.findIndex(row => row.Number === updatedRow.Number);
      if (rowIndex !== -1) {
        currentData[rowIndex] = { ...currentData[rowIndex], ...updatedRow };
      } else {
        currentData.push(updatedRow);  // Add new row if it doesn't exist
      }
    });

    // Convert updated data back to a worksheet
    const updatedSheet = XLSX.utils.json_to_sheet(currentData);
    wb.Sheets[wb.SheetNames[0]] = updatedSheet;

    // Write the updated workbook to the file
    XLSX.writeFile(wb, excelPath);

    res.status(200).json({ success: true, data: currentData }); // Return the updated data

  } catch (err) {
    console.error('Error saving Excel file:', err);
    res.status(500).json({ error: 'Failed to save Excel file.' });
  }
});

// 🟢 POST: Add new software
app.post('/api/software/add', upload.single('softwareFile'), (req, res) => {
  const { softwareName, inventoryNumber, optionalField } = req.body;
  const file = req.file;

  // Check if file is uploaded
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Ensure software name and other fields are present
  if (!softwareName) {
    return res.status(400).json({ error: 'Software name is required' });
  }

  // Define path where the Excel file will be saved
  const uploadedFilePath = path.join(excelDir, `${softwareName}.xlsx`);

  // Move the uploaded file to the desired location
  fs.rename(file.path, uploadedFilePath, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save the file.' });
    }

    // After moving the file, continue reading the Excel data
    try {
      const wb = XLSX.readFile(uploadedFilePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Log data for testing
      console.log(`Excel file ${softwareName} uploaded and parsed successfully!`);
      console.log(data); // Log data for testing

      // Return success response with data
      res.json({
        success: true,
        message: `Software "${softwareName}" added successfully!`,
        software: {
          softwareName,
          inventoryNumber,
          optionalField,
          file: uploadedFilePath,
          data: data, // Return parsed data
        },
      });
    } catch (err) {
      console.error('Error reading Excel file:', err);
      res.status(500).json({ error: 'Failed to read Excel file.' });
    }
  });
});

// 🟡 POST: Save logs to the logs file
app.post('/api/save-logs', (req, res) => {
  const logs = req.body.logs;  // Прифаќање на логовите од клиентот
  const logFilePath = path.join(__dirname, 'data', 'logs.txt');  // Патека до лог фајлот

  // Ensure logs are in text format (if they are not strings)
  const logData = logs.map(log => {
    if (typeof log !== 'string') {
      return JSON.stringify(log);  // Convert objects to string format
    }
    return log;
  });

  // Запишување на логовите во текстуален фајл
  fs.appendFile(logFilePath, logData.join('\n') + '\n', (err) => {
    if (err) {
      console.error('Неуспешно зачувување на логови:', err);
      return res.status(500).json({ error: 'Failed to save logs' });
    }
    res.json({ success: true });
  });
});


// 🟡 GET: Fetch logs from the logs file
app.get('/api/logs', (req, res) => {
  const logFilePath = path.join(__dirname, 'data', 'logs.txt'); // Define the path to the log file

  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read logs' });
    }

    // Split the log data into lines and filter out empty or invalid log entries
    const logs = data.split('\n')
      .filter(line => line.trim() !== '' && !line.includes('[object Object]') && line !== 'undefined');  // Remove invalid logs

    res.json({ success: true, logs });
  });
});


// 🟢 POST: Upload a new Excel file
app.post('/api/excel/upload', upload.single('softwareFile'), (req, res) => {
  const { softwareName, inventoryNumber, optionalField } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const uploadedFilePath = path.join(excelDir, 'uploads', file.filename);

  // Here you can also save software name, inventory number, and optional fields to a database or some other storage
  // For now, just return the file information
  res.json({
    success: true,
    message: 'File uploaded successfully!',
    file: uploadedFilePath,
    softwareName,
    inventoryNumber,
    optionalField,
  });
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});

