// === STATO GLOBALE E DATI ===
let trackText = [];
let trackBg = [];
let trackAudio = []; 

let masterTimeline = null;
let isPlaying = false;
let currentFontFamily = 'sans-serif';
let selectedAnimIn = 'fade';
let selectedAnimOut = 'none';

let pixelsPerSecond = 50;
let MASTER_DURATION = 10.0;
let editingClipIndex = -1;
let currentProjectName = "";

// === GESTIONE PROGETTI (LOCALSTORAGE) ===
function saveProject() {
    const projectName = document.getElementById('project-name').value.trim();
    if (!projectName) {
        alert("INSERISCI UN NOME PER IL PROGETTO PRIMA DI SALVARE.");
        return;
    }
    
    const projectData = {
        name: projectName,
        duration: MASTER_DURATION,
        font: currentFontFamily,
        tracks: { text: trackText, bg: trackBg, audio: trackAudio }
    };
    
    let projects = JSON.parse(localStorage.getItem('ovo71_projects')) || {};
    projects[projectName] = projectData;
    localStorage.setItem('ovo71_projects', JSON.stringify(projects));
    
    currentProjectName = projectName;
    alert(`PROGETTO "${projectName}" SALVATO CON SUCCESSO!`);
    loadProjectsList();
}

function loadProjectsList() {
    const container = document.getElementById('projects-list');
    container.innerHTML = '';
    let projects = JSON.parse(localStorage.getItem('ovo71_projects')) || {};
    
    for (const key in projects) {
        const btn = document.createElement('button');
        btn.className = 'project-tag';
        btn.innerText = key;
        btn.onclick = () => loadProject(key);
        container.appendChild(btn);
    }
}

function loadProject(name) {
    let projects = JSON.parse(localStorage.getItem('ovo71_projects')) || {};
    if (projects[name]) {
        const p = projects[name];
        currentProjectName = p.name;
        document.getElementById('project-name').value = p.name;
        MASTER_DURATION = p.duration;
        document.getElementById('master-duration').value = p.duration;
        currentFontFamily = p.font;
        trackText = p.tracks.text || [];
        trackBg = p.tracks.bg || [];
        trackAudio = p.tracks.audio || [];
        
        renderTimelineUI();
        rebuildMasterTimelineSilently();
    }
}

document.getElementById('btn-save-draft').addEventListener('click', saveProject);
// Carica la lista all'avvio
loadProjectsList();

// === GESTIONE UI E TIMELINE ===
const fontSlider = document.getElementById('font-size-slider');
const fontNum = document.getElementById('font-size-num');

fontSlider.addEventListener('input', (e) => fontNum.value = e.target.value);
fontNum.addEventListener('input', (e) => fontSlider.value = e.target.value);

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        const activeElement = document.activeElement.tagName;
        if (activeElement !== 'INPUT' && activeElement !== 'TEXTAREA') {
            e.preventDefault();
            document.getElementById('btn-play-pause').click();
        }
    }
});

document.getElementById('master-duration').addEventListener('change', (e) => {
    MASTER_DURATION = parseFloat(e.target.value) || 10;
    renderTimelineUI();
    rebuildMasterTimelineSilently();
});

document.getElementById('font-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const fontUrl = URL.createObjectURL(file);
        currentFontFamily = 'OVO71_CustomFont';
        const customFont = new FontFace(currentFontFamily, `url(${fontUrl})`);
        await customFont.load();
        document.fonts.add(customFont);
    } catch (err) { alert('ERRORE CARICAMENTO FONT.'); }
});

document.getElementById('btn-update-text').addEventListener('click', () => {
    if (editingClipIndex > -1) {
        trackText[editingClipIndex].text = document.getElementById('text-input').value.replace(/\n/g, '<br>');
        trackText[editingClipIndex].fontSize = fontNum.value;
        trackText[editingClipIndex].color = document.getElementById('color-text-preset').value;
        trackText[editingClipIndex].align = document.getElementById('horiz-align').value;
        trackText[editingClipIndex].target = document.getElementById('anim-target').value;
        trackText[editingClipIndex].animIn = selectedAnimIn;
        trackText[editingClipIndex].animOut = selectedAnimOut;
        renderTimelineUI();
        rebuildMasterTimelineSilently();
    } else {
        alert("TESTO E PARAMETRI PRONTI! CLICCA '+ INSERISCI CLIP TESTO' PER AGGIUNGERLA.");
    }
});

const setupGrid = (gridId, setterCallback) => {
    document.querySelectorAll(`${gridId} .preset-btn`).forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll(`${gridId} .preset-btn`).forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            setterCallback(e.target.getAttribute('data-anim'));
        });
    });
};
setupGrid('#grid-in', val => selectedAnimIn = val);
setupGrid('#grid-out', val => selectedAnimOut = val);

document.getElementById('btn-add-text').addEventListener('click', () => {
    if(editingClipIndex > -1) {
        document.getElementById('btn-update-text').click();
        exitEditMode();
        return;
    }

    let startPos = 0;
    if(trackText.length > 0) {
        const last = trackText[trackText.length - 1];
        startPos = last.start + last.duration;
    }
    const duration = 3.0; 
    if (startPos + duration > MASTER_DURATION) startPos = Math.max(0, MASTER_DURATION - duration);

    trackText.push({
        text: document.getElementById('text-input').value.replace(/\n/g, '<br>'),
        font: currentFontFamily,
        fontSize: fontNum.value,
        color: document.getElementById('color-text-preset').value,
        align: document.getElementById('horiz-align').value,
        target: document.getElementById('anim-target').value,
        duration: duration,
        animIn: selectedAnimIn,
        animOut: selectedAnimOut,
        start: startPos
    });
    renderTimelineUI();
    rebuildMasterTimelineSilently();
});

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const color = e.target.getAttribute('data-color');
        let startPos = 0;
        if(trackBg.length > 0) {
            const last = trackBg[trackBg.length - 1];
            startPos = last.start + last.duration;
        }
        if (startPos + 2.0 > MASTER_DURATION) startPos = Math.max(0, MASTER_DURATION - 2.0);
        trackBg.push({ color: color, duration: 2.0, start: startPos });
        renderTimelineUI();
        rebuildMasterTimelineSilently();
    });
});

document.getElementById('btn-add-audio').addEventListener('click', () => {
    const file = document.getElementById('audio-upload').files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audioEl = document.getElementById('master-audio');
    audioEl.src = url;
    audioEl.onloadedmetadata = () => {
        let dur = audioEl.duration;
        if (dur > MASTER_DURATION) dur = MASTER_DURATION;
        trackAudio = [{ url: url, duration: dur, start: 0 }];
        renderTimelineUI();
        rebuildMasterTimelineSilently();
    };
});

document.getElementById('btn-clear-timeline').addEventListener('click', () => {
    trackText = []; trackBg = []; trackAudio = [];
    document.getElementById('master-audio').src = "";
    exitEditMode();
    renderTimelineUI();
    rebuildMasterTimelineSilently();
});

function loadClipIntoEditor(index) {
    editingClipIndex = index;
    const clip = trackText[index];
    
    document.getElementById('sidebar-title').textContent = "MODIFICA CLIP";
    document.getElementById('text-input').value = clip.text.replace(/<br>/g, '\n');
    fontSlider.value = clip.fontSize || 120;
    fontNum.value = clip.fontSize || 120;
    document.getElementById('color-text-preset').value = clip.color;
    document.getElementById('horiz-align').value = clip.align;
    document.getElementById('anim-target').value = clip.target;
    
    selectedAnimIn = clip.animIn; selectedAnimOut = clip.animOut;
    document.querySelectorAll('#grid-in .preset-btn').forEach(b => { b.classList.remove('active'); if(b.getAttribute('data-anim')===selectedAnimIn) b.classList.add('active'); });
    document.querySelectorAll('#grid-out .preset-btn').forEach(b => { b.classList.remove('active'); if(b.getAttribute('data-anim')===selectedAnimOut) b.classList.add('active'); });

    document.getElementById('btn-add-text').innerHTML = "✓ SALVA E CHIUDI MODIFICA";
    document.getElementById('btn-cancel-edit').style.display = "flex";
    renderTimelineUI();
}

function exitEditMode() {
    editingClipIndex = -1;
    document.getElementById('sidebar-title').textContent = "MOTION EDITOR";
    document.getElementById('btn-add-text').innerHTML = "+ INSERISCI CLIP TESTO";
    document.getElementById('btn-cancel-edit').style.display = "none";
    renderTimelineUI();
}

document.getElementById('btn-cancel-edit').addEventListener('click', exitEditMode);
document.getElementById('zoom-slider').addEventListener('input', (e) => {
    pixelsPerSecond = parseInt(e.target.value);
    renderTimelineUI();
    updatePlayheadVisuals();
});

function renderTimelineUI() {
    const ruler = document.getElementById('ruler-container');
    ruler.innerHTML = '<div id="playhead"></div>'; 
    document.getElementById('lane-text').innerHTML = '';
    document.getElementById('lane-bg').innerHTML = '';
    document.getElementById('lane-audio').innerHTML = '';

    const totalWidth = MASTER_DURATION * pixelsPerSecond;
    for(let i=0; i<=MASTER_DURATION; i++) {
        const tick = document.createElement('div');
        tick.className = 'ruler-tick';
        tick.style.left = `${i * pixelsPerSecond}px`;
        tick.innerText = `${i}S`;
        ruler.appendChild(tick);
    }

    const createTimelineBlock = (clip, index, array, laneId, classColor, label) => {
        const lane = document.getElementById(laneId);
        const block = document.createElement('div');
        block.className = `timeline-block ${classColor}`;
        if (laneId === 'lane-text' && index === editingClipIndex) block.classList.add('editing-block');
        
        block.style.left = `${clip.start * pixelsPerSecond}px`;
        block.style.width = `${clip.duration * pixelsPerSecond}px`;
        
        const spanContent = document.createElement('span');
        spanContent.style.pointerEvents = "none";
        spanContent.innerHTML = label;
        block.appendChild(spanContent);

        if (laneId === 'lane-bg') block.style.backgroundColor = clip.color;

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-clip-btn'; delBtn.innerHTML = '✕';
        delBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); array.splice(index, 1); renderTimelineUI(); rebuildMasterTimelineSilently(); });
        block.appendChild(delBtn);

        const resizerL = document.createElement('div');
        resizerL.className = 'resizer resizer-left';
        resizerL.addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault();
            let startX = e.clientX;
            let initialStart = clip.start;
            let initialDuration = clip.duration;
            
            const onMoveL = (ev) => {
                let diffS = (ev.clientX - startX) / pixelsPerSecond;
                let newStart = initialStart + diffS;
                let newDur = initialDuration - diffS;
                if (newStart < 0) { newDur += newStart; newStart = 0; }
                if (newDur < 0.2) { newStart = initialStart + initialDuration - 0.2; newDur = 0.2; }
                clip.start = newStart; clip.duration = newDur;
                block.style.left = `${clip.start * pixelsPerSecond}px`;
                block.style.width = `${clip.duration * pixelsPerSecond}px`;
            };
            const onUpL = () => { document.removeEventListener('mousemove', onMoveL); document.removeEventListener('mouseup', onUpL); rebuildMasterTimelineSilently(); };
            document.addEventListener('mousemove', onMoveL); document.addEventListener('mouseup', onUpL);
        });
        block.appendChild(resizerL);

        const resizerR = document.createElement('div');
        resizerR.className = 'resizer resizer-right';
        resizerR.addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault();
            let startX = e.clientX;
            let initialDuration = clip.duration;
            
            const onMoveR = (ev) => {
                let diffS = (ev.clientX - startX) / pixelsPerSecond;
                let newDur = initialDuration + diffS;
                if (newDur < 0.2) newDur = 0.2;
                if (clip.start + newDur > MASTER_DURATION) newDur = MASTER_DURATION - clip.start;
                clip.duration = newDur;
                block.style.width = `${clip.duration * pixelsPerSecond}px`;
            };
            const onUpR = () => { document.removeEventListener('mousemove', onMoveR); document.removeEventListener('mouseup', onUpR); rebuildMasterTimelineSilently(); };
            document.addEventListener('mousemove', onMoveR); document.addEventListener('mouseup', onUpR);
        });
        block.appendChild(resizerR);

        block.addEventListener('mousedown', (e) => {
            if(e.target.classList.contains('resizer') || e.target.classList.contains('delete-clip-btn')) return;
            e.preventDefault();
            let startX = e.clientX;
            let initialStart = clip.start;

            const onMoveDrag = (ev) => {
                let diffS = (ev.clientX - startX) / pixelsPerSecond;
                let newStart = initialStart + diffS;
                if (newStart < 0) newStart = 0;
                if (newStart + clip.duration > MASTER_DURATION) newStart = MASTER_DURATION - clip.duration;
                clip.start = newStart;
                block.style.left = `${clip.start * pixelsPerSecond}px`;
            };
            const onUpDrag = () => { document.removeEventListener('mousemove', onMoveDrag); document.removeEventListener('mouseup', onUpDrag); rebuildMasterTimelineSilently(); };
            document.addEventListener('mousemove', onMoveDrag); document.addEventListener('mouseup', onUpDrag);
        });

        if(laneId === 'lane-text') block.addEventListener('dblclick', () => loadClipIntoEditor(index));
        lane.appendChild(block);
    };

    trackText.forEach((clip, i) => createTimelineBlock(clip, i, trackText, 'lane-text', 'block-text', clip.text.replace(/<br>/g, ' ')));
    trackBg.forEach((clip, i) => createTimelineBlock(clip, i, trackBg, 'lane-bg', 'block-bg', ''));
    trackAudio.forEach((clip, i) => createTimelineBlock(clip, i, trackAudio, 'lane-audio', 'block-audio', 'TRACCIA AUDIO'));

    ruler.addEventListener('mousedown', (e) => {
        if(isPlaying) document.getElementById('btn-play-pause').click();
        const updateScrub = (ev) => {
            const rect = ruler.getBoundingClientRect();
            let x = ev.clientX - rect.left;
            if(x < 0) x = 0;
            if(x > totalWidth) x = totalWidth;
            let time = x / pixelsPerSecond;
            if(masterTimeline) masterTimeline.time(time);
        };
        updateScrub(e); 
        const onScrubUp = () => { document.removeEventListener('mousemove', updateScrub); document.removeEventListener('mouseup', onScrubUp); };
        document.addEventListener('mousemove', updateScrub); document.addEventListener('mouseup', onScrubUp);
    });
}

function getAnimConfig(elements, type, isOut, duration) {
    const base = { duration: duration, ease: isOut ? "power2.inOut" : "power3.out", stagger: 0.04 };
    gsap.set(elements, { transformPerspective: 800, transformOrigin: "50% 50%" });
    if (!isOut) {
        switch(type) {
            case 'fade': return { from: { opacity: 0 }, to: { opacity: 1, ...base } };
            case 'blur': return { from: { opacity: 0, filter: "blur(12px)" }, to: { opacity: 1, filter: "blur(0px)", ...base } };
            case 'cinematicZoom': return { from: { opacity: 0, scale: 1.15 }, to: { opacity: 1, scale: 1, ...base, ease: "power4.out" } };
            case 'slideRight': return { from: { opacity: 0, x: -50 }, to: { opacity: 1, x: 0, ...base } };
            case 'drop': return { from: { opacity: 0, y: -50 }, to: { opacity: 1, y: 0, ...base, ease: "bounce.out" } };
            case 'typewriter': return { from: { opacity: 0 }, to: { opacity: 1, duration: 0.01, ease: "none", stagger: 0.05 } };
        }
    } else {
        switch(type) {
            case 'fade': return { to: { opacity: 0, ...base } };
            case 'zoomOut': return { to: { opacity: 0, scale: 0.9, ...base } };
        }
    }
    return null;
}

function rebuildMasterTimelineSilently() {
    let savedTime = 0;
    if(masterTimeline) {
        savedTime = masterTimeline.time();
        masterTimeline.kill();
    }

    const textCont = document.getElementById('text-container');
    const bgCont = document.getElementById('bg-container');
    textCont.innerHTML = ''; bgCont.innerHTML = ''; bgCont.style.backgroundColor = "transparent";
    const audioEl = document.getElementById('master-audio');
    
    masterTimeline = gsap.timeline({ 
        paused: true,
        onUpdate: updatePlayheadVisuals,
        onComplete: () => { 
            isPlaying = false; 
            document.getElementById('btn-play-pause').textContent = "▶ PLAY"; 
            document.getElementById('btn-play-pause').style.background = "#32D74B";
            document.getElementById('btn-play-pause').style.color = "#000";
            audioEl.pause(); 
        }
    });

    trackBg.forEach(clip => {
        masterTimeline.set(bgCont, { backgroundColor: clip.color }, clip.start);
        masterTimeline.set(bgCont, { backgroundColor: "transparent" }, clip.start + clip.duration);
    });

    trackText.forEach(clip => {
        const layer = document.createElement('div');
        layer.className = `clip-layer ${clip.align} valign-center`;
        
        const txtNode = document.createElement('div');
        txtNode.className = 'clip-text';
        txtNode.style.fontFamily = clip.font;
        txtNode.style.fontSize = `${clip.fontSize || 120}px`; 
        txtNode.style.color = clip.color;
        txtNode.innerHTML = clip.text;

        layer.appendChild(txtNode); textCont.appendChild(layer);

        const split = new SplitType(txtNode, { types: clip.target });
        const elements = clip.target === 'chars' ? split.chars : split.words;
        if(elements) elements.forEach(el => el.style.color = clip.color);

        masterTimeline.set(layer, { opacity: 1 }, clip.start);

        const effectDur = 0.5;
        const inAnim = getAnimConfig(elements, clip.animIn, false, effectDur);
        if (inAnim) masterTimeline.fromTo(elements, inAnim.from, inAnim.to, clip.start);

        if (clip.animOut !== 'none') {
            const outAnim = getAnimConfig(elements, clip.animOut, true, effectDur);
            if (outAnim) masterTimeline.to(elements, outAnim.to, clip.start + clip.duration - effectDur);
        }

        masterTimeline.set(layer, { opacity: 0 }, clip.start + clip.duration);
    });

    masterTimeline.set({}, {}, MASTER_DURATION);
    masterTimeline.time(savedTime);
}

function updatePlayheadVisuals() {
    if(!masterTimeline) return;
    const time = masterTimeline.time();
    const ph = document.getElementById('playhead');
    if(ph) ph.style.left = `${time * pixelsPerSecond}px`;
    
    const audioEl = document.getElementById('master-audio');
    if (trackAudio.length > 0 && isPlaying) {
        const aClip = trackAudio[0];
        if (time >= aClip.start && time <= aClip.start + aClip.duration) {
            if (audioEl.paused) audioEl.play();
            if (Math.abs(audioEl.currentTime - (time - aClip.start)) > 0.2) audioEl.currentTime = time - aClip.start;
        } else {
            audioEl.pause();
        }
    }
}

document.getElementById('btn-play-pause').addEventListener('click', () => {
    const btn = document.getElementById('btn-play-pause');
    const audioEl = document.getElementById('master-audio');
    
    if (!masterTimeline) rebuildMasterTimelineSilently();

    if (!isPlaying) {
        if(masterTimeline.progress() === 1) masterTimeline.time(0); 
        masterTimeline.play();
        isPlaying = true;
        btn.textContent = "⏸ PAUSA"; btn.style.background = "#FFC107"; btn.style.color = "#000";
    } else {
        masterTimeline.pause();
        audioEl.pause();
        isPlaying = false;
        btn.textContent = "▶ PLAY"; btn.style.background = "#32D74B"; btn.style.color = "#000";
    }
});

renderTimelineUI();
rebuildMasterTimelineSilently();