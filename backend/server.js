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
    user: process.env.GMAIL_USER || 'mildwavemmpatna@gmail.com',
    pass: process.env.GMAIL_PASS || ''
  }
});

// Helper to send instant notification email
const sendNotificationEmail = async (subject, textBody, attachments = []) => {
  const mailOptions = {
    from: `"Mildwave Notifications" <${process.env.GMAIL_USER || 'mildwavemmpatna@gmail.com'}>`,
    to: 'mildwavemmpatna@gmail.com',
    subject: subject,
    text: textBody,
    attachments: attachments
  };

  // Skip sending if credentials are not configured
  if (!process.env.GMAIL_PASS) {
    console.warn(`[SMTP WARNING]: GMAIL_PASS is not configured in .env. Email "${subject}" skipped from SMTP transmission but saved to local JSON database.`);
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

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
  if (allowedExtensions.includes(ext)) {
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
  { name: 'photo', maxCount: 1 }
]);

const uploadDoc = multer({
  storage: storage,
  fileFilter: docFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

    try {
      await sendNotificationEmail("New RO Service Booking Request", emailBody);
    } catch (mailError) {
      console.error("[SMTP ERROR]: Failed to send email \"New RO Service Booking Request\":", mailError.message);
    }
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
      name, fatherName, phone, whatsapp, email, dob, gender, 
      currentAddress, permanentAddress, qualification, experience, 
      currentCompany, currentSalary, expectedSalary, preferredLocation, 
      position, noticePeriod, skills, message 
    } = req.body;

    // Aadhaar Card is strictly mandatory
    if (!req.files || !req.files['aadhaar']) {
      return res.status(400).json({ error: "Aadhaar Card document upload is mandatory." });
    }

    if (!name || name.trim().length < 2) return res.status(400).json({ error: "Invalid name" });
    if (!phone || phone.trim().length < 10) return res.status(400).json({ error: "Invalid phone number" });
    if (!email || !email.includes('@')) return res.status(400).json({ error: "Invalid email" });
    if (!position) return res.status(400).json({ error: "Applying position is required" });

    const apps = readDb('corporate_applications.json');
    const resumeFile = req.files['resume'] ? req.files['resume'][0] : null;
    const aadhaarFile = req.files['aadhaar'][0];
    const photoFile = req.files['photo'] ? req.files['photo'][0] : null;

    const newApp = {
      id: 'corp_' + Date.now(),
      name: name.trim(),
      fatherName: (fatherName || '').trim(),
      phone: phone.trim(),
      whatsapp: (whatsapp || '').trim(),
      email: email.trim(),
      dob: (dob || '').trim(),
      gender: (gender || '').trim(),
      currentAddress: (currentAddress || '').trim(),
      permanentAddress: (permanentAddress || '').trim(),
      qualification: (qualification || '').trim(),
      experience: (experience || '').trim(),
      currentCompany: (currentCompany || '').trim(),
      currentSalary: (currentSalary || '').trim(),
      expectedSalary: (expectedSalary || '').trim(),
      preferredLocation: (preferredLocation || '').trim(),
      position,
      noticePeriod: (noticePeriod || '').trim(),
      skills: (skills || '').trim(),
      message: (message || '').trim(),
      files: {
        resume: resumeFile ? `/uploads/${resumeFile.filename}` : null,
        aadhaar: `/uploads/${aadhaarFile.filename}`,
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
Preferred Location: ${newApp.preferredLocation}
Expected Salary: ${newApp.expectedSalary}`;

      const attachments = [];
      if (resumeFile) attachments.push({ filename: resumeFile.originalname, path: resumeFile.path });
      attachments.push({ filename: aadhaarFile.originalname, path: aadhaarFile.path });
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
      name, fatherName, phone, whatsapp, aadhaarNumber, dob, gender, 
      currentAddress, permanentAddress, state, district, pincode, 
      education, experience, preferredLocation, position, expectedSalary, 
      readyToRelocate, policeVerification 
    } = req.body;

    // Aadhaar Card is strictly mandatory
    if (!req.files || !req.files['aadhaar']) {
      return res.status(400).json({ error: "Aadhaar Card document upload is mandatory." });
    }

    if (!name || name.trim().length < 2) return res.status(400).json({ error: "Invalid name" });
    if (!phone || phone.trim().length < 10) return res.status(400).json({ error: "Invalid phone number" });
    if (!aadhaarNumber || aadhaarNumber.trim().length !== 12 || isNaN(aadhaarNumber)) {
      return res.status(400).json({ error: "Aadhaar number must be exactly 12 digits." });
    }
    if (!position) return res.status(400).json({ error: "Applying position is required" });

    const apps = readDb('manpower_applications.json');
    const resumeFile = req.files['resume'] ? req.files['resume'][0] : null;
    const aadhaarFile = req.files['aadhaar'][0];
    const photoFile = req.files['photo'] ? req.files['photo'][0] : null;

    const newApp = {
      id: 'man_' + Date.now(),
      name: name.trim(),
      fatherName: (fatherName || '').trim(),
      phone: phone.trim(),
      whatsapp: (whatsapp || '').trim(),
      aadhaarNumber: aadhaarNumber.trim(),
      dob: (dob || '').trim(),
      gender: (gender || '').trim(),
      currentAddress: (currentAddress || '').trim(),
      permanentAddress: (permanentAddress || '').trim(),
      state: (state || '').trim(),
      district: (district || '').trim(),
      pincode: (pincode || '').trim(),
      education: (education || '').trim(),
      experience: (experience || '').trim(),
      preferredLocation: (preferredLocation || '').trim(),
      position,
      expectedSalary: (expectedSalary || '').trim(),
      readyToRelocate: (readyToRelocate || '').trim(),
      policeVerification: (policeVerification || '').trim(),
      files: {
        resume: resumeFile ? `/uploads/${resumeFile.filename}` : null,
        aadhaar: `/uploads/${aadhaarFile.filename}`,
        photo: photoFile ? `/uploads/${photoFile.filename}` : null
      },
      appliedAt: new Date().toISOString()
    };

    apps.push(newApp);
    if (writeDb('manpower_applications.json', apps)) {
      const emailBody = `Manpower Job Application Received
Full Name: ${newApp.name}
Position: ${newApp.position}
Phone: ${newApp.phone}
Aadhaar Number: ${newApp.aadhaarNumber}
Preferred Location: ${newApp.preferredLocation}
Expected Salary: ${newApp.expectedSalary}`;

      const attachments = [];
      if (resumeFile) attachments.push({ filename: resumeFile.originalname, path: resumeFile.path });
      attachments.push({ filename: aadhaarFile.originalname, path: aadhaarFile.path });
      if (photoFile) attachments.push({ filename: photoFile.originalname, path: photoFile.path });

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
  let csv = '\ufeffID,Applied At,Full Name,Father\'s Name,Phone,WhatsApp,Email,Date of Birth,Gender,Current Address,Permanent Address,Highest Qualification,Experience,Current Company,Current Salary,Expected Salary,Preferred Job Location,Position Applying For,Notice Period,Skills,Resume Path,Aadhaar Path,Photo Path,Cover Letter\n';
  
  apps.forEach(app => {
    csv += [
      app.id,
      app.appliedAt,
      app.name,
      app.fatherName,
      app.phone,
      app.whatsapp,
      app.email,
      app.dob,
      app.gender,
      app.currentAddress,
      app.permanentAddress,
      app.qualification,
      app.experience,
      app.currentCompany,
      app.currentSalary,
      app.expectedSalary,
      app.preferredLocation,
      app.position,
      app.noticePeriod,
      app.skills,
      app.files ? app.files.resume : '',
      app.files ? app.files.aadhaar : '',
      app.files ? app.files.photo : '',
      app.message
    ].map(escapeCSV).join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=corporate_applications.csv');
  res.status(200).send(csv);
});

// 5d. GET /api/export/manpower - Download Manpower CSV spreadsheet
app.get('/api/export/manpower', (req, res) => {
  const apps = readDb('manpower_applications.json');
  let csv = '\ufeffID,Applied At,Full Name,Father\'s Name,Phone,WhatsApp,Aadhaar Number,Date of Birth,Gender,Current Address,Permanent Address,State,District,PIN Code,Education,Experience,Preferred Job Location,Position Applying For,Expected Salary,Ready to Relocate,Police Verification Available,Resume Path,Aadhaar Path,Photo Path\n';
  
  apps.forEach(app => {
    csv += [
      app.id,
      app.appliedAt,
      app.name,
      app.fatherName,
      app.phone,
      app.whatsapp,
      app.aadhaarNumber,
      app.dob,
      app.gender,
      app.currentAddress,
      app.permanentAddress,
      app.state,
      app.district,
      app.pincode,
      app.education,
      app.experience,
      app.preferredLocation,
      app.position,
      app.expectedSalary,
      app.readyToRelocate,
      app.policeVerification,
      app.files ? app.files.resume : '',
      app.files ? app.files.aadhaar : '',
      app.files ? app.files.photo : ''
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
