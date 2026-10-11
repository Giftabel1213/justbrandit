// === DOM ELEMENTS ===
const visitorForm = document.getElementById('visitorForm');
const startCaptureBtn = document.getElementById('startCaptureBtn');
const cameraFeed = document.getElementById('cameraFeed');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const photoCanvas = document.getElementById('photoCanvas');
const capturedPreview = document.getElementById('capturedPreview');
const capturedContainer = document.getElementById('capturedContainer');
const submitBtn = document.getElementById('submitBtn');
const recordsBody = document.getElementById('recordsBody');
const successModal = document.getElementById('successModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportPhotosBtn = document.getElementById('exportPhotosBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const adminToggleBtn = document.getElementById('adminToggleBtn');
const loginModal = document.getElementById('loginModal');
const adminSetupModal = document.getElementById('adminSetupModal');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginCancelBtn = document.getElementById('loginCancelBtn');
const loginEmailInput = document.getElementById('adminEmail');
const loginPasswordInput = document.getElementById('adminPassword');
const setupEmail = document.getElementById('setupEmail');
const setupPassword = document.getElementById('setupPassword');
const setupSubmitBtn = document.getElementById('setupSubmitBtn');
const setupCancelBtn = document.getElementById('setupCancelBtn');

// === STATE VARIABLES ===
let stream = null;
let capturedImageData = null;
let visitors = JSON.parse(localStorage.getItem('justbranditVisitors') || '[]');
let isAdminSession = !!sessionStorage.getItem('justbranditAdminSession');

// === INITIALIZE ===
renderRecords();
// Enable submit immediately — photo is optional
submitBtn.disabled = false;

// --- Server upload configuration ---
// For monolith deployment, the app uploads to the same origin by default.
// If you need a different host, set `UPLOAD_SERVER_URL` manually in the browser console or here.
const UPLOAD_SERVER_URL = window.location.origin || 'http://localhost:3000';
// For quick testing you can store the upload token in localStorage using the key 'UPLOAD_AUTH_TOKEN'
// e.g. in browser console: localStorage.setItem('UPLOAD_AUTH_TOKEN', 'your_token_here')
const UPLOAD_AUTH_TOKEN = localStorage.getItem('UPLOAD_AUTH_TOKEN') || ''; // set to the secret token from server .env (if used)

// Helpful warning when uploads are not configured
if (!UPLOAD_SERVER_URL) {
    console.warn('UPLOAD_SERVER_URL is empty — server uploads are disabled. Set UPLOAD_SERVER_URL in script.js to enable uploads.');
}

// Initialize admin UI state
updateAdminUiState();

// If no admin configured, prompt to create one
if (!localStorage.getItem('justbranditAdmin')) {
    // show admin setup modal after short delay
    setTimeout(() => {
        if (adminSetupModal) adminSetupModal.classList.remove('hidden');
    }, 300);
}

// === CAMERA HANDLING ===
startCaptureBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user', 
                width: { ideal: 640 }, 
                height: { ideal: 480 } 
            } 
        });
        cameraFeed.srcObject = stream;
        cameraFeed.classList.remove('hidden');
        cameraPlaceholder.classList.add('hidden');
        captureBtn.disabled = false;
        startCaptureBtn.textContent = 'Camera Active';
        startCaptureBtn.disabled = true;
    } catch (err) {
        alert('Camera access denied. You can still sign in without a photo.');
        console.error('Camera error:', err);
    }
});

// === CAPTURE PHOTO ===
captureBtn.addEventListener('click', () => {
    const ctx = photoCanvas.getContext('2d');
    photoCanvas.width = cameraFeed.videoWidth;
    photoCanvas.height = cameraFeed.videoHeight;
    
    ctx.translate(photoCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cameraFeed, 0, 0);
    
    capturedImageData = photoCanvas.toDataURL('image/jpeg', 0.85);
    
    capturedPreview.src = capturedImageData;
    capturedContainer.classList.remove('hidden');
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    cameraFeed.classList.add('hidden');
    
    captureBtn.classList.add('hidden');
    retakeBtn.classList.remove('hidden');
    // If server upload configured, upload immediately and replace capturedImageData with remote URL
    if (UPLOAD_SERVER_URL) {
        console.log('upload: sending image to', UPLOAD_SERVER_URL + '/upload');
        uploadToServer(capturedImageData).then(url => {
            if (url) {
                console.log('upload: received url', url);
                capturedImageData = url;
                capturedPreview.src = url;
            } else {
                console.warn('upload: server returned no URL');
            }
        }).catch(err => {
            console.error('Server upload failed:', err);
            alert('Upload failed — check server logs and browser console.');
        });
    } else {
        console.warn('Upload skipped: UPLOAD_SERVER_URL not configured in script.js');
    }
});

// === RETAKE PHOTO ===
retakeBtn.addEventListener('click', async () => {
    capturedImageData = null;
    capturedContainer.classList.add('hidden');
    retakeBtn.classList.add('hidden');
    captureBtn.classList.remove('hidden');
    
    stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
    });
    cameraFeed.srcObject = stream;
    cameraFeed.classList.remove('hidden');
});

// === SUBMIT SIGN-IN — PHOTO OPTIONAL ===
submitBtn.addEventListener('click', () => {
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const purpose = document.getElementById('purpose').value;
    const person = document.getElementById('person').value.trim();
    
    // Removed: !capturedImageData from validation
    if (!fullname || !phone || !purpose || !person) {
        alert('Please fill all required fields.');
        return;
    }
    
    const visitor = {
        id: Date.now(),
        fullname,
        email,
        phone,
        purpose,
        person,
        photo: capturedImageData || null, // could be data URL or remote URL
        timeIn: new Date().toLocaleString('en-NG', { 
            dateStyle: 'full', 
            timeStyle: 'medium' 
        }),
        timeOut: null
    };
    
    visitors.unshift(visitor);
    localStorage.setItem('justbranditVisitors', JSON.stringify(visitors));
    renderRecords();
    
    // Reset form
    visitorForm.reset();
    capturedImageData = null;
    capturedContainer.classList.add('hidden');
    retakeBtn.classList.add('hidden');
    captureBtn.classList.remove('hidden');
    startCaptureBtn.textContent = 'Capture Photo';
    startCaptureBtn.disabled = false;
    cameraPlaceholder.classList.remove('hidden');
    
    successModal.classList.remove('hidden');
});

// --- Admin UI events ---
adminToggleBtn?.addEventListener('click', () => {
    const admin = localStorage.getItem('justbranditAdmin');
    const session = sessionStorage.getItem('justbranditAdminSession');
    if (session) {
        if (confirm('Log out admin?')) {
            sessionStorage.removeItem('justbranditAdminSession');
            isAdminSession = false;
            updateAdminUiState();
        }
        return;
    }
    if (!admin) {
        if (adminSetupModal) adminSetupModal.classList.remove('hidden');
        return;
    }
    if (loginModal) loginModal.classList.remove('hidden');
});

loginCancelBtn?.addEventListener('click', () => {
    if (loginModal) loginModal.classList.add('hidden');
});

setupCancelBtn?.addEventListener('click', () => {
    if (adminSetupModal) adminSetupModal.classList.add('hidden');
});

setupSubmitBtn?.addEventListener('click', async () => {
    const email = (setupEmail?.value || '').trim();
    const password = (setupPassword?.value || '').trim();
    if (!email || !password) return alert('Please enter email and password for admin.');
    try {
        await createAdmin(email, password);
        alert('Admin account created. Please log in.');
        if (adminSetupModal) adminSetupModal.classList.add('hidden');
        if (loginModal) loginModal.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        alert('Failed to create admin.');
    }
});

loginSubmitBtn?.addEventListener('click', async () => {
    const email = (loginEmailInput?.value || '').trim();
    const password = (loginPasswordInput?.value || '').trim();
    if (!email || !password) return alert('Enter admin email and password.');
    try {
        const ok = await verifyAdmin(email, password);
        if (ok) {
            sessionStorage.setItem('justbranditAdminSession', JSON.stringify({ email, ts: Date.now() }));
            isAdminSession = true;
            updateAdminUiState();
            if (loginModal) loginModal.classList.add('hidden');
            alert('Admin logged in.');
        } else {
            alert('Invalid credentials.');
        }
    } catch (err) {
        console.error(err);
        alert('Login error.');
    }
});

// --- Admin utilities ---
function updateAdminUiState() {
    const enabled = !!sessionStorage.getItem('justbranditAdminSession');
    if (exportCsvBtn) exportCsvBtn.disabled = !enabled;
    if (exportPhotosBtn) exportPhotosBtn.disabled = !enabled;
    if (clearAllBtn) clearAllBtn.disabled = !enabled;
    if (adminToggleBtn) adminToggleBtn.textContent = enabled ? 'Admin (Logged In)' : 'Admin';
}

// --- Admin auth (client-side PBKDF2) ---
function bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr.buffer;
}

async function deriveKey(password, saltB64) {
    const encoder = new TextEncoder();
    const pwKey = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const salt = base64ToBuf(saltB64);
    const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, pwKey, 256);
    return bufToBase64(derived);
}

async function createAdmin(email, password) {
    const saltArr = crypto.getRandomValues(new Uint8Array(16));
    const saltB64 = bufToBase64(saltArr.buffer);
    const hash = await deriveKey(password, saltB64);
    const adminObj = { email, salt: saltB64, hash };
    localStorage.setItem('justbranditAdmin', JSON.stringify(adminObj));
}

async function verifyAdmin(email, password) {
    const adminRaw = localStorage.getItem('justbranditAdmin');
    if (!adminRaw) return false;
    const admin = JSON.parse(adminRaw);
    if (admin.email !== email) return false;
    const testHash = await deriveKey(password, admin.salt);
    return testHash === admin.hash;
}

// --- Server upload (server performs signed Cloudinary upload) ---
async function uploadToServer(dataUrl) {
    if (!UPLOAD_SERVER_URL) return null;
    try {
        const res = await fetch(new URL('/upload', UPLOAD_SERVER_URL).toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(UPLOAD_AUTH_TOKEN ? { 'x-upload-auth': UPLOAD_AUTH_TOKEN } : {})
            },
            body: JSON.stringify({ image: dataUrl })
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Upload failed: ${t}`);
        }
        const json = await res.json();
        return json.url || (json.raw && json.raw.secure_url) || null;
    } catch (err) {
        console.error('Server upload error', err);
        return null;
    }
}

// === SIGN-OUT HANDLING ===
recordsBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('sign-out-btn')) {
        const id = parseInt(e.target.dataset.id);
        const visitor = visitors.find(v => v.id === id);
        if (visitor && !visitor.timeOut) {
            visitor.timeOut = new Date().toLocaleString('en-NG', { 
                dateStyle: 'full', 
                timeStyle: 'medium' 
            });
            localStorage.setItem('justbranditVisitors', JSON.stringify(visitors));
            renderRecords();
        }
    }
});

// === CLOSE MODAL ===
closeModalBtn.addEventListener('click', () => {
    successModal.classList.add('hidden');
});

// === EXPORT TO CSV ===
exportCsvBtn?.addEventListener('click', exportToCSV);

function exportToCSV() {
    if (!sessionStorage.getItem('justbranditAdminSession')) {
        return alert('Admin login required to export data.');
    }

    if (visitors.length === 0) {
        alert('No records to export.');
        return;
    }

    const headers = [
        'Full Name', 'Email', 'Phone', 'Purpose of Visit',
        'Visiting Person', 'Time In', 'Time Out', 'Photo Captured'
    ];

    const rows = visitors.map(v => [
        `"${escapeCsv(v.fullname)}"`,
        `"${escapeCsv(v.email || '')}"`,
        `"${escapeCsv(v.phone)}"`,
        `"${escapeCsv(v.purpose)}"`,
        `"${escapeCsv(v.person)}"`,
        `"${escapeCsv(v.timeIn)}"`,
        `"${escapeCsv(v.timeOut || 'Active - Not Signed Out')}"`,
        `"${v.photo ? 'Yes' : 'No'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `visitor_records_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeCsv(text) {
    return String(text).replace(/"/g, '""');
}

// === EXPORT ALL PHOTOS ===
exportPhotosBtn?.addEventListener('click', exportAllPhotos);

async function exportAllPhotos() {
    // Only include visitors who have photos
    if (!sessionStorage.getItem('justbranditAdminSession')) {
        return alert('Admin login required to export photos.');
    }

    const visitorsWithPhotos = visitors.filter(v => v.photo);
    if (visitorsWithPhotos.length === 0) return alert('No photos to export.');

    try {
        if (!window.JSZip) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }

        const zip = new JSZip();
        const safeDate = new Date().toISOString().slice(0, 10);

        // Add files (support both data URLs and remote URLs)
        for (let i = 0; i < visitorsWithPhotos.length; i++) {
            const v = visitorsWithPhotos[i];
            const name = `${String(i + 1).padStart(3, '0')}_${sanitizeFilename(v.fullname)}.jpg`;
            if (v.photo.startsWith('data:')) {
                const base64Data = v.photo.split(',')[1];
                zip.file(name, base64Data, { base64: true });
            } else {
                // fetch remote image as blob
                try {
                    const resp = await fetch(v.photo);
                    const blob = await resp.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    zip.file(name, arrayBuffer);
                } catch (err) {
                    console.warn('Failed to fetch remote photo for', v.fullname, err);
                }
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `visitor_photos_${safeDate}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert('Error exporting photos. Please try again.');
        console.error('Photo export error:', err);
    }
}

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

// === CLEAR ALL RECORDS ===
clearAllBtn?.addEventListener('click', () => {
    if (!sessionStorage.getItem('justbranditAdminSession')) {
        return alert('Admin login required to clear records.');
    }
    if (visitors.length === 0) return alert('No records to clear.');
    if (confirm('⚠️ Are you sure you want to DELETE ALL visitor records? This cannot be undone!')) {
        visitors = [];
        localStorage.removeItem('justbranditVisitors');
        renderRecords();
        alert('✅ All records have been cleared.');
    }
});

// === RENDER VISITOR TABLE ===
function renderRecords() {
    if (visitors.length === 0) {
        recordsBody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-gray-500">
                    <i class="fa fa-folder-open text-2xl mb-2"></i>
                    <p>No visitor records yet.</p>
                </td>
            </tr>
        `;
        return;
    }
    recordsBody.innerHTML = visitors.map(v => `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4">
                ${v.photo 
                    ? `<img src="${v.photo}" alt="${escapeHtml(v.fullname)}" class="w-12 h-12 rounded-full object-cover no-mirror">`
                    : `<div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">No Photo</div>`
                }
            </td>
            <td class="py-3 px-4 font-medium">${escapeHtml(v.fullname)}</td>
            <td class="py-3 px-4 text-sm">
                <div>${escapeHtml(v.phone)}</div>
                ${v.email ? `<div class="text-gray-500 text-xs">${escapeHtml(v.email)}</div>` : ''}
            </td>
            <td class="py-3 px-4 text-sm">
                <div><span class="font-medium">${escapeHtml(v.purpose)}</span></div>
                <div class="text-gray-500">For: ${escapeHtml(v.person)}</div>
            </td>
            <td class="py-3 px-4 text-sm">
                <div class="text-green-600">${v.timeIn}</div>
                ${v.timeOut ? `<div class="text-red-500 text-xs">Signed out: ${v.timeOut}</div>` : ''}
            </td>
            <td class="py-3 px-4">
                ${!v.timeOut ? `
                    <button class="sign-out-btn text-sm bg-red-100 hover:bg-red-200 text-red-700 py-1 px-3 rounded transition" data-id="${v.id}">
                        Sign Out
                    </button>
                ` : '<span class="text-gray-400 text-sm">Completed</span>'}
            </td>
        </tr>
    `).join('');
}

// === PREVENT XSS ATTACKS ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}