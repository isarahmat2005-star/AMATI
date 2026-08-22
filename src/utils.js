export const R = Math.random;

export const getOpfsDir = async (kind) => {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(kind === 'mp4' ? 'renders_mp4' : 'renders_base64', { create: true });
};

export const saveToOpfs = async (kind, cardId, data) => {
    const dir = await getOpfsDir(kind);
    const ext = kind === 'mp4' ? 'mp4' : 'txt';
    const fileHandle = await dir.getFileHandle(`${cardId}.${ext}`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
};

export const getFromOpfs = async (kind, cardId) => {
    const dir = await getOpfsDir(kind);
    const ext = kind === 'mp4' ? 'mp4' : 'txt';
    const fileHandle = await dir.getFileHandle(`${cardId}.${ext}`);
    return fileHandle.getFile(); 
};

export const deleteFromOpfs = async (kind, cardId) => {
    try {
        const dir = await getOpfsDir(kind);
        const ext = kind === 'mp4' ? 'mp4' : 'txt';
        await dir.removeEntry(`${cardId}.${ext}`);
    } catch { /* File belum ada, abaikan */ }
};

// --- HELPER: KONVERSI FILE/BLOB KE BASE64 (generate on-demand) ---
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const b64 = dataUrl.split(',')[1];
            resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

export const wrapSvgAsHtml = (jsCode, resolution = '1920x1080', duration = 10, viewMode = 'preview') => {
    const isThumb = viewMode === 'thumbnail';
    const isPreview = viewMode === 'preview';
    const [w, h] = resolution.split('x');

    // Menarik detik thumbnail spesifik dari meta-tag di dalam JS Code
    const metaThumbMatch = jsCode.match(/THUMB:(\d+(?:\.\d+)?)/i);
    const thumbTime = metaThumbMatch ? parseFloat(metaThumbMatch[1]) : (duration * 0.40);

    const playerStyles = isPreview ? `
    .player-bar { height: 44px; background: #ffffff; border: 1px solid #0891B3; border-radius: 8px; padding: 0 16px; display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-shrink: 0; }
    .play-btn { background: #0891B3; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: background 0.2s; }
    .play-btn:hover { background: #06738F; }
    .play-btn svg { width: 10px; height: 10px; fill: currentColor; }
    .progress-track { flex: 1; height: 6px; background: #e2e8f0; border-radius: 4px; position: relative; cursor: pointer; }
    .progress-fill { height: 100%; background: #0891B3; width: 0%; pointer-events: none; border-radius: 4px; position: relative; }
    .progress-thumb { position: absolute; right: -6px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; background: #fff; border: 2px solid #0891B3; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); pointer-events: none; }
    .time-label { font-size: 11px; font-weight: 700; color: #475569; font-variant-numeric: tabular-nums; min-width: 38px; text-align: right; }
    ` : '';

    const playerHtml = isPreview ? `
    <div class="player-bar">
        <button class="play-btn" id="btnPlayPause">
            <svg id="iconPause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            <svg id="iconPlay" viewBox="0 0 24 24" style="display:none;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <div class="progress-track" id="track">
            <div class="progress-fill" id="fill"><div class="progress-thumb"></div></div>
        </div>
        <div class="time-label" id="timeDisp">0.0s</div>
    </div>
    ` : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100vh; overflow: hidden; background: transparent; display: flex; flex-direction: column; font-family: ui-sans-serif, system-ui, sans-serif; }
    .svg-wrapper { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; overflow: hidden; ${isPreview ? 'background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1;' : 'background: transparent;'} }
    svg { display: block; width: 100%; height: 100%; }
    ${playerStyles}
</style>
</head>
<body>
    <div class="svg-wrapper">
        <svg id="mainCanvas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="${isThumb ? 'xMidYMid slice' : 'xMidYMid meet'}"></svg>
    </div>
    ${playerHtml}

    <script>
        ${jsCode}

        {
            const _dur = ${duration}; const _w = ${w}; const _h = ${h};
            let _isPlaying = ${isThumb ? 'false' : 'true'}; let _startTime = performance.now(); let _accTime = 0;
            const _svg = document.getElementById('mainCanvas'); const _btn = document.getElementById('btnPlayPause');
            const _iPlay = document.getElementById('iconPlay'); const _iPause = document.getElementById('iconPause');
            const _fill = document.getElementById('fill'); const _tDisp = document.getElementById('timeDisp'); const _track = document.getElementById('track');

            try { if (typeof create === 'function') create(_svg, _w, _h); } catch (err) {}
            
            let _isDragging = false;
            const _updateT = (clientX) => {
                if(!_track) return;
                const rect = _track.getBoundingClientRect();
                const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
                const targetTime = (percent / 100) * _dur;
                _accTime = targetTime;
                try { if (typeof update === 'function') update(targetTime, _svg, _w, _h); } catch (err) {}
                if(_fill && _tDisp) { _fill.style.width = percent + '%'; _tDisp.innerText = targetTime.toFixed(1) + 's'; }
            };

            if (_track) {
                _track.addEventListener('mousedown', (e) => { _isDragging = true; _updateT(e.clientX); });
                window.addEventListener('mousemove', (e) => { if(_isDragging) _updateT(e.clientX); });
                window.addEventListener('mouseup', () => { if(_isDragging) { _isDragging = false; _startTime = performance.now(); } });
            }

            const _render = () => {
                if(!_isPlaying) { requestAnimationFrame(_render); return; }
                const now = performance.now(); const elapsed = (now - _startTime) / 1000;
                let current = (_accTime + elapsed) % _dur;
                try { if (typeof update === 'function') update(current, _svg, _w, _h); } catch (err) {}
                if (_fill && _tDisp && !_isDragging) { _fill.style.width = ((current / _dur) * 100) + '%'; _tDisp.innerText = current.toFixed(1) + 's'; }
                requestAnimationFrame(_render);
            };
            requestAnimationFrame(_render);

            // Menerapkan detik thumbnail spesifik saat membeku (isThumb === true)
            if (typeof update === 'function' && !_isPlaying) update(${thumbTime}, _svg, _w, _h);

            if (_btn && _track) {
                _btn.addEventListener('click', () => {
                    if(_isPlaying) {
                        _isPlaying = false; _iPause.style.display = 'none'; _iPlay.style.display = 'block';
                        _accTime = (_accTime + (performance.now() - _startTime) / 1000) % _dur;
                    } else {
                        _isPlaying = true; _iPlay.style.display = 'none'; _iPause.style.display = 'block';
                        _startTime = performance.now();
                    }
                });
            }
        }
    </script>
</body>
</html>`;
};

export const generateRandomTaskID = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let str = "";
    for(let i=0; i<5; i++) str += letters.charAt(Math.floor(Math.random() * letters.length));
    const nums = Math.floor(10000 + Math.random() * 90000).toString();
    return str + nums;
};

export const generateRandomSuffix = () => {
    return Math.random().toString(36).substring(2, 7);
};
