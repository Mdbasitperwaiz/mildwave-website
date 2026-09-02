require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 5000;

// Create Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || '',
    pass: process.env.GMAIL_PASS || ''
  }
});

// Helper to clean and format phone numbers
const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
};

// Helper to send instant notification email
const sendNotificationEmail = async (subject, textBody, attachments = []) => {
  const mailOptions = {
    from: `"Mildwave Notifications" <${process.env.GMAIL_USER}>`,
    to: process.env.COMPANY_EMAIL || process.env.GMAIL_USER,
    subject: subject,
    text: textBody,
    attachments: attachments
  };

  // Skip sending if credentials are not configured
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS || !mailOptions.to) {
    console.warn(`[SMTP WARNING]: Gmail credentials or COMPANY_EMAIL are not configured. Email "${subject}" skipped; application remains saved locally.`);
    return { skipped: true, reason: "GMAIL_PASS not configured" };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS]: Email notification sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP ERROR]: Failed to send email "${subject}":`, error.message);
    throw error;
  }
};

// Helper to log booking to Google Sheets via Webhook URL
const logToGoogleSheets = async (bookingData) => {
  const sheetWebhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!sheetWebhookUrl) {
    return { skipped: true, reason: "GOOGLE_SHEETS_WEBHOOK_URL not configured" };
  }

  try {
    const response = await fetch(sheetWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log("[GOOGLE SHEETS SUCCESS]: Booking logged to Google Sheets successfully.");
    return { success: true };
  } catch (error) {
    console.error("[GOOGLE SHEETS ERROR]: Failed to log booking to Google Sheets:", error.message);
    return { success: false, error: error.message };
  }
};

// Helper to log ICT Lab Instructor applications to Google Sheets / Drive via Webhook URL
const logIctToGoogleSheets = async (ictData, docUrls) => {
  const webhookUrl = process.env.GOOGLE_ICT_WEBHOOK_URL || process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    return { skipped: true, reason: "GOOGLE_ICT_WEBHOOK_URL / GOOGLE_SHEETS_WEBHOOK_URL not configured" };
  }

  try {
    const payload = {
      type: 'ict_application',
      ...ictData,
      docUrls: docUrls || {}
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`[GOOGLE SHEETS / DRIVE SUCCESS]: ICT Application "${ictData.id}" logged to Google Sheet successfully.`);
    return { success: true };
  } catch (error) {
    console.error("[GOOGLE SHEETS / DRIVE ERROR]: Failed to log ICT application to Google Sheets:", error.message);
    return { success: false, error: error.message };
  }
};


// Enable CORS for localhost (any port), 127.0.0.1, and mildwavem.co.in production domains
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
      origin === 'https://mildwavem.co.in' ||
      origin === 'https://www.mildwavem.co.in' ||
      origin.endsWith('.mildwavem.co.in')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Directories
const DB_DIR = path.resolve(__dirname, 'database');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const SECURE_UPLOADS_DIR = path.resolve(__dirname, 'secure_uploads');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(SECURE_UPLOADS_DIR)) {
  fs.mkdirSync(SECURE_UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve static frontend files
app.use(express.static(path.resolve(__dirname, '../frontend')));
app.use(express.static(path.resolve(__dirname, '..')));

// Helper to escape values for CSV
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes(';')) {
    str = `"${str}"`;
  }
  return str;
}

const getDbPath = (filename) => path.resolve(DB_DIR, filename);
const MASTER_SHEET_PATH = path.resolve(DB_DIR, 'master_applications.csv');
const CANDIDATES_MASTER_PATH = path.resolve(DB_DIR, 'candidates_master.csv');
const SQL_DB_PATH = path.resolve(DB_DIR, 'mildwave.db');
const db = new Database(SQL_DB_PATH);

const initializeSqlDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS form_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_type TEXT NOT NULL,
      name TEXT,
      mobile_no TEXT,
      address TEXT,
      aadhaar_number TEXT,
      job_title TEXT,
      email TEXT,
      raw_data TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const saveFormEntry = (formType, payload = {}) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO form_entries (form_type, name, mobile_no, address, aadhaar_number, job_title, email, raw_data, created_at)
      VALUES (@formType, @name, @mobileNo, @address, @aadhaarNumber, @jobTitle, @email, @rawData, @createdAt)
    `);

    stmt.run({
      formType,
      name: payload.name || '',
      mobileNo: payload.mobileNo || payload.phone || '',
      address: payload.address || payload.place || '',
      aadhaarNumber: payload.aadhaarNumber || '',
      jobTitle: payload.jobTitle || payload.position || '',
      email: payload.email || '',
      rawData: JSON.stringify(payload),
      createdAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('[SQLITE ERROR]: Failed to save form entry:', error.message);
    return false;
  }
};

// Safe JSON database file reading with robust fallback
const readDb = async (filename, defaultData = []) => {
  try {
    const filePath = getDbPath(filename);
    if (!fs.existsSync(filePath)) {
      await fs.promises.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    if (!data || !data.trim()) {
      await fs.promises.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error(`[DB READ ERROR] Error reading database file: ${filename}`, error.message);
    try {
      const filePath = getDbPath(filename);
      await fs.promises.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    } catch (writeErr) {}
    return defaultData;
  }
};

// Safe JSON database file writing with fs.promises
const writeDb = async (filename, data) => {
  try {
    const filePath = getDbPath(filename);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`[DB WRITE ERROR] Error writing database file: ${filename}`, error.message);
    return false;
  }
};

// Initialize JSON database files ensuring non-empty valid array
const initializeJsonDb = async (filename, defaultData = []) => {
  try {
    const filePath = getDbPath(filename);
    let needInit = false;
    if (!fs.existsSync(filePath)) {
      needInit = true;
    } else {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      if (!content || !content.trim()) {
        needInit = true;
      } else {
        try {
          JSON.parse(content);
        } catch (e) {
          console.warn(`[DB WARNING] Malformed JSON in ${filename}. Reinitializing:`, e.message);
          needInit = true;
        }
      }
    }
    if (needInit) {
      await fs.promises.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      console.log(`[DB INIT] Initialized ${filename} with valid structure.`);
    }
  } catch (error) {
    console.error(`[DB INIT ERROR] Failed to initialize ${filename}:`, error.message);
  }
};

const MASTER_HEADERS = [
  'Name',
  'Father Name',
  'Aadhaar Card No',
  'Mobile No',
  'Place',
  'Job Position',
  'Form Type',
  'Email',
  'Document Link',
  'Applied At'
];

const ensureMasterSheet = async () => {
  try {
    // UTF-8 BOM so Excel opens UTF-8 without garbled text
    const headerLine = '\ufeff' + MASTER_HEADERS.map(escapeCSV).join(',') + '\n';
    if (!fs.existsSync(MASTER_SHEET_PATH)) {
      await fs.promises.writeFile(MASTER_SHEET_PATH, headerLine, 'utf-8');
    }
    if (!fs.existsSync(CANDIDATES_MASTER_PATH)) {
      await fs.promises.writeFile(CANDIDATES_MASTER_PATH, headerLine, 'utf-8');
    }
  } catch (error) {
    console.error('[MASTER SHEET INIT ERROR]:', error.message);
  }
};

const appendMasterSheetRow = async (record) => {
  try {
    await ensureMasterSheet();
    const row = [
      record.name || '',
      record.fatherName || record.parentName || '',
      record.aadhaarNumber || record.aadhaar || '',
      record.phone || record.mobile || '',
      record.place || record.address || record.city || record.prefLocation || '',
      record.position || record.jobTitle || 'General Applicant',
      record.formType || 'Direct Application',
      record.email || '',
      record.docLink || record.documentUrl || record.resumeUrl || record.fileUrl || '',
      record.appliedAt || new Date().toISOString()
    ].map(escapeCSV).join(',');

    await fs.promises.appendFile(MASTER_SHEET_PATH, row + '\n', 'utf-8');
    await fs.promises.appendFile(CANDIDATES_MASTER_PATH, row + '\n', 'utf-8');
    console.log(`[EXCEL MASTER SHEET]: Successfully logged record "${record.name}" [Form: ${record.formType}]`);
  } catch (error) {
    console.error('[MASTER SHEET ERROR]: Failed to append to CSV sheet:', error.message);
  }
};

// Default statutory mockups for documents.json
const defaultDocuments = [
  {
    id: "doc_1",
    title: "Company Profile PDF",
    category: "Statutory Cert",
    filename: "Company_Profile_Mildwave.pdf",
    sizeBytes: 3355443,
    description: "Comprehensive corporate overview presenting our management board, services framework, and PAN India logistics reach.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  },
  {
    id: "doc_2",
    title: "Registration Certificate",
    category: "Statutory Cert",
    filename: "Incoporation_Certificate_Mildwave.pdf",
    sizeBytes: 1153433,
    description: "Verified Ministry of Corporate Affairs incorporation charter for statutory audit clearances.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  },
  {
    id: "doc_3",
    title: "GST Certificate",
    category: "Tax Compliance",
    filename: "GSTIN_Certificate_Mildwave_Corp.pdf",
    sizeBytes: 972800,
    description: "State-wise GSTIN details and taxation registrations for seamless accounts vendor onboarding.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  },
  {
    id: "doc_4",
    title: "Service Brochure",
    category: "Operational SLA",
    filename: "Services_SLA_Brochure_Mildwave.pdf",
    sizeBytes: 5033164,
    description: "Technical service brochures with transparent pricing guidelines, SLA frameworks, and escalation schedules.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  },
  {
    id: "doc_5",
    title: "Terms & Conditions",
    category: "Financial Document",
    filename: "Master_MSA_Terms_Mildwave.pdf",
    sizeBytes: 798720,
    description: "Standard master service agreements, liability bounds, payment terms, and arbitration provisions.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  }
];

// Initialize all databases
const initDatabases = async () => {
  await initializeJsonDb('bookings.json', []);
  await initializeJsonDb('contacts.json', []);
  await initializeJsonDb('quotes.json', []);
  await initializeJsonDb('newsletter.json', []);
  await initializeJsonDb('candidates.json', []);
  await initializeJsonDb('corporate_applications.json', []);
  await initializeJsonDb('manpower_applications.json', []);
  await initializeJsonDb('ict_applications.json', []);
  await initializeJsonDb('documents.json', defaultDocuments);
  await ensureMasterSheet();
  initializeSqlDb();
};

initDatabases();

// Configure Multer Storage for candidate profiles and statutory legal documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

// File Filter for Career Resumes and KYC (PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP)
const careerFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file format for "${file.originalname}". Only PDF, Word (.doc/.docx), and Image (.jpg/.jpeg/.png) files are allowed.`));
  }
};

// File Filter for Statutory Documents (PDF only)
const docFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Statutory documents must be in PDF format.'));
  }
};

const uploadCareer = multer({
  storage: storage,
  fileFilter: careerFileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }
});

const uploadCareerFields = uploadCareer.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'document', maxCount: 1 },
  { name: 'marksheet', maxCount: 1 },
  { name: 'bank', maxCount: 1 }
]);

const uploadDoc = multer({
  storage: storage,
  fileFilter: docFileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }
});

const uploadIct = multer({
  storage: storage,
  fileFilter: careerFileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }
});

const uploadIctFields = uploadIct.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 },
  { name: 'marksheet10', maxCount: 1 },
  { name: 'marksheet12', maxCount: 1 },
  { name: 'graduation', maxCount: 1 },
  { name: 'diploma', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'bank', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]);

const removeUploadedFiles = (files = {}) => {
  Object.values(files).flat().forEach(file => {
    if (file && file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
  });
};

const sendWhatsAppIctNotification = async (application) => {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const recipient = process.env.WHATSAPP_RECRUITMENT_NUMBER;
  if (!apiUrl || !apiToken || !recipient) return { sent: false, fallback: true };

  const message = `NEW ICT LAB INSTRUCTOR APPLICATION\n\nApplication ID: ${application.id}\nCandidate: ${application.name}\nMobile: ${application.phone}\nPreferred Location: ${application.prefLocation}\nQualification: ${application.eduGrad}\nComputer Diploma: ${application.compDiploma}\nExperience: ${application.totalExp}\nApplication Date: ${application.appliedAt}\n\nMessage:\nNew candidate application received for the Kendriya Bhandar – ICT Lab Instructor Phase 2 project. Please check the recruitment Gmail for the complete application and uploaded documents.`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
    body: JSON.stringify({ to: recipient, message })
  });
  if (!response.ok) throw new Error(`WhatsApp API returned HTTP ${response.status}`);
  return { sent: true, fallback: false };
};

// ==========================================
// API ENDPOINTS
// ==========================================

// GET API Status
app.get('/api/status', (req, res) => {
  res.json({
    status: "active",
    company: "Mildwave Marketing PVT.LTD",
    timestamp: new Date().toISOString()
  });
});

// 1. POST /api/book-service & POST /api/booking - Create RO Purifier & Maintenance service bookings
app.post(['/api/book-service', '/api/booking'], async (req, res) => {
  try {
    const { name, phone, email, city, pincode, type, serviceType, date, time, address, message } = req.body || {};

    const cleanPhone = cleanPhoneNumber(phone);
    // Validations
    if (!name || name.trim().length < 2) return res.status(400).json({ error: "Invalid customer name" });
    if (!cleanPhone || cleanPhone.length < 10) return res.status(400).json({ error: "Invalid 10-digit mobile number" });
    if (!address || address.trim().length < 3) return res.status(400).json({ error: "Service address is required" });

    const bookings = await readDb('bookings.json');
    const newBooking = {
      id: 'ro_' + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      email: (email || '').trim(),
      city: (city || '').trim(),
      pincode: (pincode || '').trim(),
      type: type || 'Domestic / Home',
      serviceType: serviceType || 'RO Repair',
      date: date || new Date().toISOString().split('T')[0],
      time: time || 'Morning (9 AM - 12 PM)',
      address: address.trim(),
      message: (message || '').trim(),
      createdAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    const saved = await writeDb('bookings.json', bookings);
    if (saved) {
      saveFormEntry('RO Service Booking', {
        name: newBooking.name,
        phone: newBooking.phone,
        email: newBooking.email,
        address: `${newBooking.address}${newBooking.city ? ', ' + newBooking.city : ''}${newBooking.pincode ? ' - ' + newBooking.pincode : ''}`,
        jobTitle: newBooking.serviceType || 'RO Service Booking'
      });

      appendMasterSheetRow({
        formType: 'RO Service Booking',
        name: newBooking.name,
        phone: newBooking.phone,
        email: newBooking.email,
        address: `${newBooking.address}${newBooking.city ? ', ' + newBooking.city : ''}${newBooking.pincode ? ' - ' + newBooking.pincode : ''}`,
        jobTitle: newBooking.serviceType || 'RO Service Booking'
      }).catch(e => console.error("CSV append error:", e.message));

      const emailBody = `New RO Service Booking Request
Customer Name: ${newBooking.name}
Phone Number: ${newBooking.phone}
Email: ${newBooking.email || 'N/A'}
City: ${newBooking.city || 'N/A'}
Pincode: ${newBooking.pincode || 'N/A'}
RO Type: ${newBooking.type}
Service Type: ${newBooking.serviceType}
Preferred Date: ${newBooking.date}
Preferred Slot: ${newBooking.time}
Address: ${newBooking.address}
Problem Details: ${newBooking.message || 'None'}`;

      sendNotificationEmail("New RO Service Booking Request", emailBody)
        .catch(mailError => console.error("[SMTP ERROR]: Failed to send booking email:", mailError.message));
      
      logToGoogleSheets(newBooking)
        .catch(sheetError => console.error("[GOOGLE SHEETS ERROR]: Failed to log booking:", sheetError.message));

      return res.status(201).json({ success: true, booking: newBooking });
    } else {
      return res.status(500).json({ error: "Internal Database Write Exception" });
    }
  } catch (error) {
    console.error("Booking handler error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. POST /api/contact - General Inquiry contacts
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body || {};

    const cleanPhone = cleanPhoneNumber(phone);
    if (!name || name.trim().length < 2) return res.status(400).json({ error: "Please enter your name" });
    if (!email || !email.includes('@')) return res.status(400).json({ error: "Please enter a valid email address" });
    if (!cleanPhone || cleanPhone.length < 10) return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
    if (!message || message.trim().length < 1) return res.status(400).json({ error: "Please enter your message" });

    const contacts = await readDb('contacts.json');
    const newContact = {
      id: 'msg_' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: cleanPhone,
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    contacts.push(newContact);
    const saved = await writeDb('contacts.json', contacts);
    if (saved) {
      saveFormEntry('Contact Inquiry', {
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email,
        address: '',
        jobTitle: 'General Inquiry'
      });

      appendMasterSheetRow({
        formType: 'Contact Inquiry',
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email,
        address: '',
        jobTitle: 'General Inquiry'
      }).catch(e => console.error("CSV append error:", e.message));

      const emailBody = `New Contact Inquiry
Name: ${newContact.name}
Phone Number: ${newContact.phone}
Email: ${newContact.email}
Message: ${newContact.message}`;

      sendNotificationEmail("New Contact Inquiry", emailBody)
        .catch(mailError => console.error("[SMTP ERROR]: Failed to send contact email:", mailError.message));

      return res.status(201).json({ success: true, contact: newContact });
    } else {
      return res.status(500).json({ error: "Internal Database Write Exception" });
    }
  } catch (error) {
    console.error("Contact handler error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. POST /api/quote - Request Free Consultative Quote RFQ
app.post('/api/quote', async (req, res) => {
  try {
    const { name, phone, email, service, message } = req.body || {};

    const cleanPhone = cleanPhoneNumber(phone);
    if (!name || name.trim().length < 2) return res.status(400).json({ error: "Please enter your name" });
    if (!cleanPhone || cleanPhone.length < 10) return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
    if (!email || !email.includes('@')) return res.status(400).json({ error: "Please enter a valid email address" });
    if (!service) return res.status(400).json({ error: "Please select a service vertical" });
    if (!message || message.trim().length < 1) return res.status(400).json({ error: "Requirement description is required" });

    const quotes = await readDb('quotes.json');
    const newQuote = {
      id: 'rfq_' + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      email: email.trim(),
      service: service.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    quotes.push(newQuote);
    const saved = await writeDb('quotes.json', quotes);
    if (saved) {
      saveFormEntry('Quote Request', {
        name: newQuote.name,
        phone: newQuote.phone,
        email: newQuote.email,
        address: '',
        jobTitle: newQuote.service || 'Quote Request'
      });

      appendMasterSheetRow({
        formType: 'Quote Request',
        name: newQuote.name,
        phone: newQuote.phone,
        email: newQuote.email,
        address: '',
        jobTitle: newQuote.service || 'Quote Request'
      }).catch(e => console.error("CSV append error:", e.message));

      const emailBody = `New Quote Request
Name: ${newQuote.name}
Phone Number: ${newQuote.phone}
Email: ${newQuote.email}
Service: ${newQuote.service}
Message: Quote Request for ${newQuote.service} service. Details: ${newQuote.message}`;

      sendNotificationEmail(`New Quote Request - ${newQuote.service}`, emailBody)
        .catch(mailError => console.error("[SMTP ERROR]: Failed to send quote email:", mailError.message));

      return res.status(201).json({ success: true, quote: newQuote });
    } else {
      return res.status(500).json({ error: "Internal Database Write Exception" });
    }
  } catch (error) {
    console.error("Quote handler error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// 4. POST /api/newsletter - Log email newsletters
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || !email.includes('@')) return res.status(400).json({ error: "Invalid email format" });

    const newsletter = await readDb('newsletter.json');
    const cleanEmail = email.trim().toLowerCase();
    
    // Avoid duplicate subscriptions
    if (newsletter.some(sub => sub.email && sub.email.toLowerCase() === cleanEmail)) {
      return res.status(200).json({ success: true, message: "Email already registered" });
    }

    const newSubscription = {
      id: 'sub_' + Date.now(),
      email: cleanEmail,
      subscribedAt: new Date().toISOString()
    };

    newsletter.push(newSubscription);
    const saved = await writeDb('newsletter.json', newsletter);
    if (saved) {
      appendMasterSheetRow({
        formType: 'Newsletter Signup',
        name: '',
        phone: '',
        email: newSubscription.email,
        address: '',
        jobTitle: 'Newsletter'
      }).catch(e => console.error("CSV append error:", e.message));

      return res.status(201).json({ success: true, subscription: newSubscription });
    } else {
      return res.status(500).json({ error: "Internal Database Write Exception" });
    }
  } catch (error) {
    console.error("Newsletter handler error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// 5a. POST /api/careers/corporate - Corporate applications with Multi-uploads
app.post('/api/careers/corporate', (req, res) => {
  uploadCareerFields(req, res, async (err) => {
    if (err) {
      console.error("[UPLOAD ERROR]:", err.message);
      return res.status(400).json({ error: err.message });
    }

    try {
      const { 
        name, fatherName, parentName, phone, email, address, place, qualification, experience, position,
        skills, certifications, linkedin, aadhaarNumber
      } = req.body || {};

      const candidateName = (name || '').trim();
      const candidatePhone = (phone || '').trim();
      const candidateFather = (fatherName || parentName || '').trim();
      const candidateAadhaar = (aadhaarNumber || '').trim();
      const candidatePlace = (place || address || '').trim();
      const candidatePosition = (position || 'Corporate Role').trim();
      const candidateEmail = (email || '').trim();

      if (!candidateName || candidateName.length < 2) return res.status(400).json({ error: "Candidate full name is required." });
      if (!candidatePhone || candidatePhone.length < 10) return res.status(400).json({ error: "A valid 10-digit mobile number is required." });
      if (!candidatePlace || candidatePlace.length < 3) return res.status(400).json({ error: "Address / Place of residence is required." });

      const apps = await readDb('corporate_applications.json');
      const resumeFile = req.files && req.files['resume'] ? req.files['resume'][0] : (req.files && req.files['document'] ? req.files['document'][0] : null);
      const photoFile = req.files && req.files['photo'] ? req.files['photo'][0] : null;

      const docUrl = resumeFile ? `${req.protocol}://${req.get('host')}/uploads/${resumeFile.filename}` : '';

      const newApp = {
        id: 'corp_' + Date.now(),
        name: candidateName,
        fatherName: candidateFather,
        aadhaarNumber: candidateAadhaar,
        phone: candidatePhone,
        email: candidateEmail,
        address: candidatePlace,
        place: candidatePlace,
        qualification: (qualification || '').trim(),
        experience: (experience || '').trim(),
        position: candidatePosition,
        skills: (skills || '').trim(),
        certifications: (certifications || '').trim(),
        linkedin: (linkedin || '').trim(),
        docUrl: docUrl,
        files: {
          resume: resumeFile ? `/uploads/${resumeFile.filename}` : null,
          photo: photoFile ? `/uploads/${photoFile.filename}` : null
        },
        appliedAt: new Date().toISOString()
      };

      apps.push(newApp);
      const saved = await writeDb('corporate_applications.json', apps);
      if (saved) {
        // Also log to candidates.json
        const candidates = await readDb('candidates.json');
        candidates.push(newApp);
        await writeDb('candidates.json', candidates);

        const emailBody = `Corporate Job Application Received
Full Name: ${newApp.name}
Father's Name: ${newApp.fatherName || 'N/A'}
Aadhaar Number: ${newApp.aadhaarNumber || 'N/A'}
Position: ${newApp.position}
Phone: ${newApp.phone}
Email: ${newApp.email}
Address / Place: ${newApp.address}
Qualification: ${newApp.qualification}
Experience: ${newApp.experience}
Skills: ${newApp.skills}
Certifications: ${newApp.certifications}
LinkedIn: ${newApp.linkedin}
Document Link: ${docUrl || 'No file attached'}`;

        const attachments = [];
        if (resumeFile) attachments.push({ filename: resumeFile.originalname, path: resumeFile.path });
        if (photoFile) attachments.push({ filename: photoFile.originalname, path: photoFile.path });

        sendNotificationEmail(`New Corporate Application: ${newApp.position} - ${newApp.name}`, emailBody, attachments)
          .catch(mailError => console.error("[SMTP ERROR]: Failed to send corporate application email:", mailError.message));

        appendMasterSheetRow({
          formType: 'Corporate Application',
          name: newApp.name,
          fatherName: newApp.fatherName,
          aadhaarNumber: newApp.aadhaarNumber,
          phone: newApp.phone,
          place: newApp.address,
          position: newApp.position,
          email: newApp.email,
          docLink: docUrl,
          appliedAt: newApp.appliedAt
        }).catch(e => console.error("CSV append error:", e.message));

        const whatsappMsg = `*MILDWAVE MARKETING - JOB APPLICATION*
----------------------------------------
*Name:* ${newApp.name}
*Father Name:* ${newApp.fatherName || 'N/A'}
*Aadhaar Card No:* ${newApp.aadhaarNumber || 'N/A'}
*Mobile No:* ${newApp.phone}
*Place:* ${newApp.address}
*Position:* ${newApp.position}
*Email:* ${newApp.email || 'N/A'}
*Document Link:* ${docUrl || 'Attached with chat'}
----------------------------------------`;

        return res.status(201).json({
          success: true,
          candidate: newApp,
          docLink: docUrl,
          whatsappMsg: whatsappMsg
        });
      } else {
        return res.status(500).json({ error: "Internal Database Write Exception" });
      }
    } catch (error) {
      console.error("Corporate application error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

// 5b. POST /api/careers/manpower - Manpower applications with Multi-uploads
app.post('/api/careers/manpower', (req, res) => {
  uploadCareerFields(req, res, async (err) => {
    if (err) {
      console.error("[UPLOAD ERROR]:", err.message);
      return res.status(400).json({ error: err.message });
    }

    try {
      const { 
        name, fatherName, parentName, phone, email, address, place, position, aadhaarNumber, panNumber, 
        education, qualification, experience, prevEmployer, policeVerification, readyToRelocate, prefShift 
      } = req.body || {};

      const candidateName = (name || '').trim();
      const candidatePhone = (phone || '').trim();
      const candidateFather = (fatherName || parentName || '').trim();
      const candidateAadhaar = (aadhaarNumber || '').trim();
      const candidatePlace = (place || address || '').trim();
      const candidatePosition = (position || 'Manpower & Security Staff').trim();

      if (!candidateName || candidateName.length < 2) return res.status(400).json({ error: "Candidate full name is required." });
      if (!candidatePhone || candidatePhone.length < 10) return res.status(400).json({ error: "A valid 10-digit mobile number is required." });
      if (!candidatePlace || candidatePlace.length < 3) return res.status(400).json({ error: "Address / Place of residence is required." });

      const apps = await readDb('manpower_applications.json');
      const aadhaarFile = req.files && req.files['aadhaar'] ? req.files['aadhaar'][0] : (req.files && req.files['resume'] ? req.files['resume'][0] : (req.files && req.files['document'] ? req.files['document'][0] : null));
      const photoFile = req.files && req.files['photo'] ? req.files['photo'][0] : null;
      const panFile = req.files && req.files['pan'] ? req.files['pan'][0] : null;

      const docUrl = aadhaarFile ? `${req.protocol}://${req.get('host')}/uploads/${aadhaarFile.filename}` : '';

      const newApp = {
        id: 'man_' + Date.now(),
        name: candidateName,
        fatherName: candidateFather,
        aadhaarNumber: candidateAadhaar,
        phone: candidatePhone,
        email: (email || '').trim(),
        address: candidatePlace,
        place: candidatePlace,
        position: candidatePosition,
        panNumber: (panNumber || '').trim(),
        education: (education || qualification || '').trim(),
        experience: (experience || '').trim(),
        prevEmployer: (prevEmployer || '').trim(),
        policeVerification: (policeVerification || 'No').trim(),
        readyToRelocate: (readyToRelocate || 'Yes').trim(),
        prefShift: (prefShift || 'Day Shift').trim(),
        docUrl: docUrl,
        files: {
          aadhaar: aadhaarFile ? `/uploads/${aadhaarFile.filename}` : null,
          photo: photoFile ? `/uploads/${photoFile.filename}` : null,
          pan: panFile ? `/uploads/${panFile.filename}` : null
        },
        appliedAt: new Date().toISOString()
      };

      apps.push(newApp);
      const saved = await writeDb('manpower_applications.json', apps);
      if (saved) {
        // Also log to candidates.json
        const candidates = await readDb('candidates.json');
        candidates.push(newApp);
        await writeDb('candidates.json', candidates);

        const emailBody = `Manpower & Security Job Application Received
Full Name: ${newApp.name}
Father's Name: ${newApp.fatherName || 'N/A'}
Aadhaar Number: ${newApp.aadhaarNumber || 'N/A'}
Position: ${newApp.position}
Phone: ${newApp.phone}
Email: ${newApp.email}
Address / Place: ${newApp.address}
Highest Education: ${newApp.education}
Experience: ${newApp.experience}
Previous Employer: ${newApp.prevEmployer}
Police Verification Available: ${newApp.policeVerification}
Willing to Relocate: ${newApp.readyToRelocate}
Preferred Work Shift: ${newApp.prefShift}
Document Link: ${docUrl || 'No file attached'}`;

        const attachments = [];
        if (aadhaarFile) attachments.push({ filename: aadhaarFile.originalname, path: aadhaarFile.path });
        if (photoFile) attachments.push({ filename: photoFile.originalname, path: photoFile.path });
        if (panFile) attachments.push({ filename: panFile.originalname, path: panFile.path });

        sendNotificationEmail(`New Manpower Application: ${newApp.position} - ${newApp.name}`, emailBody, attachments)
          .catch(mailError => console.error("[SMTP ERROR]: Failed to send manpower application email:", mailError.message));

        appendMasterSheetRow({
          formType: 'Manpower Application',
          name: newApp.name,
          fatherName: newApp.fatherName,
          aadhaarNumber: newApp.aadhaarNumber,
          phone: newApp.phone,
          place: newApp.address,
          position: newApp.position,
          email: newApp.email,
          docLink: docUrl,
          appliedAt: newApp.appliedAt
        }).catch(e => console.error("CSV append error:", e.message));

        const whatsappMsg = `*MILDWAVE MARKETING - MANPOWER APPLICATION*
----------------------------------------
*Name:* ${newApp.name}
*Father Name:* ${newApp.fatherName || 'N/A'}
*Aadhaar Card No:* ${newApp.aadhaarNumber || 'N/A'}
*Mobile No:* ${newApp.phone}
*Place:* ${newApp.address}
*Position:* ${newApp.position}
*Highest Education:* ${newApp.education || 'N/A'}
*Document Link:* ${docUrl || 'Attached with chat'}
----------------------------------------`;

        return res.status(201).json({
          success: true,
          candidate: newApp,
          docLink: docUrl,
          whatsappMsg: whatsappMsg
        });
      } else {
        return res.status(500).json({ error: "Internal Database Write Exception" });
      }
    } catch (error) {
      console.error("Manpower application error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

// 5c. Universal quick application endpoint: POST /api/apply and POST /api/careers/apply
const handleUniversalApply = async (req, res) => {
  try {
    const { 
      name, fatherName, parentName, phone, mobile, email, address, place, position, jobTitle, 
      aadhaarNumber, aadhaar, message, qualification, education, experience, skills 
    } = req.body || {};

    const candidateName = (name || '').trim();
    const candidatePhone = (phone || mobile || '').trim();
    const candidateFather = (fatherName || parentName || '').trim();
    const candidateAadhaar = (aadhaarNumber || aadhaar || '').trim();
    const candidatePlace = (place || address || '').trim();
    const candidatePosition = (position || jobTitle || 'General Applicant').trim();
    const candidateEmail = (email || '').trim();

    if (!candidateName || candidateName.length < 2) return res.status(400).json({ error: "Name is required." });
    if (!candidatePhone || candidatePhone.length < 10) return res.status(400).json({ error: "Valid 10-digit mobile number is required." });

    const fileObj = req.files ? Object.values(req.files).flat()[0] : (req.file || null);
    const docUrl = fileObj ? `${req.protocol}://${req.get('host')}/uploads/${fileObj.filename}` : '';

    const newApp = {
      id: 'app_' + Date.now(),
      name: candidateName,
      fatherName: candidateFather,
      aadhaarNumber: candidateAadhaar,
      phone: candidatePhone,
      email: candidateEmail,
      address: candidatePlace,
      place: candidatePlace,
      position: candidatePosition,
      qualification: (qualification || education || '').trim(),
      experience: (experience || '').trim(),
      skills: (skills || '').trim(),
      message: (message || '').trim(),
      docUrl: docUrl,
      files: fileObj ? { resume: `/uploads/${fileObj.filename}` } : {},
      appliedAt: new Date().toISOString()
    };

    // Save to candidates.json
    const candidates = await readDb('candidates.json');
    candidates.push(newApp);
    await writeDb('candidates.json', candidates);

    // Also append to manpower_applications.json for manpower roles
    const isManpower = candidatePosition.toLowerCase().includes('manpower') ||
                       candidatePosition.toLowerCase().includes('security') ||
                       candidatePosition.toLowerCase().includes('electrician') ||
                       candidatePosition.toLowerCase().includes('plumber') ||
                       candidatePosition.toLowerCase().includes('housekeeping');
    if (isManpower) {
      const manpowerApps = await readDb('manpower_applications.json');
      manpowerApps.push(newApp);
      await writeDb('manpower_applications.json', manpowerApps);
    }

    appendMasterSheetRow({
      formType: 'Website Application',
      name: newApp.name,
      fatherName: newApp.fatherName,
      aadhaarNumber: newApp.aadhaarNumber,
      phone: newApp.phone,
      place: newApp.address,
      position: newApp.position,
      email: newApp.email,
      docLink: docUrl,
      appliedAt: newApp.appliedAt
    }).catch(e => console.error("CSV append error:", e.message));

    const whatsappMsg = `*MILDWAVE MARKETING - APPLICANT RECORD*
----------------------------------------
*Name:* ${newApp.name}
*Father Name:* ${newApp.fatherName || 'N/A'}
*Aadhaar Card No:* ${newApp.aadhaarNumber || 'N/A'}
*Mobile No:* ${newApp.phone}
*Place:* ${newApp.address}
*Position:* ${newApp.position}
*Document Link:* ${docUrl || 'Attached in chat'}
----------------------------------------`;

    return res.status(201).json({
      success: true,
      candidate: newApp,
      docLink: docUrl,
      whatsappMsg: whatsappMsg
    });
  } catch (error) {
    console.error("Universal apply error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

app.post('/api/apply', (req, res) => {
  uploadCareerFields(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    handleUniversalApply(req, res);
  });
});

app.post('/api/careers/apply', (req, res) => {
  uploadCareerFields(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    handleUniversalApply(req, res);
  });
});

// 5d. GET /api/export/corporate - Download Corporate CSV spreadsheet
app.get('/api/export/corporate', async (req, res) => {
  try {
    const apps = await readDb('corporate_applications.json');
    let csv = '\ufeffID,Applied At,Full Name,Father Name,Aadhaar Number,Phone,Email,Address,Qualification,Experience,Position,Skills,Certifications,LinkedIn,Document Link\n';
    
    apps.forEach(app => {
      csv += [
        app.id,
        app.appliedAt,
        app.name,
        app.fatherName || '',
        app.aadhaarNumber || '',
        app.phone,
        app.email,
        app.address,
        app.qualification,
        app.experience,
        app.position,
        app.skills || '',
        app.certifications || '',
        app.linkedin || '',
        app.docUrl || (app.files ? app.files.resume : '')
      ].map(escapeCSV).join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=corporate_applications.csv');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: "Failed to export CSV" });
  }
});

// 5e. GET /api/export/manpower - Download Manpower CSV spreadsheet
app.get('/api/export/manpower', async (req, res) => {
  try {
    const apps = await readDb('manpower_applications.json');
    let csv = '\ufeffID,Applied At,Full Name,Father Name,Aadhaar Number,Phone,Email,Address,Position,PAN Number,Highest Education,Experience,Previous Employer,Police Verification Available,Willing to Relocate,Preferred Work Shift,Document Link\n';
    
    apps.forEach(app => {
      csv += [
        app.id,
        app.appliedAt,
        app.name,
        app.fatherName || '',
        app.aadhaarNumber || '',
        app.phone,
        app.email,
        app.address,
        app.position,
        app.panNumber || '',
        app.education,
        app.experience,
        app.prevEmployer || '',
        app.policeVerification,
        app.readyToRelocate,
        app.prefShift,
        app.docUrl || (app.files ? app.files.aadhaar : '')
      ].map(escapeCSV).join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=manpower_applications.csv');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: "Failed to export CSV" });
  }
});

// 5f. GET /api/export/master & /api/export/excel - Download Master Excel CSV spreadsheet
app.get(['/api/export/master', '/api/export/excel'], async (req, res) => {
  try {
    await ensureMasterSheet();
    const sheetPath = CANDIDATES_MASTER_PATH;
    if (fs.existsSync(sheetPath)) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=mildwave_candidates_master.csv');
      return res.status(200).send(await fs.promises.readFile(sheetPath, 'utf-8'));
    } else {
      return res.status(404).json({ error: 'Master Excel sheet not found' });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to export master sheet" });
  }
});

// 6. GET /api/documents - Retrieve all statutory certificates
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await readDb('documents.json', defaultDocuments);
    return res.json(documents);
  } catch (err) {
    return res.status(500).json({ error: "Failed to read documents" });
  }
});

// 7. POST /api/document-upload - Administrative legal uploads
app.post('/api/document-upload', (req, res) => {
  uploadDoc.single('document')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { title, category } = req.body || {};
      const file = req.file;

      if (!title || title.trim().length < 3) return res.status(400).json({ error: "Document title is too short" });
      if (!category) return res.status(400).json({ error: "Document category is required" });
      if (!file) return res.status(400).json({ error: "PDF document attachment is required" });

      const documents = await readDb('documents.json', defaultDocuments);
      const newDoc = {
        id: 'doc_' + Date.now(),
        title: title.trim(),
        category,
        filename: file.filename,
        originalName: file.originalname,
        sizeBytes: file.size,
        path: `/uploads/${file.filename}`,
        description: `Statutory corporate record uploaded under ${category} audit scopes. Authenticated and verified active.`,
        uploadedAt: new Date().toISOString(),
        isSystem: false
      };

      documents.push(newDoc);
      const saved = await writeDb('documents.json', documents);
      if (saved) {
        return res.status(201).json({ success: true, document: newDoc });
      } else {
        return res.status(500).json({ error: "Internal Database Write Exception" });
      }
    } catch (error) {
      console.error("Document upload error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

// Admin Authentication middleware
const authAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "Access Denied. Authorization Header missing." });
  
  const token = authHeader.replace('Bearer ', '');
  const expectedUser = process.env.ADMIN_USER || 'admin';
  const expectedPass = process.env.ADMIN_PASS || 'MildwaveAdmin2026!';
  
  try {
    const credentials = Buffer.from(token, 'base64').toString('ascii');
    const [user, pass] = credentials.split(':');
    if (user === expectedUser && pass === expectedPass) {
      next();
    } else {
      res.status(403).json({ error: "Forbidden. Invalid credentials." });
    }
  } catch (err) {
    res.status(400).json({ error: "Invalid authentication format" });
  }
};

// 8. POST /api/careers/ict - ICT Lab Instructor Phase 2 applications
app.post('/api/careers/ict', (req, res) => {
  uploadIctFields(req, res, async (err) => {
    if (err) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ error: err.message });
    }

    try {
      const { 
        name, parentName, dob, phone, whatsapp, email, address, district, prefLocation,
        edu10, edu12, eduGrad, gradYear, compDiploma, diplomaYear,
        totalExp, prevEmployer, relevantIct, currentOcc,
        confirmCorrect, consentUse
      } = req.body || {};

      // Validation
      const textFields = [
        ['name', name, "Invalid candidate name"], ['parentName', parentName, "Invalid Father's / Mother's name"],
        ['dob', dob, 'Date of Birth is required'], ['phone', phone, 'Invalid mobile number'],
        ['whatsapp', whatsapp, 'Invalid WhatsApp number'], ['email', email, 'Invalid email address'],
        ['address', address, 'Address is too short'], ['district', district, 'District is required'],
        ['edu10', edu10, '10th qualification is required'], ['edu12', edu12, '12th qualification is required'],
        ['eduGrad', eduGrad, 'Graduation qualification is required'], ['gradYear', gradYear, 'Graduation passing year is required'],
        ['compDiploma', compDiploma, 'Computer diploma details are required'], ['diplomaYear', diplomaYear, 'Computer diploma passing year is required'],
        ['totalExp', totalExp, 'Total work experience is required'], ['relevantIct', relevantIct, 'Relevant ICT experience is required']
      ];
      const invalidField = textFields.find(([field, value]) => !value || (field !== 'dob' && String(value).trim().length < 2));
      if (invalidField) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ error: invalidField[2] });
      }
      if (!/^[0-9]{10}$/.test(String(phone).trim())) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ error: "Invalid mobile number" });
      }
      if (!/^[0-9]{10}$/.test(String(whatsapp).trim())) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ error: "Invalid WhatsApp number" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ error: "Invalid email address" });
      }
      if (!['Patna', 'Gaya', 'Jehanabad'].includes(prefLocation)) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ error: "Invalid preferred location" });
      }

      // Validate that required files are uploaded
      const requiredFields = ['resume', 'photo1', 'photo2', 'marksheet10', 'marksheet12', 'graduation', 'diploma', 'aadhaar', 'pan', 'bank'];
      for (const field of requiredFields) {
        if (!req.files || !req.files[field]) {
          removeUploadedFiles(req.files);
          return res.status(400).json({ error: `Mandatory document upload is missing: ${field}` });
        }
      }

      if (confirmCorrect !== 'true' && confirmCorrect !== true) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ error: "You must confirm that the submitted information is correct." });
      }
      if (consentUse !== 'true' && consentUse !== true) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ error: "You must consent to Mildwave using your information." });
      }

      const apps = await readDb('ict_applications.json');
      
      // Generate unique sequential Application ID
      let nextNum = apps.length + 1;
      let appId = `MW-ICT-2026-${String(nextNum).padStart(4, '0')}`;
      while (apps.some(a => a.id === appId)) {
        nextNum++;
        appId = `MW-ICT-2026-${String(nextNum).padStart(4, '0')}`;
      }

      const files = {};
      requiredFields.forEach(field => {
        files[field] = req.files[field][0].filename;
      });

      const newApp = {
        id: appId,
        name: name.trim(),
        parentName: parentName.trim(),
        dob: dob,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        address: address.trim(),
        district: district.trim(),
        prefLocation: prefLocation,
        edu10: edu10.trim(),
        edu12: edu12.trim(),
        eduGrad: eduGrad.trim(),
        gradYear: gradYear.trim(),
        compDiploma: compDiploma.trim(),
        diplomaYear: diplomaYear.trim(),
        totalExp: totalExp.trim(),
        prevEmployer: (prevEmployer || '').trim(),
        relevantIct: relevantIct.trim(),
        currentOcc: (currentOcc || '').trim(),
        files: files,
        status: 'New',
        appliedAt: new Date().toISOString()
      };

      apps.push(newApp);
      const saved = await writeDb('ict_applications.json', apps);
      if (saved) {
        // Also add to candidates.json
        const candidates = await readDb('candidates.json');
        candidates.push(newApp);
        await writeDb('candidates.json', candidates);

        // Send Gmail Notification with attachments
        const emailBody = `New ICT Lab Instructor Job Application Received
--------------------------------------------------
Application ID: ${newApp.id}
Full Name: ${newApp.name}
Father's / Mother's Name: ${newApp.parentName}
Date of Birth: ${newApp.dob}
Mobile Number: ${newApp.phone}
WhatsApp Number: ${newApp.whatsapp}
Email Address: ${newApp.email}
Complete Address: ${newApp.address}
District: ${newApp.district}
Preferred Location: ${newApp.prefLocation}

Educational Qualifications:
- 10th: ${newApp.edu10}
- 12th: ${newApp.edu12}
- Graduation: ${newApp.eduGrad} (Passing Year: ${newApp.gradYear})
- 1-Year Computer Diploma: ${newApp.compDiploma} (Passing Year: ${newApp.diplomaYear})

Experience details:
- Total Work Experience: ${newApp.totalExp}
- Previous Employer: ${newApp.prevEmployer || 'None'}
- Relevant ICT / Computer Experience: ${newApp.relevantIct}
- Current Occupation: ${newApp.currentOcc || 'None'}

Application Date & Time: ${newApp.appliedAt}
--------------------------------------------------
Candidate files are securely attached to this email. You can also view and manage this application on the Mildwave Admin Portal.`;

        const attachments = [];
        requiredFields.forEach(field => {
          const fileObj = req.files[field][0];
          attachments.push({
            filename: fileObj.originalname,
            path: fileObj.path
          });
        });

        const subject = `New ICT Lab Instructor Application – Kendriya Bhandar Phase 2 – ${newApp.name} – ${newApp.prefLocation}`;
        sendNotificationEmail(subject, emailBody, attachments)
          .catch(mailError => console.error("[SMTP ERROR]: Failed to send ICT application email:", mailError.message));

        const primaryDoc = files['resume'] || files['aadhaar'] || Object.values(files)[0] || '';
        const docUrl = primaryDoc ? `${req.protocol}://${req.get('host')}/uploads/${primaryDoc}` : '';

        // Build document link map for Google Drive / Sheets sync
        const docUrls = {};
        Object.keys(files).forEach(fKey => {
          docUrls[fKey] = `${req.protocol}://${req.get('host')}/uploads/${files[fKey]}`;
        });

        appendMasterSheetRow({
          formType: 'ICT Application',
          name: newApp.name,
          fatherName: newApp.parentName,
          aadhaarNumber: newApp.aadhaarNumber || 'Uploaded',
          phone: newApp.phone,
          place: `${newApp.address}, ${newApp.district} (${newApp.prefLocation})`,
          position: 'ICT Lab Instructor – Phase 2',
          email: newApp.email,
          docLink: docUrl,
          appliedAt: newApp.appliedAt
        }).catch(e => console.error("CSV append error:", e.message));

        // Auto sync ICT application data to Google Drive / Google Sheets
        logIctToGoogleSheets(newApp, docUrls)
          .catch(sheetError => console.error("[GOOGLE SYNC ERROR]:", sheetError.message));


        const whatsappMsg = `*NEW ICT LAB INSTRUCTOR APPLICATION*
----------------------------------------
*Application ID:* ${appId}
*Name:* ${newApp.name}
*Father Name:* ${newApp.parentName}
*Mobile No:* ${newApp.phone}
*WhatsApp No:* ${newApp.whatsapp}
*Place:* ${newApp.address}, ${newApp.district} (${newApp.prefLocation})
*Preferred Location:* ${newApp.prefLocation}
*Qualification:* ${newApp.eduGrad} & ${newApp.compDiploma}
*Document Link:* ${docUrl || 'Attached in chat'}
----------------------------------------`;

        let whatsapp = { sent: false, fallback: true };
        try {
          whatsapp = await sendWhatsAppIctNotification(newApp);
        } catch (whatsappError) {
          console.error("[WHATSAPP ERROR]: Failed to send ICT application notification:", whatsappError.message);
        }

        return res.status(201).json({
          success: true,
          applicationId: appId,
          candidate: newApp,
          docLink: docUrl,
          whatsappMsg: whatsappMsg,
          whatsappSent: whatsapp.sent
        });
      } else {
        return res.status(500).json({ error: "Internal Database Write Exception" });
      }
    } catch (error) {
      console.error("ICT application error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;

  if (!expectedUser || !expectedPass) {
    return res.status(503).json({ error: "Admin credentials are not configured." });
  }
  
  if (username === expectedUser && password === expectedPass) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    return res.json({ success: true, token });
  } else {
    return res.status(400).json({ error: "Invalid admin username or password." });
  }
});

// GET all ICT Applications (Admin only)
app.get('/api/admin/ict-applications', authAdmin, async (req, res) => {
  try {
    const apps = await readDb('ict_applications.json');
    return res.json(apps);
  } catch (err) {
    return res.status(500).json({ error: "Failed to load applications" });
  }
});

// Update ICT Application Status (Admin only)
app.post('/api/admin/ict-applications/status', authAdmin, async (req, res) => {
  try {
    const { id, status } = req.body || {};
    const allowedStatuses = ['New', 'Under Review', 'Shortlisted', 'Document Verification', 'Selected', 'Rejected'];
    if (!id || !status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid Application ID or Status" });
    }
    
    const apps = await readDb('ict_applications.json');
    const index = apps.findIndex(a => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    apps[index].status = status;
    const saved = await writeDb('ict_applications.json', apps);
    if (saved) {
      return res.json({ success: true, application: apps[index] });
    } else {
      return res.status(500).json({ error: "Database write error" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to update status" });
  }
});

// Secure Document Retrieval (Admin only)
app.get('/api/admin/secure-file/:filename', authAdmin, (req, res) => {
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const filePath = path.join(SECURE_UPLOADS_DIR, safeFilename);
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).json({ error: "Secure document not found" });
  }
});

// Export ICT Applications to CSV (Admin only)
app.get('/api/admin/export/ict', authAdmin, async (req, res) => {
  try {
    const apps = await readDb('ict_applications.json');
    let csv = '\ufeffApplication ID,Applied At,Full Name,Parent Name,DOB,Mobile,WhatsApp,Email,Address,District,Preferred Location,10th Qualification,12th Qualification,Graduation,Grad Year,Computer Diploma,Diploma Year,Total Experience,Previous Employer,Relevant ICT Experience,Current Occupation,Status\n';
    
    apps.forEach(app => {
      csv += [
        app.id,
        app.appliedAt,
        app.name,
        app.parentName,
        app.dob,
        app.phone,
        app.whatsapp,
        app.email,
        app.address,
        app.district,
        app.prefLocation,
        app.edu10,
        app.edu12,
        app.eduGrad,
        app.gradYear,
        app.compDiploma,
        app.diplomaYear,
        app.totalExp,
        app.prevEmployer || '',
        app.relevantIct,
        app.currentOcc || '',
        app.status
      ].map(escapeCSV).join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=ict_applications.csv');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: "Failed to export ICT applications" });
  }
});

// Handle Multer upload errors gracefully
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "File exceeds upload size limit (Max 15MB)" });
    }
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Mildwave Corporate API Backend running on port ${PORT}`);
  console.log(`Static uploads served at http://localhost:${PORT}/uploads`);
  console.log(`Database records logged under: ${DB_DIR}`);
  console.log(`=======================================================`);
});
