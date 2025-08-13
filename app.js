// app.js
// Bilingual interactive reader (EN / AR) with auto story loader, save/resume, restart, export, local stats

const App = {
  story: null,
  currentId: null,
  history: [],
  storyId: null,
  lang: 'en',
};

const keys = {
  lastStory: 'lastStory',
  lastScene: 'lastScene',
  lastLang: 'lastLang',
};

// DOM refs
const storySelect = document.getElementById('storySelect');
const restartBtn = document.getElementById('restartBtn');
const rtlToggle = document.getElementById('rtlToggle'); // not used directly but we keep for compatibility
const useSampleBtn = document.getElementById('useSampleBtn');
const saveBtn = document.getElementById('saveBtn');
const backBtn = document.getElementById('backBtn');
const clearSavedBtn = document.getElementById('clearSaved');
const exportPathBtn = document.getElementById('exportPath');
const exportJsonBtn = document.getElementById('exportJson');
const langSelect = document.getElementById('langSelect');

const contentArea = document.getElementById('contentArea');
const choicesArea = document.getElementById('choicesArea');
const storyTitle = document.getElementById('storyTitle');
const storyMeta = document.getElementById('storyMeta');
const storyIdBadge = document.getElementById('storyIdBadge');
const choiceStats = document.getElementById('choiceStats');
const tagline = document.getElementById('tagline');
const storiesHeading = document.getElementById('storiesHeading');
const noteIndex = document.getElementById('noteIndex');
const useSampleLabel = useSampleBtn; // element

/* Localization strings */
const L = {
  en: {
    select_story: 'Select a story...',
    stories_controls: 'Stories & Controls',
    use_sample: 'Use sample story',
    save_progress: 'Save progress',
    back: 'Back',
    clear_saved: 'Clear saved',
    export: 'Export',
    export_path: 'Export played path',
    export_json: 'Export story JSON',
    note_index: 'Stories are listed from stories/index.json.',
    no_story_loaded: 'No story loaded',
    end_of_branch: '(End of branch)',
    client_note: 'Client-only • static',
    restart_confirm: 'Restart the story from the beginning?',
    restart: 'Restart',
    restart_no_story: 'No story selected to restart.',
    invalid_story_json: 'Invalid story JSON',
  },
  ar: {
    select_story: 'اختر قصة...',
    stories_controls: 'القصص والتحكم',
    use_sample: 'استخدم القصة التجريبية',
    save_progress: 'حفظ التقدم',
    back: 'عودة',
    clear_saved: 'مسح المحفوظات',
    export: 'تصدير',
    export_path: 'تصدير المسار الذي لعبته',
    export_json: 'تصدير JSON للقصة',
    note_index: 'يتم سرد القصص من stories/index.ar.json.',
    no_story_loaded: 'لم يتم تحميل قصة',
    end_of_branch: '(نهاية الفرع)',
    client_note: 'عميل فقط • ثابت',
    restart_confirm: 'إعادة تشغيل القصة من البداية؟',
    restart: 'إعادة تشغيل',
    restart_no_story: 'لم يتم اختيار قصة لإعادة التشغيل.',
    invalid_story_json: 'ملف JSON غير صالح للقصة',
  }
};

/* sample fallback story (English) */
const SAMPLE_JSON = {
  id: "sample-1984-lite",
  title: "Sample — The Cold Day",
  start: "s1",
  segments: [
    { id: "s1", title: "Waking", text: "It was a bright cold day in April, and the clocks were striking thirteen.\nWinston Smith, his chin tucked against the wind, slips through the glass doors.", choices: [ {id:"c1", label:"Go upstairs", next:"s2"}, {id:"c2", label:"Stand by the poster", next:"s3"} ] },
    { id: "s2", title: "Upstairs", text: "The stair is narrow. A woman in red looks at a poster. You consider what to say.", choices: [ {id:"c1", label:"Ask about the poster", next:"s4"}, {id:"c2", label:"Remain silent", next:"s3"} ] },
    { id: "s3", title: "Poster", text: "The poster shows a large, luminous face. For a moment, you feel watched.", choices: [ {id:"c1", label:"Touch the poster", next:"s4"}, {id:"c2", label:"Walk outside", next:null} ] },
    { id: "s4", title: "Strange", text: "A small event moves you to do something unexpected. The alley feels colder.", choices: [ {id:"c1", label:"Press on", next:null}, {id:"c2", label:"Go back home", next:null} ] }
  ]
};

/* Arabic sample fallback (keeps simple Arabic text) */
const SAMPLE_JSON_AR = [
  { "id": "a1", "title": "بداية", "text": "تستيقظ في كوخ خشبي صغير. ينساب نور الصباح من بين الشقوق.", "choices":[ {"id":"c1","label":"اخرج إلى الغابة","next":"a2"}, {"id":"c2","label":"افحص الكوخ","next":"a3"} ] },
  { "id": "a2", "title":"الغابة", "text":"تتقدم إلى الهواء البارد. تغرد الطيور في المسافة.", "choices":[ {"id":"c1","label":"اتبع الطيور","next":"a4"}, {"id":"c2","label":"عود إلى الكوخ","next":"a1"} ] },
  { "id":"a3", "title":"الداخل", "text":"تعثر على دفتر قديم مغلف بالجلد.", "choices":[ {"id":"c1","label":"اقرأ الدفتر","next":"a5"}, {"id":"c2","label":"اتركه و اخرج","next":"a2"} ] },
  { "id":"a4", "title":"الفجوة", "text":"تصل إلى فسحة مضيئة وبها جدول صغير.", "choices":[ {"id":"c1","label":"اشرب من الجدول","next":"a6"}, {"id":"c2","label":"ارجع","next":"a2"} ] },
  { "id":"a5", "title":"الدفتر", "text":"يحوي الدفتر قصصًا عن كنز مخفي في مكان ما في الغابة.", "choices":[ {"id":"c1","label":"ابحث عن الكنز","next":"a4"}, {"id":"c2","label":"ارتاح","next":"a1"} ] },
  { "id":"a6", "title":"الانتعاش", "text":"الماء ينعشك. تشعر بأنك جاهز للمغامرة.", "choices":[ {"id":"c1","label":"استكشف","next":"a4"}, {"id":"c2","label":"ارجع إلى الكوخ","next":"a1"} ] }
];

/* ---------- Localization helpers ---------- */
function t(k){ return (L[App.lang] && L[App.lang][k]) ? L[App.lang][k] : L['en'][k] || k; }

function setUILanguage(lang){
  App.lang = lang;
  localStorage.setItem(keys.lastLang, lang);

  // set html lang and dir
  document.documentElement.lang = (lang === 'ar') ? 'ar' : 'en';
  document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

  // switch font-family (styles.css handles Cairo for RTL)
  // Update UI labels
  document.querySelector('#storySelect option[value=""]').textContent = t('select_story');
  document.getElementById('storiesHeading').textContent = t('stories_controls');
  useSampleBtn.textContent = t('use_sample');
  saveBtn.textContent = t('save_progress');
  backBtn.textContent = t('back');
  clearSavedBtn.textContent = t('clear_saved');
  document.getElementById('exportHeading').textContent = t('export');
  exportPathBtn.textContent = t('export_path');
  exportJsonBtn.textContent = t('export_json');
  noteIndex.textContent = (lang === 'ar') ? 'يتم سرد القصص من stories/index.ar.json.' : 'Stories are listed from stories/index.json.';
  tagline.textContent = (lang === 'ar') ? 'قصص مُعدة مسبقًا • استضافة ثابتة' : 'pre-generated JSON • static hosting';
  document.getElementById('clientNote').textContent = t('client_note');
  restartBtn.textContent = (lang === 'ar') ? 'إعادة تشغيل' : 'Restart';
  // if a story is loaded re-render current to apply direction/text alignment
  if(App.story) renderCurrent();
}

/* ---------- Story build and UI rendering ---------- */
function buildStoryFromJson(rawJson){
  let doc = rawJson;
  if(Array.isArray(rawJson)) {
    doc = { id: "uploaded", title: "Uploaded Story", start: rawJson[0]?.id || null, segments: rawJson };
  }
  if(!doc.segments || !Array.isArray(doc.segments)) throw new Error(t('invalid_story_json'));
  const map = {};
  for(const seg of doc.segments){
    if(!seg.id) throw new Error("Each segment must have an 'id'.");
    seg.choices = Array.isArray(seg.choices) ? seg.choices : [];
    map[seg.id] = seg;
  }
  return {
    id: doc.id || ('story-' + Math.random().toString(36).slice(2,9)),
    title: doc.title || 'Untitled',
    start: doc.start || (doc.segments[0] && doc.segments[0].id),
    segmentsMap: map
  };
}

function setStory(doc){
  App.story = doc;
  App.storyId = doc.id;
  storyTitle.textContent = doc.title;
  storyIdBadge.textContent = doc.id;
  storyMeta.textContent = `Segments: ${Object.keys(doc.segmentsMap).length}`;

  // resume if saved
  const saved = localStorage.getItem('storystate-'+App.storyId + ':' + App.lang);
  if(saved){
    try{
      const p = JSON.parse(saved);
      App.currentId = p.currentId;
      App.history = p.history || [];
      renderCurrent();
      return;
    }catch(e){ console.warn('corrupt saved state',e); }
  }

  App.currentId = doc.start;
  App.history = [];
  renderCurrent();
}

function renderCurrent(){
  if(!App.story){
    contentArea.innerText = t('no_story_loaded');
    choicesArea.innerHTML = '';
    return;
  }

  if(!App.currentId){
    contentArea.innerHTML = `<div class="story-text small-muted">${t('end_of_branch')}</div>`;
    choicesArea.innerHTML = `<div class="mt-2"><button id="restartFromEnd" class="btn btn-outline-light btn-sm">${t('restart')}</button></div>`;
    document.getElementById('restartFromEnd').addEventListener('click', ()=> restartStory());
    saveStateToLocal();
    return;
  }

  const seg = App.story.segmentsMap[App.currentId];
  if(!seg){
    contentArea.innerText = '(segment not found)';
    choicesArea.innerHTML = '';
    storyMeta.textContent = `Segment missing: ${App.currentId}`;
    return;
  }

  storyTitle.textContent = App.story.title + (seg.title ? ` — ${seg.title}` : '');
  storyMeta.textContent = `Segment: ${seg.id}`;

  // render text (no HTML rendering to avoid injection)
  contentArea.innerHTML = `<div class="story-text">${escapeHtml(seg.text)}</div>`;

  if(!seg.choices || seg.choices.length === 0){
    choicesArea.innerHTML = `<div class="small-muted">${t('end_of_branch')}</div><div class="mt-2"><button id="restartFromEnd2" class="btn btn-outline-light btn-sm">${t('restart')}</button></div>`;
    document.getElementById('restartFromEnd2').addEventListener('click', ()=> restartStory());
  } else {
    choicesArea.innerHTML = seg.choices.map(c => {
      const safe = escapeHtml(JSON.stringify(c));
      return `<button class="choice-btn" data-choice='${safe}'>
        <div style="font-weight:700">${escapeHtml(c.label)}</div>
        <div class="hint small-muted">${escapeHtml(c.hint || '')}</div>
      </button>`;
    }).join('');
    choicesArea.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', ()=> {
        const c = JSON.parse(btn.getAttribute('data-choice'));
        onChoice(c);
      });
    });
  }

  renderStatsForSegment(seg.id);
  saveStateToLocal();
}

function onChoice(choice){
  App.history.push({ segmentId: App.currentId, choiceId: choice.id || choice.label });
  incrementChoiceStat(App.storyId, App.currentId, choice.id || choice.label);
  if(choice.next){
    App.currentId = choice.next;
    renderCurrent();
  } else if(choice.next === null || choice.next === undefined){
    App.currentId = null;
    renderCurrent();
  } else {
    App.currentId = null;
    contentArea.innerHTML = `<div class="story-text small-muted">(Next segment not found)</div>`;
    choicesArea.innerHTML = '';
    saveStateToLocal();
  }
}

function restartStory(){
  if(!App.story) return;
  if(!confirm(t('restart_confirm'))) return;
  App.currentId = App.story.start;
  App.history = [];
  // remove saved progress for this story & language
  localStorage.removeItem('storystate-'+App.storyId + ':' + App.lang);
  localStorage.removeItem(keys.lastStory + ':' + App.lang);
  localStorage.removeItem(keys.lastScene + ':' + App.lang);
  saveStateToLocal();
  renderCurrent();
}

function back(){
  if(App.history.length === 0) { alert(t('back') + ': ' + t('no_story_loaded')); return; }
  const last = App.history.pop();
  App.currentId = last.segmentId;
  saveStateToLocal();
  renderCurrent();
}

function saveStateToLocal(){
  if(!App.storyId) return;
  const payload = { currentId: App.currentId, history: App.history };
  localStorage.setItem('storystate-'+App.storyId + ':' + App.lang, JSON.stringify(payload));
  // remember last opened story & scene per language for resume
  if(currentStoryFile) localStorage.setItem(keys.lastStory + ':' + App.lang, currentStoryFile);
  localStorage.setItem(keys.lastScene + ':' + App.lang, App.currentId || '');
}

/* ---------- clear / export ---------- */

function clearSaved(){
  if(!App.storyId){
    if(!confirm((App.lang === 'ar') ? 'مسح كل البيانات المحلية؟ سيؤدي هذا إلى إزالة التقدم والإحصاءات من هذا المتصفح.' : 'Clear all local data? This will remove saved progress and stats from this browser.')) return;
    localStorage.clear();
    alert((App.lang === 'ar') ? 'تم مسح كل البيانات المحلية.' : 'All local data cleared.');
    location.reload();
    return;
  }
  if(!confirm((App.lang === 'ar') ? 'مسح التقدم المحفوظ لهذه القصة؟' : 'Clear saved progress for this story?')) return;
  localStorage.removeItem('storystate-'+App.storyId + ':' + App.lang);
  alert((App.lang === 'ar') ? 'تم مسح التقدم المحفوظ لهذه القصة.' : 'Saved progress for this story cleared.');
  location.reload();
}

function exportPlayedPath(){
  if(!App.story) return alert((App.lang === 'ar') ? 'لم يتم تحميل قصة.' : 'No story loaded.');
  let out = `${(App.lang === 'ar') ? 'القصة' : 'Story'}: ${App.story.title}\n\n`;
  out += `${(App.lang === 'ar') ? 'بداية' : 'Start'} -> ${App.story.start}\n`;
  for(const h of App.history){
    const seg = App.story.segmentsMap[h.segmentId];
    out += `\n[${h.segmentId}] ${seg?.title || ''}\n${seg?.text || ''}\n${(App.lang === 'ar') ? 'الاختيار' : 'Choice'}: ${h.choiceId}\n`;
  }
  if(App.currentId){
    const cur = App.story.segmentsMap[App.currentId];
    out += `\n${(App.lang === 'ar') ? 'المشهد الحالي' : 'Current segment'} [${App.currentId}]\n${cur?.text || ''}\n`;
  } else {
    out += `\n${(App.lang === 'ar') ? 'الحالي: (نهاية)' : 'Current: (end)'}\n`;
  }
  downloadText(out, (App.storyId || 'story') + '-played-path.txt');
}

function exportStoryJson(){
  if(!App.story) return alert((App.lang === 'ar') ? 'لم يتم تحميل قصة.' : 'No story loaded.');
  const segments = Object.values(App.story.segmentsMap);
  const doc = { id: App.story.id, title: App.story.title, start: App.story.start, segments };
  downloadText(JSON.stringify(doc, null, 2), (App.storyId || 'story') + '-export.json');
}

function downloadText(text, filename){
  const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

/* ---------- stats ---------- */

function incrementChoiceStat(storyId, segmentId, choiceId){
  const key = `stat:${storyId}:${segmentId}:${App.lang}`;
  const raw = localStorage.getItem(key);
  let stats = raw ? JSON.parse(raw) : {};
  stats[choiceId] = (stats[choiceId] || 0) + 1;
  localStorage.setItem(key, JSON.stringify(stats));
  renderStatsForSegment(segmentId);
}

function renderStatsForSegment(segmentId){
  const key = `stat:${App.storyId}:${segmentId}:${App.lang}`;
  const raw = localStorage.getItem(key);
  if(!raw){ choiceStats.textContent = ''; return; }
  const stats = JSON.parse(raw);
  const total = Object.values(stats).reduce((a,b)=>a+b,0);
  const parts = Object.entries(stats).map(([k,v]) => `${k}: ${v} (${Math.round(v/total*100)}%)`);
  choiceStats.textContent = (App.lang === 'ar') ? 'إحصاءات الاختيارات: ' + parts.join(' | ') : 'Choice stats: ' + parts.join(' | ');
}

/* ---------- Utilities ---------- */

function escapeHtml(s){
  if(!s) return '';
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

/* ---------- Auto story loader & resume (per language) ---------- */

let currentStoryFile = null;

window.addEventListener('DOMContentLoaded', () => {
  // initialize language from stored or browser
  const storedLang = localStorage.getItem(keys.lastLang) || navigator.language?.startsWith('ar') ? 'ar' : 'en';
  langSelect.value = storedLang;
  setUILanguage(storedLang);

  // decide index file name by language
  const indexFile = (App.lang === 'ar') ? 'stories/index.ar.json' : 'stories/index.json';

  fetch(indexFile)
    .then(res => {
      if(!res.ok) throw new Error('Could not load ' + indexFile);
      return res.json();
    })
    .then(stories => {
      // populate select
      stories.forEach(story => {
        const option = document.createElement('option');
        option.value = story.file;
        option.textContent = (App.lang === 'ar' && story.title_ar) ? story.title_ar : story.title;
        storySelect.appendChild(option);
      });

      // Try resume last opened story for this language
      const savedStory = localStorage.getItem(keys.lastStory + ':' + App.lang);
      const savedScene = localStorage.getItem(keys.lastScene + ':' + App.lang);
      if(savedStory){
        storySelect.value = savedStory;
        loadStory(savedStory, savedScene || null);
      }
    })
    .catch(err => {
      console.warn('Could not load story index:', err);
      // allow sample button as fallback
    });
});

/* ---------- Story loading ---------- */

function loadStory(filePath, resumeSceneId = null){
  currentStoryFile = filePath;
  fetch(filePath)
    .then(res => {
      if(!res.ok) throw new Error('Failed to fetch ' + filePath);
      return res.json();
    })
    .then(data => {
      // support both array-of-segments and object-with-segments
      let built;
      try {
        built = buildStoryFromJson(data);
      } catch(e) {
        // If Arabic index points to an Arabic array, we may have an array-based story
        // For Arabic-only stories that are arrays, wrap into {segments: data}
        if(Array.isArray(data)) built = buildStoryFromJson({ segments: data });
        else throw e;
      }
      setStory(built);
      if(resumeSceneId && built.segmentsMap[resumeSceneId]) {
        App.currentId = resumeSceneId;
        renderCurrent();
      }
      // remember last story file per language
      localStorage.setItem(keys.lastStory + ':' + App.lang, filePath);
    })
    .catch(err => {
      console.error(err);
      alert((App.lang === 'ar') ? 'تعذر تحميل ملف القصة: ' + err.message : 'Could not load the story file: ' + err.message);
    });
}

/* ---------- Event wiring ---------- */

storySelect.addEventListener('change', (e) => {
  const v = e.target.value;
  if(!v) return;
  loadStory(v);
});

useSampleBtn.addEventListener('click', () => {
  try {
    if(App.lang === 'ar'){
      const wrapped = { id: 'sample-ar', title: 'قصة تجريبية', start: SAMPLE_JSON_AR[0].id, segments: SAMPLE_JSON_AR };
      const built = buildStoryFromJson(wrapped);
      setStory(built);
      // try to set select to sample if present
      const opt = Array.from(storySelect.options).find(o => o.value === 'stories/sample-story-ar.json');
      if(opt) storySelect.value = 'stories/sample-story-ar.json';
      currentStoryFile = 'stories/sample-story-ar.json';
      localStorage.setItem(keys.lastStory + ':' + App.lang, currentStoryFile);
      localStorage.setItem(keys.lastScene + ':' + App.lang, App.currentId || '');
    } else {
      const built = buildStoryFromJson(SAMPLE_JSON);
      setStory(built);
      const opt = Array.from(storySelect.options).find(o => o.value === 'stories/sample-story.json');
      if(opt) storySelect.value = 'stories/sample-story.json';
      currentStoryFile = 'stories/sample-story.json';
      localStorage.setItem(keys.lastStory + ':' + App.lang, currentStoryFile);
      localStorage.setItem(keys.lastScene + ':' + App.lang, App.currentId || '');
    }
  } catch(e) {
    alert((App.lang === 'ar') ? 'فشل تحميل القصة التجريبية: ' + e.message : 'Failed to load sample: ' + e.message);
  }
});

restartBtn.addEventListener('click', () => {
  if(!currentStoryFile) { alert((App.lang === 'ar') ? 'لم يتم اختيار قصة لإعادة التشغيل.' : 'No story selected to restart.'); return; }
  if(!confirm(t('restart_confirm'))) return;
  localStorage.removeItem(keys.lastStory + ':' + App.lang);
  localStorage.removeItem(keys.lastScene + ':' + App.lang);
  loadStory(currentStoryFile);
});

langSelect.addEventListener('change', (e) => {
  const lang = e.target.value;
  setUILanguage(lang);
  // reload story index for new language
  // clear current select options except the placeholder
  while(storySelect.options.length > 1) storySelect.remove(1);
  const indexFile = (lang === 'ar') ? 'stories/index.ar.json' : 'stories/index.json';
  fetch(indexFile)
    .then(res => {
      if(!res.ok) throw new Error('Could not load ' + indexFile);
      return res.json();
    })
    .then(stories => {
      stories.forEach(story => {
        const option = document.createElement('option');
        option.value = story.file;
        option.textContent = (lang === 'ar' && story.title_ar) ? story.title_ar : story.title;
        storySelect.appendChild(option);
      });
      // try resume for this language
      const savedStory = localStorage.getItem(keys.lastStory + ':' + lang);
      const savedScene = localStorage.getItem(keys.lastScene + ':' + lang);
      if(savedStory){
        storySelect.value = savedStory;
        loadStory(savedStory, savedScene || null);
      } else {
        // nothing saved; clear current story view
        App.story = null; App.currentId = null; App.storyId = null; renderCurrent();
      }
    })
    .catch(err => {
      console.warn(err);
      // nothing more
    });
});

saveBtn.addEventListener('click', () => { saveStateToLocal(); alert((App.lang === 'ar') ? 'تم الحفظ.' : 'Saved.'); });
backBtn.addEventListener('click', () => back());
clearSavedBtn.addEventListener('click', () => clearSaved());
exportPathBtn.addEventListener('click', () => exportPlayedPath());
exportJsonBtn.addEventListener('click', () => exportStoryJson());

window.addEventListener('beforeunload', () => saveStateToLocal());
