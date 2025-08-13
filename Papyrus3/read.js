// read.js
// Story reader logic for read.html and read_ar.html
// Include on both reader pages (defer).

(function () {
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';

  // DOM refs (reader pages must include these IDs)
  const content = document.getElementById('contentArea');
  const choicesArea = document.getElementById('choicesArea');
  const storyTitleEl = document.getElementById('storyTitle');
  const storySub = document.getElementById('storySub');
  const storyIdBadge = document.getElementById('storyIdBadge');
  const titleHeader = document.getElementById('readerStoryTitle');
  const restartBtn = document.getElementById('restartReader');
  const saveBtn = document.getElementById('saveReader');
  const rtlBtn = document.getElementById('rtlToggleReader');
  const expPathBtn = document.getElementById('exportPathBtn');
  const expJsonBtn = document.getElementById('exportJsonBtn');

  let state = { storyFile: null, storyData: null, currentId: null, history: [] };

  function param(name){ return new URL(location.href).searchParams.get(name); }
  function escapeHtml(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
  function downloadText(text, filename){ const blob = new Blob([text], {type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

  function saveProgress(file, currentId, history){
    if(!file) return;
    localStorage.setItem('reader:last:' + file + ':' + lang, JSON.stringify({ currentId, history }));
  }
  function loadProgress(file){
    if(!file) return null;
    const raw = localStorage.getItem('reader:last:' + file + ':' + lang);
    if(!raw) return null;
    try{ return JSON.parse(raw); }catch(e){ return null; }
  }
  function clearProgress(file){
    if(!file) return;
    localStorage.removeItem('reader:last:' + file + ':' + lang);
  }

  function incrementChoiceStat(storyFile, segId, choiceId){
    if(!storyFile) return;
    const key = 'stat:' + storyFile + ':' + segId + ':' + lang;
    const raw = localStorage.getItem(key);
    const stats = raw ? JSON.parse(raw) : {};
    stats[choiceId] = (stats[choiceId] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(stats));
    renderStatsForSegment(segId);
  }
  function renderStatsForSegment(segId){
    const el = document.getElementById('choiceStats');
    if(!state.storyFile || !segId){ el.textContent = ''; return; }
    const key = 'stat:' + state.storyFile + ':' + segId + ':' + lang;
    const raw = localStorage.getItem(key);
    if(!raw){ el.textContent = ''; return; }
    const st = JSON.parse(raw); const total = Object.values(st).reduce((a,b)=>a+b,0);
    el.textContent = (lang==='ar' ? 'إحصاءات الاختيارات: ' : 'Choice stats: ') + Object.entries(st).map(([k,v]) => `${k}: ${v} (${Math.round(v/total*100)}%)`).join(' | ');
  }

  function normalizeStoryData(raw){
    if(!raw) return null;
    if(Array.isArray(raw)) return raw;
    if(raw.segments && Array.isArray(raw.segments)) return raw.segments;
    if(raw.id && raw.text) return [raw];
    return null;
  }

  function renderCurrent(){
    if(!state.storyData){
      content.textContent = (lang==='ar' ? 'لم يتم تحميل قصة' : 'No story');
      return;
    }

    if(!state.currentId){
      content.innerHTML = `<div class="story-text small-muted">${lang==='ar' ? '(نهاية الفرع)' : '(End of branch)'}</div>`;
      choicesArea.innerHTML = `<div class="mt-2"><button id="restartFromEnd" class="btn btn-outline-light btn-sm">${lang==='ar' ? 'إعادة تشغيل' : 'Restart'}</button></div>`;
      document.getElementById('restartFromEnd').addEventListener('click', () => restartStory());
      saveProgress(state.storyFile, state.currentId, state.history);
      return;
    }

    const seg = state.storyData.find(s => s.id === state.currentId);
    if(!seg){
      content.textContent = '(segment not found)';
      choicesArea.innerHTML = '';
      storySub.textContent = `Segment missing: ${state.currentId}`;
      return;
    }

    storyTitleEl.textContent = seg.title || '';
    storySub.textContent = `Segment: ${seg.id}`;
    titleHeader.textContent = (lang==='ar' ? 'القراءة: ' : 'Reading: ') + (seg.title || state.storyFile);
    storyIdBadge.textContent = state.storyFile || 'local';

    content.innerHTML = `<div class="story-text">${escapeHtml(seg.text)}</div>`;

    if(!seg.choices || seg.choices.length === 0){
      choicesArea.innerHTML = `<div class="small-muted">${lang==='ar' ? '(نهاية الفرع)' : 'End of branch.'}</div>
        <div class="mt-2"><button id="restartFromEnd2" class="btn btn-outline-light btn-sm">${lang==='ar' ? 'إعادة تشغيل' : 'Restart'}</button></div>`;
      document.getElementById('restartFromEnd2').addEventListener('click', () => restartStory());
    } else {
      choicesArea.innerHTML = seg.choices.map(c => {
        const safe = escapeHtml(JSON.stringify(c));
        return `<button class="choice-btn" data-choice='${safe}'>
          <div style="font-weight:700">${escapeHtml(c.label)}</div>
          <div class="hint small-muted">${escapeHtml(c.hint || '')}</div>
        </button>`;
      }).join('');
      Array.from(choicesArea.querySelectorAll('.choice-btn')).forEach(btn=>{
        btn.addEventListener('click', () => {
          const c = JSON.parse(btn.getAttribute('data-choice'));
          state.history.push({ segmentId: state.currentId, choiceId: c.id || c.label });
          incrementChoiceStat(state.storyFile, state.currentId, c.id || c.label);
          if(c.next){ state.currentId = c.next; renderCurrent(); }
          else { state.currentId = null; renderCurrent(); }
        });
      });
    }

    renderStatsForSegment(state.currentId);
    saveProgress(state.storyFile, state.currentId, state.history);
  }

  function restartStory(){
    if(!confirm(lang === 'ar' ? 'إعادة تشغيل القصة من البداية؟' : 'Restart the story from the beginning?')) return;
    clearProgress(state.storyFile);
    state.currentId = state.storyData[0]?.id || null;
    state.history = [];
    renderCurrent();
  }
  function saveNow(){ saveProgress(state.storyFile, state.currentId, state.history); alert(lang==='ar' ? 'تم الحفظ.' : 'Saved.'); }
  function back(){ if(state.history.length===0){ alert(lang==='ar' ? 'لا توجد محطات سابقة.' : 'No history to go back to.'); return; } const last = state.history.pop(); state.currentId = last.segmentId; renderCurrent(); }

  function exportPlayedPath(){
    if(!state.storyData) return alert(lang==='ar' ? 'لم يتم تحميل قصة.' : 'No story loaded.');
    let out = `${lang==='ar' ? 'القصة' : 'Story'}: ${state.storyFile}\n\n`;
    out += `${lang==='ar' ? 'البداية' : 'Start'} -> ${state.storyData[0]?.id}\n`;
    for(const h of state.history){
      const seg = state.storyData.find(s => s.id === h.segmentId);
      out += `\n[${h.segmentId}] ${seg?.title || ''}\n${seg?.text || ''}\n${lang==='ar' ? 'الاختيار' : 'Choice'}: ${h.choiceId}\n`;
    }
    if(state.currentId){ const cur = state.storyData.find(s=>s.id===state.currentId); out += `\n${lang==='ar' ? 'المشهد الحالي' : 'Current segment'} [${state.currentId}]\n${cur?.text || ''}\n`; } else out += `\n${lang==='ar' ? 'الحالي: (نهاية)' : 'Current: (end)'}\n`;
    downloadText(out, (state.storyFile || 'story') + '-played-path.txt');
  }
  function exportStoryJson(){ if(!state.storyData) return alert(lang==='ar' ? 'لم يتم تحميل قصة.' : 'No story loaded.'); downloadText(JSON.stringify(state.storyData, null, 2), (state.storyFile || 'story') + '-export.json'); }

  async function loadStoryFromFile(path){
    const res = await fetch(path);
    if(!res.ok) throw new Error('Fetch failed: ' + path);
    const json = await res.json();
    const normalized = normalizeStory(json);
    if(!normalized) throw new Error('Unsupported story format');
    return normalized;
  }

  function normalizeStory(raw){
    if(!raw) return null;
    if(Array.isArray(raw)) return raw;
    if(raw.segments && Array.isArray(raw.segments)) return raw.segments;
    if(raw.id && raw.text) return [raw];
    return null;
  }

  // init
  (async function init(){
    try {
      const fileParam = param('file');
      const localParam = param('local');

      let rawData = null;
      if(localParam){
        const raw = localStorage.getItem(localParam);
        if(!raw) throw new Error('Local upload not found');
        const obj = JSON.parse(raw);
        rawData = obj.data;
        state.storyFile = localParam;
      } else if(fileParam){
        state.storyFile = decodeURIComponent(fileParam);
        const res = await fetch(state.storyFile);
        if(!res.ok) throw new Error('Fetch failed');
        rawData = await res.json();
      } else {
        // fallback tiny sample
        rawData = [{ id:'scene_1', title: (lang==='ar' ? 'تجريبي' : 'Sample'), text: (lang==='ar' ? 'هذه قصة تجريبية.' : 'This is a small sample story.'), choices:[ {id:'c1', label: (lang==='ar' ? 'تقدم' : 'Continue'), next:'scene_2'} ] }, { id:'scene_2', title:'', text:(lang==='ar' ? 'لقد تقدمت.' : 'You continued.'), choices:[] }];
        state.storyFile = 'embedded-sample';
      }

      const segments = normalizeStory(rawData);
      if(!segments) throw new Error('Unsupported story format');

      state.storyData = segments;

      const saved = loadProgress(state.storyFile);
      if(saved && saved.currentId){
        state.currentId = saved.currentId;
        state.history = saved.history || [];
      } else {
        state.currentId = state.storyData[0]?.id || null;
        state.history = [];
      }

      renderCurrent();
    } catch (err) {
      content.textContent = (lang==='ar' ? 'فشل تحميل القصة: ' : 'Failed to load story: ') + (err.message || err);
    }
  })();

  // wire UI
  restartBtn?.addEventListener('click', restartStory);
  saveBtn?.addEventListener('click', saveNow);
  rtlBtn?.addEventListener('click', ()=>{
    const html = document.documentElement;
    if(html.getAttribute('dir') === 'rtl'){ html.setAttribute('dir','ltr'); rtlBtn.textContent = (lang==='ar' ? 'LTR' : 'RTL'); }
    else { html.setAttribute('dir','rtl'); rtlBtn.textContent = (lang==='ar' ? 'LTR' : 'RTL'); }
  });
  expPathBtn?.addEventListener('click', exportPlayedPath);
  expJsonBtn?.addEventListener('click', exportStoryJson);

})();
