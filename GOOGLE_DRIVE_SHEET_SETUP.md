# Mildwave ICT Lab Instructor Data Storage Setup Guide

You can store ICT Lab Instructor applications in **Google Drive (Google Sheets / Google Drive Folder)** or via **Google Forms**. Below are the two easiest and most reliable methods.

---

## 🚀 Method 1: Automatic Sync to Google Drive / Google Sheets (Recommended)

Whenever a candidate applies on your website, their data and all document download links are **automatically pushed into a Google Sheet stored in your Google Drive in real time**.

### Step 1: Create the Google Sheet in Google Drive
1. Go to [Google Drive](https://drive.google.com).
2. Click **+ New** > **Google Sheets** > **Blank spreadsheet**.
3. Name the spreadsheet: `Mildwave ICT Lab Instructor Applications`.

### Step 2: Open Apps Script
1. In your new Google Sheet, click **Extensions** in the top menu bar.
2. Select **Apps Script**.

### Step 3: Paste the Mildwave Webhook Script
1. Delete any sample code in the editor.
2. Open [`google_apps_script_ict.js`](file:///C:/Users/basit/.gemini/antigravity-ide/scratch/mildwave/google_apps_script_ict.js) and copy the entire code.
3. Paste the code into the Apps Script editor.

### Step 4: Deploy as a Web App
1. In the top-right corner of Apps Script, click **Deploy** > **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and choose **Web app**.
3. Fill in the deployment details:
   - **Description:** `Mildwave ICT Webhook`
   - **Execute as:** `Me (<your-email>@gmail.com)`
   - **Who has access:** `Anyone` *(Crucial: Allows the website backend to send application data)*
4. Click **Deploy**.
5. Click **Authorize access**, select your Google account, click *Advanced*, and click *Go to Untitled project (unsafe)* to permit access.
6. Copy the generated **Web app URL** (it looks like: `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 5: Add Webhook to Mildwave Backend
1. Open [`backend/.env`](file:///C:/Users/basit/.gemini/antigravity-ide/scratch/mildwave/backend/.env).
2. Paste the URL into `GOOGLE_ICT_WEBHOOK_URL`:
   ```env
   GOOGLE_ICT_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
3. Restart your backend server (`node server.js` or `npm start`).

✅ **Result:** Every time a candidate submits the ICT Lab Instructor application, a new row is instantly added to your Google Sheet with:
- Candidate Name & Parent Name
- Mobile & WhatsApp Number
- DOB, Email, Full Address, District, & Preferred Location
- Qualifications (10th, 12th, Graduation, Computer Diploma, Passing Years)
- Work Experience & ICT Experience Details
- Direct clickable links to all 10 uploaded documents (Resume, Photos, Marksheets, Aadhaar, PAN, Passbook).

---

## 📋 Method 2: Using a Google Form

If you prefer to collect applications directly using a Google Form:

### Step 1: Create the Form
1. Go to [Google Forms](https://forms.google.com).
2. Click **+ Blank form** and title it: `Kendriya Bhandar Phase 2 – ICT Lab Instructor Application`.

### Step 2: Add Form Fields
Add the following questions:
1. **Full Name** (Short answer, Required)
2. **Father's / Mother's Name** (Short answer, Required)
3. **Date of Birth** (Date, Required)
4. **Mobile Number** (Short answer, Required)
5. **WhatsApp Number** (Short answer, Required)
6. **Email Address** (Short answer, Required)
7. **Complete Residential Address** (Paragraph, Required)
8. **District** (Short answer, Required)
9. **Preferred Location** (Multiple choice: `Patna`, `Gaya`, `Jehanabad`, Required)
10. **10th Qualification Details** (Short answer, Required)
11. **12th Qualification Details** (Short answer, Required)
12. **Graduation Degree & Passing Year** (Short answer, Required)
13. **1-Year Computer Diploma Details & Year** (Short answer: ADCA, DCA, PGDCA, etc., Required)
14. **Total Work Experience** (Short answer, Required)
15. **Previous Employer / Organization** (Short answer)
16. **Relevant ICT / Teaching Experience** (Paragraph, Required)
17. **File Uploads** (File upload question type):
    - Resume / CV
    - Passport Photos
    - Educational Marksheets & Certificates
    - Aadhaar & PAN Card
    - Bank Passbook / Cheque

### Step 3: Link Responses to Google Drive & Google Sheets
1. In Google Forms, click the **Responses** tab.
2. Click **Link to Sheets** (green spreadsheet icon).
3. Select **Create a new spreadsheet**. All candidate responses and uploaded files will be stored directly in your Google Drive!
