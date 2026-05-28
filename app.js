// --- State Management ---
let currentCardData = null;
let collection = {}; 
let cameraStream = null;

// --- Bulletproof View Navigation ---
function navigateTo(viewId) {
    // Forcefully reset every view state cleanly using class configurations
    document.querySelectorAll('.view').forEach(el => {
        el.classList.remove('active-view');
        el.classList.add('hidden-view');
    });

    // Make target view instantly active
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden-view');
        target.classList.add('active-view');
    }

    // Camera hardware management
    if (viewId === 'scanner') {
        startCamera();
    } else {
        stopCamera();
    }

    if (viewId === 'collection') {
        renderCollection();
    }
}

// App initial setup
window.onload = () => {
    setTimeout(() => {
        navigateTo('home');
    }, 2500);
};

// --- Camera Access ---
async function startCamera() {
    const video = document.getElementById('camera-feed');
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = cameraStream;
    } catch (err) {
        console.error("Camera access denied or unavailable", err);
        alert("Please allow camera access in your mobile browser settings to scan cards.");
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// --- OCR Pattern Analysis via Tesseract.js ---
async function captureAndAnalyze() {
    const btn = document.getElementById('capture-btn');
    const scanLine = document.getElementById('scan-line');
    const overlay = document.getElementById('scanning-overlay');
    const statusText = document.getElementById('scanning-text');
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('capture-canvas');

    btn.disabled = true;
    scanLine.classList.remove('hidden');
    overlay.classList.remove('hidden');
    statusText.innerText = 'Extracting Card Data...';

    try {
        // Freeze frame to internal canvas rendering context
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Run local canvas processing via Tesseract CDN workers
        const result = await Tesseract.recognize(canvas, 'eng');
        const scannedText = result.data.text;
        
        // Isolate primary text blocks matching title layouts
        const words = scannedText.split(/\s+/)
            .map(w => w.replace(/[^a-zA-Z]/g, ''))
            .filter(w => w.length > 3);

        if (words.length === 0) throw new Error("No characters found.");
        
        const searchName = words[0]; 
        statusText.innerText = `Searching Database for: ${searchName}...`;

        // Run dynamic query to external TCG platform endpoints
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${searchName}*&pageSize=1`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            currentCardData = data.data[0];
            populateResultScreen(currentCardData);
            navigateTo('result');
        } else {
            alert(`Couldn't find official data for "${searchName}". Adjust placement and retry.`);
        }
    } catch (error) {
        console.error("Scan Process Faulted:", error);
        alert("Failed to read text. Ensure card is upright, centered, and fully lit.");
    }

    btn.disabled = false;
    scanLine.classList.add('hidden');
    overlay.classList.add('hidden');
}

// --- Result Processing Engine ---
function populateResultScreen(card) {
    const img = document.getElementById('result-image');
    img.src = card.images.large;
    img.classList.remove('scale-100');
    setTimeout(() => img.classList.add('scale-100'), 100);

    document.getElementById('result-name').textContent = card.name;
    document.getElementById('result-set').textContent = `${card.set.name} • ${card.rarity || 'Common'}`;
    document.getElementById('result-type').textContent = card.supertype;
    
    const price = card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market || 'N/A';
    document.getElementById('result-value').textContent = price !== 'N/A' ? `$${price}` : 'N/A';
}

// --- Storage & Album Partitioning ---
function addToCollection() {
    if (!currentCardData) return;
    
    const setName = currentCardData.set.name;
    if (!collection[setName]) {
        collection[setName] = [];
    }
    
    collection[setName].push(currentCardData);
    navigateTo('collection');
}

function renderCollection() {
    const grid = document.getElementById('collection-grid');
    const sets = Object.keys(collection);

    if (sets.length === 0) {
        grid.innerHTML = '<p class="mt-20">No cards scanned yet.</p>';
        return;
    }

    let html = '';
    sets.forEach(setName => {
        html += `
            <div class="glass-panel p-4 rounded-2xl text-left">
                <h3 class="text-lg text-white font-semibold mb-4 border-b border-white/10 pb-2">${setName}</h3>
                <div class="grid grid-cols-3 gap-3">
        `;
        collection[setName].forEach(card => {
            html += `<img src="${card.images.small}" alt="${card.name}" class="w-full h-auto rounded-lg shadow-md">`;
        });
        html += `</div></div>`;
    });
    grid.innerHTML = html;
}
