// ============================================================
// CALENDAR — Visualização de calendário (mensal/semanal)
// ============================================================

/* global masterLists, activities, audits, trainings, documents,
          currentuser, currentTab, openView, openPublicacaoModal,
          passesFilters, passesFbarMyTasks, normalizeText,
          getAllowedSetores, formatBR, saveAll, renderCards,
          userCanEditCards, verPublicacao */

// ── Estado ──────────────────────────────────────────────────
var calendarActiveByTab = {
    auditoria: false,
    treinamentos: false,
    atividades: false,
    documentos: false
};

var calViewMode   = 'monthly';
var calViewYear   = new Date().getFullYear();
var calViewMonth  = new Date().getMonth();
var calViewWeek   = _calGetWeekStart(new Date());

var calViewFilter = 'tarefas';  // 'tarefas' | 'publicacoes' | 'ambos'

// ── Módulos ─────────────────────────────────────────────────
var _CAL_MODULES = {
    auditoria:    { prefix: 'Audit', statusKey: 'auditStatus',  dateField: 'dataPrevisao',       getItems: () => (typeof audits     !== 'undefined' ? audits     : []) },
    treinamentos: { prefix: 'Train', statusKey: 'trainStatus',  dateField: 'dataPrevisao',       getItems: () => (typeof trainings  !== 'undefined' ? trainings  : []) },
    atividades:   { prefix: 'Ativ',  statusKey: 'ativStatus',   dateField: 'dataConclusao',      getItems: () => (typeof activities !== 'undefined' ? activities : []) },
    documentos:   { prefix: 'Doc',   statusKey: 'docStatus',    dateField: 'dataProximaRevisao', getItems: () => (typeof documents  !== 'undefined' ? documents  : []) }
};

// ── Utils de data ────────────────────────────────────────────
function _calGetWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
}

function _calDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
}

function _calFmtDayMonth(d) {
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
}

function _calFmtFullDate(d) {
    return d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
}

function _calToday() {
    const t = new Date();
    t.setHours(0,0,0,0);
    return t;
}

function _calTruncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
}

// ── Verifica se calendário está ativo nesta aba ──────────────
function isCalendarActive(tab) {
    tab = tab || (typeof currentTab !== 'undefined' ? currentTab : '');
    return !!(calendarActiveByTab[tab]);
}

// ── Alterna para aba Calendário ──────────────────────────────
function toggleCalendarView(mode) {
    if (!_CAL_MODULES[currentTab]) return;

    if (typeof kanbanActiveByTab !== 'undefined') {
        kanbanActiveByTab[currentTab] = false;
    }

    calendarActiveByTab[currentTab] = (mode === 'calendar');

    const grid    = document.getElementById('cardsGrid');
    const board   = document.getElementById('kanbanBoard');
    const calBoard= document.getElementById('calendarBoard');
    const addBtn  = document.getElementById('addBtn');
    const addColRow = document.getElementById('fbarAddcolRow');
    const canEdit = typeof userCanEditCards === 'function' ? userCanEditCards() : false;

    const calOn = isCalendarActive();

    if (calOn) {
        if (grid)  grid.style.display  = 'none';
        if (board) board.style.display = 'none';
        if (calBoard) calBoard.style.display = 'block';
        if (addBtn)    addBtn.style.display    = canEdit ? 'flex' : 'none';
        if (addColRow) addColRow.style.display = 'none';
        renderCalendar();
    } else {
        if (calBoard) calBoard.style.display = 'none';
        if (grid) grid.style.display = 'grid';
        if (addBtn) addBtn.style.display = canEdit ? 'flex' : 'none';
        if (typeof renderCards === 'function') renderCards();
    }

    _calUpdateToggleBtns();
    if (typeof _populateFbarAdv === 'function') _populateFbarAdv();
}

function _calUpdateToggleBtns() {
    const btnList   = document.getElementById('btnViewList');
    const btnKanban = document.getElementById('btnViewKanban');
    const btnCal    = document.getElementById('btnViewCalendar');
    const calOn     = isCalendarActive();
    const kbOn      = (typeof isKanbanActive === 'function') && isKanbanActive();

    if (btnList)   { btnList.classList.toggle('active', !calOn && !kbOn);  btnList.classList.toggle('inactive', calOn || kbOn); }
    if (btnKanban) { btnKanban.classList.toggle('active',  kbOn && !calOn); btnKanban.classList.toggle('inactive', !kbOn || calOn); }
    if (btnCal)    { btnCal.classList.toggle('active', calOn); btnCal.classList.toggle('inactive', !calOn); }
}

// ── Calcula próximas ocorrências de rotina a partir de uma base ─
function _calNextOccurrence(item, fromDate) {
    const rotina = item.rotina || 'pontual';
    if (rotina === 'pontual') return null;
    const freq = Number(item.frequencia) || 1;
    const base = new Date(fromDate);
    base.setHours(0,0,0,0);
    let next = new Date(base);

    if (rotina === 'anual') {
        next.setFullYear(next.getFullYear() + freq);
    } else if (rotina === 'mensal') {
        next.setMonth(next.getMonth() + freq);
    } else if (rotina === 'semanal') {
        next.setDate(next.getDate() + freq * 7);
    } else if (rotina === 'diario') {
        next.setDate(next.getDate() + freq);
    } else if (rotina === 'diasemana') {
        const days = Array.isArray(item.diasSemana) ? item.diasSemana : [];
        if (days.length === 0) return null;
        const tomorrow = new Date(base);
        tomorrow.setDate(tomorrow.getDate() + 1);
        for (let i = 0; i < 14; i++) {
            const d = new Date(tomorrow);
            d.setDate(tomorrow.getDate() + i);
            if (days.includes(d.getDay())) { next = d; break; }
        }
    }
    return next;
}

// ── Gera ocorrências de tarefa no range (apenas data da previsão/conclusão) ─
function _calGetTarefaOccurrences(item, dateField, rangeStart, rangeEnd) {
    const dateStr = item[dateField];
    if (!dateStr) return [];
    const d = new Date(dateStr + 'T00:00:00');
    if (d >= rangeStart && d <= rangeEnd) return [dateStr];
    return [];
}

// ── Gera publicações previstas futuras no range (baseadas na última publicação) ─
function _calGetPubPrevistaOccurrences(item, tab, rangeStart, rangeEnd) {
    const rotina = item.rotina || 'pontual';
    if (rotina === 'pontual') return [];

    // Data base = última publicação ou dataPublicacao do item
    const pubs = (item.publicacoes || []).filter(p => p.data).sort((a,b) => a.data > b.data ? -1 : 1);
    const lastPubDate = pubs.length > 0 ? pubs[0].data : (
        tab === 'documentos' ? item.dataCriacao : item.dataPublicacao
    );
    if (!lastPubDate) return [];

    const results = [];
    const freq = Number(item.frequencia) || 1;
    const days = Array.isArray(item.diasSemana) ? item.diasSemana : [];

    if (rotina === 'diasemana') {
        // Para diasemana: cada dia da semana no range que cai nos dias configurados
        const d = new Date(rangeStart);
        while (d <= rangeEnd) {
            if (days.includes(d.getDay())) {
                const ds = _calDateStr(d);
                // Só mostra futuras (após a última publicação)
                if (ds > lastPubDate) results.push(ds);
            }
            d.setDate(d.getDate() + 1);
        }
        return results;
    }

    // Para anual/mensal/semanal/diario: avança a partir da última publicação
    let cur = new Date(lastPubDate + 'T00:00:00');

    // Avança até entrar no range
    let safety = 0;
    while (cur < rangeStart && safety < 500) {
        if (rotina === 'anual') cur.setFullYear(cur.getFullYear() + freq);
        else if (rotina === 'mensal') cur.setMonth(cur.getMonth() + freq);
        else if (rotina === 'semanal') cur.setDate(cur.getDate() + freq * 7);
        else if (rotina === 'diario') cur.setDate(cur.getDate() + freq);
        else break;
        safety++;
    }

    // Coleta ocorrências no range
    safety = 0;
    while (cur <= rangeEnd && safety < 500) {
        if (cur >= rangeStart) {
            const ds = _calDateStr(cur);
            // Só mostra futuras (após última publicação)
            if (ds > lastPubDate) results.push(ds);
        }
        if (rotina === 'anual') cur.setFullYear(cur.getFullYear() + freq);
        else if (rotina === 'mensal') cur.setMonth(cur.getMonth() + freq);
        else if (rotina === 'semanal') cur.setDate(cur.getDate() + freq * 7);
        else if (rotina === 'diario') cur.setDate(cur.getDate() + freq);
        else break;
        safety++;
    }

    return results;
}

// ── Gera mapa dia → itens ────────────────────────────────────
function _calBuildDayMap(rangeStart, rangeEnd) {
    const tab = currentTab;
    const cfg = _CAL_MODULES[tab];
    if (!cfg) return {};

    let data = (cfg.getItems() || []).filter(i => !i.deleted);

    const allowedSetores = (typeof getAllowedSetores === 'function') ? getAllowedSetores() : null;
    if (allowedSetores !== null) data = data.filter(i => allowedSetores.includes(i.setor));

    const titleRaw = (document.getElementById('titleSearchInput') || {}).value || '';
    const titleQ = typeof normalizeText === 'function' ? normalizeText(titleRaw) : titleRaw.toLowerCase().trim();

    data = data.filter(item => {
        if (typeof passesFilters === 'function' && !passesFilters(cfg.prefix, item, { status: true })) return false;
        if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
        if (titleQ) {
            const t = typeof normalizeText === 'function' ? normalizeText(item.titulo || '') : (item.titulo || '').toLowerCase();
            if (!t.includes(titleQ)) return false;
        }
        return true;
    });

    const map = {};

    // ── Tarefas: apenas no dia da previsão/conclusão ─────────
    if (calViewFilter !== 'publicacoes') {
        data.forEach(item => {
            const occurrences = _calGetTarefaOccurrences(item, cfg.dateField, rangeStart, rangeEnd);
            occurrences.forEach(ds => {
                if (!map[ds]) map[ds] = [];
                map[ds].push({ item, type: 'tarefa' });
            });
        });
    }

    // ── Publicações ──────────────────────────────────────────
    if (calViewFilter !== 'tarefas') {
        data.forEach(item => {
            // Publicações realizadas
            (item.publicacoes || []).forEach((pub, pubIdx) => {
                if (!pub.data) return;
                const d = new Date(pub.data + 'T00:00:00');
                if (d >= rangeStart && d <= rangeEnd) {
                    if (!map[pub.data]) map[pub.data] = [];
                    map[pub.data].push({ item, type: 'publicacao', pub, pubIdx, realizada: true });
                }
            });

            // Publicações previstas futuras (apenas para itens com rotina)
            if (item.rotina && item.rotina !== 'pontual') {
                const previstas = _calGetPubPrevistaOccurrences(item, tab, rangeStart, rangeEnd);
                previstas.forEach(ds => {
                    if (!map[ds]) map[ds] = [];
                    const alreadyReal = (map[ds] || []).some(e => e.item.id === item.id && e.type === 'publicacao' && e.realizada && e.pub && e.pub.data === ds);
                    if (!alreadyReal) {
                        map[ds].push({ item, type: 'publicacao', pub: null, pubIdx: null, realizada: false });
                    }
                });
            }
        });
    }

    return map;
}

// ── RENDER PRINCIPAL ─────────────────────────────────────────
function renderCalendar() {
    const board = document.getElementById('calendarBoard');
    if (!board) return;
    if (!_CAL_MODULES[currentTab]) { board.innerHTML = ''; return; }

    board.innerHTML = '';
    board.appendChild(_calBuildHeader());

    const grade = document.createElement('div');
    grade.id = 'calendarGrade';
    board.appendChild(grade);

    _calRenderGrade();
}

function _calRenderGrade() {
    const grade = document.getElementById('calendarGrade');
    if (!grade) return;
    if (calViewMode === 'monthly') _calRenderMonthly(grade);
    else _calRenderWeekly(grade);
}

// ── Header ───────────────────────────────────────────────────
function _calBuildHeader() {
    const wrap = document.createElement('div');
    wrap.className = 'cal-header';

    const navArea = document.createElement('div');
    navArea.className = 'cal-nav-area';

    const btnPrev = document.createElement('button');
    btnPrev.className = 'cal-nav-btn';
    btnPrev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    btnPrev.onclick = () => _calNavigate(-1);

    const btnNext = document.createElement('button');
    btnNext.className = 'cal-nav-btn';
    btnNext.innerHTML = '<i class="fas fa-chevron-right"></i>';
    btnNext.onclick = () => _calNavigate(1);

    const btnToday = document.createElement('button');
    btnToday.className = 'cal-today-btn';
    btnToday.textContent = 'Hoje';
    btnToday.onclick = _calGoToday;

    const title = document.createElement('span');
    title.className = 'cal-nav-title';
    title.id = 'calNavTitle';
    title.textContent = _calGetNavTitle();

    navArea.appendChild(btnPrev);
    navArea.appendChild(btnToday);
    navArea.appendChild(title);
    navArea.appendChild(btnNext);

    const ctrlArea = document.createElement('div');
    ctrlArea.className = 'cal-ctrl-area';
    ctrlArea.appendChild(_calBuildViewFilter());
    ctrlArea.appendChild(_calBuildModeToggle());

    wrap.appendChild(navArea);
    wrap.appendChild(ctrlArea);
    return wrap;
}

function _calGetNavTitle() {
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    if (calViewMode === 'monthly') return `${months[calViewMonth]} ${calViewYear}`;
    const end = new Date(calViewWeek);
    end.setDate(end.getDate() + 6);
    const sm = months[calViewWeek.getMonth()];
    const em = months[end.getMonth()];
    if (sm === em) return `${calViewWeek.getDate()} – ${end.getDate()} de ${sm} ${end.getFullYear()}`;
    return `${calViewWeek.getDate()} ${sm} – ${end.getDate()} ${em} ${end.getFullYear()}`;
}

function _calBuildViewFilter() {
    const wrap = document.createElement('div');
    wrap.className = 'cal-viewfilter-wrap';
    wrap.style.position = 'relative';

    const btn = document.createElement('button');
    btn.className = 'fbar-mytasks-btn' + (calViewFilter !== 'ambos' ? ' active' : '');
    btn.id = 'calViewFilterBtn';
    btn.innerHTML = `<i class="fas fa-eye"></i> <span id="calViewFilterLabel">${_calViewFilterLabel()}</span> <i class="fas fa-caret-down" style="margin-left:6px;font-size:12px;"></i>`;
    btn.onclick = () => {
        const dd = document.getElementById('calViewFilterDropdown');
        if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
    };

    const dd = document.createElement('div');
    dd.className = 'filters-dropdown fbar-adv-dropdown';
    dd.id = 'calViewFilterDropdown';
    dd.style.cssText = 'display:none; position:absolute; right:0; z-index:60; min-width:200px;';

    const opts = [
        { val: 'tarefas',     label: 'Tarefas',     desc: 'Visualiza as tarefas na agenda' },
        { val: 'publicacoes', label: 'Publicações',  desc: 'Visualiza as publicações na agenda' },
        { val: 'ambos',       label: 'Ambos',        desc: 'Tarefas e publicações' }
    ];

    const inner = document.createElement('div');
    inner.style.cssText = 'padding:8px; display:flex; flex-direction:column; gap:4px;';
    opts.forEach(o => {
        const optBtn = document.createElement('button');
        optBtn.className = 'cal-viewfilter-opt' + (calViewFilter === o.val ? ' active' : '');
        optBtn.dataset.val = o.val;
        optBtn.innerHTML = `<span class="cal-vf-label">${o.label}</span><span class="cal-vf-desc">${o.desc}</span>`;
        optBtn.onclick = () => _calSetViewFilter(o.val);
        inner.appendChild(optBtn);
    });

    dd.appendChild(inner);
    wrap.appendChild(btn);
    wrap.appendChild(dd);
    return wrap;
}

function _calViewFilterLabel() {
    return { tarefas: 'Tarefas', publicacoes: 'Publicações', ambos: 'Ambos' }[calViewFilter] || 'Visualização';
}

function _calSetViewFilter(val) {
    calViewFilter = val;
    const dd = document.getElementById('calViewFilterDropdown');
    if (dd) dd.style.display = 'none';
    renderCalendar();
}

function _calBuildModeToggle() {
    const wrap = document.createElement('div');
    wrap.className = 'view-module-tabs cal-mode-toggle';

    const btnMonth = document.createElement('button');
    btnMonth.className = 'view-module-tab' + (calViewMode === 'monthly' ? ' active' : '');
    btnMonth.innerHTML = '<i class="fas fa-calendar-alt"></i> Mensal';
    btnMonth.onclick = () => _calSetMode('monthly');

    const btnWeek = document.createElement('button');
    btnWeek.className = 'view-module-tab' + (calViewMode === 'weekly' ? ' active' : '');
    btnWeek.innerHTML = '<i class="fas fa-calendar-week"></i> Semanal';
    btnWeek.onclick = () => _calSetMode('weekly');

    wrap.appendChild(btnMonth);
    wrap.appendChild(btnWeek);
    return wrap;
}

function _calSetMode(mode) {
    calViewMode = mode;
    renderCalendar();
}

function _calNavigate(dir) {
    if (calViewMode === 'monthly') {
        calViewMonth += dir;
        if (calViewMonth < 0)  { calViewMonth = 11; calViewYear--; }
        if (calViewMonth > 11) { calViewMonth = 0;  calViewYear++; }
    } else {
        const d = new Date(calViewWeek);
        d.setDate(d.getDate() + dir * 7);
        calViewWeek = d;
    }
    const titleEl = document.getElementById('calNavTitle');
    if (titleEl) titleEl.textContent = _calGetNavTitle();
    _calRenderGrade();
}

function _calGoToday() {
    const now = new Date();
    calViewYear  = now.getFullYear();
    calViewMonth = now.getMonth();
    calViewWeek  = _calGetWeekStart(now);
    renderCalendar();
}

// ── Renderização Mensal ──────────────────────────────────────
function _calRenderMonthly(container) {
    const rangeStart = new Date(calViewYear, calViewMonth, 1);
    const rangeEnd   = new Date(calViewYear, calViewMonth + 1, 0);

    const map = _calBuildDayMap(rangeStart, rangeEnd);
    const today = _calToday();
    const canEdit = typeof userCanEditCards === 'function' ? userCanEditCards() : false;

    const grid = document.createElement('div');
    grid.className = 'cal-monthly-grid';

    const weekDays = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    weekDays.forEach(d => {
        const th = document.createElement('div');
        th.className = 'cal-weekday-header';
        th.textContent = d;
        grid.appendChild(th);
    });

    let startDow = rangeStart.getDay();
    startDow = (startDow === 0) ? 6 : startDow - 1;

    for (let i = 0; i < startDow; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell cal-day-other-month';
        grid.appendChild(cell);
    }

    const daysInMonth = rangeEnd.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(calViewYear, calViewMonth, d);
        const dateStr = _calDateStr(dateObj);
        const isToday = (dateObj.getTime() === today.getTime());
        const entries = map[dateStr] || [];

        const cell = document.createElement('div');
        cell.className = 'cal-day-cell' + (isToday ? ' cal-day-today' : '');
        cell.dataset.date = dateStr;

        // Drag-over para tarefas
        if (canEdit) {
            cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('cal-drag-over'); });
            cell.addEventListener('dragleave', () => cell.classList.remove('cal-drag-over'));
            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('cal-drag-over');
                _calHandleDrop(e, dateStr);
            });
        }

        const dayNum = document.createElement('span');
        dayNum.className = 'cal-day-num';
        dayNum.textContent = d;
        cell.appendChild(dayNum);

        if (entries.length > 0) {
            const evtsWrap = document.createElement('div');
            evtsWrap.className = 'cal-events-wrap';

            const maxShow = 3;
            const shown = entries.slice(0, maxShow);
            shown.forEach(e => evtsWrap.appendChild(_calRenderEventChip(e, canEdit)));
            if (entries.length > maxShow) {
                const more = document.createElement('button');
                more.className = 'cal-more-btn';
                more.textContent = `+${entries.length - maxShow} mais`;
                more.onclick = (ev) => { ev.stopPropagation(); _calOpenDayModal(dateStr, entries); };
                evtsWrap.appendChild(more);
            }
            cell.appendChild(evtsWrap);
        }

        if (entries.length > 0) {
            cell.onclick = () => _calOpenDayModal(dateStr, entries);
            cell.style.cursor = 'pointer';
        }

        grid.appendChild(cell);
    }

    const totalCells = startDow + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder !== 0) {
        for (let i = 0; i < 7 - remainder; i++) {
            const cell = document.createElement('div');
            cell.className = 'cal-day-cell cal-day-other-month';
            grid.appendChild(cell);
        }
    }

    container.innerHTML = '';
    container.appendChild(grid);
}

// ── Renderização Semanal ─────────────────────────────────────
function _calRenderWeekly(container) {
    const rangeStart = new Date(calViewWeek);
    const rangeEnd   = new Date(calViewWeek);
    rangeEnd.setDate(rangeEnd.getDate() + 6);

    const map = _calBuildDayMap(rangeStart, rangeEnd);
    const today = _calToday();
    const weekDayNames = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    const canEdit = typeof userCanEditCards === 'function' ? userCanEditCards() : false;

    const grid = document.createElement('div');
    grid.className = 'cal-weekly-grid';

    for (let i = 0; i < 7; i++) {
        const dateObj = new Date(calViewWeek);
        dateObj.setDate(dateObj.getDate() + i);
        const dateStr = _calDateStr(dateObj);
        const isToday = (dateObj.getTime() === today.getTime());
        const entries = map[dateStr] || [];

        const col = document.createElement('div');
        col.className = 'cal-week-col' + (isToday ? ' cal-week-col-today' : '');
        col.dataset.date = dateStr;

        if (canEdit) {
            col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('cal-drag-over'); });
            col.addEventListener('dragleave', () => col.classList.remove('cal-drag-over'));
            col.addEventListener('drop', (e) => {
                e.preventDefault();
                col.classList.remove('cal-drag-over');
                _calHandleDrop(e, dateStr);
            });
        }

        const colHeader = document.createElement('div');
        colHeader.className = 'cal-week-col-header';
        colHeader.innerHTML = `<span class="cal-wk-dayname">${weekDayNames[i]}</span><span class="cal-wk-daynum${isToday ? ' cal-wk-today-num' : ''}">${dateObj.getDate()}</span>`;
        col.appendChild(colHeader);

        const evtsWrap = document.createElement('div');
        evtsWrap.className = 'cal-week-events';

        if (entries.length === 0) {
            evtsWrap.appendChild(document.createElement('div')).className = 'cal-week-empty';
        } else {
            entries.forEach(e => evtsWrap.appendChild(_calRenderEventCard(e, canEdit)));
        }

        col.appendChild(evtsWrap);
        grid.appendChild(col);
    }

    container.innerHTML = '';
    container.appendChild(grid);
}

// ── Chip de evento (mensal) ──────────────────────────────────
function _calRenderEventChip(entry, canEdit) {
    const { item, type, pub, pubIdx, realizada } = entry;
    const chip = document.createElement('button');
    chip.className = 'cal-event-chip';

    const statusColor = _calGetStatusColor(item);
    chip.style.setProperty('--evt-color', statusColor);

    // Trunca título para caber no chip mensal (18 chars)
    const titulo = _calTruncate(item.titulo, 18);

    if (type === 'publicacao') {
        chip.classList.add(realizada ? 'cal-evt-pub-done' : 'cal-evt-pub-pending');
        const icon = realizada ? 'check-circle' : 'clock';
        const pubLabel = realizada && pub ? (pub.tipo || 'Publicação') : 'Previsto';
        const dateInfo = realizada && pub ? ` · ${pub.hora || ''}` : '';
        chip.innerHTML = `<i class="fas fa-${icon}"></i> ${_calEsc(titulo)}`;
        chip.title = `${pubLabel}${dateInfo} — ${item.titulo}`;
        chip.onclick = (e) => { e.stopPropagation(); _calOpenPubEntry(item, pub, pubIdx); };
    } else {
        chip.classList.add('cal-evt-tarefa');
        chip.innerHTML = `<span class="cal-evt-dot" style="background:${statusColor}"></span>${_calEsc(titulo)}`;
        chip.title = item.titulo;
        // Drag para mover tarefas
        if (canEdit) {
            chip.draggable = true;
            chip.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', JSON.stringify({ itemId: item.id, tab: currentTab }));
                chip.classList.add('cal-dragging');
            });
            chip.addEventListener('dragend', () => chip.classList.remove('cal-dragging'));
        }
        chip.onclick = (e) => { e.stopPropagation(); _calOpenItem(item); };
    }

    return chip;
}

// ── Card de evento (semanal) ──────────────────────────────────
function _calRenderEventCard(entry, canEdit) {
    const { item, type, pub, pubIdx, realizada } = entry;
    const card = document.createElement('button');
    card.className = 'cal-event-card';

    const statusColor = _calGetStatusColor(item);
    card.style.setProperty('--evt-color', statusColor);

    const statusName = item.status || '';
    const resp = item.responsavelTecnico || item.responsavel || '';

    if (type === 'publicacao') {
        card.classList.add(realizada ? 'cal-evt-pub-done' : 'cal-evt-pub-pending');
        const pubTipo = realizada && pub ? (pub.tipo || 'Publicação') : 'Previsto';
        const pubDesc = realizada && pub ? _calTruncate(pub.descricao || '', 40) : 'Publicação prevista pela rotina';
        const pubDate = realizada && pub ? `<div class="cal-ecard-resp"><i class="fas fa-calendar" style="font-size:10px;"></i> ${pub.data || ''} ${pub.hora || ''}</div>` : '';
        const pubUser = realizada && pub && pub.usuario ? `<div class="cal-ecard-resp"><i class="fas fa-user" style="font-size:10px;"></i> ${_calEsc(pub.usuario)}</div>` : '';
        card.innerHTML = `
            <div class="cal-ecard-top">
                <i class="fas fa-${realizada ? 'check-circle' : 'clock'}" style="color:${realizada ? 'var(--c-green)' : 'var(--c-orange)'}"></i>
                <span class="cal-ecard-type">${_calEsc(pubTipo)}</span>
            </div>
            <div class="cal-ecard-title">${_calEsc(item.titulo)}</div>
            ${pubDesc ? `<div class="cal-ecard-desc">${_calEsc(pubDesc)}</div>` : ''}
            ${pubDate}${pubUser}
            ${resp ? `<div class="cal-ecard-resp"><i class="fas fa-user" style="font-size:10px;"></i> ${_calEsc(resp)}</div>` : ''}`;
        card.onclick = () => _calOpenPubEntry(item, pub, pubIdx);
    } else {
        card.classList.add('cal-evt-tarefa');
        const setor = item.setor ? `<div class="cal-ecard-resp"><i class="fas fa-building" style="font-size:10px;"></i> ${_calEsc(item.setor)}</div>` : '';
        card.innerHTML = `
            <div class="cal-ecard-top">
                <span class="cal-evt-dot" style="background:${statusColor}; flex-shrink:0;"></span>
                <span class="cal-ecard-status">${_calEsc(statusName)}</span>
            </div>
            <div class="cal-ecard-title">${_calEsc(item.titulo)}</div>
            ${resp ? `<div class="cal-ecard-resp"><i class="fas fa-user" style="font-size:10px;"></i> ${_calEsc(resp)}</div>` : ''}
            ${setor}`;
        if (canEdit) {
            card.draggable = true;
            card.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', JSON.stringify({ itemId: item.id, tab: currentTab }));
                card.classList.add('cal-dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('cal-dragging'));
        }
        card.onclick = () => _calOpenItem(item);
    }

    return card;
}

function _calGetStatusColor(item) {
    if (!masterLists || !item.status) return 'var(--c-default, #94a3b8)';
    const cfg = _CAL_MODULES[currentTab];
    if (!cfg) return 'var(--c-default, #94a3b8)';
    const list = masterLists[cfg.statusKey] || [];
    const s = list.find(s => s.name === item.status);
    if (!s) return 'var(--c-default, #94a3b8)';
    const colorMap = {
        blue: 'var(--c-blue)', green: 'var(--c-green)', red: 'var(--c-red)',
        orange: 'var(--c-orange)', yellow: 'var(--c-yellow)', purple: 'var(--c-purple)',
        default: 'var(--c-default, #94a3b8)'
    };
    return colorMap[s.color] || colorMap.default;
}

function _calEsc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Abrir item / publicação ──────────────────────────────────
function _calOpenItem(item) {
    if (typeof openView === 'function') openView(item.id, currentTab);
}

function _calOpenPubEntry(item, pub, pubIdx) {
    if (!pub) {
        // Publicação prevista: abre diretamente o modal de Nova Publicação
        if (typeof openPublicacaoModal === 'function') {
            window._currentViewId  = item.id;
            window._currentViewTab = currentTab;
            openPublicacaoModal();
        } else if (typeof openView === 'function') {
            openView(item.id, currentTab);
            setTimeout(() => {
                const pubTabBtn = document.querySelector('.view-modal-tab[data-tab="publicacoes"], .view-modal-tab[onclick*="publicacoes"]');
                if (pubTabBtn) pubTabBtn.click();
                if (typeof openPublicacaoModal === 'function') openPublicacaoModal();
            }, 200);
        }
        return;
    }
    // Publicação realizada: abre diretamente o modal da publicação
    if (typeof verPublicacao === 'function' && pubIdx !== null && pubIdx !== undefined) {
        verPublicacao(item.id, currentTab, pubIdx);
    } else if (typeof openView === 'function') {
        openView(item.id, currentTab);
        setTimeout(() => {
            const pubTabBtn = document.querySelector('.view-modal-tab[data-tab="publicacoes"], .view-modal-tab[onclick*="publicacoes"]');
            if (pubTabBtn) pubTabBtn.click();
        }, 150);
    }
}

// ── Drag & Drop ──────────────────────────────────────────────
function _calHandleDrop(e, targetDateStr) {
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (!data || !data.itemId || !data.tab) return;

    const tab = data.tab;
    const cfg = _CAL_MODULES[tab];
    if (!cfg) return;

    const items = cfg.getItems();
    const item = items.find(i => i.id === data.itemId);
    if (!item) return;

    // Verifica permissão de editar cards (Todos ou Parcial — verificado via userCanEditCards que já trata parcial)
    if (typeof userCanEditCards === 'function' && !userCanEditCards(item)) return;

    // Atualiza a data do campo correto
    item[cfg.dateField] = targetDateStr;

    if (typeof saveAll === 'function') saveAll();
    _calRenderGrade();
    if (typeof renderCards === 'function') renderCards();
}

// ── Modal do dia ─────────────────────────────────────────────
function _calOpenDayModal(dateStr, entries) {
    let modal = document.getElementById('calDayModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'calDayModal';
        modal.className = 'cal-day-modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }

    const d = new Date(dateStr + 'T00:00:00');
    const dateLabel = _calFmtFullDate(d);
    const canEdit = typeof userCanEditCards === 'function' ? userCanEditCards() : false;

    modal.innerHTML = `
        <div class="cal-day-modal">
            <div class="cal-day-modal-header">
                <span class="cal-day-modal-title">${dateLabel}</span>
                <button class="cal-day-modal-close" onclick="document.getElementById('calDayModal').style.display='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="cal-day-modal-body" id="calDayModalBody"></div>
        </div>`;

    const body = modal.querySelector('#calDayModalBody');
    entries.forEach(e => body.appendChild(_calRenderEventCard(e, canEdit)));

    modal.style.display = 'flex';
}

// ── Fechar dropdowns ao clicar fora ──────────────────────────
document.addEventListener('click', function(e) {
    const vfDd = document.getElementById('calViewFilterDropdown');
    const vfBtn = document.getElementById('calViewFilterBtn');
    if (vfDd && vfDd.style.display === 'block') {
        if (!vfDd.contains(e.target) && e.target !== vfBtn && !vfBtn?.contains(e.target)) {
            vfDd.style.display = 'none';
        }
    }
});
