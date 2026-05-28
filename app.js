// --- State Management ---
let currentCardData = null;
let collection = {}; // Object to store cards by Set name
let cameraStream = null;

// --- View Navigation ---
function navigateTo(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(el => {
        el.classList.remove('active');
        setTimeout(() => el.style.display = 'none', 300); // Wait for fade out
    });

    // Show target view
    const target = document.getElementById(`view-${viewId}`);
    target.style.display = 'flex';
    // Small timeout ensures display:flex applies before opacity transitions
    setTimeout(() => target.classList.add('active'), 50);

    // Handle Camera Lifecycle
    if (viewId === 'scanner') {
        startCamera();
    } else {
        stopCamera();
    }

    if (viewId === 'collection') {
        renderCollection();
    }
}

// --- App Boot Sequence ---
window.onload = () => {
    // Show intro for 2.5 seconds, then go home
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
        alert("Please allow camera access to scan cards.");
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// --- Scanning & API Logic ---
async function captureAndAnalyze() {
    const btn = document.getElementById('capture-btn');
    const scanLine = document.getElementById('scan-line');
    const overlay = document.getElementById('scanning-overlay');

    // UI Feedback
    btn.disabled = true;
    scanLine.classList.remove('hidden');
    overlay.classList.remove('hidden');

    // Fake analyzing time for UX (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch from TCG API (Mocking "Charizard" detection)
    try {
        const response = await fetch('https://api.pokemontcg.io/v2/cards?q=name:charizard&pageSize=1');
        const data = await response.json();
        
        if (data.data.length > 0) {
            currentCardData = data.data[0];
            populateResultScreen(currentCardData);
            navigateTo('result');
        }
    } catch (error) {
        console.error("API Fetch Failed", error);
        alert("Failed to analyze card. Check internet connection.");
    }

    // Reset UI
    btn.disabled = false;
    scanLine.classList.add('hidden');
    overlay.classList.add('hidden');
}

// --- Result Screen Population ---
function populateResultScreen(card) {
    const img = document.getElementById('result-image');
    img.src = card.images.large;
    // Pop animation trigger
    img.classList.remove('scale-100');
    setTimeout(() => img.classList.add('scale-100'), 100);

    document.getElementById('result-name').textContent = card.name;
    document.getElementById('result-set').textContent = `${card.set.name} • ${card.rarity || 'Common'}`;
    document.getElementById('result-type').textContent = card.supertype;
    
    const price = card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market || 'N/A';
    document.getElementById('result-value').textContent = price !== 'N/A' ? `$${price}` : 'N/A';
}

// --- Binder/Collection Logic ---
function addToCollection() {
    if (!currentCardData) return;
    
    const setName = currentCardData.set.name;
    
    // Create the binder for this set if it doesn't exist
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
