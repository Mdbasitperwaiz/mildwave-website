/**
 * Google Apps Script for Mildwave ICT Lab Instructor Applications
 * 
 * INSTRUCTIONS:
 * 1. Open Google Drive (https://drive.google.com).
 * 2. Create a new Google Sheet named: "Mildwave ICT Lab Instructor Applications".
 * 3. In the Google Sheet top menu, click Extensions -> Apps Script.
 * 4. Replace any default code with this entire script.
 * 5. Click "Deploy" -> "New deployment".
 * 6. Select Type: "Web app".
 * 7. In Description, type: "Mildwave ICT Webhook".
 * 8. Set "Execute as": "Me (your email)".
 * 9. Set "Who has access": "Anyone" (CRITICAL: Allows your server to submit data).
 * 10. Click "Deploy", authorize permissions when prompted, and copy the Web App URL.
 * 11. Paste the Web App URL into your backend/.env as:
 *     GOOGLE_ICT_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 10-second lock to prevent concurrent write collisions

  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "ICT Candidates";
    var sheet = ss.getSheetByName(sheetName);

    // Create and format the sheet if it doesn't exist yet
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      var headers = [
        "Application ID",
        "Applied At (IST)",
        "Candidate Name",
        "Father/Mother Name",
        "Date of Birth",
        "Mobile Number",
        "WhatsApp Number",
        "Email Address",
        "Address",
        "District",
        "Preferred Location",
        "10th Qualification",
        "12th Qualification",
        "Graduation",
        "Graduation Year",
        "Computer Diploma",
        "Diploma Year",
        "Total Experience",
        "Previous Employer",
        "Relevant ICT Exp",
        "Current Occupation",
        "Status",
        "Resume Link",
        "Photo 1",
        "Photo 2",
        "10th Marksheet",
        "12th Marksheet",
        "Graduation Doc",
        "Diploma Doc",
        "Aadhaar Card",
        "PAN Card",
        "Bank Passbook"
      ];

      sheet.appendRow(headers);
      
      // Style header row
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#0F766E"); // Mildwave Teal
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setFontFamily("Poppins");
      sheet.setFrozenRows(1);
    }

    var docUrls = data.docUrls || {};
    var timestamp = data.appliedAt ? new Date(data.appliedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Build the row data
    var newRow = [
      data.id || "N/A",
      timestamp,
      data.name || "",
      data.parentName || "",
      data.dob || "",
      data.phone || "",
      data.whatsapp || "",
      data.email || "",
      data.address || "",
      data.district || "",
      data.prefLocation || "",
      data.edu10 || "",
      data.edu12 || "",
      data.eduGrad || "",
      data.gradYear || "",
      data.compDiploma || "",
      data.diplomaYear || "",
      data.totalExp || "",
      data.prevEmployer || "",
      data.relevantIct || "",
      data.currentOcc || "",
      data.status || "New",
      docUrls.resume || (data.files && data.files.resume) || "",
      docUrls.photo1 || (data.files && data.files.photo1) || "",
      docUrls.photo2 || (data.files && data.files.photo2) || "",
      docUrls.marksheet10 || (data.files && data.files.marksheet10) || "",
      docUrls.marksheet12 || (data.files && data.files.marksheet12) || "",
      docUrls.graduation || (data.files && data.files.graduation) || "",
      docUrls.diploma || (data.files && data.files.diploma) || "",
      docUrls.aadhaar || (data.files && data.files.aadhaar) || "",
      docUrls.pan || (data.files && data.files.pan) || "",
      docUrls.bank || (data.files && data.files.bank) || ""
    ];

    sheet.appendRow(newRow);

    // Auto-fit column widths for neat look
    for (var col = 1; col <= newRow.length; col++) {
      sheet.autoResizeColumn(col);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ "status": "success", "id": data.id, "row": sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ "status": "active", "service": "Mildwave ICT Google Sync Service" }))
    .setMimeType(ContentService.MimeType.JSON);
}
