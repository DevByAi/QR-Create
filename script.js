let createHistory = JSON.parse(localStorage.getItem('createHistory')) || [];
let scanHistory = JSON.parse(localStorage.getItem('scanHistory')) || [];
let qrcode, lastScannedCode = '', html5QrcodeScanner;

document.addEventListener('DOMContentLoaded', function() {
    displayHistory('create');
    displayHistory('scan');
    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
        document.querySelector('.night-mode-toggle').textContent = '☀️';
    }
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    document.getElementById(tabName + '-tab').setAttribute('aria-hidden', 'false');
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).setAttribute('aria-selected', 'true');
    if (tabName === 'scan' && !html5QrcodeScanner) startScanner();
}

function generateQR(url = document.getElementById('url').value, name = document.getElementById('url-name').value) {
    if (url) {
        if (qrcode) {
            qrcode.clear();
            qrcode.makeCode(url);
        } else {
            qrcode = new QRCode(document.getElementById("qrcode"), {
                text: url,
                width: 256,
                height: 256,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }
        
        const existingItem = createHistory.find(item => item.data === url);
        if (!existingItem) {
            addToHistory('create', url, name || url);
        }
    }
}

async function startScanner() {
    try {
        const devices = await Html5Qrcode.getCameras();
        let selectedCamera;

        // חיפוש מצלמה אחורית
        for (const device of devices) {
            if (device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('אחורית') ||
                device.label.toLowerCase().includes('חיצונית')) {
                selectedCamera = device;
                break;
            }
        }

        // אם לא נמצאה מצלמה אחורית, השתמש במצלמה הראשונה ברשימה
        if (!selectedCamera && devices.length > 0) {
            selectedCamera = devices[devices.length - 1]; // לרוב, המצלמה האחרונה היא האחורית
        }

        if (selectedCamera) {
            html5QrcodeScanner = new Html5Qrcode("reader");
            await html5QrcodeScanner.start(
                selectedCamera.id, 
                {
                    fps: 10,
                    qrbox: 250
                },
                onScanSuccess,
                onScanFailure
            );
        } else {
            throw new Error("לא נמצאה מצלמה מתאימה.");
        }
    } catch (err) {
        console.error("Error starting scanner:", err);
        alert("לא ניתן להפעיל את הסורק. אנא ודא שיש גישה למצלמה האחורית.");
    }
}

function onScanSuccess(decodedText, decodedResult) {
    document.getElementById('scanned-qr').innerText = `נסרק: ${decodedText}`;
    lastScannedCode = decodedText;
}

function onScanFailure(error) {
    // console.warn(`QR code scanning failed: ${error}`);
}

function saveScan() {
    const name = document.getElementById('scan-name').value || lastScannedCode;
    if (lastScannedCode) {
        const existingItem = scanHistory.find(item => item.data === lastScannedCode);
        if (!existingItem) {
            addToHistory('scan', lastScannedCode, name);
        }
        document.getElementById('scan-name').value = '';
        lastScannedCode = '';
        document.getElementById('scanned-qr').innerText = '';
    }
}

function addToHistory(type, data, name) {
    const item = { data, name, date: new Date().toISOString() };
    const history = type === 'create' ? createHistory : scanHistory;
    history.unshift(item);
    localStorage.setItem(type + 'History', JSON.stringify(history));
    displayHistory(type);
}

function displayHistory(type) {
    const historyElement = document.getElementById(type === 'create' ? 'history' : 'scan-history');
    const history = type === 'create' ? createHistory : scanHistory;
    historyElement.innerHTML = '';
    history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<span>${item.name}</span><div>
            <button onclick="copyToClipboard('${item.data}')" aria-label="העתק">העתק</button>
            <button onclick="openLink('${item.data}')" aria-label="פתח">פתח</button>
            <button onclick="editName('${type}', ${index})" aria-label="ערוך">ערוך שם</button>
            <button onclick="deleteItem('${type}', ${index})" aria-label="מחק">מחק</button>
        </div>`;
        div.onclick = function(event) {
            if (!event.target.closest('button')) generateQR(item.data, item.name);
        };
        historyElement.appendChild(div);
    });
}

function searchHistory(type) {
    const searchTerm = document.getElementById(type + '-search').value.toLowerCase();
    const history = type === 'create' ? createHistory : scanHistory;
    const filteredHistory = history.filter(item => 
        item.data.toLowerCase().includes(searchTerm) || item.name.toLowerCase().includes(searchTerm)
    );
    displayFilteredHistory(type, filteredHistory);
}

function displayFilteredHistory(type, filteredHistory) {
    const historyElement = document.getElementById(type === 'create' ? 'history' : 'scan-history');
    historyElement.innerHTML = '';
    filteredHistory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<span>${item.name}</span><div>
            <button onclick="copyToClipboard('${item.data}')" aria-label="העתק">העתק</button>
            <button onclick="openLink('${item.data}')" aria-label="פתח">פתח</button>
            <button onclick="editName('${type}', ${index})" aria-label="ערוך">ערוך שם</button>
            <button onclick="deleteItem('${type}', ${index})" aria-label="מחק">מחק</button>
        </div>`;
        div.onclick = function(event) {
            if (!event.target.closest('button')) generateQR(item.data, item.name);
        };
        historyElement.appendChild(div);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('הטקסט הועתק ללוח'));
}

function openLink(url) {
    window.open(url, '_blank');
}

function editName(type, index) {
    const history = type === 'create' ? createHistory : scanHistory;
    const newName = prompt('הכנס שם חדש:', history[index].name);
    if (newName !== null) {
        history[index].name = newName;
        localStorage.setItem(type + 'History', JSON.stringify(history));
        displayHistory(type);
    }
}

function deleteItem(type, index) {
    if (confirm('האם אתה בטוח שברצונך למחוק פריט זה?')) {
        const history = type === 'create' ? createHistory : scanHistory;
        history.splice(index, 1);
        localStorage.setItem(type + 'History', JSON.stringify(history));
        displayHistory(type);
    }
}

function toggleNightMode() {
    document.body.classList.toggle('night-mode');
    const isNightMode = document.body.classList.contains('night-mode');
    localStorage.setItem('nightMode', isNightMode);
    document.querySelector('.night-mode-toggle').textContent = isNightMode ? '☀️' : '🌙';
    if (qrcode) {
        qrcode.clear();
        qrcode.makeCode(document.getElementById('url').value);
    }
}
