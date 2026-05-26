const app = {
    stream: null,
    collection: { cards: 0, value: 0.00 },

    init() {
        // Register Service Worker for PWA Add to Home Screen
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js');
        }

        // Simulate Database Load
        setTimeout(() => {
            this.showView('home-screen');
        }, 2000);
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        
        const target = document.getElementById(viewId);
        target.classList.remove('hidden');
        target.classList.add('active');

        if (viewId !== 'scan-screen' && this.stream) {
            this.stopCamera();
        }
    },

    async startScanner() {
        this.showView('scan-screen');
        document.getElementById('scan-ui').classList.remove('hidden');
        document.getElementById('result-ui').classList.add('hidden');
        document.getElementById('analyzing-ui').classList.add('hidden');

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } // Forces back camera on iPhone
            });
            document.getElementById('camera-feed').srcObject = this.stream;
        } catch (err) {
            alert("Camera access is required to scan cards.");
            this.showView('home-screen');
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    captureImage() {
        // 1. Hide capture UI, show analyzing UI
        document.getElementById('scan-ui').classList.add('hidden');
        document.getElementById('analyzing-ui').classList.remove('hidden');
        
        // Pause the video to "freeze" the frame
        document.getElementById('camera-feed').pause();

        // 2. Here is where you will capture the frame to a canvas
        // and run your perceptual hash matching against the JSON db.

        // Simulating the network/matching delay
        setTimeout(() => {
            this.showMatchResult();
        }, 2500);
    },

    showMatchResult() {
        document.getElementById('analyzing-ui').classList.add('hidden');
        document.getElementById('result-ui').classList.remove('hidden');
        
        // Mock data update - this would come from your matched DB/API
        document.getElementById('matched-card-img').src = "https://images.pokemontcg.io/base1/4_hires.png"; // Example Charizard
        document.getElementById('card-name').innerText = "Charizard";
        document.getElementById('card-value').innerText = "$120.00";
    },

    resetScanner() {
        document.getElementById('camera-feed').play();
        this.startScanner();
    },

    addToCollection() {
        this.collection.cards += 1;
        this.collection.value += 120.00; // Mock value addition
        
        document.getElementById('total-cards').innerText = this.collection.cards;
        document.getElementById('total-value').innerText = this.collection.value.toFixed(2);
        
        this.resetScanner();
    }
};

window.onload = () => app.init();
