// Relies on CONFIG defined in config.js (loaded before this script).

const WEEKDAYS_LABEL = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
// JS getDay(): 0=Sun, 1=Mon, … 6=Sat — show Mon–Sun order in dropdowns
const WEEKDAY_OPTS = [1,2,3,4,5,6,0].map(v => `<option value="${v}">${WEEKDAYS_LABEL[v]}</option>`).join('');

const MONTHS_RU  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DAYS_CAL   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const DAYS_SHORT = ['вс','пн','вт','ср','чт','пт','сб'];

const now = new Date();
const defaultYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
let currentMonth = defaultYM;
let nextRuleId = 1, nextLWId = 1, nextEvId = 1;

// State shape per month: { rules, lastWeekRules, events }
let rules         = []; // { id, weekday, time, name, type }
let lastWeekRules = []; // { id, weekday, time, name, type }
let events        = []; // { id, date, time, name, type, link }

// Last generated output — used by copyCalendarPng
let lastGeneratedEvents = null;
let lastGeneratedYM     = null;

// ── Storage ──────────────────────────────────────────────────────────────────

function loadAll() { try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}'); } catch { return {}; } }
function saveAll(a) { localStorage.setItem(CONFIG.storageKey, JSON.stringify(a)); }

function saveMonth(ym) {
  const all = loadAll();
  all[ym] = {
    rules:         rules.map(r => ({...r})),
    lastWeekRules: lastWeekRules.map(r => ({...r})),
    events:        events.map(e => ({...e})),
  };
  saveAll(all);
  flashSaved();
}

function loadMonthData(ym) {
  const all = loadAll();
  const d   = all[ym];
  if (d) {
    rules         = d.rules         || [];
    lastWeekRules = d.lastWeekRules || [];
    events        = d.events        || [];
  } else {
    rules         = CONFIG.defaultRules.map((r, i)         => ({...r, id: i + 1}));
    lastWeekRules = CONFIG.defaultLastWeekRules.map((r, i) => ({...r, id: i + 1}));
    events        = [];
  }
  nextRuleId = Math.max(0, ...rules.map(r => r.id)) + 1;
  nextLWId   = Math.max(0, ...lastWeekRules.map(r => r.id)) + 1;
  nextEvId   = Math.max(0, ...events.map(e => e.id)) + 1;
}

function flashSaved() {
  const b = document.getElementById('saved-badge');
  b.classList.add('show');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('show'), 1800);
}

// ── Init ─────────────────────────────────────────────────────────────────────

function init() {
  document.getElementById('app-title').textContent    = CONFIG.title;
  document.getElementById('app-subtitle').textContent = CONFIG.subtitle;
  document.getElementById('month-pick').value = defaultYM;
  loadMonthData(defaultYM);
  renderAll();
}

function onMonthChange() {
  saveMonth(currentMonth);
  currentMonth = document.getElementById('month-pick').value;
  loadMonthData(currentMonth);
  document.getElementById('output').style.display = 'none';
  renderAll();
}

function renderAll() {
  renderRules();
  renderLastWeek();
  renderEvents();
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function typeSelect(val, onchange) {
  const options = Object.entries(CONFIG.eventTypes)
    .map(([k, v]) => `<option value="${k}"${val === k ? ' selected' : ''}>${v.label}</option>`)
    .join('');
  return `<select onchange="${onchange}">${options}</select>`;
}

// ── Rules CRUD ───────────────────────────────────────────────────────────────

function renderRules() {
  document.getElementById('rules-list').innerHTML = rules.map(r => `
    <div class="rule-row">
      <select onchange="updRule(${r.id},'weekday',+this.value)">${WEEKDAY_OPTS.replace(`value="${r.weekday}"`, `value="${r.weekday}" selected`)}</select>
      <input type="time" value="${r.time}" onchange="updRule(${r.id},'time',this.value)" />
      <input type="number" value="${r.duration || ''}" min="1" max="480" placeholder="мин" oninput="updRule(${r.id},'duration',+this.value)" />
      <input type="text" value="${esc(r.name)}" placeholder="Название" oninput="updRule(${r.id},'name',this.value)" />
      ${typeSelect(r.type, `updRule(${r.id},'type',this.value)`)}
      <button class="del-btn" onclick="delRule(${r.id})">×</button>
    </div>`).join('');
}

function addRule()          { rules.push({id: nextRuleId++, weekday: 3, time: '19:00', duration: 60, name: '', type: CONFIG.defaultNewEventType}); persist(); renderRules(); }
function delRule(id)        { rules = rules.filter(r => r.id !== id); persist(); renderRules(); }
function updRule(id, f, v)  { const r = rules.find(r => r.id === id); if (r) { r[f] = v; persist(); } }

// ── LastWeek CRUD ─────────────────────────────────────────────────────────────

function renderLastWeek() {
  document.getElementById('lastweek-list').innerHTML = lastWeekRules.map(r => `
    <div class="rule-row last-week-row">
      <select onchange="updLW(${r.id},'weekday',+this.value)">${WEEKDAY_OPTS.replace(`value="${r.weekday}"`, `value="${r.weekday}" selected`)}</select>
      <input type="time" value="${r.time}" onchange="updLW(${r.id},'time',this.value)" />
      <input type="number" value="${r.duration || ''}" min="1" max="480" placeholder="мин" oninput="updLW(${r.id},'duration',+this.value)" />
      <input type="text" value="${esc(r.name)}" placeholder="Название" oninput="updLW(${r.id},'name',this.value)" />
      ${typeSelect(r.type, `updLW(${r.id},'type',this.value)`)}
      <button class="del-btn" onclick="delLW(${r.id})">×</button>
    </div>`).join('');
}

function addLastWeek()      { lastWeekRules.push({id: nextLWId++, weekday: 3, time: '19:00', duration: 60, name: 'Игровой день', type: 'gametime'}); persist(); renderLastWeek(); }
function delLW(id)          { lastWeekRules = lastWeekRules.filter(r => r.id !== id); persist(); renderLastWeek(); }
function updLW(id, f, v)    { const r = lastWeekRules.find(r => r.id === id); if (r) { r[f] = v; persist(); } }

// ── Events CRUD ───────────────────────────────────────────────────────────────

function renderEvents() {
  document.getElementById('events-list').innerHTML = events.map(e => `
    <div class="event-row">
      <input type="date" value="${e.date}" onchange="updEv(${e.id},'date',this.value)" />
      <input type="time" value="${e.time}" onchange="updEv(${e.id},'time',this.value)" />
      <input type="number" value="${e.duration || ''}" min="1" max="480" placeholder="мин" oninput="updEv(${e.id},'duration',+this.value)" />
      <input type="text" value="${esc(e.name)}" placeholder="Название" oninput="updEv(${e.id},'name',this.value)" />
      ${typeSelect(e.type, `updEv(${e.id},'type',this.value)`)}
      <input type="url" value="${esc(e.link)}" placeholder="https://meet.google.com/..." oninput="updEv(${e.id},'link',this.value)" />
      <button class="del-btn" onclick="delEv(${e.id})">×</button>
    </div>`).join('');
}

function addEvent() {
  const [y, m] = currentMonth.split('-');
  events.push({id: nextEvId++, date: `${y}-${m}-01`, time: '19:00', duration: 60, name: '', type: CONFIG.defaultNewEventType, link: ''});
  persist(); renderEvents();
}
function delEv(id)        { events = events.filter(e => e.id !== id); persist(); renderEvents(); }
function updEv(id, f, v)  { const e = events.find(e => e.id === id); if (e) { e[f] = v; persist(); } }

function persist() { saveMonth(currentMonth); }

// ── Expand rules into concrete dates ─────────────────────────────────────────

function expandMonth(ym) {
  const [yr, mo] = ym.split('-').map(Number);
  const lastDay  = new Date(yr, mo, 0).getDate();
  const result   = [];

  // last occurrence of each weekday in the month (for lastWeekRules)
  const lastOccurrence = {};
  for (let d = lastDay; d >= 1; d--) {
    const wd = new Date(yr, mo - 1, d).getDay();
    if (lastOccurrence[wd] === undefined) lastOccurrence[wd] = d;
  }

  // (weekday, day) pairs that are claimed by a lastWeek override
  const lastWeekDays = new Set();
  lastWeekRules.forEach(r => {
    const d = lastOccurrence[r.weekday];
    if (d !== undefined) lastWeekDays.add(`${r.weekday}-${d}`);
  });

  // regular rules — skip days covered by lastWeek overrides
  for (let d = 1; d <= lastDay; d++) {
    const wd = new Date(yr, mo - 1, d).getDay();
    rules.forEach(r => {
      if (r.weekday === wd && !lastWeekDays.has(`${wd}-${d}`)) {
        result.push({ date: isoDate(yr, mo, d), time: r.time, duration: r.duration || 0, name: r.name, type: r.type, link: '' });
      }
    });
  }

  // lastWeek rules
  lastWeekRules.forEach(r => {
    const d = lastOccurrence[r.weekday];
    if (d !== undefined) {
      result.push({ date: isoDate(yr, mo, d), time: r.time, duration: r.duration || 0, name: r.name, type: r.type, link: '' });
    }
  });

  // one-off events — replace any auto event with the same date+time
  events.filter(e => e.date.startsWith(ym)).forEach(e => {
    const idx = result.findIndex(r => r.date === e.date && r.time === e.time);
    if (idx !== -1) result.splice(idx, 1);
    result.push({ date: e.date, time: e.time, duration: e.duration || 0, name: e.name, type: e.type, link: e.link || '' });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

function isoDate(yr, mo, d) {
  return `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Returns "HH:MM" end time given a start time string and duration in minutes, or null if duration is falsy. */
function calcEndTime(time, duration) {
  if (!duration) return null;
  const [h, m] = time.split(':').map(Number);
  const end = new Date(2000, 0, 1, h, m + duration);
  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
}

function timeRange(time, duration) {
  const end = calcEndTime(time, duration);
  return end ? `${time}–${end}` : time;
}

// ── Generate ──────────────────────────────────────────────────────────────────

function generate() {
  const [yr, mo] = currentMonth.split('-').map(Number);
  const allEvents = expandMonth(currentMonth);
  lastGeneratedEvents = allEvents;
  lastGeneratedYM     = currentMonth;
  document.getElementById('output').style.display = 'block';
  renderCalendar(yr, mo, allEvents);
  renderText('tg',    yr, mo, allEvents);
  renderText('slack', yr, mo, allEvents);
  document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCalendar(yr, mo, allEvents) {
  const firstDow = new Date(yr, mo - 1, 1).getDay();
  const offset   = (firstDow === 0 ? 7 : firstDow) - 1; // Mon-first grid
  const lastDay  = new Date(yr, mo, 0).getDate();
  const byDay    = {};
  allEvents.forEach(e => { const d = +e.date.split('-')[2]; (byDay[d] = byDay[d] || []).push(e); });

  const td = new Date();
  let h = `<div class="cal-wrap"><div class="cal-title">${MONTHS_RU[mo-1]} ${yr}</div><div class="calendar-grid">`;
  DAYS_CAL.forEach(d => h += `<div class="cal-header">${d}</div>`);
  for (let i = 0; i < offset; i++) h += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= lastDay; d++) {
    const isToday = td.getFullYear() === yr && td.getMonth() === mo - 1 && td.getDate() === d;
    h += `<div class="cal-day${isToday ? ' today' : ''}"><div class="day-num">${d}</div>`;
    (byDay[d] || []).forEach(e => {
      const t  = CONFIG.eventTypes[e.type] || CONFIG.eventTypes[Object.keys(CONFIG.eventTypes)[0]];
      const tr = timeRange(e.time, e.duration);
      h += `<div class="ev-chip ${t.chipClass}" title="${esc(e.name)} ${tr}">${tr} ${esc(e.name || t.label)}</div>`;
    });
    h += `</div>`;
  }
  h += `</div></div>`;
  document.getElementById('tab-cal').innerHTML = h +
    `<button class="copy-txt-btn copy-png-btn" onclick="copyCalendarPng(this)">Скопировать PNG</button>`;
}

// ── Canvas-based PNG export ───────────────────────────────────────────────────

// Chip colours for canvas rendering — must stay in sync with style.css
const CHIP_CANVAS_COLORS = {
  'chip-tasks':      { bg: '#E6F1FB', fg: '#185FA5' },
  'chip-strategy':   { bg: '#EEEDFE', fg: '#3C3489' },
  'chip-gametime':   { bg: '#EAF3DE', fg: '#3B6D11' },
  'chip-lesson':     { bg: '#E1F5EE', fg: '#0F6E56' },
  'chip-tournament': { bg: '#FAEEDA', fg: '#854F0B' },
};

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill)   { ctx.fillStyle   = fill;   ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

/** Splits text into lines that fit within maxWidth. */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function buildCalendarCanvas(ym, allEvents, calWrapWidth) {
  const [yr, mo] = ym.split('-').map(Number);
  const dpr      = window.devicePixelRatio || 1;

  // Derive cell width from the actual rendered calendar so PNG matches screen.
  // .cal-wrap has padding 1.25rem (20px) each side; grid gap is 3px.
  const WRAP_PAD = 20;
  const GAP      = 3;
  const CELL_W   = Math.floor((calWrapWidth - WRAP_PAD * 2 - GAP * 6) / 7);
  const GRID_W   = CELL_W * 7 + GAP * 6;

  const PAD       = 24;
  const HDR_H     = 44;  // month title row
  const DHEAD     = 24;  // weekday labels row
  const FONT      = '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';
  const CHIP_FONT = `10px ${FONT}`;
  const TEXT_W    = CELL_W - 10; // usable text width inside chip
  const LINE_H    = 13;          // px per text line inside chip
  const CHIP_VPAD = 3;           // top/bottom padding inside chip
  const CHIP_GAP  = 2;           // gap between chips
  const DAY_NUM_H = 18;          // space reserved for the day number

  const firstDow = new Date(yr, mo - 1, 1).getDay();
  const offset   = (firstDow === 0 ? 7 : firstDow) - 1;
  const lastDay  = new Date(yr, mo, 0).getDate();
  const rows     = Math.ceil((offset + lastDay) / 7);

  // Build event-by-day map
  const byDay = {};
  allEvents.forEach(e => { const d = +e.date.split('-')[2]; (byDay[d] = byDay[d] || []).push(e); });

  // ── Pass 1: measure cell heights ─────────────────────────────────────────
  // We need a temporary canvas context just for text measurement.
  const measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font  = CHIP_FONT;

  function cellHeight(d) {
    const evs = byDay[d] || [];
    if (!evs.length) return 66;
    let h = DAY_NUM_H;
    for (const e of evs) {
      const t     = CONFIG.eventTypes[e.type] || CONFIG.eventTypes[Object.keys(CONFIG.eventTypes)[0]];
      const label = `${timeRange(e.time, e.duration)} ${e.name || t.label}`;
      const lines = wrapText(measureCtx, label, TEXT_W);
      h += lines.length * LINE_H + CHIP_VPAD * 2 + CHIP_GAP;
    }
    return Math.max(h + 4, 66);
  }

  // Compute per-row max height (all cells in the same row share the same height)
  const rowH = Array.from({ length: rows }, (_, ri) => {
    let max = 66;
    for (let col = 0; col < 7; col++) {
      const dayIdx = ri * 7 + col - offset + 1;
      if (dayIdx >= 1 && dayIdx <= lastDay) max = Math.max(max, cellHeight(dayIdx));
    }
    return max;
  });

  // Row Y offsets
  const rowY = rowH.reduce((acc, h) => { acc.push((acc.at(-1) || 0) + h + GAP); return acc; }, [0]);

  const gridH = rowY.at(-1) - GAP; // total grid height without trailing gap
  const TW    = PAD + GRID_W + PAD;
  const TH    = PAD + HDR_H + DHEAD + gridH + PAD;

  // ── Draw ──────────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width  = TW * dpr;
  canvas.height = TH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Outer background
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, TW, TH);

  // Calendar card
  roundRect(ctx, PAD, PAD, GRID_W, HDR_H + DHEAD + gridH, 12, '#ffffff', '#e5e5e0');

  // Month title
  ctx.font         = `500 16px ${FONT}`;
  ctx.fillStyle    = '#1a1a1a';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${MONTHS_RU[mo - 1]} ${yr}`, PAD + GRID_W / 2, PAD + HDR_H / 2);

  // Weekday headers
  ctx.font         = `500 11px ${FONT}`;
  ctx.fillStyle    = '#888';
  ctx.textBaseline = 'middle';
  DAYS_CAL.forEach((label, i) => {
    ctx.textAlign = 'center';
    ctx.fillText(label, PAD + i * (CELL_W + GAP) + CELL_W / 2, PAD + HDR_H + DHEAD / 2);
  });

  // Day cells
  const today = new Date();

  for (let d = 1; d <= lastDay; d++) {
    const idx     = d - 1 + offset;
    const col     = idx % 7;
    const ri      = Math.floor(idx / 7);
    const x       = PAD + col * (CELL_W + GAP);
    const y       = PAD + HDR_H + DHEAD + rowY[ri];
    const CELL_H  = rowH[ri];
    const isToday = today.getFullYear() === yr && today.getMonth() === mo - 1 && today.getDate() === d;

    roundRect(ctx, x + 1, y + 1, CELL_W - 2, CELL_H - 2, 5,
      isToday ? '#f0f7ff' : '#fafaf8',
      isToday ? '#378ADD' : '#eeeeea');

    // Day number
    ctx.font         = `500 11px ${FONT}`;
    ctx.fillStyle    = isToday ? '#378ADD' : '#aaa';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(d), x + 5, y + 5);

    // Chips — track running Y within cell
    let chipTop = y + DAY_NUM_H;
    for (const e of (byDay[d] || [])) {
      const t      = CONFIG.eventTypes[e.type] || CONFIG.eventTypes[Object.keys(CONFIG.eventTypes)[0]];
      const colors = CHIP_CANVAS_COLORS[t.chipClass] || { bg: '#f0f0f0', fg: '#555' };
      const label  = `${timeRange(e.time, e.duration)} ${e.name || t.label}`;

      ctx.font = CHIP_FONT;
      const lines  = wrapText(ctx, label, TEXT_W);
      const chipH  = lines.length * LINE_H + CHIP_VPAD * 2;

      roundRect(ctx, x + 3, chipTop, CELL_W - 6, chipH, 3, colors.bg, null);

      ctx.fillStyle    = colors.fg;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      lines.forEach((ln, li) => {
        ctx.fillText(ln, x + 5, chipTop + CHIP_VPAD + li * LINE_H);
      });

      chipTop += chipH + CHIP_GAP;
    }
  }

  return canvas;
}

async function copyCalendarPng(btn) {
  if (!lastGeneratedEvents) return;
  const prev    = btn.textContent;
  const calWrap = document.querySelector('#tab-cal .cal-wrap');
  btn.textContent = 'Готовлю…';
  btn.disabled = true;
  try {
    const canvas = buildCalendarCanvas(lastGeneratedYM, lastGeneratedEvents, calWrap.getBoundingClientRect().width);
    const blob   = await new Promise((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob returned null')), 'image/png')
    );
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    btn.textContent = 'Скопировано ✓';
  } catch (err) {
    // Fallback: download the file
    console.warn('Clipboard write failed, falling back to download:', err);
    try {
      const canvas = buildCalendarCanvas(lastGeneratedYM, lastGeneratedEvents, calWrap.getBoundingClientRect().width);
      const a      = Object.assign(document.createElement('a'), {
        href:     canvas.toDataURL('image/png'),
        download: `digest-${lastGeneratedYM}.png`,
      });
      a.click();
      btn.textContent = 'Сохранено ↓';
    } catch (err2) {
      console.error('PNG export failed:', err2);
      btn.textContent = 'Ошибка ✕';
    }
  }
  setTimeout(() => { btn.textContent = prev; btn.disabled = false; }, 2500);
}

function fmtDate(e) {
  const p   = e.date.split('-').map(Number);
  const dow = DAYS_SHORT[new Date(p[0], p[1] - 1, p[2]).getDay()];
  return `${p[2]} ${MONTHS_GEN[p[1]-1]} (${dow}), ${timeRange(e.time, e.duration)}`;
}

function renderText(platform, yr, mo, allEvents) {
  const order  = CONFIG.eventTypeOrder;
  const groups = {};
  order.forEach(k => groups[k] = []);
  allEvents.forEach(e => {
    if (groups[e.type] !== undefined) groups[e.type].push(e);
  });

  let txt = CONFIG.digestHeader(MONTHS_RU[mo-1], yr) + '\n\n';
  order.forEach(type => {
    if (!groups[type].length) return;
    const t = CONFIG.eventTypes[type];
    txt += `${t.icon} *${t.label}*\n`;
    groups[type].forEach(e => {
      const name = e.name || t.label;
      if (platform === 'slack') {
        const lp = e.link ? ` — <${e.link}|Ссылка на встречу>` : '';
        txt += `• ${fmtDate(e)} — ${name}${lp}\n`;
      } else {
        txt += `• ${fmtDate(e)} — ${name}\n`;
        if (e.link) txt += `  🔗 ${e.link}\n`;
      }
    });
    txt += '\n';
  });
  txt += CONFIG.digestFooter(allEvents.length);

  const badgeCls = platform === 'tg' ? 'badge-tg' : 'badge-slack';
  const badgeLbl = platform === 'tg' ? 'Telegram'  : 'Slack';
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="platform-badge ${badgeCls}">${badgeLbl}</div>
    <div class="digest-box">${txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    <button class="copy-txt-btn" onclick="doCopy(this)">Скопировать</button>`;
  wrap._raw = txt;
  const el = document.getElementById('tab-' + platform);
  el.innerHTML = '';
  el.appendChild(wrap);
}

// ── Copy rules to next month ───────────────────────────────────────────────────

function copyToNextMonth() {
  saveMonth(currentMonth);
  const [yr, mo] = currentMonth.split('-').map(Number);
  const next = new Date(yr, mo, 1);
  const nYM  = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;
  const all  = loadAll();
  all[nYM] = { rules: rules.map(r => ({...r})), lastWeekRules: lastWeekRules.map(r => ({...r})), events: [] };
  saveAll(all);
  const c = document.getElementById('copy-confirm');
  c.style.display = 'inline';
  setTimeout(() => c.style.display = 'none', 3000);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function doCopy(btn) {
  navigator.clipboard.writeText(btn.parentNode._raw).then(() => {
    btn.textContent = 'Скопировано ✓';
    setTimeout(() => btn.textContent = 'Скопировать', 2000);
  });
}

const TABS = ['cal', 'tg', 'slack'];
function switchTab(t) {
  document.querySelectorAll('.tab').forEach((b, i) => b.classList.toggle('active', TABS[i] === t));
  TABS.forEach(id => document.getElementById('tab-' + id).style.display = id === t ? 'block' : 'none');
}

init();
