// === STATO GLOBALE E DATI ===
let trackText = [];
let trackBg = [];
let trackAudio = []; 
let customGuides = { h: [], v: [] }; 

let masterTimeline = null;
let isPlaying = false;
let currentFontFamily = 'sans-serif';
let selectedAnimIn = 'fade';
let selectedAnimOut = 'none';

let pixelsPerSecond = 50;
let MASTER_DURATION = 10.0;
let editingClipIndex = -1;
let currentProjectName = "";

let selectedTrackType = null;
let selectedGlobalIndex = -1;
let clipboard = null;

// === MOTORE SCALA VIDEO 4K (3840x2160) ===
let stageScale = 1;
function resizeStage() {
    const wrapper = document.getElementById('stage-wrapper');
    const stage = document.getElementById('stage');
    const wWidth = wrapper.clientWidth - 80; 
    const wHeight = wrapper.clientHeight - 80;
    stageScale = Math.min(wWidth / 3840, wHeight / 2160); // Math 4K
    stage.style.transform = `scale(${stageScale})`;
}
window.addEventListener('resize', resizeStage);
resizeStage(); 

// === GESTIONE PROGETTI ===
function saveProject() {
    const projectName = document.getElementById('project-name').value.trim();
    if (!projectName) { alert("INSERISCI UN NOME PER IL PROGETTO PRIMA DI SALVARE."); return; }
    const projectData = { name: projectName, duration: MASTER_DURATION, font: currentFontFamily, tracks: { text: trackText, bg: trackBg, audio: trackAudio }, guides: customGuides };
    let projects = JSON.parse(localStorage.getItem('ovo71_projects')) || {};
    projects[projectName] = projectData;
    localStorage.setItem('ovo71_projects', JSON.stringify(projects));
    currentProjectName = projectName; alert(`PROGETTO "${projectName}" SALVATO!`); loadProjectsList();
}

function loadProjectsList() {
    const container = document.getElementById('projects-list'); container.innerHTML = '';
    let projects = JSON.parse(localStorage.getItem('ovo71_projects')) || {};
    for (const key in projects) {
        const btn = document.createElement('button'); btn.className = 'project-tag'; btn.innerText = key;
        btn.onclick = () => loadProject(key); container.appendChild(btn);
    }
}

function loadProject(name) {
    let projects = JSON.parse(localStorage.getItem('ovo71_projects')) || {};
    if (projects[name]) {
        const p = projects[name]; currentProjectName = p.name; document.getElementById('project-name').value = p.name;
        MASTER_DURATION = p.duration; document.getElementById('master-duration').value = p.duration;
        currentFontFamily = p.font; trackText = p.tracks.text || []; trackBg = p.tracks.bg || []; trackAudio = p.tracks.audio || [];
        customGuides = p.guides || { h: [], v: [] };
        
        exitEditMode();
        showGuides(); 
        renderCustomGuides();
    }
}

document.getElementById('btn-save-draft').addEventListener('click', saveProject);
loadProjectsList();

// === SISTEMA GRIGLIE (3840x2160) ===
function showGuides() {
    document.getElementById('guides-container').style.display = 'block';
    document.getElementById('custom-guides-container').style.display = 'block';
    const btn = document.getElementById('btn-toggle-guides');
    btn.style.background = '#32D74B'; btn.style.color = '#000'; btn.innerText = "⌖ GUIDE ON";
}

function initRulers() {
    const rh = document.getElementById('stage-ruler-h');
    const rv = document.getElementById('stage-ruler-v');
    rh.innerHTML = ''; rv.innerHTML = '';
    
    for(let i=0; i<=3840; i+=200) { // Step aumentato per leggibilità 4K
        let pct = (i / 3840) * 100;
        let t = document.createElement('div'); t.className = 'stage-tick-h'; t.style.left = `${pct}%`; t.innerText = i; rh.appendChild(t);
    }
    for(let i=0; i<=2160; i+=200) {
        let pct = (i / 2160) * 100;
        let t = document.createElement('div'); t.className = 'stage-tick-v'; t.style.top = `${pct}%`; t.innerText = i; rv.appendChild(t);
    }

    rh.addEventListener('mousedown', (e) => {
        const rect = document.getElementById('stage').getBoundingClientRect();
        let x = (e.clientX - rect.left) / stageScale;
        customGuides.v.push((x / 3840) * 100); 
        showGuides(); renderCustomGuides(); saveProject();
    });
    rv.addEventListener('mousedown', (e) => {
        const rect = document.getElementById('stage').getBoundingClientRect();
        let y = (e.clientY - rect.top) / stageScale;
        customGuides.h.push((y / 2160) * 100); 
        showGuides(); renderCustomGuides(); saveProject();
    });
}

function renderCustomGuides() {
    const container = document.getElementById('custom-guides-container');
    container.innerHTML = '';
    
    customGuides.h.forEach((posPct, i) => {
        let g = document.createElement('div'); g.className = 'custom-guide-h';
        container.appendChild(g);
        let pixelPos = (posPct / 100) * 2160;
        gsap.set(g, { y: pixelPos });
        Draggable.create(g, { type: 'y', bounds: "#stage", onDragEnd: function() { 
            customGuides.h[i] = (this.y / 2160) * 100; saveProject(); 
        }});
    });

    customGuides.v.forEach((posPct, i) => {
        let g = document.createElement('div'); g.className = 'custom-guide-v';
        container.appendChild(g);
        let pixelPos = (posPct / 100) * 3840;
        gsap.set(g, { x: pixelPos });
        Draggable.create(g, { type: 'x', bounds: "#stage", onDragEnd: function() { 
            customGuides.v[i] = (this.x / 3840) * 100; saveProject(); 
        }});
    });
}

window.addEventListener('resize', renderCustomGuides);

document.getElementById('btn-generate-grid').addEventListener('click', () => {
    const cols = parseInt(document.getElementById('grid-cols').value) || 1;
    const rows = parseInt(document.getElementById('grid-rows').value) || 1;
    customGuides = { h: [], v: [] };
    
    for(let i=1; i<cols; i++) customGuides.v.push((100 / cols) * i);
    for(let i=1; i<rows; i++) customGuides.h.push((100 / rows) * i);
    
    showGuides(); renderCustomGuides(); saveProject();
});

document.getElementById('btn-clear-guides').addEventListener('click', () => {
    customGuides = { h: [], v: [] }; renderCustomGuides(); saveProject();
});

document.getElementById('btn-toggle-guides').addEventListener('click', (e) => {
    const guides1 = document.getElementById('guides-container');
    const guides2 = document.getElementById('custom-guides-container');
    if(guides1.style.display === 'none') { 
        showGuides();
    } else { 
        guides1.style.display = 'none'; guides2.style.display = 'none';
        e.target.style.background = '#444'; e.target.style.color = 'white'; e.target.innerText = "⌖ GUIDE OFF";
    }
});

initRulers();

// === UI TESTO E DRAG ===
const fontSlider = document.getElementById('font-size-slider');
const fontNum = document.getElementById('font-size-num');
fontSlider.addEventListener('input', (e) => { fontNum.value = e.target.value; updateLiveText(); });
fontNum.addEventListener('input', (e) => { fontSlider.value = e.target.value; updateLiveText(); });

function updateLiveText() {
    if (editingClipIndex > -1) {
        trackText[editingClipIndex].fontSize = fontNum.value;
        const liveNode = document.querySelector(`.clip-text[data-index="${editingClipIndex}"]`);
        if (liveNode) liveNode.style.fontSize = `${fontNum.value}px`;
    }
}

document.getElementById('stage-wrapper').addEventListener('mousedown', (e) => {
    if (e.target.id === 'stage' || e.target.id === 'bg-container' || e.target.id === 'stage-wrapper') {
        if (editingClipIndex > -1) { document.getElementById('btn-update-text').click(); exitEditMode(); }
    }
});

document.getElementById('text-container').addEventListener('mousedown', (e) => {
    if(e.target.classList.contains('resize-handle')) return; 

    const clipNode = e.target.closest('.clip-text');
    if (clipNode && !isPlaying) {
        const index = parseInt(clipNode.getAttribute('data-index'));
        if (!isNaN(index) && editingClipIndex !== index) {
            e.stopPropagation();
            if(editingClipIndex > -1) document.getElementById('btn-update-text').click(); 
            loadClipIntoEditor(index);
        }
    } else if (!clipNode) {
        if (editingClipIndex > -1) { document.getElementById('btn-update-text').click(); exitEditMode(); }
    }
});

// === COPIA E INCOLLA VIA UI ===
document.getElementById('btn-copy-clip').addEventListener('click', () => {
    if (selectedGlobalIndex > -1 && selectedTrackType) {
        let sourceArr = selectedTrackType === 'text' ? trackText : (selectedTrackType === 'bg' ? trackBg : trackAudio);
        clipboard = JSON.parse(JSON.stringify(sourceArr[selectedGlobalIndex]));
    } else { alert("SELEZIONA UNA CLIP NELLA TIMELINE PRIMA DI COPIARE."); }
});

document.getElementById('btn-paste-clip').addEventListener('click', () => {
    if (!clipboard) { alert("NESSUNA CLIP DA INCOLLARE."); return; }
    let newClip = JSON.parse(JSON.stringify(clipboard));
    let phTime = masterTimeline ? masterTimeline.time() : 0;
    
    newClip.start = phTime; 
    if (newClip.start + newClip.duration > MASTER_DURATION) newClip.start = Math.max(0, MASTER_DURATION - newClip.duration);
    
    if (clipboard.text !== undefined) trackText.push(newClip);
    else if (clipboard.color !== undefined) trackBg.push(newClip);
    else trackAudio.push(newClip);
    
    renderTimelineUI(); rebuildMasterTimelineSilently();
});

document.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement.tagName;
    if (activeElement === 'INPUT' || activeElement === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); document.getElementById('btn-play-pause').click(); }
});

document.getElementById('master-duration').addEventListener('change', (e) => { MASTER_DURATION = parseFloat(e.target.value) || 10; renderTimelineUI(); rebuildMasterTimelineSilently(); });

document.getElementById('font-upload').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; try { const fontUrl = URL.createObjectURL(file); currentFontFamily = 'OVO71_CustomFont'; const customFont = new FontFace(currentFontFamily, `url(${fontUrl})`); await customFont.load(); document.fonts.add(customFont); } catch (err) { alert('ERRORE CARICAMENTO FONT.'); } });

document.getElementById('btn-update-text').addEventListener('click', () => {
    if (editingClipIndex > -1) {
        trackText[editingClipIndex].text = document.getElementById('text-input').value.replace(/\n/g, '<br>');
        trackText[editingClipIndex].fontSize = fontNum.value;
        trackText[editingClipIndex].color = document.getElementById('color-text-preset').value;
        trackText[editingClipIndex].align = document.getElementById('horiz-align').value;
        trackText[editingClipIndex].target = document.getElementById('anim-target').value;
        trackText[editingClipIndex].animIn = selectedAnimIn;
        trackText[editingClipIndex].animOut = selectedAnimOut;
        renderTimelineUI(); rebuildMasterTimelineSilently();
    } else { alert("TESTO PRONTO! CLICCA '+ INSERISCI CLIP TESTO'."); }
});

const setupGrid = (gridId, setterCallback) => { document.querySelectorAll(`${gridId} .preset-btn`).forEach(btn => { btn.addEventListener('click', (e) => { document.querySelectorAll(`${gridId} .preset-btn`).forEach(b => b.classList.remove('active')); e.target.classList.add('active'); setterCallback(e.target.getAttribute('data-anim')); }); }); };
setupGrid('#grid-in', val => selectedAnimIn = val); setupGrid('#grid-out', val => selectedAnimOut = val);

document.getElementById('btn-add-text').addEventListener('click', () => {
    if(editingClipIndex > -1) { document.getElementById('btn-update-text').click(); exitEditMode(); return; }
    let startPos = 0; if(trackText.length > 0) { const last = trackText[trackText.length - 1]; startPos = last.start + last.duration; }
    const duration = 3.0; if (startPos + duration > MASTER_DURATION) startPos = Math.max(0, MASTER_DURATION - duration);
    trackText.push({ text: document.getElementById('text-input').value.replace(/\n/g, '<br>'), font: currentFontFamily, fontSize: fontNum.value, color: document.getElementById('color-text-preset').value, align: document.getElementById('horiz-align').value, target: document.getElementById('anim-target').value, duration: duration, animIn: selectedAnimIn, animOut: selectedAnimOut, start: startPos, posX: 0, posY: 0 });
    renderTimelineUI(); rebuildMasterTimelineSilently();
});

document.querySelectorAll('.color-btn').forEach(btn => { btn.addEventListener('click', (e) => { const color = e.target.getAttribute('data-color'); let startPos = 0; if(trackBg.length > 0) { const last = trackBg[trackBg.length - 1]; startPos = last.start + last.duration; } if (startPos + 2.0 > MASTER_DURATION) startPos = Math.max(0, MASTER_DURATION - 2.0); trackBg.push({ color: color, duration: 2.0, start: startPos }); renderTimelineUI(); rebuildMasterTimelineSilently(); }); });
document.getElementById('btn-add-audio').addEventListener('click', () => { const file = document.getElementById('audio-upload').files[0]; if (!file) return; const url = URL.createObjectURL(file); const audioEl = document.getElementById('master-audio'); audioEl.src = url; audioEl.onloadedmetadata = () => { let dur = audioEl.duration; if (dur > MASTER_DURATION) dur = MASTER_DURATION; trackAudio = [{ url: url, duration: dur, start: 0 }]; renderTimelineUI(); rebuildMasterTimelineSilently(); }; });
document.getElementById('btn-clear-timeline').addEventListener('click', () => { trackText = []; trackBg = []; trackAudio = []; document.getElementById('master-audio').src = ""; exitEditMode(); });

function loadClipIntoEditor(index) {
    editingClipIndex = index; 
    selectedTrackType = 'text'; 
    selectedGlobalIndex = index;
    const clip = trackText[index];
    
    document.getElementById('sidebar-title').textContent = "MODIFICA CLIP";
    document.getElementById('text-input').value = clip.text.replace(/<br>/g, '\n');
    fontSlider.value = clip.fontSize || 240; fontNum.value = clip.fontSize || 240; // Default 4K
    document.getElementById('color-text-preset').value = clip.color;
    document.getElementById('horiz-align').value = clip.align; document.getElementById('anim-target').value = clip.target;
    
    selectedAnimIn = clip.animIn; selectedAnimOut = clip.animOut;
    document.querySelectorAll('#grid-in .preset-btn').forEach(b => { b.classList.remove('active'); if(b.getAttribute('data-anim')===selectedAnimIn) b.classList.add('active'); });
    document.querySelectorAll('#grid-out .preset-btn').forEach(b => { b.classList.remove('active'); if(b.getAttribute('data-anim')===selectedAnimOut) b.classList.add('active'); });

    document.getElementById('btn-add-text').innerHTML = "✓ SALVA E CHIUDI MODIFICA";
    document.getElementById('btn-cancel-edit').style.display = "flex";
    
    if(isPlaying) document.getElementById('btn-play-pause').click();
    
    renderTimelineUI(); 
    rebuildMasterTimelineSilently();
    
    if(masterTimeline) masterTimeline.time(clip.start + 0.1);
}

function exitEditMode() {
    editingClipIndex = -1; selectedTrackType = null; selectedGlobalIndex = -1;
    document.getElementById('sidebar-title').textContent = "MOTION EDITOR";
    document.getElementById('btn-add-text').innerHTML = "+ INSERISCI CLIP TESTO";
    document.getElementById('btn-cancel-edit').style.display = "none";
    renderTimelineUI(); rebuildMasterTimelineSilently();
}

document.getElementById('btn-cancel-edit').addEventListener('click', exitEditMode);
document.getElementById('zoom-slider').addEventListener('input', (e) => { pixelsPerSecond = parseInt(e.target.value); renderTimelineUI(); updatePlayheadVisuals(); });

// === MOTORE MAGNETICO TIMELINE ===
function snapToClosest(time, trackType, skipIndex = -1) {
    const SNAP_THRESHOLD = 0.3; 
    let closest = time;
    let minDiff = SNAP_THRESHOLD;

    let phTime = masterTimeline ? masterTimeline.time() : 0;
    if (Math.abs(time - phTime) < minDiff) { closest = phTime; minDiff = Math.abs(time - phTime); }

    const allTracks = [trackText, trackBg, trackAudio];
    const types = ['text', 'bg', 'audio'];

    allTracks.forEach((trackArr, tIdx) => {
        trackArr.forEach((c, idx) => {
            if (trackType === types[tIdx] && idx === skipIndex) return; 
            if (Math.abs(time - c.start) < minDiff) { closest = c.start; minDiff = Math.abs(time - c.start); }
            let cEnd = c.start + c.duration;
            if (Math.abs(time - cEnd) < minDiff) { closest = cEnd; minDiff = Math.abs(time - cEnd); }
        });
    });

    return closest;
}

function renderTimelineUI() {
    const ruler = document.getElementById('ruler-container');
    ruler.innerHTML = '<div id="playhead"></div>'; 
    document.getElementById('lane-text').innerHTML = ''; document.getElementById('lane-bg').innerHTML = ''; document.getElementById('lane-audio').innerHTML = '';

    for(let i=0; i<=MASTER_DURATION; i++) {
        const tick = document.createElement('div'); tick.className = 'ruler-tick';
        tick.style.left = `${i * pixelsPerSecond}px`; tick.innerText = `${i}S`; ruler.appendChild(tick);
    }

    const createTimelineBlock = (clip, index, array, laneId, classColor, label, trackType) => {
        const lane = document.getElementById(laneId);
        const block = document.createElement('div');
        block.className = `timeline-block ${classColor}`;
        if (laneId === 'lane-text' && index === editingClipIndex) block.classList.add('editing-block');
        if (trackType === selectedTrackType && index === selectedGlobalIndex) block.classList.add('selected-for-copy');
        
        block.style.left = `${clip.start * pixelsPerSecond}px`; block.style.width = `${clip.duration * pixelsPerSecond}px`;
        
        const spanContent = document.createElement('span'); spanContent.style.pointerEvents = "none"; spanContent.innerHTML = label; block.appendChild(spanContent);
        if (laneId === 'lane-bg') block.style.backgroundColor = clip.color;

        const delBtn = document.createElement('button'); delBtn.className = 'delete-clip-btn'; delBtn.innerHTML = '✕';
        delBtn.addEventListener('mousedown', (e) => { 
            e.stopPropagation(); 
            if (index === editingClipIndex && trackType === 'text') exitEditMode();
            array.splice(index, 1); 
            renderTimelineUI(); rebuildMasterTimelineSilently(); 
        });
        block.appendChild(delBtn);

        const resizerL = document.createElement('div'); resizerL.className = 'resizer resizer-left';
        resizerL.addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault(); let startX = e.clientX; let initialStart = clip.start; let initialDuration = clip.duration;
            const onMoveL = (ev) => {
                let diffS = (ev.clientX - startX) / pixelsPerSecond; 
                let newStart = initialStart + diffS; 
                
                newStart = snapToClosest(newStart, trackType, index);
                let newDur = initialDuration - (newStart - initialStart);

                if (newStart < 0) { newDur += newStart; newStart = 0; }
                if (newDur < 0.2) { newStart = initialStart + initialDuration - 0.2; newDur = 0.2; }
                clip.start = newStart; clip.duration = newDur;
                block.style.left = `${clip.start * pixelsPerSecond}px`; block.style.width = `${clip.duration * pixelsPerSecond}px`;
            };
            const onUpL = () => { document.removeEventListener('mousemove', onMoveL); document.removeEventListener('mouseup', onUpL); rebuildMasterTimelineSilently(); };
            document.addEventListener('mousemove', onMoveL); document.addEventListener('mouseup', onUpL);
        }); block.appendChild(resizerL);

        const resizerR = document.createElement('div'); resizerR.className = 'resizer resizer-right';
        resizerR.addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault(); let startX = e.clientX; let initialDuration = clip.duration;
            const onMoveR = (ev) => {
                let diffS = (ev.clientX - startX) / pixelsPerSecond; 
                let newEnd = clip.start + initialDuration + diffS;
                
                newEnd = snapToClosest(newEnd, trackType, index);
                let newDur = newEnd - clip.start;

                if (newDur < 0.2) newDur = 0.2; if (clip.start + newDur > MASTER_DURATION) newDur = MASTER_DURATION - clip.start;
                clip.duration = newDur; block.style.width = `${clip.duration * pixelsPerSecond}px`;
            };
            const onUpR = () => { document.removeEventListener('mousemove', onMoveR); document.removeEventListener('mouseup', onUpR); rebuildMasterTimelineSilently(); };
            document.addEventListener('mousemove', onMoveR); document.addEventListener('mouseup', onUpR);
        }); block.appendChild(resizerR);

        block.addEventListener('mousedown', (e) => {
            if(e.target.classList.contains('resizer') || e.target.classList.contains('delete-clip-btn')) return;
            e.preventDefault();
            selectedTrackType = trackType; selectedGlobalIndex = index; renderTimelineUI(); 
            
            let startX = e.clientX; let initialStart = clip.start;
            const onMoveDrag = (ev) => {
                let diffS = (ev.clientX - startX) / pixelsPerSecond; 
                let newStart = initialStart + diffS;
                
                newStart = snapToClosest(newStart, trackType, index);

                if (newStart < 0) newStart = 0; if (newStart + clip.duration > MASTER_DURATION) newStart = MASTER_DURATION - clip.duration;
                clip.start = newStart; block.style.left = `${clip.start * pixelsPerSecond}px`;
            };
            const onUpDrag = () => { document.removeEventListener('mousemove', onMoveDrag); document.removeEventListener('mouseup', onUpDrag); rebuildMasterTimelineSilently(); };
            document.addEventListener('mousemove', onMoveDrag); document.addEventListener('mouseup', onUpDrag);
        });

        if(laneId === 'lane-text') {
            block.addEventListener('dblclick', () => loadClipIntoEditor(index));
        } else if (laneId === 'lane-bg') {
            block.addEventListener('dblclick', () => {
                const newColor = prompt("INSERISCI UN NUOVO COLORE (es. #FF0000, rgba, ecc.):", clip.color);
                if (newColor) { clip.color = newColor; renderTimelineUI(); rebuildMasterTimelineSilently(); }
            });
        }
        lane.appendChild(block);
    };

    trackText.forEach((clip, i) => createTimelineBlock(clip, i, trackText, 'lane-text', 'block-text', clip.text.replace(/<br>/g, ' '), 'text'));
    trackBg.forEach((clip, i) => createTimelineBlock(clip, i, trackBg, 'lane-bg', 'block-bg', '', 'bg'));
    trackAudio.forEach((clip, i) => createTimelineBlock(clip, i, trackAudio, 'lane-audio', 'block-audio', 'TRACCIA AUDIO', 'audio'));

    ruler.addEventListener('mousedown', (e) => {
        if(isPlaying) document.getElementById('btn-play-pause').click();
        const updateScrub = (ev) => {
            const rect = ruler.getBoundingClientRect(); let x = ev.clientX - rect.left;
            if(x < 0) x = 0; if(x > MASTER_DURATION * pixelsPerSecond) x = MASTER_DURATION * pixelsPerSecond;
            let time = snapToClosest(x / pixelsPerSecond); 
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
            case 'slideLeft': return { from: { opacity: 0, x: -100 }, to: { opacity: 1, x: 0, ...base } };
            case 'slideRight': return { from: { opacity: 0, x: 100 }, to: { opacity: 1, x: 0, ...base } };
            case 'slideUp': return { from: { opacity: 0, y: 100 }, to: { opacity: 1, y: 0, ...base } };
            case 'slideDown': return { from: { opacity: 0, y: -100 }, to: { opacity: 1, y: 0, ...base } };
            case 'typewriter': return { from: { opacity: 0 }, to: { opacity: 1, duration: 0.01, ease: "none", stagger: 0.05 } };
        }
    } else {
        switch(type) {
            case 'fade': return { to: { opacity: 0, ...base } };
            case 'zoomOut': return { to: { opacity: 0, scale: 0.9, ...base } };
            case 'slideLeftOut': return { to: { opacity: 0, x: -100, ...base } };
            case 'slideRightOut': return { to: { opacity: 0, x: 100, ...base } };
            case 'slideUpOut': return { to: { opacity: 0, y: -100, ...base } };
            case 'slideDownOut': return { to: { opacity: 0, y: 100, ...base } };
        }
    }
    return null;
}

function rebuildMasterTimelineSilently() {
    let savedTime = 0;
    if(masterTimeline) { savedTime = masterTimeline.time(); masterTimeline.kill(); }

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

    trackText.forEach((clip, index) => {
        const layer = document.createElement('div');
        layer.className = `clip-layer ${clip.align} valign-center`;
        
        const txtNode = document.createElement('div');
        txtNode.className = 'clip-text';
        txtNode.setAttribute('data-index', index); 
        txtNode.style.fontFamily = clip.font;
        txtNode.style.fontSize = `${clip.fontSize || 240}px`; // Default 4K
        txtNode.style.color = clip.color;
        txtNode.innerHTML = clip.text;

        gsap.set(txtNode, { x: clip.posX || 0, y: clip.posY || 0 });

        layer.appendChild(txtNode); textCont.appendChild(layer);

        const split = new SplitType(txtNode, { types: clip.target });
        const elements = clip.target === 'chars' ? split.chars : split.words;
        if(elements) elements.forEach(el => el.style.color = clip.color);

        if (index === editingClipIndex) {
            txtNode.classList.add('is-editing');
            
            ['t','b','l','r'].forEach(pos => {
                let m = document.createElement('div');
                m.className = `handle-mid handle-mid-${pos}`;
                txtNode.appendChild(m);
            });
            
            Draggable.create(txtNode, {
                type: "x,y",
                onDragEnd: function() { clip.posX = this.x; clip.posY = this.y; }
            });

            const handle = document.createElement('div');
            handle.className = 'resize-handle';
            txtNode.appendChild(handle);

            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation(); 
                let startX = e.clientX;
                let startSize = parseInt(clip.fontSize) || 240;
                
                const onMove = (ev) => {
                    let diff = (ev.clientX - startX) / stageScale; // SCALATURA 4K CORRETTA 
                    let newSize = Math.max(10, startSize + diff);
                    clip.fontSize = newSize;
                    txtNode.style.fontSize = `${newSize}px`;
                    fontSlider.value = newSize;
                    fontNum.value = newSize;
                };
                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
            });
        }

        masterTimeline.set(layer, { autoAlpha: 1 }, clip.start);
        
        const effectDur = 0.5;
        const inAnim = getAnimConfig(elements, clip.animIn, false, effectDur);
        if (inAnim) masterTimeline.fromTo(elements, inAnim.from, inAnim.to, clip.start);

        if (clip.animOut !== 'none') {
            const outAnim = getAnimConfig(elements, clip.animOut, true, effectDur);
            if (outAnim) masterTimeline.to(elements, outAnim.to, clip.start + clip.duration - effectDur);
        }
        
        masterTimeline.set(layer, { autoAlpha: 0 }, clip.start + clip.duration);
    });

    masterTimeline.set({}, {}, MASTER_DURATION);
    masterTimeline.time(savedTime);
    renderCustomGuides(); 
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
        } else { audioEl.pause(); }
    }
}

document.getElementById('btn-play-pause').addEventListener('click', () => {
    const btn = document.getElementById('btn-play-pause');
    const audioEl = document.getElementById('master-audio');
    if (!masterTimeline) rebuildMasterTimelineSilently();
    
    if(editingClipIndex > -1) { document.getElementById('btn-update-text').click(); exitEditMode(); }

    if (!isPlaying) {
        if(masterTimeline.progress() === 1) masterTimeline.time(0); 
        masterTimeline.play(); isPlaying = true;
        btn.textContent = "⏸ PAUSA"; btn.style.background = "#FFC107"; btn.style.color = "#000";
    } else {
        masterTimeline.pause(); audioEl.pause(); isPlaying = false;
        btn.textContent = "▶ PLAY"; btn.style.background = "#32D74B"; btn.style.color = "#000";
    }
});

renderTimelineUI();
rebuildMasterTimelineSilently();