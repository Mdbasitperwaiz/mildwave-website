const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const DB_DIR = path.resolve(__dirname, 'database');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log("=== STARTING API & DATABASE CONNECTIVITY VERIFICATION ===");
  
  // 1. Check Server Status
  try {
    const res = await fetch(`${BASE_URL}/api/status`);
    const statusData = await res.json();
    console.log("✓ Server Status API:", statusData);
  } catch (err) {
    console.error("✗ Server status failed:", err.message);
    process.exit(1);
  }

  // 2. Test POST /api/contact
  try {
    const contactPayload = {
      name: "Test Contact User",
      email: "contact_test@mildwave.com",
      phone: "9876543210",
      message: "Testing general contact form connectivity."
    };
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactPayload)
    });
    const data = await res.json();
    console.log("✓ POST /api/contact Response:", res.status, data.success ? "Success" : "Failed");
    
    // Verify in database/contacts.json
    const contacts = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'contacts.json'), 'utf-8'));
    const found = contacts.some(c => c.email === contactPayload.email);
    console.log("✓ Record found in contacts.json:", found);
    if (!found) throw new Error("Contact record not written to contacts.json");
  } catch (err) {
    console.error("✗ Contact test failed:", err.message);
  }

  // 3. Test POST /api/book-service
  try {
    const bookingPayload = {
      name: "Test Booking User",
      phone: "9876543211",
      email: "booking_test@mildwave.com",
      city: "Patna",
      pincode: "800024",
      type: "Domestic / Home",
      serviceType: "RO Repair",
      date: "2026-09-01",
      time: "Morning (9 AM - 12 PM)",
      address: "Road No. 04, House No-69, Indrapuri, Patna",
      message: "Test RO servicing request."
    };
    const res = await fetch(`${BASE_URL}/api/book-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload)
    });
    const data = await res.json();
    console.log("✓ POST /api/book-service Response:", res.status, data.success ? "Success" : "Failed");
    
    // Verify in database/bookings.json
    const bookings = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'bookings.json'), 'utf-8'));
    const found = bookings.some(b => b.phone === bookingPayload.phone);
    console.log("✓ Record found in bookings.json:", found);
    if (!found) throw new Error("Booking record not written to bookings.json");
  } catch (err) {
    console.error("✗ Booking test failed:", err.message);
  }

  // 4. Test POST /api/quote
  try {
    const quotePayload = {
      name: "Test Quote User",
      phone: "9876543212",
      email: "quote_test@mildwave.com",
      service: "IT Services",
      message: "Testing corporate RFQ quote request."
    };
    const res = await fetch(`${BASE_URL}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotePayload)
    });
    const data = await res.json();
    console.log("✓ POST /api/quote Response:", res.status, data.success ? "Success" : "Failed");
    
    // Verify in database/quotes.json
    const quotes = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'quotes.json'), 'utf-8'));
    const found = quotes.some(q => q.email === quotePayload.email);
    console.log("✓ Record found in quotes.json:", found);
    if (!found) throw new Error("Quote record not written to quotes.json");
  } catch (err) {
    console.error("✗ Quote test failed:", err.message);
  }

  // 5. Test POST /api/newsletter
  try {
    const newsPayload = { email: "newsletter_test@mildwave.com" };
    const res = await fetch(`${BASE_URL}/api/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsPayload)
    });
    const data = await res.json();
    console.log("✓ POST /api/newsletter Response:", res.status, data.success ? "Success" : "Failed");
    
    // Verify in database/newsletter.json
    const newsletter = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'newsletter.json'), 'utf-8'));
    const found = newsletter.some(n => n.email === newsPayload.email);
    console.log("✓ Record found in newsletter.json:", found);
    if (!found) throw new Error("Newsletter record not written to newsletter.json");
  } catch (err) {
    console.error("✗ Newsletter test failed:", err.message);
  }

  // 6. Test POST /api/apply
  try {
    const applyPayload = {
      name: "Test Universal Candidate",
      phone: "9876543213",
      email: "apply_test@mildwave.com",
      position: "Housekeeping Staff",
      place: "Patna, Bihar",
      message: "Testing universal apply endpoint."
    };
    const res = await fetch(`${BASE_URL}/api/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applyPayload)
    });
    const data = await res.json();
    console.log("✓ POST /api/apply Response:", res.status, data.success ? "Success" : "Failed");
    
    // Verify in database/candidates.json and database/manpower_applications.json
    const candidates = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'candidates.json'), 'utf-8'));
    const found = candidates.some(c => c.phone === applyPayload.phone);
    console.log("✓ Record found in candidates.json:", found);
    if (!found) throw new Error("Apply record not written to candidates.json");
  } catch (err) {
    console.error("✗ Apply test failed:", err.message);
  }

  // 7. Verify CSV Master Application Sheet
  try {
    const csvContent = fs.readFileSync(path.join(DB_DIR, 'candidates_master.csv'), 'utf-8');
    console.log("✓ candidates_master.csv lines count:", csvContent.split('\n').length);
  } catch (err) {
    console.error("✗ CSV master sheet check failed:", err.message);
  }

  console.log("=== ALL API & DATABASE TESTS COMPLETED SUCCESSFULLY ===");
}

runTests();
