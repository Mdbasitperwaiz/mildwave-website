// Mildwave Marketing PVT.LTD - Interactive Client Controller
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://mildwave-backend.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Vector Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 2. Navigation & Sticky Scroll Events
  const navbar = document.getElementById('main-navbar');
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  
  window.addEventListener('scroll', () => {
    // Sticky Header styles on scroll
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Scroll To Top button visibility
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('active');
    } else {
      scrollTopBtn.classList.remove('active');
    }
    
    // Highlight Active Nav Links based on section in view
    trackActiveNavLinks();
  });

  // 3. Scroll Reveal intersection observer
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target); // Reveal once
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // 4. Premium Carousel Engine
  let currentSlideIndex = 0;
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  let slideInterval;

  function showSlide(index) {
    if (slides.length === 0) return;
    
    if (index >= slides.length) {
      currentSlideIndex = 0;
    } else if (index < 0) {
      currentSlideIndex = slides.length - 1;
    } else {
      currentSlideIndex = index;
    }

    slides.forEach((slide, i) => {
      if (i === currentSlideIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, i) => {
      if (i === currentSlideIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Dynamic control adapters for light backgrounds
    const heroSection = document.getElementById('home');
    if (heroSection) {
      const activeSlide = slides[currentSlideIndex];
      if (activeSlide && activeSlide.classList.contains('slide-light-theme')) {
        heroSection.classList.add('light-slide-active');
      } else {
        heroSection.classList.remove('light-slide-active');
      }
    }
  }

  function startAutoSlide() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => {
      showSlide(currentSlideIndex + 1);
    }, 4500); // 4.5 seconds auto slide
  }

  window.moveSlide = function(step) {
    showSlide(currentSlideIndex + step);
    startAutoSlide();
  };

  window.setSlide = function(index) {
    showSlide(index);
    startAutoSlide();
  };

  if (slides.length > 0) {
    showSlide(0);
    startAutoSlide();
  }

  // Touch swipe support for carousel on mobile devices
  const carouselEl = document.querySelector('.hero-carousel');
  if (carouselEl) {
    let touchStartX = 0;
    let touchEndX = 0;
    
    carouselEl.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    carouselEl.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
      const swipeThreshold = 40; // minimum touch drag distance
      if (touchStartX - touchEndX > swipeThreshold) {
        window.moveSlide(1); // Swiped Left
      } else if (touchEndX - touchStartX > swipeThreshold) {
        window.moveSlide(-1); // Swiped Right
      }
    }
  }

  // Safety trigger: close mobile navigation menu when a link is clicked
  const mobileNavLinksList = document.querySelectorAll('.mobile-nav-links a');
  mobileNavLinksList.forEach(link => {
    link.addEventListener('click', () => {
      if (typeof closeMobileMenu === 'function') {
        closeMobileMenu();
      }
    });
  });


  // 5. Statistics Increment Counter Animation
  const statNumbers = document.querySelectorAll('.stat-number');
  let statsAnimated = false;

  const countUp = (element) => {
    const target = parseInt(element.getAttribute('data-target'), 10);
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = progress * (2 - progress);
      const currentValue = Math.floor(easeProgress * target);
      
      if (target === 999) {
        const progressVal = Math.floor(easeProgress * 100);
        element.textContent = progressVal + "%";
        if (progress === 1) {
          element.textContent = "Pan India";
        }
      } else {
        element.textContent = currentValue + "+";
      }
      
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        if (target === 999) {
          element.textContent = "Pan India";
        } else {
          element.textContent = target + "+";
        }
      }
    };
    
    requestAnimationFrame(updateCount);
  };

  const aboutSection = document.querySelector('.about-company-section');
  if (aboutSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !statsAnimated) {
        statNumbers.forEach(num => countUp(num));
        statsAnimated = true;
        statsObserver.unobserve(aboutSection);
      }
    }, { threshold: 0.25 });
    
    statsObserver.observe(aboutSection);
  }

  // Set minimum date picker limits on RO Booking date to tomorrow
  const roDateInput = document.getElementById('ro-date');
  if (roDateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    roDateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  // statutory document dropzone selectors
  const docDropzone = document.getElementById('doc-upload-dropzone');
  if (docDropzone) {
    docDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      docDropzone.classList.add('selected');
    });
    docDropzone.addEventListener('dragleave', () => {
      docDropzone.classList.remove('selected');
    });
    docDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      docDropzone.classList.remove('selected');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const fileInput = document.getElementById('upload-doc-input');
        fileInput.files = files;
        handleDocFileSelect({ target: fileInput });
      }
    });
  }

  // Trigger SPA Router on initial load
  handleRoute();
  
  // Load statutory documents dynamically from backend
  if (typeof window.loadLegalDocuments === 'function') {
    window.loadLegalDocuments();
  }
});

// 5. Section Active State Link Highlighting Logic (Scroll-based active states for home)
function trackActiveNavLinks() {
  if (window.location.hash !== '' && window.location.hash !== '#home') return;
  
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a');
  
  let currentActiveSectionId = '';
  
  sections.forEach(section => {
    // Only track standard landing sections when on home view
    const secId = section.getAttribute('id');
    if (secId === 'projects' || secId === 'documents') return;

    const sectionTop = section.offsetTop - 120;
    const sectionHeight = section.offsetHeight;
    if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
      currentActiveSectionId = secId;
    }
  });

  if (currentActiveSectionId) {
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentActiveSectionId}`) {
        link.classList.add('active');
      }
    });
  }
}

// 6. Mobile Sidebar drawer controls
const mobileSidebar = document.getElementById('mobile-sidebar-menu');
const navOverlay = document.getElementById('nav-overlay');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const menuCloseBtn = document.getElementById('menu-close-btn');

if (menuToggleBtn && mobileSidebar && navOverlay) {
  menuToggleBtn.addEventListener('click', () => {
    mobileSidebar.classList.add('active');
    navOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock background scroll
  });
}

function closeMobileMenu() {
  if (mobileSidebar && navOverlay) {
    mobileSidebar.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = 'auto'; // Unlock background scroll
  }
}

if (menuCloseBtn) {
  menuCloseBtn.addEventListener('click', closeMobileMenu);
}
if (navOverlay) {
  navOverlay.addEventListener('click', closeMobileMenu);
}

// 7. Scroll-to-Top utility
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// 8. Custom Form Validation Utilities
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePhone(phone) {
  // Matches Indian 10 digit mobile standards starting with 6, 7, 8 or 9
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone.replace(/[\s\-\+\(\)]/g, ''));
}

function highlightError(element, isValid) {
  if (isValid) {
    element.style.borderColor = 'var(--border-light)';
    element.style.backgroundColor = 'var(--light-bg)';
  } else {
    element.style.borderColor = '#ef4444';
    element.style.backgroundColor = '#fef2f2';
  }
}

// Helper to toggle button loading spinners during AJAX dispatches
function toggleButtonLoading(buttonEl, isLoading, originalText) {
  if (!buttonEl) return;
  if (isLoading) {
    buttonEl.disabled = true;
    buttonEl.classList.add('loading');
    buttonEl.innerHTML = `<span class="btn-spinner"></span> Sending...`;
  } else {
    buttonEl.disabled = false;
    buttonEl.classList.remove('loading');
    buttonEl.innerHTML = originalText;
  }
}

// Helper to format booking payload and redirect to WhatsApp
function redirectToWhatsApp(payload) {
  const waNumber = "918544071616";
  const messageText = `*Mildwave RO Booking Request*
----------------------------------------
*Customer Name:* ${payload.name}
*Mobile Number:* ${payload.phone}
*Email Address:* ${payload.email}
*City:* ${payload.city} (Pincode: ${payload.pincode})
*RO Type:* ${payload.type}
*Service Required:* ${payload.serviceType}
*Preferred Date:* ${payload.date}
*Preferred Slot:* ${payload.time}
*Service Address:* ${payload.address}
*Problem Details:* ${payload.message || 'None'}`;

  const encodedText = encodeURIComponent(messageText);
  const waUrl = `https://wa.me/${waNumber}?text=${encodedText}`;
  window.open(waUrl, '_blank');
}

// 9. RO Service Booking submission
function handleROSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('ro-name');
  const phone = document.getElementById('ro-phone');
  const email = document.getElementById('ro-email');
  const city = document.getElementById('ro-city');
  const pincode = document.getElementById('ro-pincode');
  const type = document.getElementById('ro-type');
  const serviceType = document.getElementById('ro-service-type');
  const date = document.getElementById('ro-date');
  const time = document.getElementById('ro-time');
  const address = document.getElementById('ro-address');
  const message = document.getElementById('ro-message');
  
  let isValid = true;
  
  // Custom Validation checks
  if (name.value.trim().length < 2) { highlightError(name, false); isValid = false; } else { highlightError(name, true); }
  if (!validatePhone(phone.value)) { highlightError(phone, false); isValid = false; } else { highlightError(phone, true); }
  if (!validateEmail(email.value)) { highlightError(email, false); isValid = false; } else { highlightError(email, true); }
  if (city.value.trim().length < 2) { highlightError(city, false); isValid = false; } else { highlightError(city, true); }
  if (pincode.value.trim().length !== 6 || isNaN(pincode.value.trim())) { highlightError(pincode, false); isValid = false; } else { highlightError(pincode, true); }
  if (type.value === '') { highlightError(type, false); isValid = false; } else { highlightError(type, true); }
  if (serviceType.value === '') { highlightError(serviceType, false); isValid = false; } else { highlightError(serviceType, true); }
  if (!date.value) { highlightError(date, false); isValid = false; } else { highlightError(date, true); }
  if (time.value === '') { highlightError(time, false); isValid = false; } else { highlightError(time, true); }
  if (address.value.trim().length < 5) { highlightError(address, false); isValid = false; } else { highlightError(address, true); }
  
  if (isValid) {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Book RO Service';
    if (submitBtn) toggleButtonLoading(submitBtn, true);
 
    const payload = {
      name: name.value.trim(),
      phone: phone.value.trim(),
      email: email.value.trim(),
      city: city.value.trim(),
      pincode: pincode.value.trim(),
      type: type.value,
      serviceType: serviceType.value,
      date: date.value,
      time: time.value,
      address: address.value.trim(),
      message: message ? message.value.trim() : ''
    };
 
    fetch(`${API_BASE}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) throw new Error("Server error");
      return response.json();
    })
    .then(data => {
      if (submitBtn) toggleButtonLoading(submitBtn, false, originalBtnText);
      document.getElementById('ro-form-container').style.display = 'none';
      const successPanel = document.getElementById('ro-success-panel');
      successPanel.style.display = 'block';
      showToastNotification("Booking submitted! Transferring to WhatsApp...");
      
      // Redirect to WhatsApp after 1 second
      setTimeout(() => {
        redirectToWhatsApp(payload);
      }, 1000);
    })
    .catch(error => {
      console.warn("Express server offline / error. Transferring directly to WhatsApp.", error);
      if (submitBtn) toggleButtonLoading(submitBtn, false, originalBtnText);
      document.getElementById('ro-form-container').style.display = 'none';
      const successPanel = document.getElementById('ro-success-panel');
      successPanel.style.display = 'block';
      showToastNotification("Transferring to WhatsApp...");
      
      // Redirect directly to WhatsApp even if backend database fails
      setTimeout(() => {
        redirectToWhatsApp(payload);
      }, 1000);
    });
  } else {
    showToastNotification("Please fill all required fields correctly.", "error");
  }
}


function resetROForm() {
  document.getElementById('ro-booking-form').reset();
  document.getElementById('ro-form-container').style.display = 'block';
  document.getElementById('ro-success-panel').style.display = 'none';
  
  // Reset border highlights
  const inputs = document.querySelectorAll('#ro-booking-form .form-control');
  inputs.forEach(el => highlightError(el, true));
}

// 10. Careers Resume File Selector & Drag-Drop UI Support
const fileZone = document.getElementById('file-dropzone');
if (fileZone) {
  fileZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileZone.classList.add('dragover');
  });
  
  fileZone.addEventListener('dragleave', () => {
    fileZone.classList.remove('dragover');
  });
  
  fileZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileInput = document.getElementById('career-resume');
      fileInput.files = files;
      
      // Update UI with file details
      updateFileUploadUI(files[0]);
    }
  });
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    updateFileUploadUI(file);
  }
}

function updateFileUploadUI(file) {
  const fileZone = document.getElementById('file-dropzone');
  const title = document.getElementById('upload-box-title');
  const meta = document.getElementById('upload-box-meta');
  
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  if (file.size > 5 * 1024 * 1024) {
    showToastNotification("File size exceeds 5MB limit", "error");
    document.getElementById('career-resume').value = ""; // Clear file
    title.textContent = "Click or drag & drop file here";
    meta.textContent = "PDF or Word format (Max size 5MB)";
    fileZone.classList.remove('selected');
    return;
  }
  
  title.textContent = file.name;
  meta.textContent = `File loaded successfully (${sizeMB} MB)`;
  fileZone.classList.add('selected');
}

function handleCareerSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('career-name');
  const email = document.getElementById('career-email');
  const phone = document.getElementById('career-phone');
  const position = document.getElementById('career-position');
  const message = document.getElementById('career-message');
  const fileInput = document.getElementById('career-resume');
  const fileZone = document.getElementById('file-dropzone');
  
  let isValid = true;
  
  if (name.value.trim().length < 2) { highlightError(name, false); isValid = false; } else { highlightError(name, true); }
  if (!validateEmail(email.value)) { highlightError(email, false); isValid = false; } else { highlightError(email, true); }
  if (!validatePhone(phone.value)) { highlightError(phone, false); isValid = false; } else { highlightError(phone, true); }
  if (position.value === '') { highlightError(position, false); isValid = false; } else { highlightError(position, true); }
  
  if (fileInput.files.length === 0) {
    fileZone.style.borderColor = '#ef4444';
    isValid = false;
  } else {
    fileZone.style.borderColor = '#cbd5e1';
  }
  
  if (isValid) {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit Application';
    if (submitBtn) toggleButtonLoading(submitBtn, true);

    const formData = new FormData();
    formData.append('name', name.value.trim());
    formData.append('email', email.value.trim());
    formData.append('phone', phone.value.trim());
    formData.append('position', position.value);
    formData.append('message', message ? message.value.trim() : '');
    formData.append('resume', fileInput.files[0]);

    fetch(`${API_BASE}/api/careers`, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) throw new Error("Server error");
      return response.json();
    })
    .then(data => {
      if (submitBtn) toggleButtonLoading(submitBtn, false, originalBtnText);
      document.getElementById('career-form-container').style.display = 'none';
      document.getElementById('career-success-panel').style.display = 'block';
      showToastNotification("Application submitted successfully!");
    })
    .catch(error => {
      console.error("Submission failed:", error);
      if (submitBtn) toggleButtonLoading(submitBtn, false, originalBtnText);
      showToastNotification("Something went wrong. Please try again.", "error");
    });
  } else {
    showToastNotification("Please review required profile fields.", "error");
  }
}

function resetCareerForm() {
  document.getElementById('career-application-form').reset();
  document.getElementById('career-form-container').style.display = 'block';
  document.getElementById('career-success-panel').style.display = 'none';
  
  // Reset dropzone details
  const title = document.getElementById('upload-box-title');
  const meta = document.getElementById('upload-box-meta');
  const fileZone = document.getElementById('file-dropzone');
  title.textContent = "Click or drag & drop file here";
  meta.textContent = "PDF or Word format (Max size 5MB)";
  fileZone.classList.remove('selected');
  fileZone.style.borderColor = '#cbd5e1';
  
  const inputs = document.querySelectorAll('#career-application-form .form-control');
  inputs.forEach(el => highlightError(el, true));
}

// 11. General Contact Form submission validation
function handleContactSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('contact-name');
  const email = document.getElementById('contact-email');
  const phone = document.getElementById('contact-phone');
  const message = document.getElementById('contact-message');
  
  let isValid = true;
  
  if (name.value.trim().length < 2) { highlightError(name, false); isValid = false; } else { highlightError(name, true); }
  if (!validateEmail(email.value)) { highlightError(email, false); isValid = false; } else { highlightError(email, true); }
  if (!validatePhone(phone.value)) { highlightError(phone, false); isValid = false; } else { highlightError(phone, true); }
  if (message.value.trim().length < 10) { highlightError(message, false); isValid = false; } else { highlightError(message, true); }
  
  if (isValid) {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Send Message';
    if (submitBtn) toggleButtonLoading(submitBtn, true);

    const payload = {
      name: name.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      message: message.value.trim()
    };

    fetch(`${API_BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) throw new Error("Server error");
      return response.json();
    })
    .then(data => {
      if (submitBtn) toggleButtonLoading(submitBtn, false, originalBtnText);
      document.getElementById('contact-form-container').style.display = 'none';
      document.getElementById('contact-success-panel').style.display = 'block';
      showToastNotification("Message sent successfully!");
    })
    .catch(error => {
      console.error("Submission failed:", error);
      if (submitBtn) toggleButtonLoading(submitBtn, false, originalBtnText);
      showToastNotification("Something went wrong. Please try again.", "error");
    });
  } else {
    showToastNotification("Please fill in all contact details.", "error");
  }
}

function resetContactForm() {
  document.getElementById('general-contact-form').reset();
  document.getElementById('contact-form-container').style.display = 'block';
  document.getElementById('contact-success-panel').style.display = 'none';
  
  const inputs = document.querySelectorAll('#general-contact-form .form-control');
  inputs.forEach(el => highlightError(el, true));
}

// 12. Modal Free Consultation Quote System
const quoteModal = document.getElementById('quote-popup-modal');

function toggleQuoteModal(show) {
  if (show) {
    quoteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    quoteModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    resetModalQuoteForm();
  }
}

function handleModalQuoteSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('modal-name');
  const phone = document.getElementById('modal-phone');
  const email = document.getElementById('modal-email');
  const service = document.getElementById('modal-service');
  const message = document.getElementById('modal-message');
  
  let isValid = true;
  
  if (name.value.trim().length < 2) { highlightError(name, false); isValid = false; } else { highlightError(name, true); }
  if (!validatePhone(phone.value)) { highlightError(phone, false); isValid = false; } else { highlightError(phone, true); }
  if (!validateEmail(email.value)) { highlightError(email, false); isValid = false; } else { highlightError(email, true); }
  if (service.value === '') { highlightError(service, false); isValid = false; } else { highlightError(service, true); }
  if (message.value.trim().length < 5) { highlightError(message, false); isValid = false; } else { highlightError(message, true); }
  
  if (isValid) {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit RFQ Quote Request';
    if (submitBtn) toggleButtonLoading(submitBtn, true);

    const payload = {
      name: name.value.trim(),
      phone: phone.value.trim(),
      email: email.value.trim(),
      service: service.value,
      message: message.value.trim()
    };

    fetch(`${API_BASE}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) throw new Error("Server error");
      return response.json();
    })
    .then(data => {
      if (submitBtn) toggleButtonLoading(submitBtn, false, originalBtnText);
      document.getElementById('modal-form-container').style.display = 'none';
      document.getElementById('modal-success-panel').style.display = 'block';
      showToastNotification("Corporate RFQ submitted!");
    })
    .catch(error => {
      console.error("Submission failed:", error);
      if (submitBtn) toggleButtonLoading(submitBtn, false, originalBtnText);
      showToastNotification("Something went wrong. Please try again.", "error");
    });
  } else {
    showToastNotification("Please fill in required RFQ details.", "error");
  }
}

function resetModalQuoteForm() {
  document.getElementById('modal-quote-form').reset();
  document.getElementById('modal-form-container').style.display = 'block';
  document.getElementById('modal-success-panel').style.display = 'none';
  
  const inputs = document.querySelectorAll('#modal-quote-form .form-control');
  inputs.forEach(el => highlightError(el, true));
}

// 13. Interactive WhatsApp Chat drawer features
const waDrawer = document.getElementById('wa-drawer');

function toggleWhatsAppChat(show) {
  if (show) {
    waDrawer.classList.add('active');
    document.getElementById('wa-chat-input').focus();
  } else {
    waDrawer.classList.remove('active');
  }
}

function handleWhatsAppKey(event) {
  if (event.key === 'Enter') {
    sendWhatsAppMessage();
  }
}

function sendWhatsAppMessage() {
  const input = document.getElementById('wa-chat-input');
  const text = input.value.trim();
  if (text === '') return;
  
  const chatBody = document.getElementById('wa-chat-body');
  
  // 1. Append User Message Bubble
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const userBubble = document.createElement('div');
  userBubble.className = 'wa-bubble';
  userBubble.style.alignSelf = 'flex-end';
  userBubble.style.background = '#dcf8c6';
  userBubble.style.borderRadius = '8px 0px 8px 8px';
  userBubble.style.maxWidth = '85%';
  userBubble.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
  userBubble.style.position = 'relative';
  
  // Custom styled CSS triangle for User bubble
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .user-wa-tri::before {
      content: ''; position: absolute; right: -8px; top: 0; width: 0; height: 0;
      border-style: solid; border-width: 8px 8px 0 0;
      border-color: #dcf8c6 transparent transparent transparent;
    }
  `;
  document.head.appendChild(styleEl);
  userBubble.classList.add('user-wa-tri');
  
  userBubble.innerHTML = `
    ${escapeHTML(text)}
    <div class="wa-bubble-time" style="text-align: right;">${timeStr}</div>
  `;
  
  chatBody.appendChild(userBubble);
  input.value = '';
  chatBody.scrollTop = chatBody.scrollHeight;
  
  // 2. Simulated Auto Helpdesk Reply and dispatch to real WhatsApp Web
  setTimeout(() => {
    const adminBubble = document.createElement('div');
    adminBubble.className = 'wa-bubble';
    adminBubble.innerHTML = `
      Understood. Routing your query to the Indian regional operations manager... Loading WhatsApp Web.
      <div class="wa-bubble-time">${timeStr}</div>
    `;
    chatBody.appendChild(adminBubble);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // Redirect to real WhatsApp API after 1.5s
    setTimeout(() => {
      const waUrl = `https://wa.me/918544071616?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
      toggleWhatsAppChat(false);
    }, 1500);
  }, 1000);
}

// 14. Official Document Dynamic PDF Generator (Client side Blob)
function downloadMockPDF(filename) {
  // Generate on-the-fly binary-like PDF mockup file contents so download works
  const displayTitle = filename.replace(/_/g, ' ').replace('.pdf', '');
  const documentMockText = 
`========================================================================
                   MILDWAVE MARKETING PRIVATE LIMITED
========================================================================
                  OFFICIAL COMPANY DOCUMENT / RECORD ARCHIVE

Document Type : Statutory / Authorized Dossier
Resource Title: ${displayTitle}
Reference No  : MW-IN-${Math.floor(100000 + Math.random() * 900000)}-2026
Verified PAN  : PAN-IN-MILDWAVE-98A
GST Compliance: IN-33-GST-MILDWAVE-7788

------------------------------------------------------------------------
DESCRIPTION:
This constitutes a verified official document released under authorized 
signatories of Mildwave Marketing Pvt. Ltd. India. Used for statutory corporate 
record, vendor onboarding, and compliance reviews.

STATUS: 
VERIFIED / REGISTERED ACTIVE (2026 AUDIT CYCLE)

ISSUED BY:
Registrar of Corporate Compliance
Mildwave Corporate Plaza, Connaught Place, New Delhi, India

------------------------------------------------------------------------
Copyright (c) 2026 Mildwave Marketing Pvt. Ltd. India. All Rights Reserved.
========================================================================`;

  const blob = new Blob([documentMockText], { type: 'text/plain;charset=utf-8' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  showToastNotification(`${displayTitle} downloaded successfully!`);
}

// 15. Newsletter Subscription Submission
function handleNewsletterSubmit(event) {
  event.preventDefault();
  const input = event.target.querySelector('input');
  if (input && validateEmail(input.value)) {
    const payload = { email: input.value.trim() };
    
    fetch(`${API_BASE}/api/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) throw new Error("Server error");
      return response.json();
    })
    .then(data => {
      showToastNotification("Subscribed to compliance digests successfully!");
      event.target.reset();
    })
    .catch(error => {
      console.warn("Express server offline. Falling back to demo mode.", error);
      showToastNotification("Subscribed successfully! (Offline Demo Mode)");
      event.target.reset();
    });
  } else {
    showToastNotification("Please enter a valid corporate email.", "error");
  }
}

// Helper: Escape strings to avoid XSS issues
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// 16. Custom Premium Toast Notification Widget
function showToastNotification(message, type = "success") {
  // Check if notification container exists, otherwise create it
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '30px';
    container.style.right = '30px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.style.background = type === 'success' ? '#ffffff' : '#fef2f2';
  toast.style.color = type === 'success' ? 'var(--text-dark)' : '#ef4444';
  toast.style.borderLeft = `5px solid ${type === 'success' ? 'var(--accent)' : '#ef4444'}`;
  toast.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
  toast.style.padding = '14px 24px';
  toast.style.borderRadius = '4px';
  toast.style.fontSize = '0.9rem';
  toast.style.fontWeight = '600';
  toast.style.minWidth = '280px';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '12px';
  toast.style.transform = 'translateX(100px)';
  toast.style.opacity = '0';
  toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', type === 'success' ? 'check-circle' : 'alert-circle');
  toast.appendChild(icon);
  
  const textNode = document.createElement('span');
  textNode.textContent = message;
  toast.appendChild(textNode);
  
  container.appendChild(toast);
  
  // Initialize lucide icon on the toast
  if (typeof lucide !== 'undefined') {
    lucide.createIcons({
      attrs: {
        style: `color: ${type === 'success' ? 'var(--accent)' : '#ef4444'}; width: 18px; height: 18px;`
      }
    });
  }
  
  // Slide In
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 50);
  
  // Slide Out and Remove
  setTimeout(() => {
    toast.style.transform = 'translateX(100px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 400);
  }, 4000);
}

// 17. SPA View Router Controller
function handleRoute() {
  const hash = window.location.hash || '#home';
  const sections = document.querySelectorAll('main > section[id]');
  
  sections.forEach(sec => {
    const id = '#' + sec.getAttribute('id');
    
    if (hash === '#home') {
      // Home routing displays standard scrolling page sections
      if (id === '#projects' || id === '#documents') {
        sec.classList.add('faded-out');
      } else {
        sec.classList.remove('faded-out');
      }
    } else {
      // Separate Page View routing displays only the requested section
      if (id === hash) {
        sec.classList.remove('faded-out');
      } else {
        sec.classList.add('faded-out');
      }
    }
  });

  // Highlight navigation anchors on load / change
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    }
  });

  // Smooth scroll back to peak
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

window.addEventListener('hashchange', handleRoute);

// 18. Projects Interactive Categorization
window.filterProjects = function(category) {
  const cards = document.querySelectorAll('.project-card');
  const buttons = document.querySelectorAll('.projects-filter-container .filter-btn');

  buttons.forEach(btn => {
    if (btn.getAttribute('data-filter') === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  cards.forEach(card => {
    const cardCat = card.getAttribute('data-category');
    if (category === 'all' || cardCat === category) {
      card.style.display = 'flex';
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      }, 50);
    } else {
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.display = 'none';
      }, 350);
    }
  });
};

// 19. Administrative Document Uploader UI & Dynamic Appending
window.handleDocFileSelect = function(event) {
  const file = event.target.files[0];
  if (file) {
    const title = document.getElementById('doc-dropzone-title');
    const meta = document.getElementById('doc-dropzone-meta');
    const fileZone = document.getElementById('doc-upload-dropzone');
    
    if (file.type !== 'application/pdf') {
      showToastNotification("Statutory files must be in PDF format", "error");
      event.target.value = '';
      return;
    }
    
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    if (file.size > 5 * 1024 * 1024) {
      showToastNotification("Document exceeds 5MB statutory limit", "error");
      event.target.value = '';
      return;
    }

    title.textContent = file.name;
    meta.textContent = `Document locked (${sizeMB} MB)`;
    fileZone.classList.add('selected');
  }
};

window.handleDocUpload = function(event) {
  event.preventDefault();
  
  const title = document.getElementById('upload-doc-title');
  const category = document.getElementById('upload-doc-cat');
  const fileInput = document.getElementById('upload-doc-input');
  const fileZone = document.getElementById('doc-upload-dropzone');
  
  let isValid = true;
  
  if (title.value.trim().length < 3) { highlightError(title, false); isValid = false; } else { highlightError(title, true); }
  if (category.value === '') { highlightError(category, false); isValid = false; } else { highlightError(category, true); }
  
  if (fileInput.files.length === 0) {
    fileZone.style.borderColor = '#ef4444';
    isValid = false;
  } else {
    fileZone.style.borderColor = '#cbd5e1';
  }
  
  if (!isValid) {
    showToastNotification("Please review statutory upload fields.", "error");
    return;
  }

  const file = fileInput.files[0];
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const docFilename = file.name.replace(/\s+/g, '_');

  const progressContainer = document.getElementById('doc-upload-progress');
  const progressPercent = document.getElementById('doc-progress-percent');
  const progressFill = document.getElementById('doc-progress-fill');
  
  progressContainer.style.display = 'block';

  // FormData setup
  const formData = new FormData();
  formData.append('title', title.value.trim());
  formData.append('category', category.value);
  formData.append('document', file);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_BASE}/api/document-upload`, true);

  // Monitor real progress
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const progress = Math.round((e.loaded / e.total) * 100);
      progressPercent.textContent = `${progress}%`;
      progressFill.style.width = `${progress}%`;
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status === 200 || xhr.status === 201) {
      // Upload Successful!
      showToastNotification("Statutory document uploaded and database logged!");
      
      // Reset forms and elements
      document.getElementById('doc-upload-form').reset();
      const dropzoneTitle = document.getElementById('doc-dropzone-title');
      const dropzoneMeta = document.getElementById('doc-dropzone-meta');
      dropzoneTitle.textContent = "Click or drag & drop file";
      dropzoneMeta.textContent = "PDF format (Max 5MB)";
      fileZone.classList.remove('selected');
      
      // Hide progress after 500ms
      setTimeout(() => {
        progressContainer.style.display = 'none';
        progressPercent.textContent = '0%';
        progressFill.style.width = '0%';
      }, 500);

      // Reload document grid list dynamically from DB
      window.loadLegalDocuments();
    } else {
      // Server returned an error, fallback to offline demo mode
      console.warn("Server upload failed. Falling back to local preview simulation.");
      simulateOfflineDocUpload(title.value, category.value, file, sizeMB, docFilename, progressContainer, progressPercent, progressFill, fileZone);
    }
  });

  xhr.addEventListener('error', () => {
    // Network failure / Server offline, fallback to offline demo mode
    console.warn("Express server offline. Falling back to local preview simulation.");
    simulateOfflineDocUpload(title.value, category.value, file, sizeMB, docFilename, progressContainer, progressPercent, progressFill, fileZone);
  });

  xhr.send(formData);
};

// Helper: fallback simulator for offline presentation
function simulateOfflineDocUpload(titleVal, catVal, file, sizeMB, docFilename, progressContainer, progressPercent, progressFill, fileZone) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    progressPercent.textContent = `${progress}%`;
    progressFill.style.width = `${progress}%`;
    
    if (progress >= 100) {
      clearInterval(interval);
      
      const grid = document.getElementById('legal-documents-grid');
      const card = document.createElement('article');
      card.className = 'doc-card glass-card reveal active';
      card.style.padding = '30px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';
      card.style.height = '100%';
      card.style.animation = 'fadeInUp 0.6s ease forwards';
      
      let iconName = 'file-text';
      if (catVal === 'Statutory Cert') iconName = 'shield';
      if (catVal === 'Tax Compliance') iconName = 'receipt';
      if (catVal === 'Operational SLA') iconName = 'book-open';
      if (catVal === 'Financial Document') iconName = 'file-check';

      card.innerHTML = `
        <div>
          <div class="doc-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
            <div class="doc-icon" style="width: 50px; height: 50px; background: #ffebe0; color: var(--accent); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><i data-lucide="${iconName}"></i></div>
            <span class="doc-meta" style="background: var(--primary-light); color: var(--primary); font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-full);">PDF (${sizeMB} MB)</span>
          </div>
          <h3 style="font-size: 1.25rem; margin-bottom: 8px;">${escapeHTML(titleVal)}</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 24px;">Statutory corporate record uploaded under ${catVal} audit scopes. Authenticated and verified active.</p>
        </div>
        <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="downloadMockPDF('${docFilename}')"><i data-lucide="download"></i> Download PDF</button>
      `;
      
      grid.insertBefore(card, grid.firstChild);
      
      document.getElementById('doc-upload-form').reset();
      const dropzoneTitle = document.getElementById('doc-dropzone-title');
      const dropzoneMeta = document.getElementById('doc-dropzone-meta');
      dropzoneTitle.textContent = "Click or drag & drop file";
      dropzoneMeta.textContent = "PDF format (Max 5MB)";
      fileZone.classList.remove('selected');
      
      setTimeout(() => {
        progressContainer.style.display = 'none';
        progressPercent.textContent = '0%';
        progressFill.style.width = '0%';
      }, 500);
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
      
      showToastNotification("Statutory document appended! (Offline Demo Mode)");
    }
  }, 50);
}

// 20. Load Legal Documents from Database
window.loadLegalDocuments = function() {
  fetch(`${API_BASE}/api/documents`)
    .then(response => {
      if (!response.ok) throw new Error("Could not fetch documents");
      return response.json();
    })
    .then(docs => {
      renderDocuments(docs);
    })
    .catch(error => {
      console.warn("Could not load documents from server. Standard fallback active.", error);
    });
};

function renderDocuments(docs) {
  const grid = document.getElementById('legal-documents-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Render documents in reverse chronological order (newest first)
  const sortedDocs = [...docs].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  
  sortedDocs.forEach(doc => {
    const card = document.createElement('article');
    card.className = 'doc-card glass-card reveal active';
    card.style.padding = '30px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'space-between';
    card.style.height = '100%';
    card.style.animation = 'fadeInUp 0.6s ease forwards';
    
    let iconName = 'file-text';
    if (doc.category === 'Statutory Cert') iconName = 'shield';
    if (doc.category === 'Tax Compliance') iconName = 'receipt';
    if (doc.category === 'Operational SLA') iconName = 'book-open';
    if (doc.category === 'Financial Document') iconName = 'file-check';
    
    const sizeMB = (doc.sizeBytes / (1024 * 1024)).toFixed(2);
    
    let actionHtml = '';
    if (doc.isSystem) {
      actionHtml = `<button class="btn btn-primary btn-sm" style="width: 100%;" onclick="downloadMockPDF('${doc.filename}')"><i data-lucide="download"></i> Download PDF</button>`;
    } else {
      const fileUrl = `${API_BASE}${doc.path}`;
      actionHtml = `<a href="${fileUrl}" target="_blank" class="btn btn-primary btn-sm" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;"><i data-lucide="download"></i> Download PDF</a>`;
    }
    
    card.innerHTML = `
      <div>
        <div class="doc-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
          <div class="doc-icon" style="width: 50px; height: 50px; background: #ffebe0; color: var(--accent); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><i data-lucide="${iconName}"></i></div>
          <span class="doc-meta" style="background: var(--primary-light); color: var(--primary); font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-full);">PDF (${sizeMB} MB)</span>
        </div>
        <h3 style="font-size: 1.25rem; margin-bottom: 8px;">${escapeHTML(doc.title)}</h3>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 24px;">${escapeHTML(doc.description)}</p>
      </div>
      ${actionHtml}
    `;
    grid.appendChild(card);
  });
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// 21. Select AMC Plan and populate the booking form
window.selectAMCPlan = function(planName) {
  // Set service type to AMC
  const serviceTypeDropdown = document.getElementById('ro-service-type');
  if (serviceTypeDropdown) {
    serviceTypeDropdown.value = 'AMC';
  }
  
  // Pre-fill the problem description text box with selected plan
  const problemDesc = document.getElementById('ro-message');
  if (problemDesc) {
    problemDesc.value = `Interested in RO AMC Plan: ${planName}\n` + (problemDesc.value || '');
  }
  
  // Reset hash to home if on another page view to reveal sections
  if (window.location.hash !== '' && window.location.hash !== '#home') {
    window.location.hash = '#home';
    setTimeout(() => {
      const bookingSection = document.getElementById('ro-booking');
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 450);
  } else {
    // Smooth scroll down to booking section
    const bookingSection = document.getElementById('ro-booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  showToastNotification(`Selected ${planName}! Fill out the form to proceed.`);
};

