(function () {
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const indexFile = (lang === 'ar') ? 'stories/index_ar.json' : 'stories/index.json';

  const grid = document.getElementById('storiesGrid');
  const upload = document.getElementById('uploadLocal');
  const useSample = document.getElementById('useSampleIndex');
  const rtlBtn = document.getElementById('rtlToggleIndex');

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  async function loadIndex() {
    let list = [];
    try {
      const res = await fetch(indexFile);
      if (!res.ok) throw new Error('index not found');
      list = await res.json();
    } catch (e) {
      console.warn('Could not load', indexFile, e);
      list = [{
        title: (lang === 'ar' ? 'قصة تجريبية' : 'Sample Story'),
        file: 'stories/sample-story.json',
        description: (lang === 'ar' ? 'قصة قصيرة تجريبية' : 'A short demo story.'),
        cover: 'sample.jpg'
      }];
    }
    renderCards(list);
  }

  function renderCards(list) {
    if (!grid) return;
    grid.innerHTML = list.map(s => {
      const title = (lang === 'ar' && s.title_ar) ? s.title_ar : s.title;
      const desc = s.description ? escapeHtml(s.description) : '';
      const cover = s.cover ? `stories/${s.cover}` : 'placeholder.jpg';

      // Avoid duplicating "stories/" if already included
      const storyPath = s.file.startsWith('stories/') ? s.file : `stories/${s.file}`;
      const readHref = (lang === 'ar' ? 'read_ar.html' : 'read.html') + '?file=' + encodeURIComponent(storyPath);

      return `
        <div class="col-12 col-sm-6 col-md-4 col-lg-3 d-flex">
          <div class="card bg-dark text-light h-100 shadow-sm w-100">
            <img src="${cover}" class="card-img-top" alt="${escapeHtml(title)}">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${escapeHtml(title)}</h5>
              <p class="card-text small flex-grow-1">${desc}</p>
              <a href="${readHref}" class="btn btn-primary mt-auto">
                ${lang === 'ar' ? 'اقرأ' : 'Read'}
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Upload local story
  upload?.addEventListener('change', (ev) => {
    const f = ev.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        const key = 'reader:local:' + Date.now();
        localStorage.setItem(key, JSON.stringify({ file: 'local', data: parsed }));
        const target = (lang === 'ar' ? 'read_ar.html' : 'read.html') + '?local=' + encodeURIComponent(key);
        location.href = target;
      } catch (e) {
        alert(lang === 'ar' ? 'ملف JSON غير صالح' : 'Invalid JSON file.');
      }
    };
    r.readAsText(f);
  });

  // Use sample story
  useSample?.addEventListener('click', () => {
    const samplePath = 'stories/sample-story.json';
    const target = (lang === 'ar' ? 'read_ar.html' : 'read.html') + '?file=' + encodeURIComponent(samplePath);
    location.href = target;
  });

  // RTL toggle
  rtlBtn?.addEventListener('click', () => {
    const html = document.documentElement;
    html.setAttribute('dir', html.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl');
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadIndex);
  else loadIndex();
})();
