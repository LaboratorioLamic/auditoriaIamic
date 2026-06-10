// ============================================================
// KANBAN — Gestão de Atividades
// ============================================================

/* global masterLists, activities, currentuser, currentHistoryPage,
          saveAll, renderCards, openView, editItem,
          getAllowedSetores, userCanEditCards, formatBR */

var kanbanActive = false;
var _kanbanDragItemId = null;

var _kanbanColorMap = {
    blue: 'var(--c-blue)', green: 'var(--c-green)', red: 'var(--c-red)',
    orange: 'var(--c-orange)', yellow: 'var(--c-yellow)', purple: 'var(--c-purple)',
    default: 'var(--c-default)'
};

// ---- Utilitários ----

function _kbIsFinalStatus(name) {
    const n = (name || '').toLowerCase();
    return n.includes('conclu') || n.includes('cancel');
}

function _kbGetColOrder() {
    try { return JSON.parse(localStorage.getItem('kanban_ativ_col_order') || 'null'); } catch { return null; }
}

function _kbSaveColOrder(order) {
    try { localStorage.setItem('kanban_ativ_col_order', JSON.stringify(order)); } catch {}
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

function _kbGetSortedStatuses() {
    const all = (masterLists && masterLists.ativStatus) ? [...masterLists.ativStatus] : [];

    // Separar em três grupos: regulares, concluídos, cancelados
    const concluidos = all.filter(s =>  _kbIsConcluido(s.name));
    const cancelados = all.filter(s =>  _kbIsCancelado(s.name) && !_kbIsConcluido(s.name));
    const regulars   = all.filter(s => !_kbIsFinalStatus(s.name));

    const savedOrder = _kbGetColOrder();
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

    // Ordem: regulares → concluídos → cancelados
    return [...regulars, ...concluidos, ...cancelados];
}

// ---- Toggle de visualização ----

function toggleKanbanView(mode) {
    kanbanActive = (mode === 'kanban');

    const grid     = document.getElementById('cardsGrid');
    const board    = document.getElementById('kanbanBoard');
    const addBtn   = document.getElementById('addBtn');
    const addColBtn= document.getElementById('addColBtn');
    const canEdit  = typeof userCanEditCards === 'function' ? userCanEditCards() : false;

    if (kanbanActive) {
        if (grid)  grid.style.display  = 'none';
        if (board) board.style.display = 'flex';
        if (addBtn)    addBtn.style.display    = 'none';
        if (addColBtn) addColBtn.style.display = canEdit ? 'flex' : 'none';
        renderKanban();
    } else {
        if (board) board.style.display = 'none';
        if (grid)  grid.style.display  = 'grid';
        if (addBtn)    addBtn.style.display    = canEdit ? 'flex' : 'none';
        if (addColBtn) addColBtn.style.display = 'none';
        renderCards();
    }

    _kbUpdateToggleBtns();
}

function _kbUpdateToggleBtns() {
    const btnList   = document.getElementById('btnViewList');
    const btnKanban = document.getElementById('btnViewKanban');
    if (btnList)   { btnList.classList.toggle('active', !kanbanActive);  btnList.classList.toggle('inactive', kanbanActive); }
    if (btnKanban) { btnKanban.classList.toggle('active',  kanbanActive); btnKanban.classList.toggle('inactive', !kanbanActive); }
}

// ---- Filtragem ----

function _kbGetFilteredItems() {
    let data = (activities || []).filter(item => !item.deleted);

    const allowedSetores = (typeof getAllowedSetores === 'function') ? getAllowedSetores() : null;
    if (allowedSetores !== null) data = data.filter(i => allowedSetores.includes(i.setor));

    const val = (id) => (document.getElementById(id) || {}).value || '';

    const setor      = val('fAtivSetor');
    const cat        = val('fAtivCat');
    const stat       = val('fAtivStatus');
    const marcador   = val('fAtivMarcador');
    const responsavel = val('fAtivResponsavel');
    const revisor    = val('fAtivRevisor');
    const showOK     = (document.getElementById('showFinalizedCheckbox') || {}).checked !== false;

    // Filtro de título
    const titleInput = (document.getElementById('titleSearchInput') || {}).value || '';

    data = data.filter(item => {
        if (setor    && item.setor      !== setor)    return false;
        if (cat      && item.categoria  !== cat)      return false;
        if (stat     && item.status     !== stat)     return false;
        if (marcador && item.marcador   !== marcador) return false;
        if (revisor  && item.revisor    !== revisor)  return false;
        if (responsavel) {
            const r = (item.responsavel || '').toLowerCase();
            if (!r.includes(responsavel.toLowerCase())) return false;
        }
        if (titleInput) {
            const t = (item.titulo || '').toLowerCase();
            if (!t.includes(titleInput.toLowerCase())) return false;
        }
        if (!showOK && _kbIsFinalStatus(item.status)) return false;
        return true;
    });

    return data;
}

// ---- Renderização principal ----

function renderKanban() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    const statuses = _kbGetSortedStatuses();
    const data     = _kbGetFilteredItems();
    const canEdit  = typeof userCanEditCards === 'function' ? userCanEditCards() : false;

    board.innerHTML = '';

    if (!statuses.length) {
        board.innerHTML = `
            <div class="kanban-empty-board">
                <i class="fas fa-columns"></i>
                <p>Nenhum status cadastrado.</p>
                <small>Clique em "+ Nova Coluna" para começar.</small>
            </div>`;
        return;
    }

    statuses.forEach((status, colIdx) => {
        const isFinal     = _kbIsFinalStatus(status.name);
        const color       = _kbResolveColor(status.color);
        const colItems    = data.filter(i => i.status === status.name)
            .sort((a, b) => {
                const da = a.dataConclusao ? new Date(a.dataConclusao) : new Date(8640000000000000);
                const db = b.dataConclusao ? new Date(b.dataConclusao) : new Date(8640000000000000);
                return da - db;
            });
        const isFirst     = colIdx === 0 && !isFinal;
        const nextIsFinal = !isFinal && _kbNextIsFinalOrEnd(statuses, colIdx);

        const col = document.createElement('div');
        col.className = 'kanban-col';
        col.dataset.status = status.name;

        const colKey = 'kb_col_collapsed_' + status.name;
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
    const deadline = _kbDeadlineColor(item.dataConclusao, item.flagDias || 3, item.status);
    const marcColor = _kbResolveColor(item.marcadorCor || 'default');
    const canEdit   = typeof userCanEditCards === 'function' ? userCanEditCards() : false;

    return `
        <div class="kanban-card"
             draggable="${canEdit}"
             data-id="${item.id}"
             ondragstart="kbDragStart(event,${item.id})"
             ondragend="kbDragEnd(event)"
             onclick="kbCardClick(event,${item.id})">
            <div class="kanban-card-stripe" style="background:${deadline}"></div>
            <div class="kanban-card-inner">
                <div class="kanban-card-title">${_kbHtml(item.titulo || 'Sem título')}</div>
                <div class="kanban-card-metas">
                    ${item.responsavel ? `<span class="kanban-card-meta"><i class="fas fa-user"></i>${_kbHtml(item.responsavel)}</span>` : ''}
                    ${item.dataConclusao ? `<span class="kanban-card-meta"><i class="fas fa-calendar-alt"></i>${_kbFormatBR(item.dataConclusao)}</span>` : ''}
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

function _kbDeadlineColor(dateStr, flagDays, status) {
    if (_kbIsFinalStatus(status)) return 'var(--ind-green)';
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

    const item = (activities || []).find(a => a.id === _kanbanDragItemId);
    if (!item || item.status === targetStatus) return;

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
        openView(itemId, 'atividades');
    }
}

function kbEditCard(itemId) {
    if (typeof editItem === 'function') editItem(itemId, 'atividades');
}

// ---- Editar coluna (nome + cor) ----

function startKanbanRename(statusName) {
    const existing = document.getElementById('kbEditColModal');
    if (existing) existing.remove();

    const list      = masterLists.ativStatus || [];
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
    const input   = document.getElementById('kbEditColName');
    const newName = (input ? input.value : '').trim();

    if (!newName) { if (input) { input.focus(); input.classList.add('kb-input-error'); } return; }

    const list = masterLists.ativStatus || [];

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
        (activities || []).forEach(a => { if (a.status === oldName) a.status = newName; });
        const order = _kbGetColOrder();
        if (order) {
            const oi = order.indexOf(oldName);
            if (oi !== -1) { order[oi] = newName; _kbSaveColOrder(order); }
        }
    }

    const modal = document.getElementById('kbEditColModal');
    if (modal) modal.remove();

    saveAll();
    renderKanban();
}

// ---- Reordenar coluna ----

function moveKanbanColumn(statusName, direction) {
    const statuses = _kbGetSortedStatuses();
    const regulars = statuses.filter(s => !_kbIsFinalStatus(s.name));
    const idx      = regulars.findIndex(s => s.name === statusName);

    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= regulars.length) return;

    [regulars[idx], regulars[newIdx]] = [regulars[newIdx], regulars[idx]];
    _kbSaveColOrder(regulars.map(s => s.name));
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
    const input = document.getElementById('kbNewColName');
    const name  = (input ? input.value : '').trim();

    if (!name) { if (input) { input.focus(); input.classList.add('kb-input-error'); } return; }

    const list = masterLists.ativStatus || (masterLists.ativStatus = []);
    if (list.some(s => s.name === name)) {
        alert('Já existe um status com esse nome.');
        if (input) input.focus();
        return;
    }

    list.push({ name, color: _kbNewColColor });

    const order = _kbGetColOrder() || list.filter(s => !_kbIsFinalStatus(s.name)).map(s => s.name);
    if (!order.includes(name)) order.push(name);
    _kbSaveColOrder(order.filter(n => !_kbIsFinalStatus(n)));

    const modal = document.getElementById('kbAddColModal');
    if (modal) modal.remove();

    saveAll();
    renderKanban();
}

// ============================================================
// EXCLUIR COLUNA
// ============================================================

var _KB_FALLBACK_STATUS = 'A definir';

function _kbEnsureFallbackStatus() {
    if (!masterLists.ativStatus) masterLists.ativStatus = [];
    const exists = masterLists.ativStatus.some(s => s.name === _KB_FALLBACK_STATUS);
    if (!exists) masterLists.ativStatus.unshift({ name: _KB_FALLBACK_STATUS, color: 'default' });
}

function openKanbanDeleteCol(statusName) {
    const existing = document.getElementById('kbDeleteModal');
    if (existing) existing.remove();

    const cardCount = (activities || []).filter(a => !a.deleted && a.status === statusName).length;

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
    // Garante que o status fallback existe antes de migrar
    _kbEnsureFallbackStatus();

    // Migra todos os cards do status excluído para "A definir"
    (activities || []).forEach(a => {
        if (!a.deleted && a.status === statusName) a.status = _KB_FALLBACK_STATUS;
    });

    // Remove da lista de status
    if (masterLists.ativStatus) {
        masterLists.ativStatus = masterLists.ativStatus.filter(s => s.name !== statusName);
    }

    // Remove da ordem salva
    const order = _kbGetColOrder();
    if (order) _kbSaveColOrder(order.filter(n => n !== statusName));

    const modal = document.getElementById('kbDeleteModal');
    if (modal) modal.remove();

    saveAll();
    renderKanban();
}

function toggleKanbanCol(btn, statusName) {
    const col = btn.closest('.kanban-col');
    if (!col) return;
    const colKey = 'kb_col_collapsed_' + statusName;
    const collapsed = col.classList.toggle('kanban-col-collapsed');
    localStorage.setItem(colKey, collapsed ? '1' : '0');
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = collapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
}
