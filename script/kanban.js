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
    try { return JSON.parse(localStorage.getItem(cfg.colOrderKey) || 'null'); } catch { return null; }
}

function _kbSaveColOrder(order, cfg) {
    cfg = cfg || _kbGetConfig();
    if (!cfg) return;
    try { localStorage.setItem(cfg.colOrderKey, JSON.stringify(order)); } catch {}
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

    const grid      = document.getElementById('cardsGrid');
    const board     = document.getElementById('kanbanBoard');
    const addBtn    = document.getElementById('addBtn');
    const addColRow = document.getElementById('fbarAddcolRow');
    const canEdit   = typeof userCanEditCards === 'function' ? userCanEditCards() : false;
    const kbOn      = isKanbanActive();

    if (kbOn) {
        if (grid)  grid.style.display  = 'none';
        if (board) board.style.display = 'flex';
        if (addBtn)    addBtn.style.display    = canEdit ? 'flex' : 'none';
        if (addColRow) addColRow.style.display = canEdit ? 'flex' : 'none';
        renderKanban();
    } else {
        if (board) board.style.display = 'none';
        if (grid)  grid.style.display  = 'grid';
        if (addBtn)    addBtn.style.display    = canEdit ? 'flex' : 'none';
        if (addColRow) addColRow.style.display = 'none';
        renderCards();
    }

    _kbUpdateToggleBtns();
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
        const isCollapsed = localStorage.getItem(colKey) === '1';
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
                        ${canEdit ? `
                        <button class="kanban-ctrl-btn kanban-ctrl-delete" title="Excluir coluna"
                            onclick="openKanbanDeleteCol('${_kbHtml(status.name)}')">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
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
    const canEdit   = typeof userCanEditCards === 'function' ? userCanEditCards() : false;

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
                    ${item.responsavel ? `<span class="kanban-card-meta"><i class="fas fa-user"></i>${_kbHtml(item.responsavel)}</span>` : ''}
                    ${dateVal ? `<span class="kanban-card-meta"><i class="fas fa-calendar-alt"></i>${_kbFormatBR(dateVal)}</span>` : ''}
                    ${item.setor ? `<span class="kanban-card-meta"><i class="fas fa-building"></i>${_kbHtml(item.setor)}</span>` : ''}
                </div>
                <div class="kanban-card-foot">
                    ${item.marcador ? `<span class="kanban-card-tag" style="background:${marcColor}">${_kbHtml(item.marcador)}</span>` : '<span></span>'}
                    <div class="kanban-card-acts" onclick="event.stopPropagation()">
                        ${canEdit ? `<button onclick="kbEditCard(${item.id})" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
                        <button onclick="kbViewCard(${item.id})" title="Visualizar"><i class="fas fa-eye"></i></button>
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

function kbDragStart(event, itemId) {
    _kanbanDragItemId = itemId;
    event.dataTransfer.effectAllowed = 'move';
    event.currentTarget.classList.add('kb-dragging');
}

function kbDragEnd(event) {
    _kanbanDragItemId = null;
    event.currentTarget.classList.remove('kb-dragging');
    document.querySelectorAll('.kanban-col-body').forEach(el => el.classList.remove('kb-drag-over'));
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

    if (/conclu/i.test(targetStatus) && !canSetConcluido(item.checklist)) {
        if (typeof showToast === 'function') showToast('Conclua todos os itens do checklist antes de mover para Concluído.', 'error');
        return;
    }

    const snapshot = JSON.parse(JSON.stringify(item));
    item.status = targetStatus;

    if (!Array.isArray(item.historico)) item.historico = [];
    item.historico.push({
        timestamp: new Date().toISOString(),
        acao: 'Alteração de Status via Kanban',
        usuario: currentuser ? (currentuser.name || currentuser.user) : 'Sistema',
        detalhes: [{ campo: 'Status', de: snapshot.status, para: targetStatus }],
        snapshot
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
        const order = _kbGetColOrder(cfg);
        if (order) {
            const oi = order.indexOf(oldName);
            if (oi !== -1) { order[oi] = newName; _kbSaveColOrder(order, cfg); }
        }
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
    _kbSaveColOrder(order.filter(n => !_kbIsFinalStatus(n)), cfg);

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
            <div class="kb-modal-header">
                <i class="fas fa-trash" style="color:var(--c-red)"></i>
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
                <button class="kb-form-btn-cancel" onclick="document.getElementById('kbDeleteModal').remove()">Cancelar</button>
                <button class="kb-form-btn-delete" onclick="confirmKanbanDeleteCol('${_kbHtml(statusName)}')">
                    <i class="fas fa-trash"></i> Excluir
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
    if (order) _kbSaveColOrder(order.filter(n => n !== statusName), cfg);

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
    localStorage.setItem(colKey, collapsed ? '1' : '0');
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = collapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
}
