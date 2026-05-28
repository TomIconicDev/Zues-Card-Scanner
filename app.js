// --- State Management ---
let currentCardData = null;
let collection = {}; 
let cameraStream = null;

// --- View Navigation ---
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(el => {
        el.classList.remove('active');
        setTimeout(() => el.style.display = 'none', 300); 
    });

    const target = document.getElementById(`view-${viewId}`);
    target.style.display = 'flex';
    setTimeout(() => target.classList.add('active'), 50);

    if (viewId === 'scanner') {
        startCamera();
    } else {
        stopCamera();
    }

    if (viewId === 'collection') {
        renderCollection();
    }
}

window.onload = () => {
    setTimeout(() => {
        navigateTo('home');
    }, 2500);
};

// --- Camera Logic ---
async function startCamera() {
    const video = document.getElementById('camera-feed');
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = cameraStream;
    } catch (err) {
        console.error("Camera access denied or unavailable", err);
        alert("Please allow camera access in your browser settings to scan cards.");
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// --- Smart Scanning via Tesseract.js ---
async function captureAndAnalyze() {
    const btn = document.getElementById('capture-btn');
    const scanLine = document.getElementById('scan-line');
    const overlay = document.getElementById('scanning-overlay');
    const statusText = document.getElementById('scanning-text');
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('capture-canvas');

    // UI Lockout & Feedback
    btn.disabled = true;
    scanLine.classList.remove('hidden');
    overlay.classList.remove('hidden');
    statusText.innerText = 'Extracting Card Data... (This may take a moment on first run)';

    try {
        // Capture frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Run OCR
        const result = await Tesseract.recognize(canvas, 'eng');
        const scannedText = result.data.text;
        
        // Clean text to find the most likely Pokémon name (first word > 3 letters)
        const words = scannedText.split(/\s+/)
            .map(w => w.replace(/[^a-zA-Z]/g, ''))
            .filter(w => w.length > 3);

        if (words.length === 0) throw new Error("No text found.");
        
        const searchName = words[0]; 
        statusText.innerText = `Searching Database for: ${searchName}...`;

        // Query Pokémon TCG API
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${searchName}*&pageSize=1`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            currentCardData = data.data[0];
            populateResultScreen(currentCardData);
            navigateTo('result');
        } else {
            alert(`Couldn't find official data for "${searchName}". Try adjusting the lighting and scan again.`);
        }
    } catch (error) {
        console.error("Scan Failed:", error);
        alert("Failed to read the card clearly. Hold steady, ensure good lighting, and try again.");
    }

    // Reset UI state for next scan attempt
    btn.disabled = false;
    scanLine.classList.add('hidden');
    overlay.classList.add('hidden');
}

// --- Result Screen Rendering ---
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

// --- Binder Storage Logic ---
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
