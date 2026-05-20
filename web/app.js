const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
let ws;

const el = {
    inDevice: document.getElementById('input-device'),
    outDevice: document.getElementById('output-device'),
    btnStart: document.getElementById('btn-start'),
    btnStop: document.getElementById('btn-stop'),
    sysStatus: document.getElementById('system-status'),
    badge: document.getElementById('status-badge'),
    statusDot: document.getElementById('status-dot'),
    enrollStatus: document.getElementById('enroll-status'),
    barIn: document.getElementById('bar-in'),
    barOut: document.getElementById('bar-out'),
    barSim: document.getElementById('bar-sim'),
    barProx: document.getElementById('bar-prox')
};

function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        el.sysStatus.textContent = "Connected to engine";
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init') {
            populateDevices(msg.devices, msg.default_in, msg.default_out);
        } else if (msg.type === 'status') {
            updateUI(msg);
        }
    };

    ws.onclose = () => {
        el.sysStatus.textContent = "Disconnected. Reconnecting...";
        el.statusDot.style.background = '#9ca3af';
        setTimeout(connect, 2000);
    };
}

function populateDevices(devices, defIn, defOut) {
    el.inDevice.innerHTML = '';
    el.outDevice.innerHTML = '';
    
    devices.forEach((dev, idx) => {
        const opt1 = document.createElement('option');
        opt1.value = idx;
        opt1.textContent = dev;
        if (idx === defIn) opt1.selected = true;
        el.inDevice.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = idx;
        opt2.textContent = dev;
        if (idx === defOut) opt2.selected = true;
        el.outDevice.appendChild(opt2);
    });
}

function updateUI(status) {
    // Buttons
    el.btnStart.disabled = status.running;
    el.btnStop.disabled = !status.running;
    el.inDevice.disabled = status.running;
    el.outDevice.disabled = status.running;
    
    // Badge
    if (status.running) {
        el.badge.textContent = "Running";
        el.badge.className = "badge running";
        el.statusDot.style.background = '#16a34a';
    } else {
        el.badge.textContent = "Idle";
        el.badge.className = "badge idle";
        el.statusDot.style.background = '#9ca3af';
    }

    // Profile status
    if (status.is_enrolled) {
        el.enrollStatus.textContent = "✅ Profile active";
        el.enrollStatus.style.color = "#16a34a";
    } else {
        el.enrollStatus.textContent = "⚠ No profile found";
        el.enrollStatus.style.color = "#d97706";
    }

    // Bars
    el.barIn.style.width = Math.min(status.rms_in * 5 * 100, 100) + '%';
    el.barOut.style.width = Math.min(status.rms_out * 5 * 100, 100) + '%';
    
    let simPct = Math.max(0, (status.sim - 0.2) / 0.8 * 100);
    el.barSim.style.width = Math.min(simPct, 100) + '%';

    let proxPct = Math.min(status.prox / 3.0 * 100, 100);
    el.barProx.style.width = Math.max(0, proxPct) + '%';
}

// Actions
el.btnStart.addEventListener('click', () => {
    ws.send(JSON.stringify({
        action: 'start',
        device_in: el.inDevice.value,
        device_out: el.outDevice.value
    }));
});

el.btnStop.addEventListener('click', () => {
    ws.send(JSON.stringify({ action: 'stop' }));
});

// Gain slider
const gainSlider = document.getElementById('gain-slider');
const gainValue = document.getElementById('gain-value');

gainSlider.addEventListener('input', () => {
    const val = parseFloat(gainSlider.value);
    gainValue.textContent = val.toFixed(1) + 'x';
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'set_gain', value: val }));
    }
});

// Threshold slider
const threshSlider = document.getElementById('threshold-slider');
const threshValue = document.getElementById('threshold-value');

threshSlider.addEventListener('input', () => {
    const val = parseFloat(threshSlider.value);
    threshValue.textContent = val.toFixed(2);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'set_threshold', value: val }));
    }
});

// Proximity slider
const proxSlider = document.getElementById('prox-slider');
const proxValue = document.getElementById('prox-value');

proxSlider.addEventListener('input', () => {
    const val = parseFloat(proxSlider.value);
    proxValue.textContent = val === 0 ? "OFF" : val.toFixed(1);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'set_proximity_threshold', value: val }));
    }
});

connect();
