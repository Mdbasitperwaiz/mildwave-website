require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

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
    console.warn("[GOOGLE SHEETS WARNING]: GOOGLE_SHEETS_WEBHOOK_URL is not configured in .env. Skipping Google Sheets logging.");
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

// Enable CORS for frontend queries
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Helper to ensure database files exist
const DB_DIR = path.join(__dirname, 'database');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SECURE_UPLOADS_DIR = path.join(__dirname, 'secure_uploads');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(SECURE_UPLOADS_DIR)) {
  fs.mkdirSync(SECURE_UPLOADS_DIR, { recursive: true });
}

const getDbPath = (filename) => path.join(DB_DIR, filename);

const initializeJsonDb = (filename, defaultData = []) => {
  const filePath = getDbPath(filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
};

// Initialize DB files
initializeJsonDb('bookings.json');
initializeJsonDb('contacts.json');
initializeJsonDb('quotes.json');
initializeJsonDb('newsletter.json');
initializeJsonDb('candidates.json');
initializeJsonDb('corporate_applications.json');
initializeJsonDb('manpower_applications.json');
initializeJsonDb('ict_applications.json');

// Initialize documents.json with default statutory mockups
const defaultDocuments = [
  {
    id: "doc_1",
    title: "Company Profile PDF",
    category: "Statutory Cert",
    filename: "Company_Profile_Mildwave.pdf",
    sizeBytes: 3355443, // 3.2 MB
    description: "Comprehensive corporate overview presenting our management board, services framework, and PAN India logistics reach.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  },
  {
    id: "doc_2",
    title: "Registration Certificate",
    category: "Statutory Cert",
    filename: "Incoporation_Certificate_Mildwave.pdf",
    sizeBytes: 1153433, // 1.1 MB
    description: "Verified Ministry of Corporate Affairs incorporation charter for statutory audit clearances.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  },
  {
    id: "doc_3",
    title: "GST Certificate",
    category: "Tax Compliance",
    filename: "GSTIN_Certificate_Mildwave_Corp.pdf",
    sizeBytes: 972800, // 950 KB
    description: "State-wise GSTIN details and taxation registrations for seamless accounts vendor onboarding.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  },
  {
    id: "doc_4",
    title: "Service Brochure",
    category: "Operational SLA",
    filename: "Services_SLA_Brochure_Mildwave.pdf",
    sizeBytes: 5033164, // 4.8 MB
    description: "Technical service brochures with transparent pricing guidelines, SLA frameworks, and escalation schedules.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  },
  {
    id: "doc_5",
    title: "Terms & Conditions",
    category: "Financial Document",
    filename: "Master_MSA_Terms_Mildwave.pdf",
    sizeBytes: 798720, // 780 KB
    description: "Standard master service agreements, liability bounds, payment terms, and arbitration provisions.",
    uploadedAt: new Date("2026-05-25T08:00:00Z").toISOString(),
    isSystem: true
  }
];
initializeJsonDb('documents.json', defaultDocuments);

// Helper to read database
const readDb = (filename) => {
  try {
    const filePath = getDbPath(filename);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading database file: ${filename}`, error);
    return [];
  }
};

// Helper to write database
const writeDb = (filename, data) => {
  try {
    const filePath = getDbPath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing database file: ${filename}`, error);
    return false;
  }
};

// Configure Multer Storage for candidate profiles and statutory legal documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Unique timestamp prefix + sanitised filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

// File Filter for Career Resumes and KYC (PDF, DOC, DOCX, JPG, JPEG, PNG)
const careerFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };
  if (allowedExtensions.includes(ext) && allowedMimeTypes[ext] === file.mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed for recruitment.'));
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadCareerFields = uploadCareer.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'pan', maxCount: 1 }
]);

const uploadDoc = multer({
  storage: storage,
  fileFilter: docFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Secure Multer storage for ICT Lab Instructor role (saves to private folder)
const secureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SECURE_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const uploadIct = multer({
  storage: secureStorage,
  fileFilter: careerFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
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
  { name: 'bank', maxCount: 1 }
]);

const removeUploadedFiles = (files = {}) => {
  Object.values(files).flat().forEach(file => {
    if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
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

// 1. POST /api/booking - Create RO Purifier service bookings
app.post('/api/booking', async (req, res) => {
  const { name, phone, email, city, pincode, type, serviceType, date, time, address, message } = req.body;

  // Serverside Validations
  if (!name || name.trim().length < 2) return res.status(400).json({ error: "Invalid customer name" });
  if (!phone || phone.trim().length < 10) return res.status(400).json({ error: "Invalid mobile number" });
  if (!email || !email.includes('@')) return res.status(400).json({ error: "Invalid email address" });
  if (!city) return res.status(400).json({ error: "City field is required" });
  if (!pincode || pincode.trim().length !== 6) return res.status(400).json({ error: "Pincode must be 6 digits" });
  if (!type) return res.status(400).json({ error: "RO type is required" });
  if (!serviceType) return res.status(400).json({ error: "Service type is required" });
  if (!date) return res.status(400).json({ error: "Preferred slot date is required" });
  if (!time) return res.status(400).json({ error: "Preferred slot time is required" });
  if (!address || address.trim().length < 5) return res.status(400).json({ error: "Service address is too short" });

  const bookings = readDb('bookings.json');
  const newBooking = {
    id: 'ro_' + Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    city: city.trim(),
    pincode: pincode.trim(),
    type,
    serviceType,
    date,
    time,
    address: address.trim(),
    message: (message || '').trim(),
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  if (writeDb('bookings.json', bookings)) {
    const emailBody = `Customer Name: ${newBooking.name}
Mobile: ${newBooking.phone}
Email: ${newBooking.email}
City: ${newBooking.city}
RO Type: ${newBooking.type}
Service Type: ${newBooking.serviceType}
Preferred Date: ${newBooking.date}
Preferred Time: ${newBooking.time}
Address: ${newBooking.address}
Issue Details: ${newBooking.message}`;

    // Trigger background tasks asynchronously (non-blocking)
    sendNotificationEmail("New RO Service Booking Request", emailBody)
      .catch(mailError => console.error("[SMTP ERROR]: Failed to send email \"New RO Service Booking Request\":", mailError.message));
    
    logToGoogleSheets(newBooking)
      .catch(sheetError => console.error("[GOOGLE SHEETS ERROR]: Failed to log booking in background:", sheetError.message));

    return res.status(201).json({ success: true, booking: newBooking });
  } else {
    return res.status(500).json({ error: "Internal Database Write Exception" });
  }
});

// 2. POST /api/contact - General Inquiry contacts
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || name.trim().length < 2) return res.status(400).json({ error: "Invalid name" });
  if (!email || !email.includes('@')) return res.status(400).json({ error: "Invalid email" });
  if (!phone || phone.trim().length < 10) return res.status(400).json({ error: "Invalid phone number" });
  if (!message || message.trim().length < 10) return res.status(400).json({ error: "Message must be at least 10 characters long" });

  const contacts = readDb('contacts.json');
  const newContact = {
    id: 'msg_' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  contacts.push(newContact);
  if (writeDb('contacts.json', contacts)) {
    const emailBody = `Name: ${newContact.name}
Email: ${newContact.email}
Phone Number: ${newContact.phone}
Message: ${newContact.message}`;

    try {
      await sendNotificationEmail("New Contact Inquiry", emailBody);
    } catch (mailError) {
      console.error("[SMTP ERROR]: Failed to send email \"New Contact Inquiry\":", mailError.message);
    }
    return res.status(201).json({ success: true, contact: newContact });
  } else {
    return res.status(500).json({ error: "Internal Database Write Exception" });
  }
});

// 3. POST /api/quote - Request Free Consultative Quote RFQ
app.post('/api/quote', async (req, res) => {
  const { name, phone, email, service, message } = req.body;

  if (!name || name.trim().length < 2) return res.status(400).json({ error: "Invalid name" });
  if (!phone || phone.trim().length < 10) return res.status(400).json({ error: "Invalid phone number" });
  if (!email || !email.includes('@')) return res.status(400).json({ error: "Invalid email address" });
  if (!service) return res.status(400).json({ error: "Service selection is required" });
  if (!message || message.trim().length < 5) return res.status(400).json({ error: "Requirement scope is too short" });

  const quotes = readDb('quotes.json');
  const newQuote = {
    id: 'rfq_' + Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    service,
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  quotes.push(newQuote);
  if (writeDb('quotes.json', quotes)) {
    const emailBody = `Name: ${newQuote.name}
Email: ${newQuote.email}
Phone Number: ${newQuote.phone}
Message: Quote Request for ${newQuote.service} service. Details: ${newQuote.message}`;

    try {
      await sendNotificationEmail("New Contact Inquiry", emailBody);
    } catch (mailError) {
      console.error("[SMTP ERROR]: Failed to send email \"New Contact Inquiry\" (Quote):", mailError.message);
    }
    return res.status(201).json({ success: true, quote: newQuote });
  } else {
    return res.status(500).json({ error: "Internal Database Write Exception" });
  }
});

// 4. POST /api/newsletter - Log email newsletters
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) return res.status(400).json({ error: "Invalid email format" });

  const newsletter = readDb('newsletter.json');
  
  // Avoid duplicate subscriptions
  if (newsletter.some(sub => sub.email.toLowerCase() === email.toLowerCase().trim())) {
    return res.status(200).json({ success: true, message: "Email already registered" });
  }

  const newSubscription = {
    email: email.trim().toLowerCase(),
    subscribedAt: new Date().toISOString()
  };

  newsletter.push(newSubscription);
  if (writeDb('newsletter.json', newsletter)) {
    return res.status(201).json({ success: true, subscription: newSubscription });
  } else {
    return res.status(500).json({ error: "Internal Database Write Exception" });
  }
});

// Helper to escape values for CSV
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    str = `"${str}"`;
  }
  return str;
}

// 5a. POST /api/careers/corporate - Corporate applications with Multi-uploads
app.post('/api/careers/corporate', (req, res) => {
  uploadCareerFields(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { 
      name, phone, email, address, qualification, experience, position,
      skills, certifications, linkedin
    } = req.body;

    // Resume is strictly mandatory for professional roles
    if (!req.files || !req.files['resume']) {
      return res.status(400).json({ error: "Resume document upload is mandatory for professional roles." });
    }

    if (!name || name.trim().length < 2) return res.status(400).json({ error: "Invalid name" });
    if (!phone || phone.trim().length < 10) return res.status(400).json({ error: "Invalid phone number" });
    if (!email || !email.includes('@')) return res.status(400).json({ error: "Invalid email" });
    if (!address || address.trim().length < 5) return res.status(400).json({ error: "Invalid address" });
    if (!qualification || qualification.trim().length < 2) return res.status(400).json({ error: "Invalid qualification" });
    if (!experience || experience.trim().length < 1) return res.status(400).json({ error: "Invalid experience" });
    if (!position) return res.status(400).json({ error: "Applying position is required" });

    const apps = readDb('corporate_applications.json');
    const resumeFile = req.files['resume'][0];
    const photoFile = req.files['photo'] ? req.files['photo'][0] : null;

    const newApp = {
      id: 'corp_' + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      qualification: qualification.trim(),
      experience: experience.trim(),
      position: position.trim(),
      skills: (skills || '').trim(),
      certifications: (certifications || '').trim(),
      linkedin: (linkedin || '').trim(),
      files: {
        resume: `/uploads/${resumeFile.filename}`,
        photo: photoFile ? `/uploads/${photoFile.filename}` : null
      },
      appliedAt: new Date().toISOString()
    };

    apps.push(newApp);
    if (writeDb('corporate_applications.json', apps)) {
      const emailBody = `Corporate Job Application Received
Full Name: ${newApp.name}
Position: ${newApp.position}
Phone: ${newApp.phone}
Email: ${newApp.email}
Address: ${newApp.address}
Qualification: ${newApp.qualification}
Experience: ${newApp.experience}
Skills: ${newApp.skills}
Certifications: ${newApp.certifications}
LinkedIn: ${newApp.linkedin}`;

      const attachments = [];
      attachments.push({ filename: resumeFile.originalname, path: resumeFile.path });
      if (photoFile) attachments.push({ filename: photoFile.originalname, path: photoFile.path });

      try {
        await sendNotificationEmail(`New Corporate Application: ${newApp.position}`, emailBody, attachments);
      } catch (mailError) {
        console.error("[SMTP ERROR]: Failed to send corporate application email:", mailError.message);
      }
      return res.status(201).json({ success: true, candidate: newApp });
    } else {
      return res.status(500).json({ error: "Internal Database Write Exception" });
    }
  });
});

// 5b. POST /api/careers/manpower - Manpower applications with Multi-uploads
app.post('/api/careers/manpower', (req, res) => {
  uploadCareerFields(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { 
      name, phone, email, address, position, aadhaarNumber, panNumber, 
      education, experience, prevEmployer, policeVerification, readyToRelocate, prefShift 
    } = req.body;

    // Aadhaar Card and Passport Photo are mandatory for manpower roles
    if (!req.files || !req.files['aadhaar']) {
      return res.status(400).json({ error: "Aadhaar Card document upload is mandatory." });
    }
    if (!req.files || !req.files['photo']) {
      return res.status(400).json({ error: "Passport size photograph upload is mandatory." });
    }

    // Passport Photo size validation (Max 2MB)
    const photoFile = req.files['photo'][0];
    if (photoFile.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: "Passport size photograph exceeds the 2 MB limit." });
    }

    if (!name || name.trim().length < 2) return res.status(400).json({ error: "Invalid name" });
    if (!phone || phone.trim().length < 10) return res.status(400).json({ error: "Invalid phone number" });
    if (!address || address.trim().length < 5) return res.status(400).json({ error: "Invalid address" });
    if (!aadhaarNumber || aadhaarNumber.trim().length !== 12 || isNaN(aadhaarNumber.trim())) {
      return res.status(400).json({ error: "Aadhaar number must be exactly 12 digits." });
    }
    if (!education) return res.status(400).json({ error: "Highest education is required" });
    if (!experience) return res.status(400).json({ error: "Experience is required" });
    if (!policeVerification) return res.status(400).json({ error: "Police Verification status is required" });
    if (!readyToRelocate) return res.status(400).json({ error: "Relocation willingness is required" });
    if (!prefShift) return res.status(400).json({ error: "Preferred work shift is required" });

    const apps = readDb('manpower_applications.json');
    const aadhaarFile = req.files['aadhaar'][0];
    const panFile = req.files['pan'] ? req.files['pan'][0] : null;

    const newApp = {
      id: 'man_' + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      email: (email || '').trim(),
      address: address.trim(),
      position: position.trim(),
      aadhaarNumber: aadhaarNumber.trim(),
      panNumber: (panNumber || '').trim(),
      education: education.trim(),
      experience: experience.trim(),
      prevEmployer: (prevEmployer || '').trim(),
      policeVerification: policeVerification.trim(),
      readyToRelocate: readyToRelocate.trim(),
      prefShift: prefShift.trim(),
      files: {
        aadhaar: `/uploads/${aadhaarFile.filename}`,
        photo: `/uploads/${photoFile.filename}`,
        pan: panFile ? `/uploads/${panFile.filename}` : null
      },
      appliedAt: new Date().toISOString()
    };

    apps.push(newApp);
    if (writeDb('manpower_applications.json', apps)) {
      const emailBody = `Manpower & Security Job Application Received
Full Name: ${newApp.name}
Position: ${newApp.position}
Phone: ${newApp.phone}
Email: ${newApp.email}
Address: ${newApp.address}
Aadhaar Number: ${newApp.aadhaarNumber}
PAN Number: ${newApp.panNumber}
Highest Education: ${newApp.education}
Experience: ${newApp.experience}
Previous Employer: ${newApp.prevEmployer}
Police Verification Available: ${newApp.policeVerification}
Willing to Relocate: ${newApp.readyToRelocate}
Preferred Work Shift: ${newApp.prefShift}`;

      const attachments = [];
      attachments.push({ filename: aadhaarFile.originalname, path: aadhaarFile.path });
      attachments.push({ filename: photoFile.originalname, path: photoFile.path });
      if (panFile) attachments.push({ filename: panFile.originalname, path: panFile.path });

      try {
        await sendNotificationEmail(`New Manpower Application: ${newApp.position}`, emailBody, attachments);
      } catch (mailError) {
        console.error("[SMTP ERROR]: Failed to send manpower application email:", mailError.message);
      }
      return res.status(201).json({ success: true, candidate: newApp });
    } else {
      return res.status(500).json({ error: "Internal Database Write Exception" });
    }
  });
});

// 5c. GET /api/export/corporate - Download Corporate CSV spreadsheet
app.get('/api/export/corporate', (req, res) => {
  const apps = readDb('corporate_applications.json');
  let csv = '\ufeffID,Applied At,Full Name,Phone,Email,Address,Qualification,Experience,Position,Skills,Certifications,LinkedIn,Resume Path,Photo Path\n';
  
  apps.forEach(app => {
    csv += [
      app.id,
      app.appliedAt,
      app.name,
      app.phone,
      app.email,
      app.address,
      app.qualification,
      app.experience,
      app.position,
      app.skills || '',
      app.certifications || '',
      app.linkedin || '',
      app.files ? app.files.resume : '',
      app.files ? app.files.photo : ''
    ].map(escapeCSV).join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=corporate_applications.csv');
  res.status(200).send(csv);
});

// 5d. GET /api/export/manpower - Download Manpower CSV spreadsheet
app.get('/api/export/manpower', (req, res) => {
  const apps = readDb('manpower_applications.json');
  let csv = '\ufeffID,Applied At,Full Name,Phone,Email,Address,Position,Aadhaar Number,PAN Number,Highest Education,Experience,Previous Employer,Police Verification Available,Willing to Relocate,Preferred Work Shift,Aadhaar Path,Photo Path,PAN Path\n';
  
  apps.forEach(app => {
    csv += [
      app.id,
      app.appliedAt,
      app.name,
      app.phone,
      app.email,
      app.address,
      app.position,
      app.aadhaarNumber,
      app.panNumber || '',
      app.education,
      app.experience,
      app.prevEmployer || '',
      app.policeVerification,
      app.readyToRelocate,
      app.prefShift,
      app.files ? app.files.aadhaar : '',
      app.files ? app.files.photo : '',
      app.files ? app.files.pan : ''
    ].map(escapeCSV).join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=manpower_applications.csv');
  res.status(200).send(csv);
});

// 6. GET /api/documents - Retrieve all statutory certificates
app.get('/api/documents', (req, res) => {
  const documents = readDb('documents.json');
  res.json(documents);
});

// 7. POST /api/document-upload - Administrative legal uploads
app.post('/api/document-upload', (req, res) => {
  uploadDoc.single('document')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { title, category } = req.body;
    const file = req.file;

    if (!title || title.trim().length < 3) return res.status(400).json({ error: "Document title is too short" });
    if (!category) return res.status(400).json({ error: "Document category is required" });
    if (!file) return res.status(400).json({ error: "PDF document attachment is required" });

    const documents = readDb('documents.json');
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
    if (writeDb('documents.json', documents)) {
      return res.status(201).json({ success: true, document: newDoc });
    } else {
      return res.status(500).json({ error: "Internal Database Write Exception" });
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

    const { 
      name, parentName, dob, phone, whatsapp, email, address, district, prefLocation,
      edu10, edu12, eduGrad, gradYear, compDiploma, diplomaYear,
      totalExp, prevEmployer, relevantIct, currentOcc,
      confirmCorrect, consentUse
    } = req.body;

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
    const invalidField = textFields.find(([field, value]) => !value || (field !== 'dob' && value.trim().length < 2));
    if (invalidField) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ error: invalidField[2] });
    }
    if (!/^[0-9]{10}$/.test(phone.trim())) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ error: "Invalid mobile number" });
    }
    if (!/^[0-9]{10}$/.test(whatsapp.trim())) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ error: "Invalid WhatsApp number" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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

    const apps = readDb('ict_applications.json');
    
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
    if (writeDb('ict_applications.json', apps)) {
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

      let whatsapp = { sent: false, fallback: true };
      try {
        whatsapp = await sendWhatsAppIctNotification(newApp);
      } catch (whatsappError) {
        console.error("[WHATSAPP ERROR]: Failed to send ICT application notification:", whatsappError.message);
      }
      return res.status(201).json({ success: true, applicationId: appId, candidate: newApp, whatsappSent: whatsapp.sent });
    } else {
      return res.status(500).json({ error: "Internal Database Write Exception" });
    }
  });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
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
app.get('/api/admin/ict-applications', authAdmin, (req, res) => {
  const apps = readDb('ict_applications.json');
  res.json(apps);
});

// Update ICT Application Status (Admin only)
app.post('/api/admin/ict-applications/status', authAdmin, (req, res) => {
  const { id, status } = req.body;
  const allowedStatuses = ['New', 'Under Review', 'Shortlisted', 'Document Verification', 'Selected', 'Rejected'];
  if (!id || !status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid Application ID or Status" });
  }
  
  const apps = readDb('ict_applications.json');
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Application not found" });
  }
  
  apps[index].status = status;
  if (writeDb('ict_applications.json', apps)) {
    return res.json({ success: true, application: apps[index] });
  } else {
    return res.status(500).json({ error: "Database write error" });
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
app.get('/api/admin/export/ict', authAdmin, (req, res) => {
  const apps = readDb('ict_applications.json');
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
  res.status(200).send(csv);
});

// Handle Multer upload errors gracefully
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "File exceeds 5MB size limit" });
    }
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Mildwave Corporate API Backend running on port ${PORT}`);
  console.log(`Static uploads served at http://localhost:${PORT}/uploads`);
  console.log(`Database records logged under: ${DB_DIR}`);
  console.log(`=======================================================`);
});
