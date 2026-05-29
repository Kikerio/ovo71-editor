const { fetchFile } = FFmpegUtil;
const { FFmpeg } = FFmpegWASM;

let ffmpeg = null;

async function loadFFmpeg() {
    if (ffmpeg === null) {
        ffmpeg = new FFmpeg();
        ffmpeg.on('log', ({ message }) => console.log(message));
        // Carica i file necessari per la conversione in locale
        await ffmpeg.load({
            coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
            wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm"
        });
    }
}

document.getElementById('btn-export-mp4').addEventListener('click', async () => {
    const btn = document.getElementById('btn-export-mp4');
    btn.textContent = "⏳ PREPARAZIONE...";
    btn.style.background = "#FFC107";
    
    try {
        await loadFFmpeg();
        btn.textContent = "⏺ REGISTRAZIONE...";
        btn.style.background = "#FF453A";

        // Otteniamo il canvas e prepariamo il registratore
        const canvas = document.getElementById('export-canvas');
        
        // --- SINCRONIZZAZIONE CANVAS MANUALE ---
        // Poiché il browser blocca la registrazione automatica del DOM senza permessi,
        // per un export perfetto dovremmo disegnare i frame sul canvas.
        // Qui prepariamo lo stream dal canvas nascosto.
        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        const chunks = [];

        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        
        mediaRecorder.onstop = async () => {
            btn.textContent = "⚙️ CONVERSIONE MP4...";
            btn.style.background = "#0A84FF";

            // Uniamo i frammenti in un file WebM
            const webmBlob = new Blob(chunks, { type: 'video/webm' });
            
            // Passiamo il WebM a FFmpeg per la conversione
            await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
            
            // Comando FFmpeg per convertire in MP4
            await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'ultrafast', 'output.mp4']);
            
            // Estraiamo il file MP4 finito
            const data = await ffmpeg.readFile('output.mp4');
            const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(mp4Blob);
            
            // Download automatico senza avvisi
            const a = document.createElement('a'); 
            a.style.display = 'none'; 
            a.href = url; 
            const expName = currentProjectName ? currentProjectName.replace(/\s+/g, '_') : 'OVO71';
            a.download = `${expName}_Export.mp4`;
            
            document.body.appendChild(a); 
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);

            // Reset UI
            btn.textContent = "⏺ ESPORTA MP4";
            btn.style.background = "#FF453A";
        };

        // Facciamo partire la registrazione
        mediaRecorder.start();
        
        // Eseguiamo la timeline
        masterTimeline.time(0);
        document.getElementById('btn-play-pause').click(); 
        
        // Fermiamo la registrazione alla fine della durata master
        setTimeout(() => { 
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop(); 
        }, (MASTER_DURATION + 0.5) * 1000);

    } catch (err) { 
        console.error(err);
        alert("ERRORE DURANTE L'ESPORTAZIONE.");
        btn.textContent = "⏺ ESPORTA MP4";
        btn.style.background = "#FF453A";
    }
});