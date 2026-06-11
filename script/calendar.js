// ============================================================
// CALENDAR — Visualização de calendário (mensal/semanal)
// ============================================================

/* global masterLists, activities, audits, trainings, documents,
          currentuser, currentTab, openView, openPublicacaoModal,
          passesFilters, passesFbarMyTasks, normalizeText,
          getAllowedSetores, formatBR */

// ── Estado ──────────────────────────────────────────────────
var calendarActiveByTab = {
    auditoria: false,
    treinamentos: false,
    atividades: false,
    documentos: false
};

var calViewMode   = 'monthly';   // 'monthly' | 'weekly'
var calViewYear   = new Date().getFullYear();
var calViewMonth  = new Date().getMonth(); // 0-11
var calViewWeek   = _calGetWeekStart(new Date()); // Date (Monday)

// Filtro "Visualização": quais tipos mostrar
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
    const day = d.getDay(); // 0=Dom
    const diff = (day === 0) ? -6 : 1 - day; // ajusta para segunda-feira
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
}

function _calDateStr(d) {
    // YYYY-MM-DD
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

// ── Verifica se calendário está ativo nesta aba ──────────────
function isCalendarActive(tab) {
    tab = tab || (typeof currentTab !== 'undefined' ? currentTab : '');
    return !!(calendarActiveByTab[tab]);
}

// ── Alterna para aba Calendário ──────────────────────────────
function toggleCalendarView(mode) {
    if (!_CAL_MODULES[currentTab]) return;

    const kanbanWasActive = (typeof isKanbanActive === 'function') && isKanbanActive();

    // Desativa kanban nesta aba
    if (typeof kanbanActiveByTab !== 'undefined') {
        kanbanActiveByTab[currentTab] = false;
    }

    if (mode === 'calendar') {
        calendarActiveByTab[currentTab] = true;
    } else {
        calendarActiveByTab[currentTab] = false;
    }

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
        // Volta ao modo lista
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

// ── Geração de ocorrências de rotina para um range de datas ─
function _calGetRotinaOccurrences(item, dateField, rangeStart, rangeEnd) {
    // Retorna array de date strings (YYYY-MM-DD) que caem no range
    const baseStr = item[dateField];
    if (!baseStr) return [];

    const rotina = item.rotina || 'pontual';
    const base = new Date(baseStr + 'T00:00:00');

    if (rotina === 'pontual') {
        // só a data prevista
        if (base >= rangeStart && base <= rangeEnd) return [baseStr];
        return [];
    }

    const freq = Number(item.frequencia) || 1;
    const days = Array.isArray(item.diasSemana) ? item.diasSemana : [];
    const results = [];

    // Gera ocorrências dentro do range, indo para frente e para trás a partir de base
    // Para frente: a partir de base, avança até ultrapassar rangeEnd
    let cur = new Date(base);
    // Ajusta para não ir muito atrás: começa 2 anos antes do rangeStart no máximo
    const safeStart = new Date(rangeStart);
    safeStart.setFullYear(safeStart.getFullYear() - 2);

    // Vai para trás até antes de safeStart
    while (cur > safeStart) {
        if (rotina === 'anual') { cur = new Date(cur); cur.setFullYear(cur.getFullYear() - freq); }
        else if (rotina === 'mensal') { cur = new Date(cur); cur.setMonth(cur.getMonth() - freq); }
        else if (rotina === 'semanal') { cur = new Date(cur); cur.setDate(cur.getDate() - freq * 7); }
        else if (rotina === 'diasemana') {
            // Para diasemana, as ocorrências são cada dia da semana no range
            break; // tratamento especial abaixo
        }
        else break;
    }
    // Avança de cur até rangeEnd
    if (rotina === 'diasemana') {
        // Itera cada dia do range e verifica se é um dia configurado
        const d = new Date(rangeStart);
        while (d <= rangeEnd) {
            if (days.includes(d.getDay())) {
                results.push(_calDateStr(d));
            }
            d.setDate(d.getDate() + 1);
        }
        return results;
    }

    // Para anual/mensal/semanal
    while (cur <= rangeEnd) {
        if (cur >= rangeStart) {
            results.push(_calDateStr(cur));
        }
        if (rotina === 'anual') { cur = new Date(cur); cur.setFullYear(cur.getFullYear() + freq); }
        else if (rotina === 'mensal') { cur = new Date(cur); cur.setMonth(cur.getMonth() + freq); }
        else if (rotina === 'semanal') { cur = new Date(cur); cur.setDate(cur.getDate() + freq * 7); }
        else break;
    }

    return results;
}

// ── Gera mapa dia → itens (para módulos de tarefa) ──────────
function _calBuildDayMap(rangeStart, rangeEnd) {
    const tab = currentTab;
    const cfg = _CAL_MODULES[tab];
    if (!cfg) return {};

    let data = (cfg.getItems() || []).filter(i => !i.deleted);

    // Filtro de setores
    const allowedSetores = (typeof getAllowedSetores === 'function') ? getAllowedSetores() : null;
    if (allowedSetores !== null) data = data.filter(i => allowedSetores.includes(i.setor));

    // Filtros do kanban/fbar
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

    const map = {}; // dateStr → [{item, type:'tarefa'|'publicacao', pub?}]

    data.forEach(item => {
        if (calViewFilter === 'publicacoes') return; // só pubs, não tarefas

        // Ocorrências de rotina
        const occurrences = _calGetRotinaOccurrences(item, cfg.dateField, rangeStart, rangeEnd);
        occurrences.forEach(ds => {
            if (!map[ds]) map[ds] = [];
            map[ds].push({ item, type: 'tarefa' });
        });
    });

    // Publicações realizadas e previstas (para qualquer módulo que tenha rotina)
    if (calViewFilter !== 'tarefas') {
        data.forEach(item => {
            // Publicações realizadas
            const pubs = item.publicacoes || [];
            pubs.forEach(pub => {
                if (!pub.data) return;
                const d = new Date(pub.data + 'T00:00:00');
                if (d >= rangeStart && d <= rangeEnd) {
                    const ds = pub.data;
                    if (!map[ds]) map[ds] = [];
                    map[ds].push({ item, type: 'publicacao', pub, realizada: true });
                }
            });

            // Publicações previstas (próxima data calculada pela rotina)
            if (item.rotina && item.rotina !== 'pontual') {
                const pubDateField = tab === 'documentos' ? 'dataProximaRevisao' : 'dataPrevisao';
                const nextStr = item[pubDateField];
                if (nextStr) {
                    const d = new Date(nextStr + 'T00:00:00');
                    if (d >= rangeStart && d <= rangeEnd) {
                        if (!map[nextStr]) map[nextStr] = [];
                        // Não duplicar se já foi adicionada como realizada nessa data
                        const alreadyPub = (map[nextStr] || []).some(e => e.item.id === item.id && e.type === 'publicacao' && e.realizada && e.pub && e.pub.data === nextStr);
                        if (!alreadyPub) {
                            map[nextStr].push({ item, type: 'publicacao', pub: null, realizada: false });
                        }
                    }
                }
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

    // Header de controles
    board.appendChild(_calBuildHeader());

    // Grade
    const grade = document.createElement('div');
    grade.id = 'calendarGrade';
    board.appendChild(grade);

    _calRenderGrade();
}

function _calRenderGrade() {
    const grade = document.getElementById('calendarGrade');
    if (!grade) return;

    if (calViewMode === 'monthly') {
        _calRenderMonthly(grade);
    } else {
        _calRenderWeekly(grade);
    }
}

// ── Header ───────────────────────────────────────────────────
function _calBuildHeader() {
    const wrap = document.createElement('div');
    wrap.className = 'cal-header';

    // Navegação + título
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

    // Controles direita: filtro Visualização + tipo (mensal/semanal)
    const ctrlArea = document.createElement('div');
    ctrlArea.className = 'cal-ctrl-area';

    // Filtro Visualização (tarefas / publicações)
    ctrlArea.appendChild(_calBuildViewFilter());

    // Toggle mensal/semanal
    ctrlArea.appendChild(_calBuildModeToggle());

    wrap.appendChild(navArea);
    wrap.appendChild(ctrlArea);
    return wrap;
}

function _calGetNavTitle() {
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    if (calViewMode === 'monthly') {
        return `${months[calViewMonth]} ${calViewYear}`;
    } else {
        const end = new Date(calViewWeek);
        end.setDate(end.getDate() + 6);
        const sm = months[calViewWeek.getMonth()];
        const em = months[end.getMonth()];
        if (sm === em) {
            return `${calViewWeek.getDate()} – ${end.getDate()} de ${sm} ${end.getFullYear()}`;
        }
        return `${calViewWeek.getDate()} ${sm} – ${end.getDate()} ${em} ${end.getFullYear()}`;
    }
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
        { val: 'tarefas',    label: 'Tarefas', desc: 'Visualiza as tarefas na agenda' },
        { val: 'publicacoes',label: 'Publicações', desc: 'Visualiza as publicações na agenda' },
        { val: 'ambos',      label: 'Ambos', desc: 'Tarefas e publicações' }
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
    // Atualiza título sem recriar header
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

    const grid = document.createElement('div');
    grid.className = 'cal-monthly-grid';

    // Cabeçalho dias da semana
    const weekDays = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    weekDays.forEach(d => {
        const th = document.createElement('div');
        th.className = 'cal-weekday-header';
        th.textContent = d;
        grid.appendChild(th);
    });

    // Primeira linha: qual dia da semana cai no dia 1?
    let startDow = rangeStart.getDay(); // 0=Dom
    startDow = (startDow === 0) ? 6 : startDow - 1; // Converte para Seg=0

    // Dias do mês anterior (preenchimento)
    for (let i = 0; i < startDow; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day-cell cal-day-other-month';
        grid.appendChild(cell);
    }

    // Dias do mês
    const daysInMonth = rangeEnd.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(calViewYear, calViewMonth, d);
        const dateStr = _calDateStr(dateObj);
        const isToday = (dateObj.getTime() === today.getTime());
        const entries = map[dateStr] || [];

        const cell = document.createElement('div');
        cell.className = 'cal-day-cell' + (isToday ? ' cal-day-today' : '');
        cell.dataset.date = dateStr;

        const dayNum = document.createElement('span');
        dayNum.className = 'cal-day-num';
        dayNum.textContent = d;
        cell.appendChild(dayNum);

        if (entries.length > 0) {
            const evtsWrap = document.createElement('div');
            evtsWrap.className = 'cal-events-wrap';

            const maxShow = 3;
            const shown = entries.slice(0, maxShow);
            shown.forEach(e => {
                evtsWrap.appendChild(_calRenderEventChip(e));
            });
            if (entries.length > maxShow) {
                const more = document.createElement('button');
                more.className = 'cal-more-btn';
                more.textContent = `+${entries.length - maxShow} mais`;
                more.onclick = (ev) => { ev.stopPropagation(); _calOpenDayModal(dateStr, entries); };
                evtsWrap.appendChild(more);
            }
            cell.appendChild(evtsWrap);
        }

        // Clique na célula vazia abre modal do dia se houver itens
        if (entries.length > 0) {
            cell.onclick = () => _calOpenDayModal(dateStr, entries);
            cell.style.cursor = 'pointer';
        }

        grid.appendChild(cell);
    }

    // Preenche dias após o mês para completar a última linha
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

        const colHeader = document.createElement('div');
        colHeader.className = 'cal-week-col-header';
        colHeader.innerHTML = `<span class="cal-wk-dayname">${weekDayNames[i]}</span><span class="cal-wk-daynum${isToday ? ' cal-wk-today-num' : ''}">${dateObj.getDate()}</span>`;
        col.appendChild(colHeader);

        const evtsWrap = document.createElement('div');
        evtsWrap.className = 'cal-week-events';

        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'cal-week-empty';
            evtsWrap.appendChild(empty);
        } else {
            entries.forEach(e => {
                const chip = _calRenderEventCard(e);
                evtsWrap.appendChild(chip);
            });
        }

        col.appendChild(evtsWrap);
        grid.appendChild(col);
    }

    container.innerHTML = '';
    container.appendChild(grid);
}

// ── Chip de evento (mensal) ──────────────────────────────────
function _calRenderEventChip(entry) {
    const { item, type, pub, realizada } = entry;
    const chip = document.createElement('button');
    chip.className = 'cal-event-chip';

    const statusColor = _calGetStatusColor(item);
    chip.style.setProperty('--evt-color', statusColor);

    if (type === 'publicacao') {
        chip.classList.add(realizada ? 'cal-evt-pub-done' : 'cal-evt-pub-pending');
        chip.innerHTML = `<i class="fas fa-${realizada ? 'check-circle' : 'clock'}"></i> ${_calEsc(item.titulo)}`;
        chip.onclick = (e) => { e.stopPropagation(); _calOpenPubEntry(item, pub); };
    } else {
        chip.classList.add('cal-evt-tarefa');
        chip.innerHTML = `<span class="cal-evt-dot" style="background:${statusColor}"></span>${_calEsc(item.titulo)}`;
        chip.onclick = (e) => { e.stopPropagation(); _calOpenItem(item); };
    }

    return chip;
}

// ── Card de evento (semanal) ──────────────────────────────────
function _calRenderEventCard(entry) {
    const { item, type, pub, realizada } = entry;
    const card = document.createElement('button');
    card.className = 'cal-event-card';

    const statusColor = _calGetStatusColor(item);
    card.style.setProperty('--evt-color', statusColor);

    const statusName = item.status || '';
    const resp = item.responsavelTecnico || item.responsavel || '';

    if (type === 'publicacao') {
        card.classList.add(realizada ? 'cal-evt-pub-done' : 'cal-evt-pub-pending');
        card.innerHTML = `
            <div class="cal-ecard-top">
                <i class="fas fa-${realizada ? 'check-circle' : 'clock'}" style="color:${realizada ? 'var(--c-green)' : 'var(--c-orange)'}"></i>
                <span class="cal-ecard-type">${realizada ? 'Publicação' : 'Previsto'}</span>
            </div>
            <div class="cal-ecard-title">${_calEsc(item.titulo)}</div>
            ${resp ? `<div class="cal-ecard-resp"><i class="fas fa-user" style="font-size:10px;"></i> ${_calEsc(resp)}</div>` : ''}`;
        card.onclick = () => _calOpenPubEntry(item, pub);
    } else {
        card.classList.add('cal-evt-tarefa');
        card.innerHTML = `
            <div class="cal-ecard-top">
                <span class="cal-evt-dot" style="background:${statusColor}; flex-shrink:0;"></span>
                <span class="cal-ecard-status">${_calEsc(statusName)}</span>
            </div>
            <div class="cal-ecard-title">${_calEsc(item.titulo)}</div>
            ${resp ? `<div class="cal-ecard-resp"><i class="fas fa-user" style="font-size:10px;"></i> ${_calEsc(resp)}</div>` : ''}`;
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

function _calOpenPubEntry(item, pub) {
    // Se pub === null (previsto), abre modal de nova publicação para o card
    if (typeof openView === 'function') {
        openView(item.id, currentTab);
        // Após abrir o view, ativa a aba de publicações
        setTimeout(() => {
            const pubTabBtn = document.querySelector('.view-modal-tab[data-tab="publicacoes"], .view-modal-tab[onclick*="publicacoes"]');
            if (pubTabBtn) pubTabBtn.click();
        }, 150);
    }
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
    entries.forEach(e => {
        body.appendChild(_calRenderEventCard(e));
    });

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
