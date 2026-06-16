// ============================================================
// KANBAN — Módulos com visualização em colunas
// ============================================================

/* global masterLists, activities, audits, trainings, documents,
          currentuser, currentTab, currentHistoryPage,
          saveAll, renderCards, openView, editItem,
          getAllowedSetores, userCanEditCards, formatBR,
          passesFilters, passesFbarMyTasks, normalizeText */

var KANBAN_TABS = ['auditoria', 'treinamentos', 'atividades', 'documentos'];

var kanbanActiveByTab = {
    auditoria: true,
    treinamentos: true,
    atividades: true,
    documentos: true
};

var _kanbanDragItemId = null;

var _KB_MODULES = {
    auditoria:    { prefix: 'Audit', statusKey: 'auditStatus',  colOrderKey: 'kanban_audit_col_order',  sortDateField: 'dataPrevisao',       getItems: () => audits },
    treinamentos: { prefix: 'Train', statusKey: 'trainStatus',  colOrderKey: 'kanban_train_col_order',  sortDateField: 'dataPrevisao',       getItems: () => trainings },
    atividades:   { prefix: 'Ativ',  statusKey: 'ativStatus',   colOrderKey: 'kanban_ativ_col_order',   sortDateField: 'dataConclusao',      getItems: () => activities },
    documentos:   { prefix: 'Doc',   statusKey: 'docStatus',    colOrderKey: 'kanban_doc_col_order',    sortDateField: 'dataProximaRevisao', getItems: () => documents }
};

var _kanbanColorMap = {
    blue: 'var(--c-blue)', green: 'var(--c-green)', red: 'var(--c-red)',
    orange: 'var(--c-orange)', yellow: 'var(--c-yellow)', purple: 'var(--c-purple)',
    default: 'var(--c-default)'
};

function isKanbanActive(tab) {
    tab = tab || (typeof currentTab !== 'undefined' ? currentTab : '');
    return KANBAN_TABS.includes(tab) && !!kanbanActiveByTab[tab];
}

function _kbGetConfig(tab) {
    tab = tab || (typeof currentTab !== 'undefined' ? currentTab : '');
    return _KB_MODULES[tab] || null;
}

function _kbGetStatusList(cfg) {
    if (!cfg || !masterLists) return [];
    return masterLists[cfg.statusKey] ? [...masterLists[cfg.statusKey]] : [];
}

// ---- Utilitários ----

function _kbIsFinalStatus(name) {
    const n = (name || '').toLowerCase();
    return n.includes('conclu') || n.includes('cancel');
}

function _kbGetColOrder(cfg) {
    cfg = cfg || _kbGetConfig();
    if (!cfg) return null;
    return kanbanOrder[cfg.colOrderKey] || null;
}

// Atualiza ordem apenas em memória (usar quando saveAll() será chamado em seguida)
function _kbSetColOrderMemory(order, cfg) {
    cfg = cfg || _kbGetConfig();
    if (!cfg) return;
    kanbanOrder[cfg.colOrderKey] = order;
}

// Atualiza em memória E persiste direto no Firebase (usar quando não há saveAll() subsequente)
function _kbSaveColOrder(order, cfg) {
    cfg = cfg || _kbGetConfig();
    if (!cfg) return;
    kanbanOrder[cfg.colOrderKey] = order;
    _kbPersistOrder();
}

async function _kbPersistOrder() {
    try {
        const database = getFirebaseDatabase();
        const dbRef = getFirebaseRef();
        const dbSet = getFirebaseSet();
        await dbSet(dbRef(database, '/kanbanOrder'), kanbanOrder);
    } catch (error) {
        console.error('Erro ao salvar ordem do kanban:', error);
    }
}

function _kbHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function _kbResolveColor(colorKey) {
    return _kanbanColorMap[colorKey] || _kanbanColorMap.default;
}

// ---- Ordenação de colunas ----

function _kbIsConcluido(name) {
    return (name || '').toLowerCase().includes('conclu');
}

function _kbIsCancelado(name) {
    return (name || '').toLowerCase().includes('cancel');
}

function _kbGetSortedStatuses(cfg) {
    cfg = cfg || _kbGetConfig();
    const all = _kbGetStatusList(cfg);

    const concluidos = all.filter(s =>  _kbIsConcluido(s.name));
    const cancelados = all.filter(s =>  _kbIsCancelado(s.name) && !_kbIsConcluido(s.name));
    const regulars   = all.filter(s => !_kbIsFinalStatus(s.name));

    const savedOrder = _kbGetColOrder(cfg);
    if (savedOrder && savedOrder.length) {
        regulars.sort((a, b) => {
            const ia = savedOrder.indexOf(a.name);
            const ib = savedOrder.indexOf(b.name);
            if (ia === -1 && ib === -1) return 0;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });
    }

    return [...regulars, ...concluidos, ...cancelados];
}

// ---- Toggle de visualização ----

function toggleKanbanView(mode) {
    if (!KANBAN_TABS.includes(currentTab)) return;
    kanbanActiveByTab[currentTab] = (mode === 'kanban');
    // Desativa calendário ao trocar para kanban/lista
    if (typeof calendarActiveByTab !== 'undefined') calendarActiveByTab[currentTab] = false;

    const grid      = document.getElementById('cardsGrid');
    const board     = document.getElementById('kanbanBoard');
    const calBoard  = document.getElementById('calendarBoard');
    const addBtn    = document.getElementById('addBtn');
    const addColRow = document.getElementById('fbarAddcolRow');
    const canEdit   = typeof userCanEditCards === 'function' ? userCanEditCards() : false;
    const kbOn      = isKanbanActive();

    if (calBoard) calBoard.style.display = 'none';

    if (kbOn) {
        if (grid)  grid.style.display  = 'none';
        if (board) board.style.display = 'flex';
        var _lsBarKb = document.getElementById('listSubtabsBar'); if (_lsBarKb) _lsBarKb.style.display = 'none';
        var _tvK = document.getElementById('tableView'); if (_tvK) _tvK.style.display = 'none';
        var _gvK = document.getElementById('groupsView'); if (_gvK) _gvK.style.display = 'none';
        if (addBtn)    addBtn.style.display    = canEdit ? 'flex' : 'none';
        if (addColRow) addColRow.style.display = canEdit ? 'flex' : 'none';
        renderKanban();
    } else {
        if (board) board.style.display = 'none';
        if (grid)  grid.style.display  = (typeof currentListSubtab === 'undefined' || currentListSubtab === 'cards') ? 'grid' : 'none';
        var _lsBarK = document.getElementById('listSubtabsBar'); if (_lsBarK) _lsBarK.style.display = 'flex';
        if (addBtn)    addBtn.style.display    = canEdit ? 'flex' : 'none';
        if (addColRow) addColRow.style.display = 'none';
        renderCards();
    }

    _kbUpdateToggleBtns();
    if (typeof _calUpdateToggleBtns === 'function') _calUpdateToggleBtns();
    if (typeof _populateFbarAdv === 'function') _populateFbarAdv();
}

function _kbUpdateToggleBtns() {
    const btnList   = document.getElementById('btnViewList');
    const btnKanban = document.getElementById('btnViewKanban');
    const kbOn      = isKanbanActive();
    if (btnList)   { btnList.classList.toggle('active', !kbOn);  btnList.classList.toggle('inactive', kbOn); }
    if (btnKanban) { btnKanban.classList.toggle('active',  kbOn); btnKanban.classList.toggle('inactive', !kbOn); }
}

// ---- Filtragem ----

function _kbGetFilteredItems() {
    const cfg = _kbGetConfig();
    if (!cfg) return [];

    let data = (cfg.getItems() || []).filter(item => !item.deleted);

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

    return data;
}

// ---- Renderização principal ----

function renderKanban() {
    const board = document.getElementById('kanbanBoard');
    const cfg   = _kbGetConfig();
    if (!board || !cfg) return;

    const statuses = _kbGetSortedStatuses(cfg);
    const data     = _kbGetFilteredItems();
    const canEdit  = typeof userCanEditCards === 'function' ? userCanEditCards() : false;
    const canManageLists = typeof userCanManageLists === 'function' ? userCanManageLists() : false;
    const dateFld  = cfg.sortDateField;

    board.innerHTML = '';

    if (!statuses.length) {
        board.innerHTML = `
            <div class="kanban-empty-board">
                <i class="fas fa-columns"></i>
                <p>Nenhum status cadastrado.</p>
                <small>Clique em "Adicionar coluna" para começar.</small>
            </div>`;
        return;
    }

    statuses.forEach((status, colIdx) => {
        const isFinal     = _kbIsFinalStatus(status.name);
        const color       = _kbResolveColor(status.color);
        const colItems    = data.filter(i => i.status === status.name)
            .sort((a, b) => {
                const da = a[dateFld] ? new Date(a[dateFld]) : new Date(8640000000000000);
                const db = b[dateFld] ? new Date(b[dateFld]) : new Date(8640000000000000);
                return da - db;
            });
        const isFirst     = colIdx === 0 && !isFinal;
        const nextIsFinal = !isFinal && _kbNextIsFinalOrEnd(statuses, colIdx);

        const col = document.createElement('div');
        col.className = 'kanban-col';
        col.dataset.status = status.name;

        const colKey = `kb_col_collapsed_${currentTab}_${status.name}`;
        const isCollapsed = !!(_userPrefsCache && _userPrefsCache.kanbanCollapsed && _userPrefsCache.kanbanCollapsed[colKey]);
        if (isCollapsed) col.classList.add('kanban-col-collapsed');

        col.innerHTML = `
            <div class="kanban-col-header" style="--col-color:${color}">
                <div class="kanban-col-title-row">
                    <span class="kanban-col-dot" style="background:${color}"></span>
                    <span class="kanban-col-name">${_kbHtml(status.name)}</span>
                    <span class="kanban-col-count">${colItems.length}</span>
                </div>
                <div class="kanban-col-bottom">
                    <div class="kanban-col-ctrl">
                        ${canManageLists ? `
                        ${!isFinal ? `
                            <button class="kanban-ctrl-btn" title="Mover esquerda"
                                onclick="moveKanbanColumn('${_kbHtml(status.name)}', -1)"
                                ${isFirst ? 'disabled' : ''}>
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <button class="kanban-ctrl-btn" title="Mover direita"
                                onclick="moveKanbanColumn('${_kbHtml(status.name)}', 1)"
                                ${nextIsFinal ? 'disabled' : ''}>
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        ` : '<span class="kanban-locked-badge"><i class="fas fa-lock"></i></span>'}
                        <button class="kanban-ctrl-btn" title="Editar coluna" onclick="startKanbanRename('${_kbHtml(status.name)}')">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="kanban-ctrl-btn kanban-ctrl-delete" title="Excluir coluna"
                            onclick="openKanbanDeleteCol('${_kbHtml(status.name)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : (isFinal ? '<span class="kanban-locked-badge"><i class="fas fa-lock"></i></span>' : '')}
                    </div>
                    <button class="kanban-ctrl-btn kanban-collapse-btn" title="Expandir/Recolher"
                        onclick="toggleKanbanCol(this, '${_kbHtml(status.name)}')">
                        <i class="fas fa-chevron-${isCollapsed ? 'down' : 'up'}"></i>
                    </button>
                </div>
            </div>
            <div class="kanban-col-body"
                 ondragover="kbDragOver(event)"
                 ondrop="kbDrop(event,'${_kbHtml(status.name)}')"
                 ondragleave="kbDragLeave(event)">
                <div class="kanban-drop-hint"${colItems.length > 0 ? ' style="display:none"' : ''}><i class="fas fa-inbox"></i><span>Arraste um card aqui</span></div>
                ${colItems.map(i => _kbRenderCard(i)).join('')}
            </div>`;

        board.appendChild(col);
    });

    initKanbanMobileSwipe();
}

function _kbNextIsFinalOrEnd(statuses, colIdx) {
    const next = statuses[colIdx + 1];
    return !next || _kbIsFinalStatus(next.name);
}

// ---- Card ----

function _kbRenderCard(item) {
    const cfg = _kbGetConfig();
    const dateVal = cfg ? (item[cfg.sortDateField] || '') : (item.dataConclusao || '');
    const deadline = _kbDeadlineColor(dateVal, item.flagDias || 3, item.status, item);
    const marcColor = _kbResolveColor(item.marcadorCor || 'default');
    const canEdit   = typeof userCanEditCards === 'function' ? userCanEditCards(item) : false;
    const canDelete = typeof userCanDeleteCards === 'function' ? userCanDeleteCards(item) : false;

    const clList  = item.checklist || [];
    const clTotal = clList.length;
    const clDone  = clList.filter(c => c.checked).length;
    const clPct   = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0;
    const donutHtml = clTotal > 0 && typeof _clDonutHtml === 'function'
        ? _clDonutHtml(clDone, clTotal, clPct, 36, true) : '';

    return `
        <div class="kanban-card"
             draggable="${canEdit}"
             data-id="${item.id}"
             ondragstart="kbDragStart(event,${item.id})"
             ondragend="kbDragEnd(event)"
             onclick="kbCardClick(event,${item.id})">
            <div class="kanban-card-stripe" style="background:${deadline}"></div>
            ${donutHtml}
            <div class="kanban-card-inner">
                <div class="kanban-card-title">${_kbHtml(item.titulo || 'Sem título')}</div>
                <div class="kanban-card-metas">
                    ${item.responsavel ? `<span class="kanban-card-meta"><i class="fas fa-user"></i>${(() => { try { const p = JSON.parse(item.responsavel); if (Array.isArray(p) && p.length > 0) { const n = typeof resolveUserId === 'function' ? resolveUserId(p[0]) : null; const extra = p.length - 1; return `<span class="kb-meta-name">${_kbHtml(n || p[0] || '')}</span>` + (extra > 0 ? `<span class="card-resp-extra">+${extra}</span>` : ''); } } catch(_){} return `<span class="kb-meta-name">${_kbHtml(item.responsavel)}</span>`; })()}</span>` : ''}
                    ${dateVal ? `<span class="kanban-card-meta"><i class="fas fa-calendar-alt"></i>${_kbFormatBR(dateVal)}</span>` : ''}
                    ${item.setor ? `<span class="kanban-card-meta"><i class="fas fa-building"></i>${_kbHtml(item.setor)}</span>` : ''}
                </div>
                <div class="kanban-card-foot">
                    ${item.marcador ? `<span class="kanban-card-tag" style="background:${marcColor}">${_kbHtml(item.marcador)}</span>` : '<span></span>'}
                    <div class="kanban-card-acts" onclick="event.stopPropagation()">
                        ${canEdit ? `<button onclick="kbEditCard(${item.id})" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
                        ${canDelete ? `<button onclick="deleteItem(${item.id},'${currentTab}')" title="Excluir" class="kanban-card-act-del"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
}

function _kbDeadlineColor(dateStr, flagDays, status, item) {
    // Concluído recorrente (train/doc com periodicidade) continua monitorando prazo
    const skipFlag = _kbIsFinalStatus(status) &&
        !(typeof isConcludedRecurring === 'function' && item && isConcludedRecurring(item, currentTab));
    if (skipFlag) return 'var(--ind-green)';
    if (!dateStr) return 'var(--c-default)';
    const today    = new Date(); today.setHours(0,0,0,0);
    const deadline = new Date(dateStr + 'T00:00:00');
    const diff     = Math.ceil((deadline - today) / 86400000);
    if (diff < 0) return 'var(--ind-red)';
    if (diff <= (flagDays || 3)) return 'var(--ind-yellow)';
    return 'var(--ind-green)';
}

function _kbFormatBR(dateStr) {
    if (!dateStr) return '';
    if (typeof formatBR === 'function') return formatBR(dateStr);
    const [y,m,d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// ---- Drag & Drop ----

var _kbEdgeTimer = null;
var _kbEdgeDir   = 0; // -1 esquerda, +1 direita

function _kbClearEdgeTimer() {
    if (_kbEdgeTimer) { clearTimeout(_kbEdgeTimer); _kbEdgeTimer = null; }
    _kbEdgeDir = 0;
    document.querySelectorAll('.kb-edge-indicator').forEach(el => el.remove());
}

function _kbEdgeCheck(clientX) {
    if (!_kbMobile.active || !_kanbanDragItemId) return;
    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const zone = rect.width * 0.15;
    let dir = 0;
    if (clientX < rect.left + zone) dir = -1;
    else if (clientX > rect.right - zone) dir = 1;

    if (dir === 0) { _kbClearEdgeTimer(); return; }
    if (dir === _kbEdgeDir) return; // já aguardando nessa direção

    _kbClearEdgeTimer();
    _kbEdgeDir = dir;
    _kbShowEdgeIndicator(dir, board, rect);
    _kbEdgeTimer = setTimeout(() => {
        const cols = board.querySelectorAll('.kanban-col');
        const next = _kbMobile.currentIdx + dir;
        if (next >= 0 && next < cols.length) {
            _kbMobileShowCol(next, true);
        }
        _kbClearEdgeTimer();
    }, 1000);
}

function _kbShowEdgeIndicator(dir, board, rect) {
    document.querySelectorAll('.kb-edge-indicator').forEach(el => el.remove());
    const ind = document.createElement('div');
    ind.className = 'kb-edge-indicator kb-edge-indicator--' + (dir < 0 ? 'left' : 'right');
    board.style.position = 'relative';
    board.appendChild(ind);
}

function kbDragStart(event, itemId) {
    _kanbanDragItemId = itemId;
    event.dataTransfer.effectAllowed = 'move';
    event.currentTarget.classList.add('kb-dragging');

    if (_kbMobile.active) {
        const board = document.getElementById('kanbanBoard');
        if (board) {
            board._kbDragOverHandler = (e) => _kbEdgeCheck(e.clientX);
            board.addEventListener('dragover', board._kbDragOverHandler);
        }
    }
}

function kbDragEnd(event) {
    _kanbanDragItemId = null;
    event.currentTarget.classList.remove('kb-dragging');
    document.querySelectorAll('.kanban-col-body').forEach(el => el.classList.remove('kb-drag-over'));
    _kbClearEdgeTimer();
    const board = document.getElementById('kanbanBoard');
    if (board && board._kbDragOverHandler) {
        board.removeEventListener('dragover', board._kbDragOverHandler);
        board._kbDragOverHandler = null;
    }
}

function kbDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('kb-drag-over');
}

function kbDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove('kb-drag-over');
    }
}

function kbDrop(event, targetStatus) {
    event.preventDefault();
    event.currentTarget.classList.remove('kb-drag-over');

    if (!_kanbanDragItemId) return;

    const cfg = _kbGetConfig();
    if (!cfg) return;
    const item = (cfg.getItems() || []).find(a => a.id === _kanbanDragItemId);
    if (!item || item.status === targetStatus) return;

    if (/conclu/i.test(targetStatus) && typeof isItemOverdue === 'function' && (currentTab === 'treinamentos' || currentTab === 'documentos') && isItemOverdue(item, currentTab)) {
        showOverdueConcluiModal();
        return;
    }
    if (/conclu/i.test(targetStatus) && !canSetConcluido(item.checklist)) {
        if (typeof showToast === 'function') showToast('Conclua todos os itens do checklist antes de mover para Concluído.', 'error');
        return;
    }
    if (/conclu/i.test(targetStatus) && typeof checkSchedWarnBeforeConcluido === 'function') {
        checkSchedWarnBeforeConcluido(item, currentTab).then(ok => {
            if (!ok) return;
            _kbApplyDrop(item, targetStatus);
        });
        return;
    }

    _kbApplyDrop(item, targetStatus);
}

function _kbApplyDrop(item, targetStatus) {
    const prevStatus = item.status;
    item.status = targetStatus;

    if (!Array.isArray(item.historico)) item.historico = [];
    item.historico.push({
        timestamp: new Date().toISOString(),
        acao: 'Alteração de Status via Kanban',
        usuario: currentuser ? (currentuser.name || currentuser.user) : 'Sistema',
        detalhes: [{ campo: 'Status', de: prevStatus, para: targetStatus }],
        snapshot: _safeSnapshot(item)
    });

    saveAll();
    renderKanban();
}

// ---- Card actions ----

function kbCardClick(event, itemId) {
    if (event.target.closest('button')) return;
    kbViewCard(itemId);
}

function kbViewCard(itemId) {
    if (typeof openView === 'function') {
        currentHistoryPage = 1;
        openView(itemId, currentTab);
    }
}

function kbEditCard(itemId) {
    if (typeof editItem === 'function') editItem(itemId, currentTab);
}

// ---- Editar coluna (nome + cor) ----

function startKanbanRename(statusName) {
    const existing = document.getElementById('kbEditColModal');
    if (existing) existing.remove();

    const cfg       = _kbGetConfig();
    if (!cfg) return;
    const list      = _kbGetStatusList(cfg);
    const statusObj = list.find(s => s.name === statusName) || { name: statusName, color: 'default' };
    const colors    = ['blue','green','red','orange','yellow','purple','default'];
    const colorLabels = { blue:'Azul', green:'Verde', red:'Vermelho', orange:'Laranja', yellow:'Amarelo', purple:'Roxo', default:'Cinza' };

    _kbNewColColor = statusObj.color || 'default';

    const modal = document.createElement('div');
    modal.id = 'kbEditColModal';
    modal.className = 'kb-modal-overlay';

    modal.innerHTML = `
        <div class="kb-modal-box">
            <div class="kb-modal-header">
                <i class="fas fa-pen" style="color:var(--accent)"></i>
                <h3>Editar coluna</h3>
            </div>
            <div class="kb-modal-field">
                <label class="kb-form-label">Nome do status</label>
                <input id="kbEditColName" class="kb-form-input" value="${_kbHtml(statusName)}" maxlength="40">
            </div>
            <div class="kb-modal-field">
                <label class="kb-form-label">Cor</label>
                <div class="kb-color-picker">
                    ${colors.map(c => `
                        <button type="button"
                            class="kb-color-opt ${c === _kbNewColColor ? 'selected' : ''} bg-${c}"
                            title="${colorLabels[c]}"
                            onclick="kbPickColor('${c}',this)"></button>`).join('')}
                </div>
            </div>
            <div class="kb-modal-actions">
                <button class="kb-form-btn-cancel" onclick="document.getElementById('kbEditColModal').remove()">Cancelar</button>
                <button class="kb-form-btn-save" onclick="confirmKanbanEditCol('${_kbHtml(statusName)}')">
                    <i class="fas fa-check"></i> Salvar
                </button>
            </div>
        </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    const input = document.getElementById('kbEditColName');
    if (input) {
        input.focus();
        input.select();
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter')  { e.preventDefault(); confirmKanbanEditCol(statusName); }
            if (e.key === 'Escape') modal.remove();
        });
    }
}

function confirmKanbanEditCol(oldName) {
    const cfg = _kbGetConfig();
    if (!cfg) return;
    const input   = document.getElementById('kbEditColName');
    const newName = (input ? input.value : '').trim();

    if (!newName) { if (input) { input.focus(); input.classList.add('kb-input-error'); } return; }

    const list = masterLists[cfg.statusKey] || [];

    if (newName !== oldName && list.some(s => s.name === newName)) {
        alert('Já existe um status com esse nome.');
        if (input) input.focus();
        return;
    }

    const idx = list.findIndex(s => s.name === oldName);
    if (idx !== -1) {
        list[idx].name  = newName;
        list[idx].color = _kbNewColColor;
    }

    if (newName !== oldName) {
        (cfg.getItems() || []).forEach(a => { if (a.status === oldName) a.status = newName; });
        const list2 = masterLists[cfg.statusKey] || [];
        const order = _kbGetColOrder(cfg) || list2.filter(s => !_kbIsFinalStatus(s.name)).map(s => s.name);
        const oi = order.indexOf(oldName);
        if (oi !== -1) order[oi] = newName;
        _kbSetColOrderMemory(order.filter(n => !_kbIsFinalStatus(n)), cfg);
    }

    const modal = document.getElementById('kbEditColModal');
    if (modal) modal.remove();

    saveAll();
    renderKanban();
}

// ---- Reordenar coluna ----

function moveKanbanColumn(statusName, direction) {
    const cfg = _kbGetConfig();
    if (!cfg) return;
    const statuses = _kbGetSortedStatuses(cfg);
    const regulars = statuses.filter(s => !_kbIsFinalStatus(s.name));
    const idx      = regulars.findIndex(s => s.name === statusName);

    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= regulars.length) return;

    [regulars[idx], regulars[newIdx]] = [regulars[newIdx], regulars[idx]];
    _kbSaveColOrder(regulars.map(s => s.name), cfg);
    renderKanban();
}

// ============================================================
// ADICIONAR COLUNA
// ============================================================

var _kbNewColColor = 'default';

function openKanbanAddCol() {
    const existing = document.getElementById('kbAddColModal');
    if (existing) existing.remove();

    _kbNewColColor = 'default';

    const colors = ['blue','green','red','orange','yellow','purple','default'];
    const colorLabels = { blue:'Azul', green:'Verde', red:'Vermelho', orange:'Laranja', yellow:'Amarelo', purple:'Roxo', default:'Cinza' };

    const modal = document.createElement('div');
    modal.id = 'kbAddColModal';
    modal.className = 'kb-modal-overlay';

    modal.innerHTML = `
        <div class="kb-modal-box">
            <div class="kb-modal-header">
                <i class="fas fa-columns" style="color:var(--accent)"></i>
                <h3>Nova Coluna</h3>
            </div>
            <div class="kb-modal-field">
                <label class="kb-form-label">Nome do status</label>
                <input id="kbNewColName" class="kb-form-input" placeholder="Ex: Em revisão" maxlength="40">
            </div>
            <div class="kb-modal-field">
                <label class="kb-form-label">Cor</label>
                <div class="kb-color-picker">
                    ${colors.map(c => `
                        <button type="button" class="kb-color-opt ${c === 'default' ? 'selected' : ''} bg-${c}"
                            title="${colorLabels[c]}" onclick="kbPickColor('${c}',this)"></button>`).join('')}
                </div>
            </div>
            <div class="kb-modal-actions">
                <button class="kb-form-btn-cancel" onclick="document.getElementById('kbAddColModal').remove()">Cancelar</button>
                <button class="kb-form-btn-save" onclick="confirmKanbanAddCol()">
                    <i class="fas fa-check"></i> Adicionar
                </button>
            </div>
        </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    const input = document.getElementById('kbNewColName');
    if (input) {
        input.focus();
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter')  { e.preventDefault(); confirmKanbanAddCol(); }
            if (e.key === 'Escape') modal.remove();
        });
    }
}

function kbPickColor(colorKey, btn) {
    _kbNewColColor = colorKey;
    document.querySelectorAll('.kb-color-opt').forEach(el => el.classList.remove('selected'));
    btn.classList.add('selected');
    const dot = document.getElementById('kbNewColDot');
    if (dot) dot.style.background = _kbResolveColor(colorKey);
}

function confirmKanbanAddCol() {
    const cfg = _kbGetConfig();
    if (!cfg) return;
    const input = document.getElementById('kbNewColName');
    const name  = (input ? input.value : '').trim();

    if (!name) { if (input) { input.focus(); input.classList.add('kb-input-error'); } return; }

    if (!masterLists[cfg.statusKey]) masterLists[cfg.statusKey] = [];
    const list = masterLists[cfg.statusKey];
    if (list.some(s => s.name === name)) {
        alert('Já existe um status com esse nome.');
        if (input) input.focus();
        return;
    }

    list.push({ name, color: _kbNewColColor });

    const order = _kbGetColOrder(cfg) || list.filter(s => !_kbIsFinalStatus(s.name)).map(s => s.name);
    if (!order.includes(name)) order.push(name);
    _kbSetColOrderMemory(order.filter(n => !_kbIsFinalStatus(n)), cfg);

    const modal = document.getElementById('kbAddColModal');
    if (modal) modal.remove();

    saveAll();
    renderKanban();
}

// ============================================================
// EXCLUIR COLUNA
// ============================================================

var _KB_FALLBACK_STATUS = 'A definir';

function _kbEnsureFallbackStatus(cfg) {
    cfg = cfg || _kbGetConfig();
    if (!cfg) return;
    if (!masterLists[cfg.statusKey]) masterLists[cfg.statusKey] = [];
    const exists = masterLists[cfg.statusKey].some(s => s.name === _KB_FALLBACK_STATUS);
    if (!exists) masterLists[cfg.statusKey].unshift({ name: _KB_FALLBACK_STATUS, color: 'default' });
}

function openKanbanDeleteCol(statusName) {
    const cfg = _kbGetConfig();
    if (!cfg) return;
    const existing = document.getElementById('kbDeleteModal');
    if (existing) existing.remove();

    const cardCount = (cfg.getItems() || []).filter(a => !a.deleted && a.status === statusName).length;

    const modal = document.createElement('div');
    modal.id = 'kbDeleteModal';
    modal.className = 'kb-modal-overlay';

    modal.innerHTML = `
        <div class="kb-modal-box">
            <div class="kb-modal-icon"><i class="fas fa-trash-alt"></i></div>
            <div class="kb-modal-header">
                <h3>Excluir coluna</h3>
            </div>
            <p class="kb-modal-desc">
                Você está excluindo a coluna <strong>${_kbHtml(statusName)}</strong> e removendo este status da lista.
                ${cardCount > 0
                    ? `<br><br><span class="kb-warn"><i class="fas fa-exclamation-triangle"></i>
                       ${cardCount} ${cardCount === 1 ? 'card será movido' : 'cards serão movidos'}
                       para <strong>${_kbHtml(_KB_FALLBACK_STATUS)}</strong>.</span>`
                    : ''}
            </p>
            <div class="kb-modal-actions">
                <button class="confirm-danger-cancel" onclick="document.getElementById('kbDeleteModal').remove()">Cancelar</button>
                <button class="kb-form-btn-delete" onclick="confirmKanbanDeleteCol('${_kbHtml(statusName)}')">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            </div>
        </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

function confirmKanbanDeleteCol(statusName) {
    const cfg = _kbGetConfig();
    if (!cfg) return;
    _kbEnsureFallbackStatus(cfg);

    (cfg.getItems() || []).forEach(a => {
        if (!a.deleted && a.status === statusName) a.status = _KB_FALLBACK_STATUS;
    });

    if (masterLists[cfg.statusKey]) {
        masterLists[cfg.statusKey] = masterLists[cfg.statusKey].filter(s => s.name !== statusName);
    }

    const order = _kbGetColOrder(cfg);
    if (order) _kbSetColOrderMemory(order.filter(n => n !== statusName), cfg);

    const modal = document.getElementById('kbDeleteModal');
    if (modal) modal.remove();

    saveAll();
    renderKanban();
}

function toggleKanbanCol(btn, statusName) {
    const col = btn.closest('.kanban-col');
    if (!col) return;
    const colKey = `kb_col_collapsed_${currentTab}_${statusName}`;
    const collapsed = col.classList.toggle('kanban-col-collapsed');
    if (!_userPrefsCache) _userPrefsCache = {};
    if (!_userPrefsCache.kanbanCollapsed) _userPrefsCache.kanbanCollapsed = {};
    _userPrefsCache.kanbanCollapsed[colKey] = collapsed;
    _persistUserPrefs();
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = collapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
}

// ============================================================
// KANBAN MOBILE — paginação por swipe (uma coluna por vez)
// ============================================================

var _kbMobile = {
    active: false,
    currentIdx: 0,
    touchStartX: 0,
    touchStartY: 0,
    dragging: false
};

function _kbIsMobile() {
    return window.innerWidth <= 768;
}

function initKanbanMobileSwipe() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    _kbMobile.active = _kbIsMobile();
    _kbMobile.currentIdx = 0;

    if (!_kbMobile.active) {
        _kbDestroyMobileDots();
        board.classList.remove('kanban-mobile-paged');
        const cols = board.querySelectorAll('.kanban-col');
        cols.forEach(c => { c.style.transform = ''; c.style.opacity = ''; c.classList.remove('kb-col-active','kb-col-left','kb-col-right'); });
        return;
    }

    board.classList.add('kanban-mobile-paged');
    _kbMobileShowCol(0, false);
    _kbBuildDots();
    _kbTouchAttachCards();

    board.removeEventListener('touchstart', _kbTouchStart, { passive: false });
    board.removeEventListener('touchmove',  _kbTouchMove,  { passive: false });
    board.removeEventListener('touchend',   _kbTouchEnd);
    board.addEventListener('touchstart', _kbTouchStart, { passive: true });
    board.addEventListener('touchmove',  _kbTouchMove,  { passive: false });
    board.addEventListener('touchend',   _kbTouchEnd);
}

function _kbMobileShowCol(idx, animate) {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    const cols = Array.from(board.querySelectorAll('.kanban-col'));
    if (!cols.length) return;
    idx = Math.max(0, Math.min(idx, cols.length - 1));
    _kbMobile.currentIdx = idx;

    cols.forEach((col, i) => {
        col.classList.remove('kb-col-active', 'kb-col-left', 'kb-col-right');
        if (animate) col.classList.add('kb-col-anim');
        else col.classList.remove('kb-col-anim');

        if (i === idx) {
            col.classList.add('kb-col-active');
        } else if (i < idx) {
            col.classList.add('kb-col-left');
        } else {
            col.classList.add('kb-col-right');
        }
    });

    _kbUpdateDots(idx, cols.length);
}

function _kbBuildDots() {
    _kbDestroyMobileDots();
    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    const cols = board.querySelectorAll('.kanban-col');
    if (cols.length <= 1) return;

    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'kb-mobile-dots';
    dotsWrap.id = 'kbMobileDots';
    for (let i = 0; i < cols.length; i++) {
        const dot = document.createElement('span');
        dot.className = 'kb-mobile-dot' + (i === _kbMobile.currentIdx ? ' kb-dot-active' : '');
        dot.addEventListener('click', () => _kbMobileShowCol(i, true));
        dotsWrap.appendChild(dot);
    }
    board.parentNode.insertBefore(dotsWrap, board.nextSibling);
}

function _kbUpdateDots(activeIdx, total) {
    const wrap = document.getElementById('kbMobileDots');
    if (!wrap) return;
    const dots = wrap.querySelectorAll('.kb-mobile-dot');
    dots.forEach((d, i) => d.classList.toggle('kb-dot-active', i === activeIdx));
}

function _kbDestroyMobileDots() {
    const el = document.getElementById('kbMobileDots');
    if (el) el.remove();
}

function _kbTouchStart(e) {
    if (!_kbMobile.active) return;
    if (_kbTouch.active || _kbTouch.longPressTimer) return; // card drag tem prioridade
    const t = e.touches[0];
    _kbMobile.touchStartX = t.clientX;
    _kbMobile.touchStartY = t.clientY;
    _kbMobile.dragging = false;
}

function _kbTouchMove(e) {
    if (!_kbMobile.active) return;
    if (_kbTouch.active || _kbTouch.longPressTimer) return; // card drag tem prioridade
    const t = e.touches[0];
    const dx = t.clientX - _kbMobile.touchStartX;
    const dy = t.clientY - _kbMobile.touchStartY;
    if (!_kbMobile.dragging) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
            _kbMobile.dragging = true;
        } else {
            return;
        }
    }
    e.preventDefault();

    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    const cols = Array.from(board.querySelectorAll('.kanban-col'));
    const idx = _kbMobile.currentIdx;

    cols.forEach((col, i) => {
        col.classList.remove('kb-col-anim');
        let base = (i - idx) * 100;
        col.style.transform = `translateX(calc(${base}% + ${dx}px))`;
        if (i === idx) {
            col.style.opacity = String(Math.max(0.6, 1 - Math.abs(dx) / 300));
        } else if ((i === idx - 1 && dx > 0) || (i === idx + 1 && dx < 0)) {
            col.style.opacity = String(Math.min(1, Math.abs(dx) / 200));
        } else {
            col.style.opacity = '0';
        }
    });
}

function _kbTouchEnd(e) {
    if (!_kbMobile.active || !_kbMobile.dragging) return;
    _kbMobile.dragging = false;

    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    const cols = Array.from(board.querySelectorAll('.kanban-col'));
    cols.forEach(c => { c.style.transform = ''; c.style.opacity = ''; });

    const dx = e.changedTouches[0].clientX - _kbMobile.touchStartX;
    const threshold = 60;
    let next = _kbMobile.currentIdx;
    if (dx < -threshold) next = Math.min(_kbMobile.currentIdx + 1, cols.length - 1);
    else if (dx > threshold) next = Math.max(_kbMobile.currentIdx - 1, 0);

    _kbMobileShowCol(next, true);
}

window.addEventListener('resize', function() {
    const wasMobile = _kbMobile.active;
    const isMobile = _kbIsMobile();
    if (wasMobile !== isMobile) {
        initKanbanMobileSwipe();
    }
});

// ============================================================
// KANBAN MOBILE — long-press para arrastar card entre colunas
// ============================================================

var _kbTouch = {
    longPressTimer: null,
    itemId: null,
    cardEl: null,
    ghostEl: null,
    active: false,       // true após long press confirmar
    startX: 0,
    startY: 0,
    edgeTimer: null,
    edgeDir: 0
};

var KB_LONG_PRESS_MS = 500;
var KB_EDGE_ZONE     = 0.18; // 18% da largura do board
var KB_EDGE_DELAY_MS = 350;

function _kbTouchAttachCards() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    board.querySelectorAll('.kanban-card').forEach(card => {
        // remove listeners antigos para evitar duplicatas
        card.removeEventListener('touchstart', _kbCardTouchStart);
        card.removeEventListener('touchmove',  _kbCardTouchMove);
        card.removeEventListener('touchend',   _kbCardTouchEnd);
        card.removeEventListener('touchcancel',_kbCardTouchCancel);

        if (card.getAttribute('draggable') !== 'true') return;
        card.addEventListener('touchstart',  _kbCardTouchStart,  { passive: false });
        card.addEventListener('touchmove',   _kbCardTouchMove,   { passive: false });
        card.addEventListener('touchend',    _kbCardTouchEnd,    { passive: false });
        card.addEventListener('touchcancel', _kbCardTouchCancel, { passive: true  });
    });
}

function _kbCardTouchStart(e) {
    if (!_kbMobile.active) return;
    if (e.touches.length !== 1) return;

    const card = e.currentTarget;
    const t = e.touches[0];
    _kbTouch.startX = t.clientX;
    _kbTouch.startY = t.clientY;
    _kbTouch.cardEl = card;
    _kbTouch.itemId = parseInt(card.dataset.id, 10);
    _kbTouch.active = false;

    _kbTouch.longPressTimer = setTimeout(() => {
        _kbActivateDrag(card, t.clientX, t.clientY);
    }, KB_LONG_PRESS_MS);
}

function _kbCardTouchMove(e) {
    if (!_kbTouch.cardEl) return;
    const t = e.touches[0];

    if (!_kbTouch.active) {
        // Se mover mais de 8px antes do long press → cancela
        const dx = Math.abs(t.clientX - _kbTouch.startX);
        const dy = Math.abs(t.clientY - _kbTouch.startY);
        if (dx > 8 || dy > 8) _kbCancelDrag();
        return;
    }

    // Drag ativo — previne scroll da página e swipe de coluna
    e.preventDefault();
    e.stopPropagation();

    _kbMoveGhost(t.clientX, t.clientY);
    _kbTouchEdgeCheck(t.clientX);
}

function _kbCardTouchEnd(e) {
    if (!_kbTouch.active) { _kbCancelDrag(); return; }
    e.preventDefault();
    e.stopPropagation();

    const t = e.changedTouches[0];
    _kbTouchDrop(t.clientX, t.clientY);
    _kbCancelDrag();
}

function _kbCardTouchCancel() {
    _kbCancelDrag();
}

function _kbActivateDrag(card, cx, cy) {
    _kbTouch.active = true;

    // Feedback tátil
    if (navigator.vibrate) navigator.vibrate(40);

    card.classList.add('kb-touch-holding');

    // Cria ghost visual
    const ghost = document.createElement('div');
    ghost.className = 'kb-touch-ghost';
    ghost.innerHTML = card.innerHTML;
    ghost.style.width  = card.offsetWidth + 'px';
    document.body.appendChild(ghost);
    _kbTouch.ghostEl = ghost;
    _kbMoveGhost(cx, cy);
}

function _kbMoveGhost(cx, cy) {
    const g = _kbTouch.ghostEl;
    if (!g) return;
    g.style.left = (cx - g.offsetWidth / 2) + 'px';
    g.style.top  = (cy - 30) + 'px';
}

function _kbTouchEdgeCheck(cx) {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const zone = rect.width * KB_EDGE_ZONE;
    let dir = 0;
    if (cx < rect.left + zone) dir = -1;
    else if (cx > rect.right - zone) dir = 1;

    if (dir === 0) { _kbTouchClearEdge(); return; }
    if (dir === _kbTouch.edgeDir) return; // já aguardando

    _kbTouchClearEdge();
    _kbTouch.edgeDir = dir;

    _kbTouch.edgeTimer = setTimeout(() => {
        const cols = board.querySelectorAll('.kanban-col');
        const next = _kbMobile.currentIdx + dir;
        if (next >= 0 && next < cols.length) {
            _kbMobileShowCol(next, true);
            // Pequena vibração ao trocar de coluna
            if (navigator.vibrate) navigator.vibrate(20);
        }
        _kbTouch.edgeDir = 0;
        _kbTouch.edgeTimer = null;
    }, KB_EDGE_DELAY_MS);
}

function _kbTouchClearEdge() {
    if (_kbTouch.edgeTimer) { clearTimeout(_kbTouch.edgeTimer); _kbTouch.edgeTimer = null; }
    _kbTouch.edgeDir = 0;
}

function _kbTouchDrop(cx, cy) {
    if (!_kbTouch.itemId) return;

    // A coluna atual é sempre a ativa
    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    const activeCol = board.querySelector('.kanban-col.kb-col-active');
    if (!activeCol) return;

    const targetStatus = activeCol.dataset.status;
    if (!targetStatus) return;

    const cfg = _kbGetConfig();
    if (!cfg) return;
    const item = (cfg.getItems() || []).find(a => a.id === _kbTouch.itemId);
    if (!item) return;

    // Não move se já está nessa coluna
    if (item.status === targetStatus) return;

    // Reutiliza a lógica de validação e persistência do kbDrop
    if (/conclu/i.test(targetStatus) && typeof isItemOverdue === 'function' &&
        (currentTab === 'treinamentos' || currentTab === 'documentos') && isItemOverdue(item, currentTab)) {
        showOverdueConcluiModal();
        return;
    }
    if (/conclu/i.test(targetStatus) && !canSetConcluido(item.checklist)) {
        if (typeof showToast === 'function') showToast('Conclua todos os itens do checklist antes de mover para Concluído.', 'error');
        return;
    }
    if (/conclu/i.test(targetStatus) && typeof checkSchedWarnBeforeConcluido === 'function') {
        checkSchedWarnBeforeConcluido(item, currentTab).then(ok => { if (ok) _kbApplyDrop(item, targetStatus); });
        return;
    }
    _kbApplyDrop(item, targetStatus);
}

function _kbCancelDrag() {
    if (_kbTouch.longPressTimer) { clearTimeout(_kbTouch.longPressTimer); _kbTouch.longPressTimer = null; }
    _kbTouchClearEdge();

    if (_kbTouch.cardEl) _kbTouch.cardEl.classList.remove('kb-touch-holding');
    if (_kbTouch.ghostEl) { _kbTouch.ghostEl.remove(); _kbTouch.ghostEl = null; }

    _kbTouch.active = false;
    _kbTouch.itemId = null;
    _kbTouch.cardEl = null;
}
