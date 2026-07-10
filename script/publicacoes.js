// ═══════════════════════════════════════════════════════════════
// publicacoes.js — Publicações, Checklist, Abas do viewModal
// ═══════════════════════════════════════════════════════════════

// ─── Utilitários de data/hora ────────────────────────────────
function _nowDateStr() {
    return new Date().toISOString().split('T')[0];
}
function _nowTimeStr() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── CHECKLIST SUB-ABAS ──────────────────────────────────────
window.switchClSubtab = function(prefix, subName, btn) {
    const panel = btn.closest('.drawer-tab-panel');
    if (!panel) return;
    panel.querySelectorAll('.cl-subtab').forEach(t => t.classList.remove('active'));
    panel.querySelectorAll('.cl-subpanel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const sub = panel.querySelector(`#${prefix}-clpanel-${subName}`);
    if (sub) sub.classList.add('active');
};

// ─── DRAWER TABS ─────────────────────────────────────────────
window.switchDrawerTab = function(prefix, tabName, btn) {
    // Desativa todos os tabs e panels do drawer
    const drawer = btn.closest('.form-drawer');
    if (!drawer) return;
    drawer.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
    drawer.querySelectorAll('.drawer-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = drawer.querySelector(`#${prefix}-panel-${tabName}`);
    if (panel) panel.classList.add('active');
};

// ─── VIEW MODAL TABS ─────────────────────────────────────────
window.switchViewTab = function(tabName, btn) {
    document.querySelectorAll('.view-modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`view-panel-${tabName}`);
    if (panel) panel.classList.add('active');

    const btnPublicar = document.getElementById('btnPublicar');
    if (btnPublicar) {
        const _canShow = btnPublicar.dataset.canPub !== 'false';
        btnPublicar.style.display = (tabName === 'publicacoes' && _canShow) ? 'inline-flex' : 'none';
    }
};

// ─── CHECKLIST EDITOR ────────────────────────────────────────
// Armazenamento temporário de checklists dos drawers
window._checklistData = {};

function _getChecklistData(prefix) {
    if (!window._checklistData) window._checklistData = {};
    return window._checklistData[prefix] || [];
}
function _setChecklistData(prefix, arr) {
    if (!window._checklistData) window._checklistData = {};
    window._checklistData[prefix] = arr;
}

// ─── DRAG-AND-DROP DE REORDENAÇÃO DO CHECKLIST ───────────────
window._clDragSrc = null;

function _clEditorItemEl(target) {
    return target.closest('.cl-pub-editor-item') || target.closest('.checklist-editor-item');
}

// Liga/desliga o atributo "draggable" da própria linha no mousedown, de acordo com o
// elemento clicado. Fazer isso apenas no dragstart não é suficiente: em alguns navegadores
// o gesto de arraste já é decidido a partir do draggable="true" herdado da linha antes do
// dragstart disparar, então clicar/segurar no input para selecionar texto acaba movendo a
// linha inteira. Alternar o atributo no mousedown (antes do gesto começar) resolve isso.
window._clRowMouseDown = function(e) {
    const row = _clEditorItemEl(e.target);
    if (!row) return;
    const tag = e.target.tagName;
    row.draggable = !(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON');
};

window._clRowMouseUp = function(e) {
    const row = _clEditorItemEl(e.target);
    if (row) row.draggable = true;
};

document.addEventListener('mouseup', function() {
    document.querySelectorAll('.checklist-editor-item, .cl-pub-editor-item').forEach(el => { el.draggable = true; });
});

window._clDragStart = function(e, prefix, index) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
        e.preventDefault();
        return;
    }
    window._clDragSrc = { prefix, index };
    e.dataTransfer.effectAllowed = 'move';
    const el = _clEditorItemEl(e.target);
    if (el) setTimeout(() => el.classList.add('dragging'), 0);
};

window._clDragOver = function(e, prefix, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const el = _clEditorItemEl(e.target);
    if (el) el.classList.add('drag-over');
};

window._clDragLeave = function(e) {
    const el = _clEditorItemEl(e.target);
    if (el) el.classList.remove('drag-over');
};

window._clDrop = function(e, prefix, index) {
    e.preventDefault();
    const el = _clEditorItemEl(e.target);
    if (el) el.classList.remove('drag-over');
    if (!window._clDragSrc || window._clDragSrc.prefix !== prefix) return;
    const from = window._clDragSrc.index;
    if (from === index) return;
    const items = _getChecklistData(prefix);
    const srcItem = items[from];
    const tgtItem = items[index];
    if (srcItem && tgtItem && prefix.endsWith('-pub')) {
        const srcKey = srcItem.geralIndex != null ? srcItem.geralIndex : null;
        const tgtKey = tgtItem.geralIndex != null ? tgtItem.geralIndex : null;
        if (srcKey !== tgtKey) {
            // Mudança de grupo: atualiza geralIndex e re-renderiza
            srcItem.geralIndex = tgtKey;
            _setChecklistData(prefix, items);
            renderChecklistEditor(prefix);
            window._clDragSrc = null;
            return;
        }
    }
    const moved = items.splice(from, 1)[0];
    items.splice(index, 0, moved);
    _setChecklistData(prefix, items);
    // BUG FIX: reordenar o checklist geral invalida geralIndex do checklist de publicação
    if (!prefix.endsWith('-pub')) _syncGeralIndexAfterReorder(prefix, from, index);
    renderChecklistEditor(prefix);
    window._clDragSrc = null;
};

// Drop no corpo de um grupo (quando o grupo está vazio ou se arrasta abaixo dos itens)
window._clDropOnGroup = function(e, prefix, geralIndex) {
    e.stopPropagation();
    e.preventDefault();
    if (!window._clDragSrc || window._clDragSrc.prefix !== prefix) return;
    const from = window._clDragSrc.index;
    const items = _getChecklistData(prefix);
    if (!items[from]) return;
    const newKey = geralIndex != null ? parseInt(geralIndex) : null;
    if (items[from].geralIndex === newKey) return;
    items[from].geralIndex = newKey;
    _setChecklistData(prefix, items);
    renderChecklistEditor(prefix);
    window._clDragSrc = null;
};

window._clDragEnd = function() {
    document.querySelectorAll('.checklist-editor-item.dragging, .cl-pub-editor-item.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.checklist-editor-item.drag-over, .cl-pub-editor-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.checklist-editor-item, .cl-pub-editor-item').forEach(el => { el.draggable = true; });
    window._clDragSrc = null;
};

// Recalcula geralIndex no checklist de publicação após reordenação do checklist geral
function _syncGeralIndexAfterReorder(geralPrefix, from, to) {
    const pubPrefix = geralPrefix + '-pub';
    const pubItems = _getChecklistData(pubPrefix);
    if (!pubItems.length) return;
    let changed = false;
    pubItems.forEach(item => {
        if (item.geralIndex == null) return;
        const gi = item.geralIndex;
        if (gi === from) {
            item.geralIndex = to; changed = true;
        } else if (from < to && gi > from && gi <= to) {
            item.geralIndex = gi - 1; changed = true;
        } else if (from > to && gi >= to && gi < from) {
            item.geralIndex = gi + 1; changed = true;
        }
    });
    if (changed) { _setChecklistData(pubPrefix, pubItems); renderChecklistEditor(pubPrefix); }
}

// Recalcula geralIndex no checklist de publicação após remoção de item do checklist geral
function _syncGeralIndexAfterRemove(geralPrefix, removedIndex) {
    const pubPrefix = geralPrefix + '-pub';
    const pubItems = _getChecklistData(pubPrefix);
    if (!pubItems.length) return;
    let changed = false;
    pubItems.forEach(item => {
        if (item.geralIndex == null) return;
        if (item.geralIndex === removedIndex) {
            item.geralIndex = null; changed = true; // item geral foi excluído
        } else if (item.geralIndex > removedIndex) {
            item.geralIndex -= 1; changed = true;   // índice deslocado
        }
    });
    if (changed) { _setChecklistData(pubPrefix, pubItems); renderChecklistEditor(pubPrefix); }
}

function _renderPubEditorItem(prefix, item, i, geralItems) {
    const req = !!item.requiredForPub;
    const showNc = prefix === 'audit-pub';
    const nc = !!item.ncEnabled;
    const geralOpts = ['<option value="">Sem grupo</option>',
        ...geralItems.map((g, gi) =>
            `<option value="${gi}"${item.geralIndex === gi ? ' selected' : ''}>${(g.texto || `Item ${gi+1}`).slice(0, 28)}</option>`)
    ].join('');
    return `
    <div class="cl-pub-editor-item" draggable="true"
        onmousedown="_clRowMouseDown(event)"
        onmouseup="_clRowMouseUp(event)"
        ondragstart="_clDragStart(event,'${prefix}',${i})"
        ondragover="_clDragOver(event,'${prefix}',${i})"
        ondragleave="_clDragLeave(event)"
        ondrop="_clDrop(event,'${prefix}',${i})"
        ondragend="_clDragEnd(event)">
        <span class="checklist-drag-handle" title="Arrastar para reordenar"><i class="fas fa-grip-vertical"></i></span>
        <input type="text" class="cl-pub-item-input" draggable="false" value="${(item.texto || '').replace(/"/g, '&quot;')}"
            oninput="updateChecklistItemText('${prefix}', ${i}, this.value)"
            placeholder="Descreva o item...">
        <button class="cl-pub-item-req-btn${req ? ' active' : ''}"
            onclick="toggleChecklistItemRequiredForPub('${prefix}', ${i}, this)"
            title="${req ? 'Obrigatório para publicar — clique para tornar opcional' : 'Tornar obrigatório para publicar'}">
            <i class="fas fa-exclamation-circle"></i>
            <span>${req ? 'Obrigatório' : 'Opcional'}</span>
        </button>
        ${showNc ? `<button class="cl-pub-item-nc-btn${nc ? ' active' : ''}"
            onclick="toggleChecklistItemNc('${prefix}', ${i}, this)"
            title="${nc ? 'Exige registro de conformidade ao publicar — clique para desabilitar' : 'Habilitar registro de conformidade (N/C) ao publicar'}">
            <i class="fas fa-clipboard-check"></i>
            <span>N/C</span>
        </button>` : ''}
        <button class="cl-pub-item-link-btn${item.geralIndex != null ? ' linked' : ''}"
            onclick="_clPubShowGroupDropdown(this,'${prefix}',${i})"
            title="${item.geralIndex != null ? 'Associado a grupo — clique para alterar' : 'Sem associação — clique para associar'}">
            <i class="fas ${item.geralIndex != null ? 'fa-link' : 'fa-unlink'}"></i>
        </button>
        <button class="cl-pub-item-del" onclick="removeChecklistItem('${prefix}',${i})" title="Remover item">
            <i class="fas fa-trash-alt"></i>
        </button>
    </div>`;
}

function _renderPubEditorGroupedItems(prefix, items, geralItems) {
    const groups = new Map();
    items.forEach((item, i) => {
        const key = item.geralIndex != null ? item.geralIndex : '__solo__';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ item, i });
    });

    const sortedGi = [...groups.keys()].filter(k => k !== '__solo__').sort((a, b) => a - b);
    let html = '';

    sortedGi.forEach(gi => {
        const groupItems = groups.get(gi);
        const geralItem = geralItems[gi];
        const title = geralItem ? (geralItem.texto || `Item ${gi + 1}`) : `Item Geral ${gi + 1}`;
        html += `<div class="cl-pub-editor-group">
            <div class="cl-pub-editor-group-hdr">
                <i class="fas fa-layer-group cl-pub-editor-group-icon"></i>
                <span class="cl-pub-editor-group-title">${title}</span>
                <span class="cl-pub-editor-group-badge">${groupItems.length}</span>
            </div>
            <div class="cl-pub-editor-group-body"
                ondragover="event.preventDefault()"
                ondrop="_clDropOnGroup(event,'${prefix}',${gi})">
                ${groupItems.map(({ item, i }) => _renderPubEditorItem(prefix, item, i, geralItems)).join('')}
            </div>
        </div>`;
    });

    const soloItems = groups.get('__solo__') || [];
    html += `<div class="cl-pub-editor-group cl-pub-editor-group-solo">
        <div class="cl-pub-editor-group-hdr">
            <i class="fas fa-list-check cl-pub-editor-group-icon"></i>
            <span class="cl-pub-editor-group-title">Sem associação</span>
            <span class="cl-pub-editor-group-badge">${soloItems.length}</span>
        </div>
        <div class="cl-pub-editor-group-body"
            ondragover="event.preventDefault()"
            ondrop="_clDropOnGroup(event,'${prefix}',null)">
            ${soloItems.length === 0
                ? '<div class="cl-pub-editor-empty"><i class="fas fa-info-circle"></i> Arraste itens aqui para remover associação ao checklist geral.</div>'
                : soloItems.map(({ item, i }) => _renderPubEditorItem(prefix, item, i, geralItems)).join('')}
        </div>
    </div>`;

    return html;
}

function renderChecklistEditor(prefix) {
    const container = document.getElementById(`${prefix}-checklist-editor`);
    if (!container) return;
    const items = _getChecklistData(prefix);
    const isPubPrefix = prefix.endsWith('-pub');
    const basePrefix = isPubPrefix ? prefix.slice(0, -4) : prefix;
    const geralItems = isPubPrefix ? _getChecklistData(basePrefix) : [];

    if (isPubPrefix) {
        container.innerHTML = _renderPubEditorGroupedItems(prefix, items, geralItems);
        return;
    }

    if (items.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;"><i class="fas fa-list-check" style="font-size:24px;display:block;margin-bottom:8px;"></i>Nenhum item ainda. Adicione abaixo.</div>';
        return;
    }

    container.innerHTML = items.map((item, i) => {
        const requiresComment = !!item.requiresComment;
        const commentVal = (item.comment || '').replace(/"/g, '&quot;');
        return `
        <div class="checklist-editor-item" draggable="true"
            onmousedown="_clRowMouseDown(event)"
            onmouseup="_clRowMouseUp(event)"
            ondragstart="_clDragStart(event,'${prefix}',${i})"
            ondragover="_clDragOver(event,'${prefix}',${i})"
            ondragleave="_clDragLeave(event)"
            ondrop="_clDrop(event,'${prefix}',${i})"
            ondragend="_clDragEnd(event)">
            <div class="checklist-editor-item-top">
                <span class="checklist-drag-handle" title="Arrastar para reordenar"><i class="fas fa-grip-vertical"></i></span>
                <input type="text" class="checklist-item-text-input" draggable="false" value="${(item.texto || '').replace(/"/g, '&quot;')}"
                    oninput="updateChecklistItemText('${prefix}', ${i}, this.value)"
                    placeholder="Texto do item">
                <button class="checklist-item-required-toggle ${requiresComment ? 'active' : ''}"
                    onclick="toggleChecklistItemRequired('${prefix}', ${i}, this)">
                    <i class="fas fa-comment-dots" style="font-size:11px;"></i>
                    ${requiresComment ? 'Comentário obrigatório' : 'Exigir comentário'}
                </button>
                <button class="checklist-item-del-btn" onclick="removeChecklistItem('${prefix}',${i})" title="Remover">&times;</button>
            </div>
            ${requiresComment ? `
            <div class="checklist-editor-comment-area">
                <textarea class="checklist-editor-comment-input" draggable="false"
                    placeholder="Comentário pré-preenchido (opcional)…"
                    oninput="updateChecklistItemComment('${prefix}', ${i}, this.value)"
                    rows="2">${commentVal}</textarea>
            </div>` : ''}
        </div>`;
    }).join('');
}

window.addChecklistItem = function(prefix) {
    const input = document.getElementById(`${prefix}-checklist-input`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const items = _getChecklistData(prefix);
    const isPub = prefix.endsWith('-pub');
    const newItem = { id: Date.now() + Math.floor(Math.random() * 1000), texto: text, checked: false, requiresComment: false, comment: '' };
    if (isPub) {
        newItem.requiredForPub = false;
        newItem.geralIndex = (window._clPubNewGroup && window._clPubNewGroup[prefix] != null) ? window._clPubNewGroup[prefix] : null;
    }
    items.push(newItem);
    _setChecklistData(prefix, items);
    renderChecklistEditor(prefix);
    input.value = '';
    input.focus();
};

window.removeChecklistItem = function(prefix, index) {
    const items = _getChecklistData(prefix);
    items.splice(index, 1);
    _setChecklistData(prefix, items);
    // BUG FIX: remover item do geral desloca ou apaga referências no checklist de publicação
    if (!prefix.endsWith('-pub')) _syncGeralIndexAfterRemove(prefix, index);
    renderChecklistEditor(prefix);
};

window.updateChecklistItemText = function(prefix, index, value) {
    const items = _getChecklistData(prefix);
    if (items[index]) items[index].texto = value;
    _setChecklistData(prefix, items);
};

window.updateChecklistItemComment = function(prefix, index, value) {
    const items = _getChecklistData(prefix);
    if (items[index]) items[index].comment = value;
    _setChecklistData(prefix, items);
};

window.toggleChecklistItemRequired = function(prefix, index, btn) {
    const items = _getChecklistData(prefix);
    if (!items[index]) return;
    items[index].requiresComment = !items[index].requiresComment;
    _setChecklistData(prefix, items);
    const isNow = items[index].requiresComment;
    btn.classList.toggle('active', isNow);
    btn.innerHTML = `<i class="fas fa-comment-dots" style="font-size:11px;"></i> ${isNow ? 'Comentário obrigatório' : 'Exigir comentário'}`;
};

window.toggleChecklistItemRequiredForPub = function(prefix, index, btn) {
    const items = _getChecklistData(prefix);
    if (!items[index]) return;
    items[index].requiredForPub = !items[index].requiredForPub;
    _setChecklistData(prefix, items);
    const isNow = items[index].requiredForPub;
    btn.classList.toggle('active', isNow);
    btn.classList.toggle('required-for-pub', isNow);
    btn.innerHTML = `<i class="fas fa-exclamation-circle" style="font-size:11px;"></i> ${isNow ? 'Obrigatório' : 'Opcional'}`;
};

window.toggleChecklistItemNc = function(prefix, index, btn) {
    const items = _getChecklistData(prefix);
    if (!items[index]) return;
    items[index].ncEnabled = !items[index].ncEnabled;
    _setChecklistData(prefix, items);
    const isNow = items[index].ncEnabled;
    btn.classList.toggle('active', isNow);
    btn.title = isNow ? 'Exige registro de conformidade ao publicar — clique para desabilitar' : 'Habilitar registro de conformidade (N/C) ao publicar';
};

window.setChecklistItemGeralIndex = function(prefix, index, value) {
    const items = _getChecklistData(prefix);
    if (!items[index]) return;
    items[index].geralIndex = (value === '' || value === null) ? null : parseInt(value, 10);
    _setChecklistData(prefix, items);
};

// ─── PUB CHECKLIST GROUP DROPDOWN ────────────────────────────
window._clPubNewGroup = {};

function _clPubCloseDropdown() {
    if (window._clPubActiveDropdown) {
        window._clPubActiveDropdown.remove();
        window._clPubActiveDropdown = null;
    }
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.cl-pub-link-dropdown') &&
        !e.target.closest('.cl-pub-item-link-btn') &&
        !e.target.closest('.cl-pub-add-group-btn') &&
        !e.target.closest('.pub-cl-nc-btn')) {
        _clPubCloseDropdown();
    }
    if (!e.target.closest('.pub-rnc-results-dropdown') &&
        !e.target.closest('#pubRncSearch')) {
        const dd = document.getElementById('pubRncResults');
        if (dd) dd.remove();
    }
});

function _clPubBuildDropdown(opts, currentValue, onClickFn) {
    const dropdown = document.createElement('div');
    dropdown.className = 'cl-pub-link-dropdown';
    dropdown.innerHTML = opts.map(opt => `
        <div class="cl-pub-link-dropdown-item${currentValue === opt.value ? ' selected' : ''}"
            onclick="${onClickFn}(${JSON.stringify(opt.value)})">
            <i class="fas ${opt.value === null ? 'fa-unlink' : 'fa-link'}"></i>
            ${opt.label}
        </div>`).join('');
    return dropdown;
}

function _clPubPositionDropdown(dropdown, btn) {
    document.body.appendChild(dropdown);
    window._clPubActiveDropdown = dropdown;
    const rect = btn.getBoundingClientRect();
    const ddW = dropdown.offsetWidth;
    let left = rect.left + window.scrollX;
    if (left + ddW > window.innerWidth - 8) left = window.innerWidth - ddW - 8;
    dropdown.style.top = (rect.bottom + 4 + window.scrollY) + 'px';
    dropdown.style.left = Math.max(4, left) + 'px';
}

window._clPubShowGroupDropdown = function(btn, prefix, index) {
    _clPubCloseDropdown();
    const basePrefix = prefix.slice(0, -4);
    const geralItems = _getChecklistData(basePrefix);
    const items = _getChecklistData(prefix);
    const item = items[index];
    const current = item ? item.geralIndex : null;
    const opts = [{ label: 'Sem associação', value: null },
        ...geralItems.map((g, gi) => ({ label: (g.texto || `Item ${gi+1}`).slice(0, 40), value: gi }))];
    const fnName = `__clPubSel_${prefix.replace(/-/g,'_')}_${index}`;
    window[fnName] = function(val) {
        _clPubCloseDropdown();
        window.setChecklistItemGeralIndex(prefix, index, val === null ? '' : String(val));
        renderChecklistEditor(prefix);
    };
    const dropdown = _clPubBuildDropdown(opts, current, fnName);
    _clPubPositionDropdown(dropdown, btn);
};

window._clPubShowAddGroupDropdown = function(btn, prefix) {
    _clPubCloseDropdown();
    const basePrefix = prefix.slice(0, -4);
    const geralItems = _getChecklistData(basePrefix);
    if (!window._clPubNewGroup) window._clPubNewGroup = {};
    const current = window._clPubNewGroup[prefix] != null ? window._clPubNewGroup[prefix] : null;
    const opts = [{ label: 'Sem associação', value: null },
        ...geralItems.map((g, gi) => ({ label: (g.texto || `Item ${gi+1}`).slice(0, 40), value: gi }))];
    const fnName = `__clPubAddSel_${prefix.replace(/-/g,'_')}`;
    window[fnName] = function(val) {
        _clPubCloseDropdown();
        if (!window._clPubNewGroup) window._clPubNewGroup = {};
        window._clPubNewGroup[prefix] = val === null ? null : parseInt(val, 10);
        const linked = window._clPubNewGroup[prefix] != null;
        const b = document.getElementById(`${prefix}-add-group-btn`);
        if (b) {
            b.innerHTML = `<i class="fas ${linked ? 'fa-link' : 'fa-unlink'}"></i>`;
            b.classList.toggle('active', linked);
            b.title = linked ? 'Novo item associado a grupo — clique para alterar' : 'Associar novo item a grupo';
        }
    };
    const dropdown = _clPubBuildDropdown(opts, current, fnName);
    _clPubPositionDropdown(dropdown, btn);
};

// Chamado ao abrir drawer em modo edição
window.restoreChecklist = function(prefix, checklistArr, checklistPubArr) {
    _setChecklistData(prefix, checklistArr ? JSON.parse(JSON.stringify(checklistArr)) : []);
    renderChecklistEditor(prefix);
    // Restaura checklist de publicação se existir
    _setChecklistData(prefix + '-pub', checklistPubArr ? JSON.parse(JSON.stringify(checklistPubArr)) : []);
    renderChecklistEditor(prefix + '-pub');
    // Reset sub-abas para Geral
    const panel = document.getElementById(`${prefix}-panel-checklist`);
    if (panel) {
        panel.querySelectorAll('.cl-subtab').forEach((t, i) => t.classList.toggle('active', i === 0));
        panel.querySelectorAll('.cl-subpanel').forEach((p, i) => p.classList.toggle('active', i === 0));
    }
};

// Chamado ao salvar
window.getChecklist = function(prefix) {
    return _getChecklistData(prefix).map(i => ({
        texto: i.texto || '',
        checked: !!i.checked,
        requiresComment: !!i.requiresComment,
        comment: i.comment || ''
    }));
};

window.getChecklistPub = function(prefix) {
    return _getChecklistData(prefix + '-pub').map(i => ({
        id: i.id || null,
        texto: i.texto || '',
        checked: !!i.checked,
        requiresComment: !!i.requiresComment,
        requiredForPub: !!i.requiredForPub,
        ncEnabled: !!i.ncEnabled,
        geralIndex: i.geralIndex != null ? i.geralIndex : null,
        comment: i.comment || ''
    }));
};

// Propaga alteração/remoção de itens do checklist de publicação (template do item)
// para os snapshots já salvos em publicações antigas — mantém a "conexão" entre
// o item do checklist e todo o histórico de publicações que o referenciam.
window.syncChecklistPublicacaoHistory = function(item, newChecklistPub) {
    if (!item || !Array.isArray(item.publicacoes) || item.publicacoes.length === 0) return;
    const newById = new Map((newChecklistPub || []).filter(c => c.id != null).map(c => [c.id, c]));
    item.publicacoes.forEach(pub => {
        if (!Array.isArray(pub.checklistSnapshot) || pub.checklistSnapshot.length === 0) return;
        pub.checklistSnapshot = pub.checklistSnapshot.filter(snap => {
            if (snap.id == null) return true; // item legado sem id, sem como rastrear
            const current = newById.get(snap.id);
            if (!current) return false; // item removido do checklist geral: remove também do histórico
            snap.texto = current.texto || snap.texto;
            snap.requiredForPub = !!current.requiredForPub;
            snap.geralIndex = current.geralIndex != null ? current.geralIndex : null;
            return true;
        });
    });
};

// Limpa ao fechar/resetar
window.clearChecklist = function(prefix) {
    _setChecklistData(prefix, []);
    renderChecklistEditor(prefix);
    _setChecklistData(prefix + '-pub', []);
    renderChecklistEditor(prefix + '-pub');
};

// Desmarca todos os itens do checklist de um item salvo
window.resetChecklistItems = function(item) {
    if (Array.isArray(item.checklist))
        item.checklist.forEach(c => { c.checked = false; c.comment = ''; });
    if (Array.isArray(item.checklistPublicacao))
        item.checklistPublicacao.forEach(c => { c.checked = false; c.comment = ''; });
};

// Modal de confirmação: manter ou resetar checklist ao sair de Concluído
// options: { dataPrevisao: 'YYYY-MM-DD', dataField: 'dataPrevisao'|'dataConclusao' }
window.showChecklistResetModal = function(onManter, onResetar, onCancelar, options) {
    const existing = document.getElementById('clResetModal');
    if (existing) existing.remove();

    const _dateVal = (options && options.dataPrevisao) || '';

    const overlay = document.createElement('div');
    overlay.id = 'clResetModal';
    overlay.className = 'cl-reset-overlay';
    overlay.innerHTML = `
        <div class="cl-reset-card">
            <div class="cl-reset-header">
                <div class="cl-reset-header-icon"><i class="fas fa-list-check"></i></div>
                <div>
                    <div class="cl-reset-title">Status alterado — Checklist</div>
                    <div class="cl-reset-subtitle">Este card saiu de Concluído</div>
                </div>
            </div>
            <div class="cl-reset-body">
                <p class="cl-reset-text">
                    O card saiu do status <strong>Concluído</strong>. Deseja resetar o checklist para uma nova conclusão futura, ou manter o estado atual?
                </p>
                <div class="cl-reset-date-row">
                    <span class="cl-reset-date-label"><i class="fas fa-calendar-alt" style="margin-right:5px;color:#6366f1;"></i>Previsão</span>
                    <input type="date" id="clResetDateInput" class="cl-reset-date-input" value="${_dateVal}">
                </div>
                <div class="cl-reset-actions">
                    <button id="clResetBtnCancelar" class="cl-reset-btn cl-reset-btn--cancel">Cancelar</button>
                    <button id="clResetBtnManter" class="cl-reset-btn cl-reset-btn--manter">Manter Checklist</button>
                    <button id="clResetBtnResetar" class="cl-reset-btn cl-reset-btn--resetar">Resetar Checklist</button>
                </div>
            </div>
        </div>
        <style>@keyframes clResetIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}</style>
    `;
    document.body.appendChild(overlay);

    const getDate = () => overlay.querySelector('#clResetDateInput').value;
    const close = () => overlay.remove();
    overlay.querySelector('#clResetBtnCancelar').onclick = () => { close(); if (onCancelar) onCancelar(); };
    overlay.querySelector('#clResetBtnManter').onclick = () => { close(); onManter(getDate()); };
    overlay.querySelector('#clResetBtnResetar').onclick = () => { close(); onResetar(getDate()); };
    overlay.addEventListener('click', e => { if (e.target === overlay) { close(); if (onCancelar) onCancelar(); } });
};

// ─── VIEW CHECKLIST ──────────────────────────────────────────
window.renderViewChecklist = function(item, tab) {
    const container = document.getElementById('viewChecklistContent');
    if (!container) return;

    // Preserva textarea com foco ativo para não interromper digitação
    const activeEl = document.activeElement;
    let _savedFocusId = null, _savedValue = null, _savedStart = null, _savedEnd = null;
    if (activeEl && activeEl.tagName === 'TEXTAREA' && activeEl.classList.contains('view-checklist-comment-input')) {
        _savedFocusId = activeEl.closest('[id^="vcl-item-"]')?.id;
        _savedValue   = activeEl.value;
        _savedStart   = activeEl.selectionStart;
        _savedEnd     = activeEl.selectionEnd;
    }
    const checklist = item.checklist || [];
    if (checklist.length === 0) {
        container.innerHTML = '<div class="pub-empty"><i class="fas fa-list-check"></i><p>Nenhum item de checklist cadastrado.</p></div>';
        return;
    }
    const done = checklist.filter(c => c.checked).length;
    const pct = checklist.length > 0 ? Math.round((done / checklist.length) * 100) : 0;

    const canCL = typeof userCanChecklist === 'function' ? userCanChecklist(item) : true;

    const _pubCL = item.checklistPublicacao || [];
    const _pubs = item.publicacoes || [];
    const _completedPubIds = new Set();
    _pubs.forEach(p => (p.checklistSnapshot || []).forEach(s => {
        if (s.checked) { if (s.id) _completedPubIds.add(s.id); else _completedPubIds.add('t:' + (s.texto || '').trim()); }
    }));

    const itemsHtml = checklist.map((c, i) => {
        const hasComment = !!(c.comment || '').trim();
        const needsComment = !!c.requiresComment;
        const blockedByComment = needsComment && !hasComment && !c.checked;
        const blockedByPerm = !canCL;
        const isDisabled = blockedByComment || blockedByPerm;
        const title = blockedByPerm
            ? 'Você não tem permissão para preencher este checklist'
            : (blockedByComment ? 'Digite um comentário antes de marcar este item' : '');
        const commentBtnClass = hasComment ? 'has-comment' : '';

        const assocPub = _pubCL.filter(pc => pc.geralIndex === i);
        let pubBtnHtml = '';
        let pubBlocked = false;
        let pubLockedDone = false;
        if (assocPub.length > 0) {
            const doneCount = assocPub.filter(pc => _completedPubIds.has(pc.id || ('t:' + (pc.texto || '').trim()))).length;
            const allPubDone = doneCount === assocPub.length;
            const partial = doneCount > 0 && !allPubDone;
            pubBlocked = !c.checked && !allPubDone;
            pubLockedDone = c.checked && allPubDone;
            pubBtnHtml = `<button class="vcl-pub-progress-btn${allPubDone ? ' all-done' : partial ? ' partial' : ''}"
                onclick="_clViewPubProgress(this,${item.id},'${tab}',${i})"
                title="Publicações associadas (${doneCount}/${assocPub.length} concluídos)">
                <i class="fas fa-paper-plane"></i>
                <span class="vcl-ppb-badge">${doneCount}/${assocPub.length}</span>
            </button>`;
        }

        const isDisabledFinal = isDisabled || pubBlocked || pubLockedDone;
        const cbTitle = pubBlocked
            ? 'Há publicações pendentes — conclua todas as publicações associadas para marcar este item'
            : pubLockedDone ? 'Concluído via publicações — não pode ser desmarcado manualmente' : title;

        const stateClass = pubBlocked ? 'pub-cl-blocked' : pubLockedDone ? 'pub-cl-locked-done' : c.checked ? 'cl-done' : '';

        return `
        <div class="view-checklist-item ${c.checked ? 'checked' : ''} ${blockedByPerm ? 'vcl-perm-locked' : ''} ${stateClass}" id="vcl-item-${item.id}-${i}">
            <div class="view-checklist-item-row">
                <span class="vcl-pub-lock-wrap${pubBlocked ? ' active' : pubLockedDone ? ' locked-done' : ''}"${pubBlocked ? ` onclick="_clPubBlockWarn(${item.id},'${tab}',${i})"` : pubLockedDone ? ` onclick="_clPubLockedDoneWarn()"` : ''}>
                    <input type="checkbox" class="view-checklist-cb" ${c.checked ? 'checked' : ''} ${isDisabledFinal ? 'disabled' : ''}
                        onchange="toggleViewChecklistItem(${item.id},'${tab}',${i})"
                        title="${cbTitle}">
                    ${pubBlocked ? '<i class="fas fa-lock vcl-pub-lock-icon"></i>' : ''}
                    ${pubLockedDone ? '<i class="fas fa-lock vcl-pub-lock-icon vcl-lock-done"></i>' : ''}
                </span>
                <span class="view-checklist-item-text${pubBlocked ? ' pub-cl-blocked-text' : ''}"
                    ${pubBlocked ? `onclick="_clPubBlockWarn(${item.id},'${tab}',${i})" style="cursor:not-allowed"` : ''}
                >${c.texto || ''}</span>
                ${pubBtnHtml}
                <button class="view-checklist-comment-btn ${commentBtnClass}"
                    onclick="toggleViewChecklistComment('vcl-item-${item.id}-${i}')"
                    title="${hasComment ? 'Ver/editar comentário' : 'Adicionar comentário'}">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;">
                        <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
            <div class="view-checklist-comment-area ${(hasComment || (needsComment && !c.checked)) ? 'open' : ''}" id="vcl-cmt-${item.id}-${i}">
                ${needsComment && !c.checked ? `<div class="view-checklist-required-hint"><i class="fas fa-exclamation-circle"></i> Comentário obrigatório para marcar este item</div>` : ''}
                <textarea class="view-checklist-comment-input"
                    placeholder="Adicione um comentário..."
                    oninput="saveViewChecklistComment(${item.id},'${tab}',${i},this.value)"
                    ${blockedByPerm ? 'disabled' : ''}
                >${(c.comment || '').replace(/</g,'&lt;')}</textarea>
            </div>
        </div>`;
    }).join('');

    const permBanner = !canCL ? `<div class="vcl-perm-banner"><i class="fas fa-lock"></i> Você não tem permissão para preencher este checklist.</div>` : '';

    container.innerHTML = `
        <div class="view-cl-progress-wrap">
            <div class="view-cl-progress-top">
                <span class="view-cl-progress-title"><i class="fas fa-list-check"></i> Progresso</span>
                <span class="view-cl-progress-count">${done} <span class="view-cl-progress-total">/ ${checklist.length}</span></span>
            </div>
            <div class="view-cl-bar-track">
                <div class="view-cl-bar-fill" style="width:${pct}%">
                    ${pct > 8 ? `<span class="view-cl-bar-pct">${pct}%</span>` : ''}
                </div>
            </div>
        </div>
        ${permBanner}
        <div class="view-checklist-header">
            ${canCL ? `<button class="view-checklist-select-all" onclick="selectAllViewChecklist(${item.id},'${tab}')">Selecionar todos</button>` : ''}
        </div>
        <div class="view-checklist-list">${itemsHtml}</div>
        <div class="view-checklist-footer">
            <span class="view-checklist-footer-count">${done}/${checklist.length} itens marcados</span>
            ${window._checklistPendingDirty ? `<button class="view-checklist-apply-btn" onclick="applyViewChecklistChanges()"><i class="fas fa-check"></i> Aplicar</button>` : ''}
        </div>`;

    // Restaura foco e posição do cursor no textarea que estava sendo editado
    if (_savedFocusId) {
        const restoredItem = container.querySelector(`#${_savedFocusId}`);
        if (restoredItem) {
            const area = restoredItem.querySelector('.view-checklist-comment-area');
            if (area) area.classList.add('open');
            const ta = restoredItem.querySelector('.view-checklist-comment-input');
            if (ta) {
                ta.value = _savedValue;
                ta.focus();
                try { ta.setSelectionRange(_savedStart, _savedEnd); } catch(e) {}
            }
        }
    }
};

window.toggleViewChecklistComment = function(itemId) {
    const item = document.getElementById(itemId);
    if (!item) return;
    const area = item.querySelector('.view-checklist-comment-area');
    if (!area) return;
    area.classList.toggle('open');
    if (area.classList.contains('open')) {
        const ta = area.querySelector('textarea');
        if (ta) ta.focus();
    }
};

window.saveViewChecklistComment = function(id, tab, index, value) {
    const finalTab = _normalizeTab(tab);
    let found;
    if (finalTab === 'auditoria') found = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') found = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') found = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') found = documents.find(i => i.id === id);
    else if (finalTab === 'rnc') found = (window.rncItems || []).find(i => i.id === id);
    if (!found || !found.checklist || !found.checklist[index]) return;
    if (typeof userCanChecklist === 'function' && !userCanChecklist(found)) return;
    found.checklist[index].comment = value;
    // Update comment button color immediately
    const commentBtn = document.querySelector(`#vcl-item-${id}-${index} .view-checklist-comment-btn`);
    if (commentBtn) {
        if (value.trim()) {
            commentBtn.classList.add('has-comment');
        } else {
            commentBtn.classList.remove('has-comment');
        }
    }
    // Unblock checkbox if required comment is now present
    if (found.checklist[index].requiresComment) {
        const cb = document.querySelector(`#vcl-item-${id}-${index} .view-checklist-cb`);
        if (cb) cb.disabled = !value.trim();
    }
    _scheduleChecklistSave();
};

// Debounce de 600ms: agrupa marcações rápidas em um único saveAll.
// Salva DURANTE o viewModal para que o listener Firebase não reverta
// a alteração local antes do fechamento.
function _scheduleChecklistSave() {
    window._checklistDirty = true;
    clearTimeout(window._checklistSaveTimer);
    window._checklistSaveTimer = setTimeout(() => {
        if (window._checklistDirty) {
            window._checklistDirty = false;
            saveAll();
        }
    }, 600);
}

// Chamado pelo closeModal ao fechar o viewModal: cancela o timer pendente
// e salva imediatamente se ainda há alterações não enviadas.
window._flushChecklistSave = function() {
    clearTimeout(window._checklistSaveTimer);
    if (window._checklistDirty) {
        window._checklistDirty = false;
        saveAll();
    }
};

// ─── CHECKLIST — marcação pendente (exige clique em "Aplicar") ──
// Ao marcar/desmarcar um item, a alteração fica só em memória até o
// usuário clicar em "Aplicar". Guarda um snapshot para permitir descartar.
window._checklistPendingDirty = false;
window._checklistPendingSnapshot = null;

function _clFindItemByTab(id, tab) {
    if (tab === 'auditoria') return audits.find(i => i.id === id);
    if (tab === 'atividades') return activities.find(i => i.id === id);
    if (tab === 'treinamentos') return trainings.find(i => i.id === id);
    if (tab === 'documentos') return documents.find(i => i.id === id);
    if (tab === 'rnc') return (window.rncItems || []).find(i => i.id === id);
    return null;
}

function _markChecklistPending(item, tab) {
    if (!window._checklistPendingDirty) {
        window._checklistPendingSnapshot = { id: item.id, tab, checklist: JSON.parse(JSON.stringify(item.checklist || [])) };
        window._checklistPendingDirty = true;
    }
}

// Aplica (salva) as marcações pendentes do checklist e fecha o viewModal
window.applyViewChecklistChanges = function() {
    if (!window._checklistPendingDirty) { closeModal('viewModal'); return; }
    window._checklistPendingDirty = false;
    window._checklistPendingSnapshot = null;
    saveAll();
    closeModal('viewModal');
};

// Descarta as marcações pendentes, restaurando o checklist ao estado salvo
window._discardChecklistPendingChanges = function() {
    if (window._checklistPendingSnapshot) {
        const { id, tab, checklist } = window._checklistPendingSnapshot;
        const found = _clFindItemByTab(id, tab);
        if (found) found.checklist = checklist;
        renderCards();
    }
    window._checklistPendingDirty = false;
    window._checklistPendingSnapshot = null;
};

// Chamado por closeModal/ESC antes de fechar o viewModal: se há marcações
// pendentes, exibe aviso em vez de fechar direto.
window._checklistGuardedClose = function(doClose) {
    if (window._checklistPendingDirty) {
        _showChecklistUnsavedWarning(
            () => { // Aplicar e fechar
                window._checklistPendingDirty = false;
                window._checklistPendingSnapshot = null;
                saveAll();
                doClose();
            },
            () => { // Descartar
                window._discardChecklistPendingChanges();
                doClose();
            }
        );
        return;
    }
    doClose();
};

function _showChecklistUnsavedWarning(onApplyAndClose, onDiscardAndClose) {
    const existing = document.getElementById('clUnsavedModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'clUnsavedModal';
    overlay.className = 'cl-reset-overlay';
    overlay.innerHTML = `
        <div class="cl-reset-card">
            <div class="cl-reset-header">
                <div class="cl-reset-header-icon"><i class="fas fa-triangle-exclamation"></i></div>
                <div>
                    <div class="cl-reset-title">Alterações não aplicadas</div>
                    <div class="cl-reset-subtitle">O checklist tem marcações pendentes</div>
                </div>
            </div>
            <div class="cl-reset-body">
                <p class="cl-reset-text">
                    Você marcou ou desmarcou itens do checklist, mas ainda não aplicou. Se fechar agora sem aplicar, essas alterações serão perdidas.
                </p>
                <div class="cl-reset-actions">
                    <button id="clUnsavedBtnCancelar" class="cl-reset-btn cl-reset-btn--cancel">Continuar editando</button>
                    <button id="clUnsavedBtnDescartar" class="cl-reset-btn cl-reset-btn--descartar">Descartar</button>
                    <button id="clUnsavedBtnAplicar" class="cl-reset-btn cl-reset-btn--aplicar">Aplicar e fechar</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#clUnsavedBtnCancelar').onclick = close;
    overlay.querySelector('#clUnsavedBtnDescartar').onclick = () => { close(); if (onDiscardAndClose) onDiscardAndClose(); };
    overlay.querySelector('#clUnsavedBtnAplicar').onclick = () => { close(); if (onApplyAndClose) onApplyAndClose(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

window.selectAllViewChecklist = function(id, tab) {
    const finalTab = _normalizeTab(tab);
    let found;
    if (finalTab === 'auditoria') found = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') found = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') found = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') found = documents.find(i => i.id === id);
    else if (finalTab === 'rnc') found = (window.rncItems || []).find(i => i.id === id);
    if (!found || !found.checklist) return;
    if (typeof userCanChecklist === 'function' && !userCanChecklist(found)) return;

    const _pCL = found.checklistPublicacao || [];
    const _doneSet = new Set();
    (found.publicacoes || []).forEach(p => (p.checklistSnapshot || []).forEach(s => {
        if (s.checked) _doneSet.add(s.id || ('t:' + (s.texto || '').trim()));
    }));
    const _isPubBlocked = idx => {
        const assoc = _pCL.filter(pc => pc.geralIndex === idx);
        return assoc.length > 0 && assoc.some(pc => !_doneSet.has(pc.id || ('t:' + (pc.texto || '').trim())));
    };
    const _isPubLockedDone = idx => {
        const assoc = _pCL.filter(pc => pc.geralIndex === idx);
        return assoc.length > 0 && assoc.every(pc => _doneSet.has(pc.id || ('t:' + (pc.texto || '').trim())));
    };

    // Considera "allDone" apenas nos itens que podem ser toggleados
    const toggleable = found.checklist.filter((c, idx) =>
        !_isPubBlocked(idx) && !_isPubLockedDone(idx) && (!c.requiresComment || (c.comment || '').trim())
    );
    const allDone = toggleable.length > 0 && toggleable.every(c => c.checked);

    _markChecklistPending(found, finalTab);

    found.checklist.forEach((c, idx) => {
        if (_isPubLockedDone(idx)) return; // nunca toca em itens bloqueados por pub concluída
        if (_isPubBlocked(idx)) return;    // nunca marca itens com pub pendente
        if (c.requiresComment && !(c.comment || '').trim()) return; // respeita comentário obrigatório
        c.checked = !allDone;
    });

    renderViewChecklist(found, finalTab);
    renderCards();
};

window.toggleViewChecklistItem = function(id, tab, index) {
    const finalTab = _normalizeTab(tab);
    let found;
    if (finalTab === 'auditoria') found = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') found = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') found = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') found = documents.find(i => i.id === id);
    else if (finalTab === 'rnc') found = (window.rncItems || []).find(i => i.id === id);
    if (!found) return;
    if (!found.checklist) found.checklist = [];
    const c = found.checklist[index];
    if (!c) return;
    // Bloqueia se não tem permissão de checklist
    if (typeof userCanChecklist === 'function' && !userCanChecklist(found)) return;
    // Block if requires comment but none provided
    if (!c.checked && c.requiresComment && !(c.comment || '').trim()) return;

    const _pCL2 = found.checklistPublicacao || [];
    const _assoc2 = _pCL2.filter(pc => pc.geralIndex === index);
    if (_assoc2.length > 0) {
        const _doneSet2 = new Set();
        (found.publicacoes || []).forEach(p => (p.checklistSnapshot || []).forEach(s => {
            if (s.checked) _doneSet2.add(s.id || ('t:' + (s.texto || '').trim()));
        }));
        const _pubDone2 = _assoc2.filter(pc => _doneSet2.has(pc.id || ('t:' + (pc.texto || '').trim()))).length;
        if (!c.checked && _pubDone2 < _assoc2.length) {
            // Bloqueia marcar quando há pub pendente
            _clPubBlockWarn(id, tab, index);
            return;
        }
        if (c.checked && _pubDone2 === _assoc2.length) {
            // Bloqueia desmarcar quando concluído via publicações
            if (typeof showToast === 'function') showToast('Este item foi concluído via publicações e não pode ser desmarcado manualmente.', 'warning');
            return;
        }
    }
    _markChecklistPending(found, finalTab);
    c.checked = !c.checked;
    renderViewChecklist(found, finalTab);
    renderCards();
};

window._clPubLockedDoneWarn = function() {
    if (typeof showToast === 'function') showToast('Este item foi concluído via publicações e não pode ser desmarcado manualmente.', 'warning');
};

function _clPubBlockWarn(itemId, tab, index) {
    if (typeof showToast === 'function') {
        showToast('Há publicações pendentes. Conclua todas as publicações associadas para poder marcar este item.', 'warning');
    }
    // Shake no botão de progresso de publicação para chamar atenção
    const btn = document.querySelector(`#vcl-item-${itemId}-${index} .vcl-pub-progress-btn`);
    if (btn) {
        btn.classList.remove('vcl-pub-btn-shake');
        void btn.offsetWidth; // reflow para resetar animação
        btn.classList.add('vcl-pub-btn-shake');
        setTimeout(() => btn.classList.remove('vcl-pub-btn-shake'), 600);
    }
}

// ─── POPUP DE PROGRESSO DE PUBLICAÇÃO POR ITEM DO CHECKLIST ──
window._clViewPubProgress = function(btn, itemId, tab, geralIndex) {
    const existing = document.getElementById('_vcl_pp_popup');
    if (existing) {
        const wasSame = existing._srcBtn === btn;
        existing.remove();
        if (wasSame) return;
    }

    const finalTab = _normalizeTab(tab);
    let found;
    if (finalTab === 'auditoria') found = audits.find(i => i.id === itemId);
    else if (finalTab === 'atividades') found = activities.find(i => i.id === itemId);
    else if (finalTab === 'treinamentos') found = trainings.find(i => i.id === itemId);
    else if (finalTab === 'documentos') found = documents.find(i => i.id === itemId);
    else if (finalTab === 'rnc') found = (window.rncItems || []).find(i => i.id === itemId);
    if (!found) return;

    const pubCL = (found.checklistPublicacao || []).filter(c => c.geralIndex === geralIndex);
    if (!pubCL.length) return;
    const pubs = found.publicacoes || [];

    // Para cada item de pub: encontra qual publicação o concluiu (mais recente = menor índice)
    const completionMap = new Map();
    pubCL.forEach(pc => {
        const key = pc.id || ('t:' + (pc.texto || '').trim());
        for (let pi = 0; pi < pubs.length; pi++) {
            const snap = (pubs[pi].checklistSnapshot || []).find(s =>
                (pc.id && s.id === pc.id) || (!pc.id && (s.texto || '').trim() === (pc.texto || '').trim())
            );
            if (snap && snap.checked) { completionMap.set(key, { pub: pubs[pi], pubIndex: pi }); break; }
        }
    });

    const total = pubCL.length;
    const done = pubCL.filter(pc => completionMap.has(pc.id || ('t:' + (pc.texto || '').trim()))).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    const itemsHtml = pubCL.map(pc => {
        const key = pc.id || ('t:' + (pc.texto || '').trim());
        const entry = completionMap.get(key);
        const isDone = !!entry;
        const pubRef = entry ? entry.pub : null;
        const pubIdx = entry ? entry.pubIndex : null;
        const metaHtml = isDone ? `<span class="vcl-pp-meta">
            <i class="fas fa-paper-plane"></i>
            ${pubRef.tipo || 'Publicação'}${pubRef.data ? ' &nbsp;·&nbsp; ' + _formatDateBR(pubRef.data) : ''}
            ${pubRef.hora ? ' · ' + pubRef.hora : ''}
        </span>` : '<span class="vcl-pp-meta vcl-pp-meta-pend"><i class="fas fa-clock"></i> Pendente</span>';
        const clickAttr = isDone
            ? `onclick="document.getElementById('_vcl_pp_popup')?.remove();verPublicacao(${itemId},'${tab}',${pubIdx})" title="Ver publicação"`
            : '';
        return `<div class="vcl-pp-item${isDone ? ' done clickable' : ''}" ${clickAttr}>
            <span class="vcl-pp-dot">${isDone ? '<i class="fas fa-check"></i>' : ''}</span>
            <div class="vcl-pp-body">
                <span class="vcl-pp-text">${pc.texto || ''}</span>
                ${metaHtml}
            </div>
            ${isDone ? '<i class="fas fa-chevron-right vcl-pp-item-arrow"></i>' : ''}
        </div>`;
    }).join('');

    const barColor = pct === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : pct > 0 ? 'linear-gradient(90deg,#6366f1,#818cf8)' : '#e0e7ff';
    const popup = document.createElement('div');
    popup.id = '_vcl_pp_popup';
    popup._srcBtn = btn;
    popup.className = 'vcl-pp-popup';
    popup.innerHTML = `
        <div class="vcl-pp-hdr">
            <div class="vcl-pp-hdr-top">
                <span class="vcl-pp-title"><i class="fas fa-paper-plane"></i> Publicações Associadas</span>
                <button class="vcl-pp-close-btn" onclick="document.getElementById('_vcl_pp_popup')?.remove()"><i class="fas fa-times"></i></button>
            </div>
            <div class="vcl-pp-prog-row">
                <div class="vcl-pp-bar-track"><div class="vcl-pp-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
                <span class="vcl-pp-count">${done}<span class="vcl-pp-total">/${total}</span></span>
            </div>
        </div>
        <div class="vcl-pp-list">${itemsHtml}</div>`;

    document.body.appendChild(popup);

    const rect = btn.getBoundingClientRect();
    const popW = 290;
    let left = rect.right - popW + window.scrollX;
    if (left < 6) left = 6;
    if (left + popW > window.innerWidth - 6) left = window.innerWidth - popW - 6;
    popup.style.left = left + 'px';
    popup.style.top = (rect.bottom + 6 + window.scrollY) + 'px';

    setTimeout(() => {
        function _vclPPClose(e) {
            if (!e.target.closest('#_vcl_pp_popup') && !e.target.closest('.vcl-pub-progress-btn')) {
                document.getElementById('_vcl_pp_popup')?.remove();
                document.removeEventListener('click', _vclPPClose);
            }
        }
        document.addEventListener('click', _vclPPClose);
    }, 20);
};

// ─── VIEW ANEXOS ─────────────────────────────────────────────
window.renderViewAnexos = function(item) {
    const container = document.getElementById('viewAnexosContent');
    if (!container) return;
    const anexos = item.anexos || [];
    if (anexos.length === 0) {
        container.innerHTML = '<div class="pub-empty"><i class="fas fa-paperclip"></i><p>Nenhum anexo cadastrado.</p></div>';
        return;
    }
    const _faIconMap = { pdf: 'fa-file-pdf', doc: 'fa-file-word', sheet: 'fa-file-excel', slide: 'fa-file-powerpoint', image: 'fa-file-image', link: 'fa-link', file: 'fa-file' };
    const _faClassMap = { pdf: 'icon-pdf', doc: 'icon-doc', sheet: 'icon-sheet', slide: 'icon-slide', image: 'icon-image', link: 'icon-link', file: 'icon-file' };
    container.innerHTML = `<div class="view-anexos-grid">${anexos.map(a => {
        const name = a.titulo || a.url || 'Arquivo';
        const info = window._anexoIconInfo ? window._anexoIconInfo(a) : { icon: 'file' };
        const icon = _faIconMap[info.icon] || 'fa-file';
        const iconClass = _faClassMap[info.icon] || 'icon-file';
        if (a.tipo === 'imagem') {
            const blobId = (a.fileId || '').replace(/'/g, "\\'");
            const safeName = name.replace(/'/g, "\\'");
            return `<button type="button" class="view-anexo-card" onclick="openImgLightboxBlob('${blobId}','${safeName}')">
                <i class="fas ${icon} anexo-icon ${iconClass}"></i>
                <span class="anexo-name">${name}</span>
            </button>`;
        }
        return `<a href="${a.url}" target="_blank" class="view-anexo-card">
            <i class="fas ${icon} anexo-icon ${iconClass}"></i>
            <span class="anexo-name">${name}</span>
        </a>`;
    }).join('')}</div>`;
};

// ─── PUBLICAÇÕES ─────────────────────────────────────────────
// Índice da publicação sendo editada (null = nova publicação)
window._editingPubIndex = null;

// Abre modal de publicação para o item atualmente em view
// editIndex: número = editar publicação existente; undefined/null = nova publicação
// ─── CHECKLIST DE PUBLICAÇÃO (modal de publicar) ─────────────
window._pubChecklistState = [];
window._pubChecklistGeralItems = [];

// ─── CONFORMIDADE (N/C) — exclusivo para rotinas ─────────────
const _PUB_NC_OPTS = [
    { v: 'conforme', label: 'Em conformidade', icon: 'fa-check-circle' },
    { v: 'menor',    label: 'N/C Menor',       icon: 'fa-flag' },
    { v: 'maior',    label: 'N/C Maior',       icon: 'fa-triangle-exclamation' },
    { v: 'critica',  label: 'N/C Crítica',     icon: 'fa-circle-exclamation' }
];
function _pubNcOpt(v) {
    return _PUB_NC_OPTS.find(o => o.v === v) || null;
}
function _pubNcBtnHtml(c, i) {
    const opt = _pubNcOpt(c.conformidade);
    if (!opt) {
        return `<button type="button" class="pub-cl-nc-btn nc-unset" data-pub-nc-index="${i}"
            onclick="event.preventDefault();event.stopPropagation();_pubNcShowDropdown(this, ${i})"
            title="Registro de conformidade — clique para selecionar">
            <i class="fas fa-circle-question"></i><span>Selecionar tipo</span><i class="fas fa-chevron-down pub-cl-nc-chevron"></i>
        </button>`;
    }
    return `<button type="button" class="pub-cl-nc-btn nc-${opt.v}" data-pub-nc-index="${i}"
        onclick="event.preventDefault();event.stopPropagation();_pubNcShowDropdown(this, ${i})"
        title="Registro de conformidade — clique para alterar">
        <i class="fas ${opt.icon}"></i><span>${opt.label}</span><i class="fas fa-chevron-down pub-cl-nc-chevron"></i>
    </button>`;
}
function _pubNcBadgeHtml(conf) {
    const opt = _pubNcOpt(conf);
    if (!opt) return '';
    return `<span class="ver-pub-nc-badge nc-${opt.v}"><i class="fas ${opt.icon}"></i> ${opt.label}</span>`;
}
function _pubNcCount(pub) {
    return (pub.checklistSnapshot || []).filter(c => c.checked && c.conformidade && c.conformidade !== 'conforme').length;
}

function _renderPubClItem(c, i) {
    const isRequired = !!c.requiredForPub;
    const isEditing = window._editingPubIndex != null;
    const showNc = !!c.ncEnabled && window._pubNcUiEnabled;

    if (c.previouslyDone) return '';
    if (isEditing) {
        return `
        <div class="pub-cl-item pub-cl-item-readonly ${c.checked ? 'checked' : ''}" data-pub-cl-index="${i}">
            <span class="pub-cl-ro-dot">${c.checked ? '<i class="fas fa-check"></i>' : ''}</span>
            ${isRequired ? `<i class="fas fa-exclamation-circle pub-cl-required-icon" title="Item obrigatório para publicar"></i>` : ''}
            <span>${c.texto || ''}</span>
            ${showNc ? (_pubNcBadgeHtml(c.conformidade) || '<span class="ver-pub-nc-badge nc-unset"><i class="fas fa-circle-question"></i> Não selecionado</span>') : ''}
        </div>`;
    }
    const needsWarning = isRequired && !c.checked;
    const ncMismatch = showNc && (!!c.checked !== !!c.conformidade);
    const hasComment = !!(c.comentario && c.comentario.trim());
    const commentOpen = !!c._commentOpen;
    return `
    <div class="pub-cl-item-wrap" data-pub-cl-wrap="${i}">
        <label class="pub-cl-item ${c.checked ? 'checked' : ''} ${needsWarning ? 'pub-cl-required-warn' : ''} ${ncMismatch ? 'pub-cl-nc-warn' : ''}" data-pub-cl-index="${i}">
            <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="togglePubClItem(${i}, this)">
            ${isRequired ? `<i class="fas fa-exclamation-circle pub-cl-required-icon" title="Item obrigatório para publicar"></i>` : ''}
            <span class="pub-cl-item-text">${c.texto || ''}</span>
            <span class="pub-cl-item-actions">
                ${showNc ? _pubNcBtnHtml(c, i) : ''}
                <button type="button" class="pub-cl-comment-btn ${hasComment ? 'has-comment' : ''}" data-pub-comment-index="${i}"
                    onclick="event.preventDefault();event.stopPropagation();_pubClToggleComment(${i})"
                    title="${hasComment ? 'Ver/editar comentário' : 'Adicionar comentário'}">
                    <i class="fas fa-comment${hasComment ? '' : '-dots'}"></i>
                </button>
            </span>
        </label>
        <div class="pub-cl-comment-box ${commentOpen ? 'open' : ''}" data-pub-comment-box="${i}">
            <textarea class="pub-cl-comment-input" data-pub-comment-input="${i}" rows="2"
                placeholder="Escreva um comentário para este item..."
                oninput="_pubClCommentInput(${i}, this.value)">${c.comentario || ''}</textarea>
        </div>
    </div>`;
}

window._pubNcShowDropdown = function(btn, i) {
    _clPubCloseDropdown();
    const c = (window._pubChecklistState || [])[i];
    if (!c) return;
    const current = c.conformidade || null;
    const dropdown = document.createElement('div');
    dropdown.className = 'cl-pub-link-dropdown pub-nc-dropdown';
    dropdown.innerHTML = _PUB_NC_OPTS.map(opt => `
        <div class="cl-pub-link-dropdown-item pub-nc-dropdown-item nc-${opt.v}${current === opt.v ? ' selected' : ''}"
            onclick="_pubNcSelect(${i}, '${opt.v}')">
            <i class="fas ${opt.icon}"></i>
            ${opt.label}
        </div>`).join('') + (current ? `
        <div class="cl-pub-link-dropdown-item pub-nc-dropdown-item nc-clear" onclick="_pubNcSelect(${i}, null)">
            <i class="fas fa-rotate-left"></i>
            Remover seleção
        </div>` : '');
    _clPubPositionDropdown(dropdown, btn);
};

window._pubNcSelect = function(i, val) {
    _clPubCloseDropdown();
    const c = (window._pubChecklistState || [])[i];
    if (!c) return;
    c.conformidade = val;
    const btn = document.querySelector(`.pub-cl-nc-btn[data-pub-nc-index="${i}"]`);
    if (btn) btn.outerHTML = _pubNcBtnHtml(c, i);
    const label = document.querySelector(`.pub-cl-item[data-pub-cl-index="${i}"]`);
    if (label) label.classList.toggle('pub-cl-nc-warn', !!c.checked !== !!c.conformidade);
    _updatePubRncSection();
    _updatePubQualityScore();
};

window._pubClToggleComment = function(i) {
    const c = (window._pubChecklistState || [])[i];
    if (!c) return;
    c._commentOpen = !c._commentOpen;
    const box = document.querySelector(`.pub-cl-comment-box[data-pub-comment-box="${i}"]`);
    if (box) {
        box.classList.toggle('open', c._commentOpen);
        if (c._commentOpen) {
            const ta = box.querySelector('.pub-cl-comment-input');
            if (ta) setTimeout(() => ta.focus(), 50);
        }
    }
};

window._pubClCommentInput = function(i, val) {
    const c = (window._pubChecklistState || [])[i];
    if (!c) return;
    c.comentario = val;
    const btn = document.querySelector(`.pub-cl-comment-btn[data-pub-comment-index="${i}"]`);
    if (btn) {
        const hasComment = !!(val && val.trim());
        btn.classList.toggle('has-comment', hasComment);
        btn.innerHTML = `<i class="fas fa-comment${hasComment ? '' : '-dots'}"></i>`;
        btn.title = hasComment ? 'Ver/editar comentário' : 'Adicionar comentário';
    }
};

// ─── ASSOCIAÇÃO OPCIONAL A RNC (modal de publicação) ─────────
window._pubRncSelected = [];

function _pubRncNormId(id) {
    const n = Number(id);
    return isNaN(n) ? id : n;
}
function _pubRncFind(id) {
    id = _pubRncNormId(id);
    return (window.rncItems || []).find(r => r.id === id);
}

function _updatePubRncSection() {
    const wrap = document.getElementById('pubRncWrap');
    if (!wrap) return;
    const hasNc = !!window._pubNcUiEnabled &&
        (window._pubChecklistState || []).some(c => c.conformidade && c.conformidade !== 'conforme');
    wrap.style.display = hasNc ? '' : 'none';
    if (hasNc) {
        _renderPubRncChips();
        const qc = document.getElementById('pubRncQuickCreate');
        if (qc) { qc.style.display = 'none'; qc.innerHTML = ''; }
        const search = document.getElementById('pubRncSearch');
        if (search) search.value = '';
        _pubRncCloseResults();
    }
}

function _renderPubRncChips() {
    const el = document.getElementById('pubRncChips');
    if (!el) return;
    const ids = window._pubRncSelected || [];
    if (!ids.length) { el.innerHTML = ''; return; }
    el.innerHTML = ids.map(id => {
        const r = _pubRncFind(id);
        if (!r) return `<span class="pub-rnc-chip pub-rnc-chip-missing"><i class="fas fa-ban"></i> RNC removida</span>`;
        return `<span class="pub-rnc-chip nc-${r.classificacao || 'menor'}" title="${(r.titulo || '').replace(/"/g, '&quot;')}">
            <i class="fas fa-file-circle-exclamation"></i>
            <span class="pub-rnc-chip-title">${(r.titulo || 'RNC sem título').slice(0, 40)}</span>
            <button type="button" class="pub-rnc-chip-x" onclick="_pubRncRemove('${id}')" title="Remover associação">&times;</button>
        </span>`;
    }).join('');
}

window._pubRncRemove = function(id) {
    id = _pubRncNormId(id);
    window._pubRncSelected = (window._pubRncSelected || []).filter(x => x !== id);
    _renderPubRncChips();
};

function _pubRncCloseResults() {
    const dd = document.getElementById('pubRncResults');
    if (dd) dd.remove();
}

window._pubRncSearchInput = function(inputEl) {
    _pubRncCloseResults();
    const q = (inputEl.value || '').trim().toLowerCase();
    if (!q) return;
    const selected = new Set(window._pubRncSelected || []);
    const results = (window.rncItems || [])
        .filter(r => !r.deleted && !selected.has(r.id))
        .filter(r => (r.titulo || '').toLowerCase().includes(q) || (r.setor || '').toLowerCase().includes(q))
        .slice(0, 8);
    const dd = document.createElement('div');
    dd.id = 'pubRncResults';
    dd.className = 'pub-rnc-results-dropdown';
    dd.innerHTML = results.length
        ? results.map(r => `
            <div class="pub-rnc-result-item" onclick="_pubRncSelect('${r.id}')">
                <span class="pub-rnc-result-dot nc-${r.classificacao || 'menor'}"></span>
                <span class="pub-rnc-result-title">${(r.titulo || 'RNC sem título').slice(0, 60)}</span>
                ${r.setor ? `<span class="pub-rnc-result-setor">${r.setor}</span>` : ''}
            </div>`).join('')
        : `<div class="pub-rnc-result-empty">Nenhuma RNC encontrada.</div>`;
    inputEl.parentElement.appendChild(dd);
};

window._pubRncSelect = function(id) {
    id = _pubRncNormId(id);
    if (!window._pubRncSelected) window._pubRncSelected = [];
    if (!window._pubRncSelected.includes(id)) window._pubRncSelected.push(id);
    const search = document.getElementById('pubRncSearch');
    if (search) search.value = '';
    _pubRncCloseResults();
    _renderPubRncChips();
};

window._pubRncToggleQuickCreate = function() {
    const qc = document.getElementById('pubRncQuickCreate');
    if (!qc) return;
    if (qc.style.display !== 'none') { qc.style.display = 'none'; qc.innerHTML = ''; return; }
    qc.innerHTML = `
        <div class="pub-rnc-quick-form">
            <input type="text" id="pubRncQcTitulo" placeholder="Título da nova RNC..." maxlength="120">
            <div class="pub-rnc-quick-class">
                ${['menor','maior','critica'].map((v, i) => `
                <label class="pub-rnc-quick-class-opt nc-${v}">
                    <input type="radio" name="pubRncQcClass" value="${v}"${i === 0 ? ' checked' : ''}>
                    ${_pubNcOpt(v).label.replace('N/C ', '')}
                </label>`).join('')}
            </div>
            <div class="pub-rnc-quick-row3">
                <div class="rnc-ac-wrap">
                    <input type="text" id="pubRncQcSetor" placeholder="Setor..." maxlength="120" autocomplete="off"
                        value="${(window._pubCurrentItemSetor || '').replace(/"/g, '&quot;')}"
                        oninput="_pubRncQcAcInput('pubRncQcSetor','pubRncQcSetorDropdown', typeof getRncSetores==='function'?getRncSetores():[])"
                        onclick="_pubRncQcAcInput('pubRncQcSetor','pubRncQcSetorDropdown', typeof getRncSetores==='function'?getRncSetores():[])">
                    <i class="fas fa-chevron-down rnc-ac-caret"></i>
                    <div class="rnc-ac-dropdown" id="pubRncQcSetorDropdown"></div>
                </div>
                <div class="rnc-ac-wrap">
                    <input type="text" id="pubRncQcOrigem" placeholder="Origem..." maxlength="120" autocomplete="off"
                        oninput="_pubRncQcAcInput('pubRncQcOrigem','pubRncQcOrigemDropdown', (typeof getRncOrigens==='function'?getRncOrigens():[]).map(o=>o.name))"
                        onclick="_pubRncQcAcInput('pubRncQcOrigem','pubRncQcOrigemDropdown', (typeof getRncOrigens==='function'?getRncOrigens():[]).map(o=>o.name))">
                    <i class="fas fa-chevron-down rnc-ac-caret"></i>
                    <div class="rnc-ac-dropdown" id="pubRncQcOrigemDropdown"></div>
                </div>
                <div class="rnc-ac-wrap">
                    <input type="text" id="pubRncQcDetalhamento" placeholder="Detalhamento..." maxlength="120" autocomplete="off"
                        oninput="_pubRncQcAcInput('pubRncQcDetalhamento','pubRncQcDetalhamentoDropdown', (typeof getRncDetalhamentos==='function'?getRncDetalhamentos():[]).map(d=>d.name))"
                        onclick="_pubRncQcAcInput('pubRncQcDetalhamento','pubRncQcDetalhamentoDropdown', (typeof getRncDetalhamentos==='function'?getRncDetalhamentos():[]).map(d=>d.name))">
                    <i class="fas fa-chevron-down rnc-ac-caret"></i>
                    <div class="rnc-ac-dropdown" id="pubRncQcDetalhamentoDropdown"></div>
                </div>
            </div>
            <textarea id="pubRncQcDescricao" placeholder="Descrição do ocorrido..." rows="2" maxlength="1000"></textarea>
            <div class="pub-rnc-quick-actions">
                <span class="pub-rnc-quick-note"><i class="fas fa-info-circle"></i> A RNC será criada imediatamente.</span>
                <button type="button" class="pub-rnc-quick-confirm" onclick="_pubRncQuickCreateConfirm()">
                    <i class="fas fa-plus"></i> Criar e associar
                </button>
            </div>
        </div>`;
    qc.style.display = '';
    document.getElementById('pubRncQcTitulo')?.focus();
};

function _pubRncQcCloseAllAc() {
    ['pubRncQcSetorDropdown', 'pubRncQcOrigemDropdown', 'pubRncQcDetalhamentoDropdown'].forEach(id => {
        const dd = document.getElementById(id);
        if (dd) dd.classList.remove('open');
    });
}

window._pubRncQcAcInput = function(inputId, dropId, items) {
    const input = document.getElementById(inputId);
    const dd = document.getElementById(dropId);
    if (!input || !dd) return;
    const val = (input.value || '').toLowerCase();
    const filtered = val ? items.filter(x => String(x).toLowerCase().indexOf(val) !== -1) : items;
    if (!filtered.length) { dd.classList.remove('open'); return; }
    dd.innerHTML = filtered.map(x => `<button type="button" class="rnc-ac-option" onclick="_pubRncQcAcSelect('${inputId}','${dropId}', this.textContent)">${(x+'').replace(/</g,'&lt;')}</button>`).join('');
    dd.classList.add('open');
};

window._pubRncQcAcSelect = function(inputId, dropId, value) {
    const input = document.getElementById(inputId);
    if (input) input.value = value;
    const dd = document.getElementById(dropId);
    if (dd) dd.classList.remove('open');
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('#pubRncQuickCreate .rnc-ac-wrap')) _pubRncQcCloseAllAc();
});

window._pubRncQuickCreateConfirm = function() {
    const _val = idEl => (document.getElementById(idEl)?.value || '').trim();
    const _markReq = (idEl, bad) => { const el = document.getElementById(idEl); if (el) el.classList.toggle('field-required-error', bad); };

    const titulo = _val('pubRncQcTitulo');
    const setor = _val('pubRncQcSetor');
    const origem = _val('pubRncQcOrigem');
    const detalhamento = _val('pubRncQcDetalhamento');
    const descricao = _val('pubRncQcDescricao');

    _markReq('pubRncQcTitulo', !titulo);
    _markReq('pubRncQcSetor', !setor);
    _markReq('pubRncQcOrigem', !origem);
    _markReq('pubRncQcDetalhamento', !detalhamento);
    _markReq('pubRncQcDescricao', !descricao);

    if (!titulo) { if (typeof showToast === 'function') showToast('Informe o título da RNC.', 'error'); document.getElementById('pubRncQcTitulo')?.focus(); return; }
    if (!setor) { if (typeof showToast === 'function') showToast('Informe o setor da RNC.', 'error'); document.getElementById('pubRncQcSetor')?.focus(); return; }
    if (!origem) { if (typeof showToast === 'function') showToast('Informe a origem da RNC.', 'error'); document.getElementById('pubRncQcOrigem')?.focus(); return; }
    if (!detalhamento) { if (typeof showToast === 'function') showToast('Informe o detalhamento da RNC.', 'error'); document.getElementById('pubRncQcDetalhamento')?.focus(); return; }
    if (!descricao) { if (typeof showToast === 'function') showToast('Informe a descrição da RNC.', 'error'); document.getElementById('pubRncQcDescricao')?.focus(); return; }

    const classificacao = document.querySelector('input[name="pubRncQcClass"]:checked')?.value || 'menor';
    if (typeof window.rncQuickCreate !== 'function') {
        if (typeof showToast === 'function') showToast('Módulo de RNC não carregado.', 'error');
        return;
    }
    const newId = window.rncQuickCreate({ titulo, setor, origem, detalhamento, descricao, classificacao });
    if (!newId) return;
    window._pubRncSelect(newId);
    window._pubRncToggleQuickCreate();
    if (typeof showToast === 'function') showToast('RNC criada e associada.', 'success');
};

function _renderPubChecklistItems() {
    const state = window._pubChecklistState || [];
    const geralItems = window._pubChecklistGeralItems || [];
    const isEditing = window._editingPubIndex != null;

    const activeItems = state.filter(c => !c.previouslyDone);
    if (state.length > 0 && activeItems.length === 0) {
        return `<div class="pub-cl-empty-done"><i class="fas fa-circle-check"></i> Todos os itens já foram concluídos em publicações anteriores.</div>`;
    }
    if (state.length === 0) {
        return `<div class="pub-cl-empty-done"><i class="fas fa-circle-check"></i> Todos os itens já foram concluídos em publicações anteriores.</div>`;
    }

    const roNotice = isEditing
        ? `<div class="pub-cl-readonly-notice"><i class="fas fa-lock"></i> O checklist não pode ser alterado ao editar uma publicação.</div>`
        : '';

    // Agrupa itens por geralIndex
    const groups = new Map();
    state.forEach((c, i) => {
        const key = c.geralIndex != null ? c.geralIndex : '__solo__';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ c, i });
    });

    let html = '';

    // Grupos associados ao checklist geral (em ordem de índice)
    const sortedKeys = [...groups.keys()].filter(k => k !== '__solo__').sort((a, b) => a - b);
    sortedKeys.forEach(gi => {
        const entries = groups.get(gi);
        const geralItem = geralItems[gi];
        const geralText = geralItem ? (geralItem.texto || `Item Geral ${gi + 1}`) : `Item Geral ${gi + 1}`;
        const allDone = entries.every(e => e.c.checked || e.c.previouslyDone);
        html += `<div class="pub-cl-group">
            <div class="pub-cl-group-header${allDone ? ' all-done' : ''}">
                <i class="fas fa-layer-group"></i>
                <span>${geralText}</span>
                ${allDone ? '<i class="fas fa-check-circle pub-cl-group-done-icon"></i>' : ''}
            </div>
            ${entries.map(({ c, i }) => _renderPubClItem(c, i)).join('')}
        </div>`;
    });

    // Itens sem associação
    const solo = groups.get('__solo__') || [];
    if (solo.length > 0) {
        if (sortedKeys.length > 0) {
            html += `<div class="pub-cl-group pub-cl-group-standalone">
                <div class="pub-cl-group-header">
                    <i class="fas fa-list-check"></i><span>Outros itens</span>
                </div>
                ${solo.map(({ c, i }) => _renderPubClItem(c, i)).join('')}
            </div>`;
        } else {
            html += solo.map(({ c, i }) => _renderPubClItem(c, i)).join('');
        }
    }

    return roNotice + html;
}

function _updatePubClToggleBtn() {
    const btn = document.getElementById('pubClToggleAllBtn');
    if (!btn) return;
    const state = window._pubChecklistState || [];
    // Esconde botão ao editar (checklist é somente leitura)
    if (window._editingPubIndex != null || state.length === 0) { btn.style.display = 'none'; return; }
    btn.style.display = '';
    btn.textContent = state.every(c => c.checked) ? 'Desmarcar todos' : 'Marcar todos';
}

window.togglePubClItem = function(i, cb) {
    if (!window._pubChecklistState || !window._pubChecklistState[i]) return;
    const c = window._pubChecklistState[i];
    c.checked = cb.checked;
    const showNc = c.ncEnabled && window._pubNcUiEnabled;
    if (showNc) {
        if (cb.checked) {
            if (!c.conformidade) c.conformidade = 'conforme';
        } else {
            c.conformidade = null;
        }
        const ncBtn = document.querySelector(`.pub-cl-nc-btn[data-pub-nc-index="${i}"]`);
        if (ncBtn) ncBtn.outerHTML = _pubNcBtnHtml(c, i);
    }
    const label = cb.closest('.pub-cl-item');
    if (label) {
        label.classList.toggle('checked', cb.checked);
        if (c.requiredForPub) {
            label.classList.toggle('pub-cl-required-warn', !cb.checked);
        }
        if (showNc) {
            label.classList.toggle('pub-cl-nc-warn', !!c.checked !== !!c.conformidade);
        }
    }
    _updatePubClToggleBtn();
    _updatePubQualityScore();
    _updatePubRncSection();
};

// ─── NOTA DE QUALIDADE — baseada em N/C dos itens marcados ────
function _computePubQualityScore() {
    const state = window._pubChecklistState || [];
    // Considera marcados nesta publicação + já concluídos anteriormente no mesmo ciclo
    const eligible = state.filter(c => c.ncEnabled && (c.checked || c.previouslyDone));
    const total = eligible.length;
    if (total === 0) return null;
    const ok = eligible.filter(c => c.conformidade === 'conforme').length;
    const nota = Math.round((ok / total) * 10 * 10) / 10;
    return { nota, ok, total };
}

function _pubQualityTier(nota) {
    if (nota >= 8) return 'good';
    if (nota >= 5) return 'mid';
    return 'bad';
}

function _pubQualityCardHtml(score) {
    const tier = _pubQualityTier(score.nota);
    const pct = Math.max(0, Math.min(100, (score.nota / 10) * 100));
    return `
        <div class="pub-quality-card pub-quality-${tier}">
            <div class="pub-quality-icon"><i class="fas fa-gauge-high"></i></div>
            <div class="pub-quality-body">
                <div class="pub-quality-top">
                    <span class="pub-quality-label">Qualidade</span>
                    <span class="pub-quality-value">${score.nota.toFixed(1).replace('.0','')}<span class="pub-quality-max">/10</span></span>
                </div>
                <div class="pub-quality-bar-track">
                    <div class="pub-quality-bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="pub-quality-sub">${score.ok} de ${score.total} itens em conformidade</div>
            </div>
        </div>`;
}

// Versão para snapshot já salvo (visualização de publicação existente)
function _computePubQualityScoreFromSnapshot(clItems) {
    const eligible = (clItems || []).filter(c => c.ncEnabled && c.checked);
    const total = eligible.length;
    if (total === 0) return null;
    const ok = eligible.filter(c => c.conformidade === 'conforme').length;
    const nota = Math.round((ok / total) * 10 * 10) / 10;
    return { nota, ok, total };
}

function _updatePubQualityScore() {
    const wrap = document.getElementById('pubQualityScoreWrap');
    if (!wrap) return;
    if (!window._pubNcUiEnabled) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
    const score = _computePubQualityScore();
    if (!score) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
    wrap.style.display = '';
    wrap.innerHTML = _pubQualityCardHtml(score);
}

window.toggleAllPubChecklist = function() {
    if (!window._pubChecklistState || window._pubChecklistState.length === 0) return;
    const allChecked = window._pubChecklistState.every(c => c.checked);
    const newState = !allChecked;
    window._pubChecklistState.forEach(c => {
        c.checked = newState;
        if (c.ncEnabled && window._pubNcUiEnabled) {
            if (newState) {
                if (!c.conformidade) c.conformidade = 'conforme';
            } else {
                c.conformidade = null;
            }
        }
    });
    document.getElementById('pubChecklistItems').innerHTML = _renderPubChecklistItems();
    _updatePubClToggleBtn();
    _updatePubQualityScore();
    _updatePubRncSection();
};

window.openPublicacaoModal = function(editIndex) {
    const id = window._currentViewId;
    const tab = window._currentViewTab;
    if (id === undefined || !tab) return;

    const finalTab = _normalizeTab(tab);
    let item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === id);
    else if (finalTab === 'rnc') item = (window.rncItems || []).find(i => i.id === id);
    if (!item) return;

    // Verificar permissão de publicação
    if (typeof userCanPublish === 'function' && !userCanPublish(item)) {
        if (typeof showToast === 'function') showToast('Você não tem permissão para publicar neste card.', 'error');
        return;
    }
    // Para edição, verificar permissão de gerenciar publicações
    const isEditing = editIndex !== undefined && editIndex !== null;
    if (isEditing && typeof userCanManagePubs === 'function' && !userCanManagePubs(item)) {
        if (typeof showToast === 'function') showToast('Você não tem permissão para editar publicações.', 'error');
        return;
    }



    window._editingPubIndex = isEditing ? editIndex : null;
    const existingPub = isEditing ? (item.publicacoes || [])[editIndex] : null;

    // Registro de conformidade (N/C) — exclusivo para rotinas
    window._pubNcUiEnabled = (finalTab === 'auditoria');
    window._pubRncSelected = existingPub ? [...(existingPub.rncIds || [])] : [];
    window._pubCurrentItemSetor = item.setor || '';

    // Carrega anexos existentes ou limpa
    if (typeof restoreAnexosUpload === 'function') {
        restoreAnexosUpload('pub', existingPub ? (existingPub.anexos || []) : []);
    }

    // Título e subtítulo do modal
    const modalTitle = document.querySelector('#modalPublicacao .modal-header h3');
    if (modalTitle) modalTitle.textContent = isEditing ? 'Editar Publicação' : 'Nova Publicação';
    document.getElementById('pubModalSubtitle').textContent = item.titulo || '';

    const btnConfirmar = document.getElementById('btn-confirmar-publicacao');
    if (btnConfirmar) {
        btnConfirmar.innerHTML = isEditing
            ? '<i class="fas fa-save"></i> Salvar'
            : '<i class="fas fa-paper-plane"></i> Publicar';
    }

    const fieldsEl = document.getElementById('pubModalFields');
    const now = new Date();
    const dateVal = existingPub ? (existingPub.data || now.toISOString().split('T')[0]) : now.toISOString().split('T')[0];
    const timeVal = existingPub ? (existingPub.hora || _nowTimeStr()) : now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const descVal = existingPub ? (existingPub.descricao || '') : '';

    let fieldsHtml = '';
    if (finalTab === 'treinamentos') {
        const chParts = existingPub && existingPub.cargaHoraria ? existingPub.cargaHoraria.split(':') : ['00','00'];
        fieldsHtml = `
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field-group">
                <label>Data <span class="req-star">*</span></label>
                <input type="date" id="pubData" value="${dateVal}">
            </div>
            <div class="field-group">
                <label>Hora <span class="req-star">*</span></label>
                <input type="time" id="pubHora" value="${timeVal}">
            </div>
            <div class="field-group">
                <label>Instrutor</label>
                <input type="text" id="pubInstrutor" placeholder="Nome do instrutor" value="${existingPub ? (existingPub.instrutor || '') : ''}">
            </div>
            <div class="field-group">
                <label>Carga Horária (HH:MM)</label>
                <div style="display:flex;gap:6px;align-items:center;">
                    <input type="number" id="pubCHoras" min="0" max="23" placeholder="00" style="width:60px;text-align:center;" value="${chParts[0] || '00'}">
                    <span>:</span>
                    <input type="number" id="pubCMinutos" min="0" max="59" placeholder="00" style="width:60px;text-align:center;" value="${chParts[1] || '00'}">
                </div>
            </div>
            <div class="field-group full-width">
                <label>Participantes</label>
                <textarea id="pubParticipantes" rows="2" placeholder="Nomes dos participantes...">${existingPub ? (existingPub.participantes || '') : ''}</textarea>
            </div>
            <div class="field-group full-width">
                <label>Local do Evento</label>
                <input type="text" id="pubLocal" placeholder="Ex: Sala de Treinamento A" value="${existingPub ? (existingPub.localEvento || '') : ''}">
            </div>
            <div class="field-group full-width">
                <label>Descrição <span class="req-star">*</span></label>
                <textarea id="pubDescricao" rows="3" placeholder="Descreva o treinamento realizado...">${descVal}</textarea>
            </div>
        </div>`;
    } else if (finalTab === 'documentos') {
        fieldsHtml = `
        <div class="form-grid" style="grid-template-columns:2fr 1fr;gap:12px;">
            <div class="field-group">
                <label>Título da Publicação</label>
                <input type="text" id="pubTitulo" placeholder="Título desta revisão/publicação" value="${existingPub ? (existingPub.titulo || '') : ''}">
            </div>
            <div class="field-group">
                <label>Data <span class="req-star">*</span></label>
                <input type="date" id="pubData" value="${dateVal}">
            </div>
            <div class="field-group full-width">
                <label>Descrição <span class="req-star">*</span></label>
                <textarea id="pubDescricao" rows="3" placeholder="Descreva as alterações ou o conteúdo...">${descVal}</textarea>
            </div>
        </div>
        ${!isEditing ? `<div style="padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;margin-top:4px;">
            <i class="fas fa-info-circle"></i> O anexo é obrigatório para documentos.
        </div>` : ''}`;
    } else {
        const tipoVal = existingPub ? (existingPub.tipo || 'Comentário') : 'Atualização';
        const showHora = finalTab !== 'auditoria';
        fieldsHtml = `
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field-group">
                <label>Tipo</label>
                <select id="pubTipo">
                    <option value="Atualização"${tipoVal==='Atualização'?' selected':''}>Atualização</option>
                    <option value="Comentário"${tipoVal==='Comentário'?' selected':''}>Comentário</option>
                    <option value="Evidência"${tipoVal==='Evidência'?' selected':''}>Evidência</option>
                </select>
            </div>
            <div class="field-group">
                <label>Data <span class="req-star">*</span></label>
                <input type="date" id="pubData" value="${dateVal}">
            </div>
            ${showHora ? `<div class="field-group">
                <label>Hora <span class="req-star">*</span></label>
                <input type="time" id="pubHora" value="${timeVal}">
            </div>` : ''}
            <div class="field-group full-width">
                <label>Descrição <span class="req-star">*</span></label>
                <textarea id="pubDescricao" rows="3" placeholder="Descreva o comentário, atualização ou evidência...">${descVal}</textarea>
            </div>
        </div>`;
    }

    fieldsEl.innerHTML = fieldsHtml;

    // Checklist de publicação
    const pubCL = item.checklistPublicacao || [];
    const clWrap = document.getElementById('pubChecklistWrap');
    const clItems = document.getElementById('pubChecklistItems');
    if (clWrap && clItems) {
        if (isEditing && existingPub && existingPub.checklistSnapshot && existingPub.checklistSnapshot.length > 0) {
            // Edição: restaura snapshot da publicação específica
            window._pubChecklistState = existingPub.checklistSnapshot.map(c => ({ ...c }));
            window._pubChecklistGeralItems = item.checklist || [];
            clItems.innerHTML = _renderPubChecklistItems();
            clWrap.style.display = '';
            _updatePubClToggleBtn();
        } else if (pubCL.length > 0 && !isEditing) {
            // Acumula itens concluídos no ciclo atual (mesmo pubCycleId ou dataConclusaoRef)
            const _currentCycle = item.pubCycleId || 1;
            const _currentDateRef = item.dataPublicacao || item.dataConclusao || null;
            const _key = c => c.id || ('t:' + (c.texto || '').trim());
            const completedKeys = new Set();
            const completedConformidade = new Map();
            (item.publicacoes || []).forEach(pub => {
                const isCurrent = pub.pubCycleId
                    ? pub.pubCycleId === _currentCycle
                    : (pub.dataConclusaoRef === _currentDateRef);
                if (!isCurrent) return;
                (pub.checklistSnapshot || []).forEach(snap => {
                    if (snap.checked) {
                        completedKeys.add(_key(snap));
                        if (snap.ncEnabled && snap.conformidade) completedConformidade.set(_key(snap), snap.conformidade);
                    }
                });
            });

            window._pubChecklistGeralItems = item.checklist || [];
            // Todos os itens do ciclo, marcando os já concluídos como "previouslyDone"
            // (mantém a conformidade registrada anteriormente para entrar na nota de Qualidade)
            window._pubChecklistState = pubCL.map(c => ({
                ...c,
                checked: false,
                previouslyDone: completedKeys.has(_key(c)),
                conformidade: completedConformidade.get(_key(c)) || null
            }));
            clItems.innerHTML = _renderPubChecklistItems();
            clWrap.style.display = '';
            _updatePubClToggleBtn();
        } else {
            clWrap.style.display = 'none';
            window._pubChecklistState = [];
            window._pubChecklistGeralItems = [];
        }
    }

    _updatePubRncSection();
    _updatePubQualityScore();

    closeModal('modalVerPublicacao');
    document.getElementById('modalPublicacao').style.display = 'flex';
};

window.confirmarPublicacao = function() {
    const id = window._currentViewId;
    const tab = window._currentViewTab;
    const finalTab = _normalizeTab(tab);
    let item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === id);
    else if (finalTab === 'rnc') item = (window.rncItems || []).find(i => i.id === id);
    if (!item) return;

    const isEditing = window._editingPubIndex !== null && window._editingPubIndex !== undefined;
    const editIndex = window._editingPubIndex;

    const dataVal = document.getElementById('pubData')?.value || _nowDateStr();
    const horaVal = document.getElementById('pubHora')?.value || (finalTab !== 'documentos' ? _nowTimeStr() : '');
    const descVal = document.getElementById('pubDescricao')?.value.trim() || '';

    const anexos = (typeof getAnexosUpload === 'function') ? getAnexosUpload('pub') : [];

    // Validações obrigatórias
    const _markReq = (id, bad) => { const el = document.getElementById(id); if (el) el.classList.toggle('field-required-error', bad); };
    const _dataOk = !!dataVal, _horaOk = (finalTab === 'documentos' || finalTab === 'auditoria') ? true : !!horaVal, _descOk = !!descVal;
    _markReq('pubData', !_dataOk); _markReq('pubHora', !_horaOk); _markReq('pubDescricao', !_descOk);
    if (!_dataOk) { if (typeof showToast === 'function') showToast('Data é obrigatória.', 'error'); document.getElementById('pubData')?.focus(); return; }
    if (!_horaOk) { if (typeof showToast === 'function') showToast('Hora é obrigatória.', 'error'); document.getElementById('pubHora')?.focus(); return; }
    if (!_descOk) { if (typeof showToast === 'function') showToast('Descrição é obrigatória.', 'error'); document.getElementById('pubDescricao')?.focus(); return; }
    // Checklist de publicação: apenas itens obrigatórios (requiredForPub) devem estar marcados
    if (!isEditing && window._pubChecklistState && window._pubChecklistState.length > 0) {
        const requiredItems = window._pubChecklistState.filter(c => !!c.requiredForPub);
        const hasRequiredUnchecked = requiredItems.some(c => !c.checked);
        if (hasRequiredUnchecked) {
            // Re-renderizar para mostrar avisos visuais nos itens obrigatórios não marcados
            document.getElementById('pubChecklistItems').innerHTML = _renderPubChecklistItems();
            const count = requiredItems.filter(c => !c.checked).length;
            if (typeof showToast === 'function') showToast(`${count} item(s) obrigatório(s) do checklist não foram marcados.`, 'error');
            return;
        }
    }
    // Registro de conformidade (N/C): se o checkbox está marcado, exige tipo selecionado;
    // se um tipo foi selecionado, exige o checkbox marcado.
    if (!isEditing && window._pubNcUiEnabled && window._pubChecklistState && window._pubChecklistState.length > 0) {
        const ncItems = window._pubChecklistState.filter(c => !!c.ncEnabled && !c.previouslyDone);
        const mismatched = ncItems.filter(c => !!c.checked !== !!c.conformidade);
        if (mismatched.length > 0) {
            document.getElementById('pubChecklistItems').innerHTML = _renderPubChecklistItems();
            const msg = mismatched.some(c => c.checked && !c.conformidade)
                ? 'Selecione o tipo de conformidade para os itens marcados.'
                : 'Marque o checkbox dos itens com tipo de conformidade selecionado.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            return;
        }
    }
    // Validação doc: anexo obrigatório apenas para novas publicações
    if (!isEditing && finalTab === 'documentos' && anexos.length === 0) {
        if (typeof showToast === 'function') showToast('Anexo obrigatório para publicações de documentos.', 'error');
        return;
    }

    if (!item.publicacoes) item.publicacoes = [];

    // Preserva id original ao editar
    const existingId = isEditing ? (item.publicacoes[editIndex]?.id || Date.now()) : Date.now();

    // Garante que o item tenha um ciclo de conclusão
    if (!item.pubCycleId) item.pubCycleId = 1;

    let pub = {
        id: existingId,
        data: dataVal,
        hora: horaVal,
        descricao: descVal,
        usuario: isEditing ? (item.publicacoes[editIndex]?.usuario || '') : (window.currentuser ? (window.currentuser.name || window.currentuser.user || '') : ''),
        anexos: anexos,
        pubCycleId: isEditing ? (item.publicacoes[editIndex]?.pubCycleId || item.pubCycleId) : item.pubCycleId,
        dataConclusaoRef: item.dataPublicacao || item.dataConclusao || null
    };

    // Salva snapshot do checklist de publicação (com id e geralIndex para rastreabilidade)
    if (window._pubChecklistState && window._pubChecklistState.length > 0) {
        pub.checklistSnapshot = window._pubChecklistState.map(c => ({
            id: c.id || null,
            texto: c.texto,
            checked: c.checked,
            requiredForPub: !!c.requiredForPub,
            geralIndex: c.geralIndex != null ? c.geralIndex : null,
            ...(c.ncEnabled && c.conformidade ? { ncEnabled: true, conformidade: c.conformidade } : {}),
            ...(c.comentario && c.comentario.trim() ? { comentario: c.comentario.trim() } : {})
        }));
    } else if (isEditing && item.publicacoes[editIndex]?.checklistSnapshot) {
        pub.checklistSnapshot = item.publicacoes[editIndex].checklistSnapshot;
    }

    // Associação opcional a RNCs quando houver não conformidade registrada
    const _hasNc = (pub.checklistSnapshot || []).some(c => c.conformidade && c.conformidade !== 'conforme');
    if (_hasNc && Array.isArray(window._pubRncSelected) && window._pubRncSelected.length > 0) {
        pub.rncIds = [...window._pubRncSelected];
    }
    window._pubRncSelected = [];

    if (finalTab === 'treinamentos') {
        const horas = parseInt(document.getElementById('pubCHoras')?.value) || 0;
        const minutos = parseInt(document.getElementById('pubCMinutos')?.value) || 0;
        pub.tipo = 'Treinamento';
        pub.instrutor = document.getElementById('pubInstrutor')?.value || '';
        pub.participantes = document.getElementById('pubParticipantes')?.value || '';
        pub.localEvento = document.getElementById('pubLocal')?.value || '';
        pub.cargaHoraria = `${String(horas).padStart(2,'0')}:${String(minutos).padStart(2,'0')}`;
    } else if (finalTab === 'documentos') {
        pub.tipo = 'Documento';
        pub.titulo = document.getElementById('pubTitulo')?.value || '';
    } else {
        pub.tipo = document.getElementById('pubTipo')?.value || 'Comentário';
    }

    if (isEditing) {
        item.publicacoes[editIndex] = pub;
        // Reavalia marcação geral ao editar publicação
        _autoMarkGeralFromPub(item);
        _autoUnmarkGeralFromPub(item);
    } else {
        item.publicacoes.unshift(pub);
        _updateItemDatesAfterPublicacao(item, finalTab, dataVal);
        // Auto-marca itens do checklist geral quando todos os associados estiverem concluídos
        _autoMarkGeralFromPub(item);
        // Auto-desmarca itens que tinham pub concluída mas agora há novos itens pendentes
        _autoUnmarkGeralFromPub(item);
    }

    window._editingPubIndex = null;
    saveAll();
    closeModal('modalPublicacao');

    if (finalTab === 'rnc') {
        if (typeof window.rncRefreshViewPubs === 'function') window.rncRefreshViewPubs();
        if (typeof showToast === 'function') showToast(isEditing ? 'Publicação atualizada com sucesso!' : 'Publicação registrada com sucesso!', 'success');
        return;
    }
    if (typeof renderViewContent === 'function') renderViewContent(id, finalTab);
    const pubTab = document.querySelector('.view-modal-tab:last-child');
    if (pubTab) switchViewTab('publicacoes', pubTab);
    renderViewPublicacoes(item);
    _updatePubTabBadge(item);
    renderCards();
    if (typeof showToast === 'function') showToast(isEditing ? 'Publicação atualizada com sucesso!' : 'Publicação registrada com sucesso!', 'success');
};

// Marca automaticamente itens do checklist geral cujos itens de publicação
// associados foram todos concluídos ao longo das publicações do item.
function _autoUnmarkGeralFromPub(item) {
    const pubCL = item.checklistPublicacao || [];
    const geral = item.checklist || [];
    if (!geral.length || !pubCL.length) return;

    const _key = c => c.id || ('t:' + (c.texto || '').trim());
    const _currentCycle = item.pubCycleId || 1;
    const _currentDateRef = item.dataPublicacao || item.dataConclusao || null;

    // Acumula chaves concluídas no ciclo atual
    const completedKeys = new Set();
    (item.publicacoes || []).forEach(pub => {
        const isCurrent = pub.pubCycleId
            ? pub.pubCycleId === _currentCycle
            : (pub.dataConclusaoRef === _currentDateRef);
        if (!isCurrent) return;
        (pub.checklistSnapshot || []).forEach(snap => {
            if (snap.checked) completedKeys.add(_key(snap));
        });
    });

    const usedGi = [...new Set(pubCL.filter(c => c.geralIndex != null).map(c => c.geralIndex))];
    usedGi.forEach(gi => {
        if (gi < 0 || gi >= geral.length || !geral[gi].checked) return;
        const assoc = pubCL.filter(c => c.geralIndex === gi);
        if (!assoc.length) return;
        if (!assoc.every(c => completedKeys.has(_key(c)))) {
            geral[gi].checked = false;
        }
    });
}

function _autoMarkGeralFromPub(item) {
    const pubCL = item.checklistPublicacao || [];
    const geral = item.checklist || [];
    if (!geral.length || !pubCL.length) return;

    const _key = c => c.id || ('t:' + (c.texto || '').trim());
    const _currentCycle = item.pubCycleId || 1;
    const _currentDateRef = item.dataPublicacao || item.dataConclusao || null;

    // Acumula chaves concluídas em TODAS as pubs do ciclo atual
    const completedKeys = new Set();
    (item.publicacoes || []).forEach(pub => {
        const isCurrent = pub.pubCycleId
            ? pub.pubCycleId === _currentCycle
            : (pub.dataConclusaoRef === _currentDateRef);
        if (!isCurrent) return;
        (pub.checklistSnapshot || []).forEach(snap => {
            if (snap.checked) completedKeys.add(_key(snap));
        });
    });

    const usedGi = [...new Set(pubCL.filter(c => c.geralIndex != null).map(c => c.geralIndex))];
    usedGi.forEach(gi => {
        if (gi < 0 || gi >= geral.length || geral[gi].checked) return;
        const associated = pubCL.filter(c => c.geralIndex === gi);
        if (!associated.length) return;
        if (associated.every(c => completedKeys.has(_key(c)))) {
            geral[gi].checked = true;
        }
    });
}

function _updateItemDatesAfterPublicacao(item, tab, newDate) {
    if (tab === 'auditoria') {
        // Usa a data da publicação mais recente (publicacoes já ordenadas desc)
        const pubs = item.publicacoes || [];
        const dates = pubs.map(p => p.data).filter(Boolean).sort().reverse();
        item.dataPublicacao = dates[0] || newDate;
        // Recalcular dataPrevisao se rotina configurada
        _calcAuditNextDate(item);
    } else if (tab === 'atividades') {
        item.dataInicio = newDate;
    } else if (tab === 'treinamentos') {
        item.dataPublicacao = newDate;
        _calcRotinaNextDate(item, item.dataPublicacao, 'dataPrevisao');
    } else if (tab === 'documentos') {
        item.dataCriacao = newDate;
        _calcRotinaNextDate(item, item.dataCriacao, 'dataProximaRevisao');
    }
}

function _calcRotinaNextDate(item, baseDate, targetField) {
    const rotina = item.rotina || 'pontual';
    if (rotina === 'pontual') return;
    const freq = Number(item.frequencia) || 1;
    const base = baseDate ? new Date(baseDate + 'T00:00:00') : new Date();
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
        if (days.length === 0) return;
        const tomorrow = new Date(base);
        tomorrow.setDate(tomorrow.getDate() + 1);
        for (let i = 0; i < 14; i++) {
            const d = new Date(tomorrow);
            d.setDate(tomorrow.getDate() + i);
            if (days.includes(d.getDay())) { next = d; break; }
        }
    }
    item[targetField] = next.toISOString().split('T')[0];
}

function _calcAuditNextDate(item) {
    const rotina = item.rotina || 'pontual';
    if (rotina === 'pontual') return;
    const freq = Number(item.frequencia) || 1;
    const base = item.dataPublicacao ? new Date(item.dataPublicacao + 'T00:00:00') : new Date();
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
        if (days.length === 0) return;
        const tomorrow = new Date(base);
        tomorrow.setDate(tomorrow.getDate() + 1);
        for (let i = 0; i < 14; i++) {
            const d = new Date(tomorrow);
            d.setDate(tomorrow.getDate() + i);
            if (days.includes(d.getDay())) { next = d; break; }
        }
    }
    item.dataPrevisao = next.toISOString().split('T')[0];
}

// ─── SUB-ABA DE PUBLICAÇÕES ───────────────────────────────────
window._pubSubtabAtivo = 'Todos';

window.switchPubSubtab = function(tipo, btn) {
    window._pubSubtabAtivo = tipo;
    _vpPubPage = 1;
    document.querySelectorAll('.pub-subtab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const allItems = [...(audits||[]),...(trainings||[]),...(activities||[]),...(documents||[]),...(maintenances||[])];
    const item = allItems.find(i => i.id === currentViewItemId);
    if (item) renderViewPublicacoes(item);
};

// ─── RENDER PUBLICAÇÕES (aba view modal) ─────────────────────
var _vpPubPage = 1;
var _vpPubSortCol = 'data';
var _vpPubSortDir = 'desc'; // padrão: mais novo primeiro
var _VP_PUB_PER_PAGE = 10;

window._vpSortPublicacoes = function(col) {
    if (_vpPubSortCol === col) {
        _vpPubSortDir = _vpPubSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        _vpPubSortCol = col;
        _vpPubSortDir = col === 'data' ? 'desc' : 'asc';
    }
    _vpPubPage = 1;
    const allItems = [...(audits||[]),...(trainings||[]),...(activities||[]),...(documents||[]),...(maintenances||[])];
    const item = allItems.find(i => i.id === currentViewItemId);
    if (item) renderViewPublicacoes(item);
};
window._vpGoPage = function(page) {
    _vpPubPage = page;
    const allItems = [...(audits||[]),...(trainings||[]),...(activities||[]),...(documents||[]),...(maintenances||[])];
    const item = allItems.find(i => i.id === currentViewItemId);
    if (item) renderViewPublicacoes(item);
};

// ─── Agrupamento de publicações por ciclo de conclusão + nota de qualidade ───
// Reaproveitado pelo header dos grupos (aba Todos) e pelo gráfico (aba Gráfico).
function _getPubGroupsWithQuality(item) {
    const allPubs = item.publicacoes || [];
    const _clKey = c => c.id || ('t:' + (c.texto || '').trim());
    const _currentCycle = item.pubCycleId || 1;
    const _currentDateRef = item.dataPublicacao || item.dataConclusao || null;
    const _hasConclusaoGroups = allPubs.some(p => !!p.pubCycleId || !!p.dataConclusaoRef);
    if (!_hasConclusaoGroups) return [];

    const _groups = {};
    const _SEM_GRUPO = '__sem_conclusao__';
    const _CURRENT_KEY = `cycle_${_currentCycle}`;
    allPubs.forEach(p => {
        let key;
        if (p.pubCycleId) key = `cycle_${p.pubCycleId}`;
        else if (p.dataConclusaoRef) key = (p.dataConclusaoRef === _currentDateRef) ? _CURRENT_KEY : p.dataConclusaoRef;
        else key = _SEM_GRUPO;
        if (!_groups[key]) _groups[key] = { pubs: [], dateRef: p.dataConclusaoRef || null };
        _groups[key].pubs.push(p);
    });

    const _sortedKeys = Object.keys(_groups).sort((a, b) => {
        if (a === _SEM_GRUPO) return 1;
        if (b === _SEM_GRUPO) return -1;
        if (a === _CURRENT_KEY) return -1;
        if (b === _CURRENT_KEY) return 1;
        const aIsCycle = a.startsWith('cycle_');
        const bIsCycle = b.startsWith('cycle_');
        if (aIsCycle && bIsCycle) return parseInt(b.slice(6)) - parseInt(a.slice(6));
        if (aIsCycle) return -1;
        if (bIsCycle) return 1;
        return b.localeCompare(a);
    });

    return _sortedKeys.filter(k => k !== _SEM_GRUPO).map(key => {
        const grp = _groups[key];
        const labelDate = (key === _CURRENT_KEY) ? _currentDateRef : grp.dateRef;
        // Ordena as pubs do grupo por data/hora para deduplicar mantendo o preenchimento mais recente
        const sortedPubs = grp.pubs.slice().sort((a, b) => {
            const ka = (a.data || '') + 'T' + (a.hora || '');
            const kb = (b.data || '') + 'T' + (b.hora || '');
            return ka.localeCompare(kb);
        });
        const byKey = new Map();
        sortedPubs.forEach(pub => {
            (pub.checklistSnapshot || []).forEach(snap => {
                if (snap.ncEnabled && snap.checked) byKey.set(_clKey(snap), snap);
            });
        });
        const quality = _computePubQualityScoreFromSnapshot(Array.from(byKey.values()));
        return { key, dateRef: labelDate, pubs: grp.pubs, quality };
    }).reverse(); // cronológico (mais antigo → mais recente) para o gráfico
}

// ─── INDICADORES POR CHECKLIST GERAL — nota de conformidade de cada grupo ────
// Para as publicações de um grupo de conclusão, deduplica os itens N/C (mantendo
// o preenchimento mais recente) e calcula a conformidade de cada checklist geral
// (agrupado por geralIndex). Retorna também o resumo de conformidade geral.
function _computePubGeralScores(item, groupPubs) {
    const _clKey = c => c.id || ('t:' + (c.texto || '').trim());
    const geralItems = item.checklist || [];

    // Deduplica itens N/C mantendo o preenchimento mais recente por item
    const sortedPubs = (groupPubs || []).slice().sort((a, b) => {
        const ka = (a.data || '') + 'T' + (a.hora || '');
        const kb = (b.data || '') + 'T' + (b.hora || '');
        return ka.localeCompare(kb);
    });
    const byKey = new Map();
    sortedPubs.forEach(pub => {
        (pub.checklistSnapshot || []).forEach(snap => {
            if (snap.ncEnabled && snap.checked) byKey.set(_clKey(snap), snap);
        });
    });
    const items = Array.from(byKey.values());
    if (items.length === 0) return null;

    // Agrupa por geralIndex
    const buckets = new Map(); // geralIndex (ou '__solo__') -> { ok, total }
    items.forEach(snap => {
        const key = (snap.geralIndex != null) ? snap.geralIndex : '__solo__';
        if (!buckets.has(key)) buckets.set(key, { ok: 0, total: 0 });
        const b = buckets.get(key);
        b.total++;
        if (snap.conformidade === 'conforme') b.ok++;
    });

    const bars = [];
    // Preserva a ordem do checklist geral
    const geralKeys = [...buckets.keys()].filter(k => k !== '__solo__').sort((a, b) => a - b);
    geralKeys.forEach(gi => {
        const b = buckets.get(gi);
        const geralItem = geralItems[gi];
        const label = geralItem ? (geralItem.texto || `Item Geral ${gi + 1}`) : `Item Geral ${gi + 1}`;
        bars.push({ label, ok: b.ok, total: b.total, pct: Math.round((b.ok / b.total) * 100) });
    });
    if (buckets.has('__solo__')) {
        const b = buckets.get('__solo__');
        bars.push({ label: 'Outros itens', ok: b.ok, total: b.total, pct: Math.round((b.ok / b.total) * 100) });
    }

    // Resumo de conformidade geral
    const totalOk = items.filter(s => s.conformidade === 'conforme').length;
    const total = items.length;
    const pctGeral = Math.round((totalOk / total) * 1000) / 10; // 1 casa decimal
    const nota = Math.round((totalOk / total) * 10 * 10) / 10;
    return { bars, ok: totalOk, total, ncCount: total - totalOk, pctGeral, nota };
}

function _pubGeralTierPct(pct) {
    if (pct >= 80) return 'good';
    if (pct >= 50) return 'mid';
    return 'bad';
}

let _pubGeralChartInstance = null;

// Abre o modal de indicadores (gráfico de barras por checklist geral) de um grupo de conclusão
window.openPubGeralChart = function(groupKey) {
    const itemId = window._currentViewId;
    const tab = window._currentViewTab;
    const finalTab = (typeof _normalizeTab === 'function') ? _normalizeTab(tab) : tab;
    let item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === itemId);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === itemId);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === itemId);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === itemId);
    else if (finalTab === 'rnc') item = (window.rncItems || []).find(i => i.id === itemId);
    if (!item) return;

    const group = _getPubGroupsWithQuality(item).find(g => g.key === groupKey);
    if (!group) return;
    const scores = _computePubGeralScores(item, group.pubs);
    if (!scores) return;

    const tier = _pubGeralTierPct(scores.pctGeral);
    const tierLabel = tier === 'good' ? 'Satisfatório' : (tier === 'mid' ? 'Atenção' : 'Crítico');
    const dateLabel = group.dateRef ? _formatDateBR(group.dateRef) : '—';
    const pctStr = scores.pctGeral.toFixed(1).replace('.0', '').replace('.', ',');

    const overlay = document.createElement('div');
    overlay.id = 'pubGeralChartModal';
    overlay.className = 'cl-reset-overlay pub-geral-overlay';
    overlay.innerHTML = `
        <div class="pub-geral-card pub-geral-${tier}">
            <div class="pub-geral-header">
                <div class="cl-reset-header-icon"><i class="fas fa-chart-column"></i></div>
                <div style="flex:1;min-width:0;">
                    <div class="cl-reset-title">Indicadores por Checklist Geral</div>
                    <div class="cl-reset-subtitle">Conclusão: ${dateLabel}</div>
                </div>
                <button type="button" class="pub-geral-close" title="Fechar"><i class="fas fa-times"></i></button>
            </div>
            <div class="pub-geral-body">
                <div class="pub-geral-summary pub-geral-${tier}">
                    <span class="pub-geral-summary-label">Conformidade Geral</span>
                    <span class="pub-geral-summary-pct">${pctStr}<small>%</small></span>
                    <span class="pub-geral-summary-nota">Nota final: ${scores.nota.toFixed(1).replace('.0','').replace('.', ',')}</span>
                    <span class="pub-geral-summary-tier">${tierLabel}</span>
                    <div class="pub-geral-summary-counts">
                        <span><i class="fas fa-circle-check"></i> ${scores.ok} itens conformes</span>
                        <span><i class="fas fa-triangle-exclamation"></i> ${scores.ncCount} não conformes</span>
                        <span><i class="fas fa-list-check"></i> ${scores.total} itens avaliados</span>
                    </div>
                </div>
                <div class="pub-geral-chart-wrap">
                    <canvas id="pubGeralChartCanvas"></canvas>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const close = () => {
        if (_pubGeralChartInstance) { _pubGeralChartInstance.destroy(); _pubGeralChartInstance = null; }
        overlay.remove();
    };
    const onEsc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } };
    const _close = () => { close(); document.removeEventListener('keydown', onEsc); };
    overlay.querySelector('.pub-geral-close').onclick = _close;
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
    document.addEventListener('keydown', onEsc);

    const canvas = overlay.querySelector('#pubGeralChartCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    // Altura dinâmica: ~34px por barra
    const barsWrap = overlay.querySelector('.pub-geral-chart-wrap');
    if (barsWrap) barsWrap.style.height = Math.max(160, scores.bars.length * 40 + 24) + 'px';

    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)';
    const tickColor = isDark ? '#94a3b8' : '#475569';
    const barColors = scores.bars.map(b => b.pct >= 80 ? '#10b981' : (b.pct >= 50 ? '#f59e0b' : '#ef4444'));

    _pubGeralChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: scores.bars.map(b => b.label),
            datasets: [{
                label: 'Conformidade (%)',
                data: scores.bars.map(b => b.pct),
                backgroundColor: barColors,
                borderRadius: 5,
                borderSkipped: false,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#0f172a',
                    padding: 10,
                    callbacks: {
                        label: (ctx) => {
                            const b = scores.bars[ctx.dataIndex];
                            return [`${b.pct}% em conformidade`, `${b.ok} de ${b.total} ${b.total === 1 ? 'item' : 'itens'}`];
                        }
                    }
                }
            },
            scales: {
                x: { min: 0, max: 100, ticks: { stepSize: 20, color: tickColor, callback: v => v }, grid: { color: gridColor } },
                y: { ticks: { color: tickColor, font: { size: 11 } }, grid: { display: false } }
            }
        }
    });
};

// ─── GRÁFICO — evolução da nota de qualidade nas últimas 12 conclusões ──────
let _pubQualityChartInstance = null;
const _PUB_CHART_WINDOW = 12;
// Offset da janela a partir do fim (0 = as 12 mais recentes). Reset a cada troca de item.
window._pubChartOffset = 0;
window._pubChartItemId = null;

window.pubChartNavigate = function(dir, item) {
    window._pubChartOffset = Math.max(0, window._pubChartOffset + dir);
    renderPubQualityChart(item);
};

window.renderPubQualityChart = function(item) {
    const wrap = document.getElementById('viewPublicacoesChart');
    if (!wrap) return;

    if (window._pubChartItemId !== item.id) { window._pubChartOffset = 0; window._pubChartItemId = item.id; }

    const allGroups = _getPubGroupsWithQuality(item).filter(g => g.quality);

    if (_pubQualityChartInstance) { _pubQualityChartInstance.destroy(); _pubQualityChartInstance = null; }

    if (allGroups.length === 0) {
        wrap.innerHTML = `<div class="pub-empty"><i class="fas fa-chart-line"></i><p>Sem dados de qualidade suficientes ainda. A nota aparece quando há itens de não conformidade (N/C) preenchidos em publicações concluídas.</p></div>`;
        return;
    }

    // Janela deslizante de 12 conclusões: offset 0 = as mais recentes
    const maxOffset = Math.max(0, allGroups.length - _PUB_CHART_WINDOW);
    window._pubChartOffset = Math.min(window._pubChartOffset, maxOffset);
    const endIdx = allGroups.length - window._pubChartOffset;
    const startIdx = Math.max(0, endIdx - _PUB_CHART_WINDOW);
    const groups = allGroups.slice(startIdx, endIdx);

    const canNavOlder = startIdx > 0;
    const canNavNewer = window._pubChartOffset > 0;
    const showNav = allGroups.length > _PUB_CHART_WINDOW;

    // Última nota sempre é a mais recente do card; média acompanha a janela de 12 conclusões visível no gráfico
    const last12 = allGroups.slice(-_PUB_CHART_WINDOW);
    const last = last12[last12.length - 1].quality.nota;
    const avg = Math.round((groups.reduce((s, g) => s + g.quality.nota, 0) / groups.length) * 10) / 10;

    wrap.innerHTML = `
        <div class="pub-chart-summary">
            <div class="pub-chart-stat">
                <span class="pub-chart-stat-label">Última nota</span>
                <span class="pub-chart-stat-value pub-group-quality-${_pubQualityTier(last)}">${last.toFixed(1).replace('.0','')}<small>/10</small></span>
            </div>
            <div class="pub-chart-stat">
                <span class="pub-chart-stat-label">Média (${groups.length} conclus${groups.length !== 1 ? 'ões' : 'ão'} visívei${groups.length !== 1 ? 's' : 'l'})</span>
                <span class="pub-chart-stat-value pub-group-quality-${_pubQualityTier(avg)}">${avg.toFixed(1).replace('.0','')}<small>/10</small></span>
            </div>
        </div>
        <div class="pub-chart-canvas-wrap">
            ${showNav ? `<button type="button" class="pub-chart-nav-btn pub-chart-nav-prev" title="Conclusões mais antigas" ${canNavOlder ? '' : 'disabled'} onclick="pubChartNavigate(1, window._pubChartCurrentItem)"><i class="fas fa-chevron-left"></i></button>` : ''}
            <canvas id="pubQualityChartCanvas"></canvas>
            ${showNav ? `<button type="button" class="pub-chart-nav-btn pub-chart-nav-next" title="Conclusões mais recentes" ${canNavNewer ? '' : 'disabled'} onclick="pubChartNavigate(-1, window._pubChartCurrentItem)"><i class="fas fa-chevron-right"></i></button>` : ''}
            ${showNav ? `<div class="pub-chart-range-label">${startIdx + 1}–${endIdx} de ${allGroups.length} conclusões</div>` : ''}
        </div>`;

    window._pubChartCurrentItem = item;

    const canvas = document.getElementById('pubQualityChartCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = groups.map(g => g.dateRef ? _formatDateBR(g.dateRef) : '—');
    const notas = groups.map(g => g.quality.nota);
    const pointColors = notas.map(n => n >= 8 ? '#16a34a' : n >= 5 ? '#d97706' : '#dc2626');

    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)';
    const tickColor = isDark ? '#94a3b8' : '#64748b';

    _pubQualityChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Nota de qualidade',
                data: notas,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.12)',
                borderWidth: 2.5,
                pointBackgroundColor: pointColors,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#0f172a',
                    padding: 10,
                    titleFont: { weight: '700' },
                    callbacks: {
                        title: (items) => `Conclusão: ${items[0].label}`,
                        label: (ctx) => {
                            const g = groups[ctx.dataIndex];
                            return [`Nota: ${g.quality.nota.toFixed(1).replace('.0','')}/10`, `${g.quality.ok} de ${g.quality.total} itens em conformidade`, `${g.pubs.length} publicaç${g.pubs.length !== 1 ? 'ões' : 'ão'}`];
                        }
                    }
                }
            },
            scales: {
                y: { min: 0, max: 10, ticks: { stepSize: 2, color: tickColor }, grid: { color: gridColor } },
                x: { ticks: { color: tickColor }, grid: { display: false } }
            },
            onClick: (evt, elements) => {
                if (!elements.length) return;
                const g = groups[elements[0].index];
                const lastPub = g.pubs.slice().sort((a, b) => ((a.data||'')+'T'+(a.hora||'')).localeCompare((b.data||'')+'T'+(b.hora||'')))[g.pubs.length - 1];
                const idx = (item.publicacoes || []).indexOf(lastPub);
                if (idx !== -1 && typeof verPublicacao === 'function') verPublicacao(item.id, window._currentViewTab, idx);
            }
        }
    });
};

window.renderViewPublicacoes = function(item) {
    const container = document.getElementById('viewPublicacoesContent');
    const chartWrap = document.getElementById('viewPublicacoesChart');
    if (!container) return;
    const allPubs = item.publicacoes || [];

    // Badges das sub-abas
    const tiposSubtab = ['Comentário', 'Atualização', 'Evidência'];
    const badgeMap = { 'Comentário': 'pubSubBadgeComentario', 'Atualização': 'pubSubBadgeAtualizacao', 'Evidência': 'pubSubBadgeEvidencia' };
    const badgeTodos = document.getElementById('pubSubBadgeTodos');
    if (badgeTodos) { badgeTodos.textContent = allPubs.length || ''; badgeTodos.style.display = allPubs.length ? '' : 'none'; }
    tiposSubtab.forEach(t => {
        const el = document.getElementById(badgeMap[t]);
        const cnt = allPubs.filter(p => p.tipo === t).length;
        if (el) { el.textContent = cnt || ''; el.style.display = cnt ? '' : 'none'; }
    });

    // Aba Gráfico: só existe se houver ao menos uma conclusão com nota de qualidade
    const _hasQualityData = _getPubGroupsWithQuality(item).some(g => g.quality);
    const graficoBtn = document.getElementById('pubSubtabGrafico');
    if (graficoBtn) graficoBtn.style.display = _hasQualityData ? '' : 'none';

    let filtroAtivo = window._pubSubtabAtivo || 'Todos';
    if (filtroAtivo === 'Gráfico' && !_hasQualityData) {
        filtroAtivo = window._pubSubtabAtivo = 'Todos';
        document.querySelectorAll('.pub-subtab').forEach(b => b.classList.toggle('active', b.dataset.tipo === 'Todos'));
    }

    // Aba Gráfico: modo especial, não usa a tabela de publicações
    if (filtroAtivo === 'Gráfico') {
        container.style.display = 'none';
        if (chartWrap) { chartWrap.style.display = ''; renderPubQualityChart(item); }
        return;
    }
    container.style.display = '';
    if (chartWrap) chartWrap.style.display = 'none';

    // Filtra pelo tipo ativo
    let pubs = filtroAtivo === 'Todos' ? allPubs.slice() : allPubs.filter(p => p.tipo === filtroAtivo);

    // Ordena
    pubs.sort((a, b) => {
        let va, vb;
        if (_vpPubSortCol === 'data') {
            va = (a.data || '') + (a.hora || '');
            vb = (b.data || '') + (b.hora || '');
        } else if (_vpPubSortCol === 'tipo') {
            va = a.tipo || ''; vb = b.tipo || '';
        } else if (_vpPubSortCol === 'desc') {
            va = a.titulo || a.descricao || ''; vb = b.titulo || b.descricao || '';
        } else if (_vpPubSortCol === 'usuario') {
            va = a.usuario || ''; vb = b.usuario || '';
        } else {
            va = ''; vb = '';
        }
        const cmp = va.localeCompare(vb);
        return _vpPubSortDir === 'asc' ? cmp : -cmp;
    });

    if (pubs.length === 0) {
        const msg = filtroAtivo === 'Todos' ? 'Nenhuma publicação registrada ainda.' : `Nenhuma publicação do tipo "${filtroAtivo}" encontrada.`;
        container.innerHTML = `<div class="pub-empty"><i class="fas fa-paper-plane"></i><p>${msg}</p></div>`;
        return;
    }

    const _canMgPubs = typeof userCanManagePubs === 'function' ? userCanManagePubs(item) : true;

    const _sortIcon = (col) => {
        if (_vpPubSortCol !== col) return '<i class="fas fa-sort" style="opacity:0.3;margin-left:4px;font-size:10px"></i>';
        return _vpPubSortDir === 'asc'
            ? '<i class="fas fa-sort-up" style="color:var(--accent);margin-left:4px;font-size:10px"></i>'
            : '<i class="fas fa-sort-down" style="color:var(--accent);margin-left:4px;font-size:10px"></i>';
    };

    const _renderPubRow = (p) => {
        const i = allPubs.indexOf(p);
        const typeClass = {
            'Evidência': 'evidencia', 'Atualização': 'atualizacao',
            'Comentário': 'comentario', 'Treinamento': 'evidencia', 'Documento': 'documento'
        }[p.tipo] || '';
        const dateStr = p.data ? _formatDateBR(p.data) : '–';
        const descPreview = (p.descricao || '').slice(0, 60) + ((p.descricao || '').length > 60 ? '…' : '');
        const nAnexos = (p.anexos || []).length;
        const nNc = _pubNcCount(p);
        const nRnc = Array.isArray(p.rncIds) ? p.rncIds.length : 0;
        const anexosCell = [
            nAnexos > 0 ? `<span><i class="fas fa-paperclip" style="color:#94a3b8"></i> ${nAnexos}</span>` : '',
            nRnc > 0 ? `<span class="pub-row-rnc-badge" title="${nRnc} RNC(s) associada(s)"><i class="fas fa-file-circle-exclamation"></i> ${nRnc} RNC</span>` : ''
        ].filter(Boolean).join(' ') || '–';
        return `<tr onclick="verPublicacao(${item.id},'${window._currentViewTab}',${i})" title="Ver publicação">
            <td><span class="pub-type-badge ${typeClass}">${p.tipo || '–'}</span></td>
            <td>${p.titulo || descPreview || '–'}${nNc > 0 ? ` <span class="pub-row-nc-badge" title="${nNc} não conformidade(s) registrada(s)"><i class="fas fa-triangle-exclamation"></i> ${nNc} N/C</span>` : ''}</td>
            <td>${dateStr}${window._currentViewTab !== 'documentos' && p.hora ? ' ' + p.hora : ''}</td>
            <td>${p.usuario || '–'}</td>
            <td>${anexosCell}</td>
            <td onclick="event.stopPropagation();" style="white-space:nowrap;">
                ${_canMgPubs ? `<button class="pub-action-btn" title="Editar" onclick="openPublicacaoModal(${i})"><i class="fas fa-pencil-alt"></i></button>` : ''}
                ${_canMgPubs ? `<button class="pub-action-btn pub-action-btn-del" title="Excluir" onclick="excluirPublicacao(${item.id},'${window._currentViewTab}',${i})"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        </tr>`;
    };

    const _tableHead = `<thead><tr>
        <th style="cursor:pointer" onclick="_vpSortPublicacoes('tipo')">Tipo${_sortIcon('tipo')}</th>
        <th style="cursor:pointer" onclick="_vpSortPublicacoes('desc')">Descrição${_sortIcon('desc')}</th>
        <th style="cursor:pointer" onclick="_vpSortPublicacoes('data')">${window._currentViewTab === 'documentos' ? 'Data' : 'Data/Hora'}${_sortIcon('data')}</th>
        <th style="cursor:pointer" onclick="_vpSortPublicacoes('usuario')">Usuário${_sortIcon('usuario')}</th>
        <th>Anexos</th><th></th>
    </tr></thead>`;

    // Agrupamento por conclusão exclusivo de rotinas (auditoria)
    const _tabSuportaGrupos = !window._currentViewTab || window._currentViewTab === 'auditoria';
    const _currentCycle = item.pubCycleId || 1;
    const _currentDateRef = item.dataPublicacao || item.dataConclusao || null;
    const _hasConclusaoGroups = _tabSuportaGrupos && pubs.some(p => !!p.pubCycleId || !!p.dataConclusaoRef);

    if (_hasConclusaoGroups) {
        const _groups = {};
        const _SEM_GRUPO = '__sem_conclusao__';
        const _CURRENT_KEY = `cycle_${_currentCycle}`;

        pubs.forEach(p => {
            let key;
            if (p.pubCycleId) {
                key = `cycle_${p.pubCycleId}`;
            } else if (p.dataConclusaoRef) {
                // Legacy: se a data bate com a data atual do ciclo corrente, une ao grupo atual
                key = (p.dataConclusaoRef === _currentDateRef) ? _CURRENT_KEY : p.dataConclusaoRef;
            } else {
                key = _SEM_GRUPO;
            }
            if (!_groups[key]) _groups[key] = { pubs: [], dateRef: p.dataConclusaoRef || null };
            _groups[key].pubs.push(p);
        });

        // Ordena: ciclo atual primeiro, demais ciclos por número desc, legacy por data desc, sem grupo por último
        const _sortedKeys = Object.keys(_groups).sort((a, b) => {
            if (a === _SEM_GRUPO) return 1;
            if (b === _SEM_GRUPO) return -1;
            if (a === _CURRENT_KEY) return -1;
            if (b === _CURRENT_KEY) return 1;
            const aIsCycle = a.startsWith('cycle_');
            const bIsCycle = b.startsWith('cycle_');
            if (aIsCycle && bIsCycle) return parseInt(b.slice(6)) - parseInt(a.slice(6));
            if (aIsCycle) return -1;
            if (bIsCycle) return 1;
            return b.localeCompare(a);
        });

        // Calcula % de conclusão do checklistPublicacao por grupo
        const _pubCL = item.checklistPublicacao || [];
        const _clKey = c => c.id || ('t:' + (c.texto || '').trim());
        function _groupPubClPct(groupKey) {
            if (!_pubCL.length) return null;
            // Acumula chaves concluídas nas pubs deste grupo
            const doneKeys = new Set();
            (_groups[groupKey]?.pubs || []).forEach(pub => {
                (pub.checklistSnapshot || []).forEach(snap => {
                    if (snap.checked) doneKeys.add(_clKey(snap));
                });
            });
            // Para ciclos anteriores, apenas as pubs daquele grupo
            // Para o ciclo atual, acumula também de outras pubs do mesmo ciclo
            if (groupKey === _CURRENT_KEY) {
                pubs.forEach(pub => {
                    const isCurr = pub.pubCycleId ? pub.pubCycleId === _currentCycle : pub.dataConclusaoRef === _currentDateRef;
                    if (!isCurr) return;
                    (pub.checklistSnapshot || []).forEach(snap => { if (snap.checked) doneKeys.add(_clKey(snap)); });
                });
            }
            const total = _pubCL.length;
            const done = _pubCL.filter(c => doneKeys.has(_clKey(c))).length;
            return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
        }

        let groupsHtml = '';
        _sortedKeys.forEach((key, gi) => {
            const grp = _groups[key];
            const groupPubs = grp.pubs;
            const labelDate = (key === _CURRENT_KEY) ? _currentDateRef : grp.dateRef;
            const groupLabel = key === _SEM_GRUPO ? 'Sem data de conclusão' : `Conclusão: ${labelDate ? _formatDateBR(labelDate) : '—'}`;
            const groupId = `pubGroup_${gi}`;
            const _gcKey = `pub_group_collapsed_${item.id}_${key}`;
            const _gcOpen = localStorage.getItem(_gcKey) !== '0';

            // Barra de progresso do checklist de publicação
            const clPct = _pubCL.length > 0 ? _groupPubClPct(key) : null;
            const pctHtml = clPct !== null ? `
                <div class="pub-group-cl-bar-wrap">
                    <div class="pub-group-cl-bar-track">
                        <div class="pub-group-cl-bar-fill${clPct.pct === 100 ? ' done' : ''}" style="width:${clPct.pct}%"></div>
                    </div>
                    <span class="pub-group-cl-bar-label${clPct.pct === 100 ? ' done' : ''}">${clPct.pct}%</span>
                </div>` : '';

            // Nota de qualidade acumulada do grupo: junta os itens N/C de todas as publicações
            // do grupo, deduplicando por item (mantém o preenchimento mais recente de cada um).
            const _qcSorted = groupPubs.slice().sort((a, b) => {
                const ka = (a.data || '') + 'T' + (a.hora || '');
                const kb = (b.data || '') + 'T' + (b.hora || '');
                return ka.localeCompare(kb);
            });
            const _qcByKey = new Map();
            _qcSorted.forEach(pub => {
                (pub.checklistSnapshot || []).forEach(snap => {
                    if (snap.ncEnabled && snap.checked) _qcByKey.set(_clKey(snap), snap);
                });
            });
            const _qScore = _computePubQualityScoreFromSnapshot(Array.from(_qcByKey.values()));
            const qualityHtml = _qScore ? `
                <span class="pub-group-quality-badge pub-group-quality-${_pubQualityTier(_qScore.nota)}" title="Nota de qualidade acumulada do grupo (${_qScore.ok} de ${_qScore.total} itens em conformidade)">
                    <i class="fas fa-gauge-high"></i><span class="pgqb-num">${_qScore.nota.toFixed(1).replace('.0','')}</span><span class="pgqb-max">/10</span>
                </span>
                <button type="button" class="pub-group-chart-btn" title="Ver indicadores por checklist geral"
                    onclick="event.stopPropagation();openPubGeralChart('${key}')">
                    <i class="fas fa-chart-column"></i>
                </button>` : '';

            groupsHtml += `
                <div class="pub-conclusao-group${_gcOpen ? ' open' : ''}" id="${groupId}">
                    <div class="pub-conclusao-group-header" onclick="(function(el){el.classList.toggle('open');localStorage.setItem('${_gcKey}',el.classList.contains('open')?'1':'0');})(document.getElementById('${groupId}'))">
                        <i class="fas fa-chevron-right pub-conclusao-group-chevron"></i>
                        <i class="fas fa-calendar-check pub-conclusao-group-cal"></i>
                        <span class="pub-conclusao-group-label">${groupLabel}</span>
                        ${pctHtml}
                        ${qualityHtml}
                        <span class="pub-conclusao-group-count">${groupPubs.length} publicaç${groupPubs.length !== 1 ? 'ões' : 'ão'}</span>
                    </div>
                    <div class="pub-conclusao-group-body" style="display:${_gcOpen ? '' : 'none'};">
                        <div class="pub-table-wrap">
                            <table class="pub-table">${_tableHead}<tbody>${groupPubs.map(_renderPubRow).join('')}</tbody></table>
                        </div>
                    </div>
                </div>`;
        });

        container.innerHTML = `<div style="padding:0 2px;">${groupsHtml}</div>`;

        // Toggle chevron baseado em open/closed
        container.querySelectorAll('.pub-conclusao-group').forEach(g => {
            const chev = g.querySelector('.pub-conclusao-group-header i.fa-chevron-right');
            const body = g.querySelector('.pub-conclusao-group-body');
            if (!chev || !body) return;
            const obs = new MutationObserver(() => {
                const isOpen = g.classList.contains('open');
                chev.style.transform = isOpen ? 'rotate(90deg)' : '';
                body.style.display = isOpen ? '' : 'none';
            });
            obs.observe(g, { attributes: true, attributeFilter: ['class'] });
            // Estado inicial
            const isOpen = g.classList.contains('open');
            chev.style.transform = isOpen ? 'rotate(90deg)' : '';
        });
    } else {
        // Sem grupos: renderização paginada original
        const totalPages = Math.max(1, Math.ceil(pubs.length / _VP_PUB_PER_PAGE));
        if (_vpPubPage > totalPages) _vpPubPage = totalPages;
        const pagePubs = pubs.slice((_vpPubPage - 1) * _VP_PUB_PER_PAGE, _vpPubPage * _VP_PUB_PER_PAGE);
        const rows = pagePubs.map(_renderPubRow).join('');

        let paginationHtml = '';
        if (totalPages > 1) {
            paginationHtml = `<div class="vp-pub-pagination">
                <span class="vp-pub-count">${pubs.length} publicaç${pubs.length !== 1 ? 'ões' : 'ão'}</span>
                <div class="vp-pub-pages">
                    <button class="dpg-btn" onclick="event.stopPropagation();_vpGoPage(${_vpPubPage - 1})" ${_vpPubPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
                    ${Array.from({length: totalPages}, (_, i) => i + 1).map(p =>
                        `<button class="dpg-btn ${p === _vpPubPage ? 'active' : ''}" onclick="event.stopPropagation();_vpGoPage(${p})">${p}</button>`
                    ).join('')}
                    <button class="dpg-btn" onclick="event.stopPropagation();_vpGoPage(${_vpPubPage + 1})" ${_vpPubPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>`;
        } else {
            paginationHtml = `<div class="vp-pub-pagination"><span class="vp-pub-count">${pubs.length} publicaç${pubs.length !== 1 ? 'ões' : 'ão'}</span></div>`;
        }

        container.innerHTML = `
            <div class="pub-table-wrap">
                <table class="pub-table">${_tableHead}<tbody>${rows}</tbody></table>
            </div>
            ${paginationHtml}`;
    }};

const _VER_PUB_TYPE_CONFIG = {
    'Comentário':  { icon: 'fas fa-comment-dots', color: '#6366f1', bg: '#eef2ff' },
    'Atualização': { icon: 'fas fa-rotate',        color: '#0891b2', bg: '#e0f2fe' },
    'Evidência':   { icon: 'fas fa-file-circle-check', color: '#16a34a', bg: '#dcfce7' },
    'Treinamento': { icon: 'fas fa-chalkboard-user', color: '#d97706', bg: '#fef3c7' },
    'Documento':   { icon: 'fas fa-file-alt',       color: '#7c3aed', bg: '#f5f3ff' },
};

window.verPublicacao = function(id, tab, index) {
    const finalTab = _normalizeTab(tab);
    let item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === id);
    else if (finalTab === 'rnc') item = (window.rncItems || []).find(i => i.id === id);
    if (!item) return;
    const pub = (item.publicacoes || [])[index];
    if (!pub) return;

    const tipo = pub.tipo || 'Comentário';
    const cfg = _VER_PUB_TYPE_CONFIG[tipo] || { icon: 'fas fa-paper-plane', color: '#0369a1', bg: '#e0f2fe' };

    // Header
    const iconEl = document.getElementById('verPubTypeIcon');
    const labelEl = document.getElementById('verPubTypeLabel');
    const titleEl = document.getElementById('verPubTitle');
    const headerEl = document.getElementById('verPubHeader');
    const subtitleEl = document.getElementById('verPubHeaderSubtitle');
    if (iconEl) { iconEl.innerHTML = `<i class="${cfg.icon}"></i>`; iconEl.style.background = ''; iconEl.style.color = ''; }
    if (labelEl) { labelEl.textContent = tipo; labelEl.style.color = ''; }
    if (titleEl) titleEl.textContent = pub.titulo || item.titulo || '';
    if (headerEl) headerEl.setAttribute('data-tipo', tipo);
    if (subtitleEl) {
        const dateStr = pub.data ? _formatDateBR(pub.data) : '';
        const userStr = pub.usuario ? ((typeof resolveUserId === 'function' ? resolveUserId(pub.usuario) : null) || pub.usuario) : '';
        subtitleEl.textContent = [dateStr + (pub.hora ? ' · ' + pub.hora : ''), userStr].filter(Boolean).join('  ·  ');
    }

    // Meta pills
    const metaPills = `
        <div class="ver-pub-meta-row">
            <span class="ver-pub-meta-pill"><i class="fas fa-calendar"></i> ${_formatDateBR(pub.data)}${pub.hora ? ' · ' + pub.hora : ''}</span>
            ${pub.usuario ? `<span class="ver-pub-meta-pill"><i class="fas fa-user"></i> ${(typeof resolveUserId === 'function' ? resolveUserId(pub.usuario) : null) || pub.usuario}</span>` : ''}
            ${pub.instrutor ? `<span class="ver-pub-meta-pill"><i class="fas fa-chalkboard-user"></i> ${pub.instrutor}</span>` : ''}
            ${pub.cargaHoraria ? `<span class="ver-pub-meta-pill"><i class="fas fa-clock"></i> ${pub.cargaHoraria}</span>` : ''}
            ${pub.localEvento ? `<span class="ver-pub-meta-pill"><i class="fas fa-location-dot"></i> ${pub.localEvento}</span>` : ''}
        </div>`;

    // Campos extra
    let extras = '';
    if (pub.titulo) extras += `
        <div class="ver-pub-section">
            <div class="ver-pub-section-label">Título</div>
            <div class="ver-pub-section-value">${pub.titulo}</div>
        </div>`;
    if (pub.participantes) extras += `
        <div class="ver-pub-section">
            <div class="ver-pub-section-label">Participantes</div>
            <div class="ver-pub-section-value">${pub.participantes.replace(/\n/g,'<br>')}</div>
        </div>`;

    // Descrição
    const descBlock = pub.descricao ? `
        <div class="ver-pub-section">
            <div class="ver-pub-section-label"><i class="fas fa-align-left"></i> Descrição</div>
            <div class="ver-pub-desc-block">${pub.descricao.replace(/\n/g,'<br>')}</div>
        </div>` : '';

    // Checklist de publicação (salvo no pub) — agrupado por item do checklist geral
    const clItems = pub.checklistSnapshot || [];
    let clBlock = '';
    if (clItems.length > 0) {
        const geralSource = item ? (item.checklist || []) : [];
        const hasGroups = clItems.some(c => c.geralIndex != null);

        // Coleta itens concluídos em publicações ANTERIORES do mesmo ciclo
        const _thisCycle = pub.pubCycleId || 1;
        const _thisDateRef = pub.dataConclusaoRef || null;
        const _sameCycle = p => p.pubCycleId
            ? p.pubCycleId === _thisCycle
            : (p.dataConclusaoRef === _thisDateRef);
        // Itens do snapshot atual já marcados como concluídos NESTA publicação —
        // esses não entram em prevCompleted (evita duplicidade na contagem)
        const currentCheckedIds   = new Set(clItems.filter(c => c.checked && c.id).map(c => c.id));
        const currentCheckedTexts = new Set(clItems.filter(c => c.checked && !c.id).map(c => (c.texto || '').trim()));
        const prevCompleted = [];
        const seenPrev = new Set();
        (item.publicacoes || []).slice(index + 1).forEach(p => {
            if (!_sameCycle(p)) return;
            (p.checklistSnapshot || []).forEach(c => {
                if (!c.checked) return;
                const key = c.id || (c.texto || '').trim();
                if (seenPrev.has(key)) return;
                if (c.id && currentCheckedIds.has(c.id)) return;
                if (!c.id && currentCheckedTexts.has((c.texto || '').trim())) return;
                seenPrev.add(key);
                prevCompleted.push({ ...c, geralIndex: c.geralIndex ?? null });
            });
        });

        // Progresso inclui concluídos anteriores — usa união de chaves para não contar
        // duas vezes um item que já vem completo no snapshot atual (checklistSnapshot de
        // novas publicações sempre inclui a lista inteira, não só os itens pendentes)
        const _pKey = c => c.id || (c.texto || '').trim();
        const totalKeys = new Set(clItems.map(_pKey));
        prevCompleted.forEach(c => totalKeys.add(_pKey(c)));
        const total = totalKeys.size;
        const doneKeys = new Set(clItems.filter(c => c.checked).map(_pKey));
        prevCompleted.forEach(c => doneKeys.add(_pKey(c)));
        const done = doneKeys.size;
        const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
        // Agrupa prev por geralIndex para injetar nos grupos corretos
        const prevByGroup = new Map();
        prevCompleted.forEach(c => {
            const key = c.geralIndex != null ? c.geralIndex : '__solo__';
            if (!prevByGroup.has(key)) prevByGroup.set(key, []);
            prevByGroup.get(key).push(c);
        });

        const _verPubCommentHtml = c => (c.comentario && c.comentario.trim())
            ? `<div class="ver-pub-cl-comment"><div class="ver-pub-cl-comment-box"><i class="fas fa-comment-dots"></i> ${c.comentario.trim().replace(/\n/g,'<br>')}</div></div>`
            : '';
        const _prevItemHtml = c => `
            <div class="ver-pub-cl-item ver-pub-cl-item-prev">
                <span class="ver-pub-cl-dot"><i class="fas fa-check"></i></span>
                <span>${c.texto || ''}</span>
                ${_pubNcBadgeHtml(c.conformidade)}
            </div>
            ${_verPubCommentHtml(c)}`;
        const _prevDivider = n => n > 0 ? `<div class="ver-pub-cl-prev-divider"><i class="fas fa-history"></i> Concluídos anteriormente</div>` : '';
        const _itemKey = c => c.id || (c.texto || '').trim();

        let clListHtml = '';
        if (hasGroups) {
            const snapGroups = new Map();
            clItems.forEach(c => {
                const key = c.geralIndex != null ? c.geralIndex : '__solo__';
                if (!snapGroups.has(key)) snapGroups.set(key, []);
                snapGroups.get(key).push(c);
            });
            // Garante que grupos com apenas itens anteriores também apareçam
            prevByGroup.forEach((_, k) => {
                if (k !== '__solo__' && !snapGroups.has(k)) snapGroups.set(k, []);
            });
            const sortedGi = [...snapGroups.keys()].filter(k => k !== '__solo__').sort((a, b) => a - b);
            sortedGi.forEach(gi => {
                const groupItems = snapGroups.get(gi) || [];
                const prevItems  = prevByGroup.get(gi) || [];
                const geralText  = geralSource[gi] ? (geralSource[gi].texto || `Item ${gi+1}`) : `Item Geral ${gi+1}`;

                // Todo o grupo já foi concluído em publicação anterior: nenhum item
                // pendente no snapshot atual, e todo item não-marcado é coberto por prevItems
                const prevKeys = new Set(prevItems.map(_itemKey));
                const uncheckedGroup = groupItems.filter(c => !c.checked);
                const groupFullyPrev = groupItems.length > 0
                    && groupItems.every(c => !c.checked)
                    && uncheckedGroup.every(c => prevKeys.has(_itemKey(c)));

                if (groupFullyPrev) {
                    clListHtml += `<div class="ver-pub-cl-group ver-pub-cl-group-prev">
                        <div class="ver-pub-cl-prev-box">
                            <div class="ver-pub-cl-prev-box-hdr"><i class="fas fa-history"></i> ${geralText} — Concluído anteriormente</div>
                            ${groupItems.map(c => {
                                const prevMatch = prevItems.find(p => _itemKey(p) === _itemKey(c)) || c;
                                return `<div class="ver-pub-cl-item ver-pub-cl-item-prev">
                                    <span class="ver-pub-cl-dot"><i class="fas fa-check"></i></span>
                                    <span>${c.texto || ''}</span>
                                    ${_pubNcBadgeHtml(prevMatch.conformidade)}
                                </div>
                                ${_verPubCommentHtml(prevMatch)}`;
                            }).join('')}
                        </div>
                    </div>`;
                    return;
                }

                // Itens do grupo já cobertos por uma conclusão anterior não devem
                // aparecer de novo como desmarcados na lista principal
                const visibleGroupItems = groupItems.filter(c => c.checked || !prevKeys.has(_itemKey(c)));
                const allDone = (visibleGroupItems.length > 0 || prevItems.length > 0) && visibleGroupItems.every(c => c.checked);
                clListHtml += `<div class="ver-pub-cl-group">
                    <div class="ver-pub-cl-group-hdr${allDone ? ' done' : ''}">
                        <i class="fas fa-layer-group"></i> ${geralText}
                        ${allDone ? '<i class="fas fa-check-circle" style="margin-left:auto;color:#22c55e"></i>' : ''}
                    </div>
                    ${visibleGroupItems.map(c => `
                        <div class="ver-pub-cl-item ${c.checked ? 'done' : ''}">
                            <span class="ver-pub-cl-dot">${c.checked ? '<i class="fas fa-check"></i>' : ''}</span>
                            <span>${c.texto || ''}</span>
                            ${_pubNcBadgeHtml(c.conformidade)}
                        </div>
                        ${_verPubCommentHtml(c)}`).join('')}
                    ${_prevDivider(prevItems.length)}
                    ${prevItems.map(_prevItemHtml).join('')}
                </div>`;
            });
            const solo     = snapGroups.get('__solo__') || [];
            const soloPrev = prevByGroup.get('__solo__') || [];
            if (solo.length || soloPrev.length) {
                clListHtml += solo.map(c => `
                    <div class="ver-pub-cl-item ${c.checked ? 'done' : ''}">
                        <span class="ver-pub-cl-dot">${c.checked ? '<i class="fas fa-check"></i>' : ''}</span>
                        <span>${c.texto || ''}</span>
                        ${_pubNcBadgeHtml(c.conformidade)}
                    </div>
                    ${_verPubCommentHtml(c)}`).join('');
                clListHtml += _prevDivider(soloPrev.length);
                clListHtml += soloPrev.map(_prevItemHtml).join('');
            }
        } else {
            clListHtml = clItems.map(c => `
                <div class="ver-pub-cl-item ${c.checked ? 'done' : ''}">
                    <span class="ver-pub-cl-dot">${c.checked ? '<i class="fas fa-check"></i>' : ''}</span>
                    <span>${c.texto || ''}</span>
                    ${_pubNcBadgeHtml(c.conformidade)}
                </div>
                ${_verPubCommentHtml(c)}`).join('');
            clListHtml += _prevDivider(prevCompleted.length);
            clListHtml += prevCompleted.map(_prevItemHtml).join('');
        }

        const qualityScore = _computePubQualityScoreFromSnapshot(clItems.concat(prevCompleted));
        const qualityHtml = qualityScore ? `<div class="ver-pub-quality-wrap">${_pubQualityCardHtml(qualityScore)}</div>` : '';

        clBlock = `
        <div class="ver-pub-section">
            <div class="ver-pub-section-label"><i class="fas fa-list-check"></i> Checklist de Publicação <span class="ver-pub-cl-badge">${done}/${total}</span></div>
            <div class="ver-pub-cl-progress"><div class="ver-pub-cl-progress-bar" style="width:${pct}%"></div></div>
            <div class="ver-pub-cl-list">${clListHtml}</div>
            ${qualityHtml}
        </div>`;
    }

    // RNCs associadas (referência — exclusivo de rotinas)
    let rncBlock = '';
    if (Array.isArray(pub.rncIds) && pub.rncIds.length > 0) {
        const chips = pub.rncIds.map(rid => {
            const r = (window.rncItems || []).find(x => x.id === rid);
            if (!r) return `<span class="ver-pub-rnc-chip ver-pub-rnc-chip-missing"><i class="fas fa-ban"></i> RNC removida</span>`;
            return `<button type="button" class="ver-pub-rnc-chip nc-${r.classificacao || 'menor'}"
                onclick="closeModal('modalVerPublicacao'); if (typeof rncOpenView === 'function') rncOpenView('${rid}');"
                title="Abrir RNC">
                <i class="fas fa-file-circle-exclamation"></i> ${(r.titulo || 'RNC sem título').slice(0, 50)}
            </button>`;
        }).join('');
        rncBlock = `
        <div class="ver-pub-section">
            <div class="ver-pub-section-label"><i class="fas fa-triangle-exclamation"></i> RNCs Associadas</div>
            <div class="ver-pub-rnc-chips">${chips}</div>
        </div>`;
    }

    // Anexos
    const anexos = pub.anexos || [];
    let anexosBlock = '';
    if (anexos.length > 0) {
        const _pubFaIconMap = { pdf: 'fa-file-pdf', doc: 'fa-file-word', sheet: 'fa-file-excel', slide: 'fa-file-powerpoint', image: 'fa-file-image', link: 'fa-link', file: 'fa-file' };
        const _extIcon = (a) => {
            const info = window._anexoIconInfo ? window._anexoIconInfo(a) : { icon: 'file', color: '#ef4444' };
            const icon = _pubFaIconMap[info.icon] || 'fa-file';
            return `<i class="fas ${icon}" style="color:${info.color}"></i>`;
        };
        const _cardHtml = (a) => {
            const icon  = _extIcon(a);
            const label = (a.titulo || 'Arquivo').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            if (a.tipo === 'imagem') {
                const blobId = (a.fileId || '').replace(/'/g, "\\'");
                const safeLabel = label.replace(/'/g, "\\'");
                return `<button type="button" class="ver-pub-anexo-card" onclick="openImgLightboxBlob('${blobId}','${safeLabel}')">
                    <span class="ver-pub-anexo-icon">${icon}</span>
                    <span class="ver-pub-anexo-name">${label}</span>
                </button>`;
            }
            return `<a href="${a.url}" target="_blank" class="ver-pub-anexo-card">
                <span class="ver-pub-anexo-icon">${icon}</span>
                <span class="ver-pub-anexo-name">${label}</span>
            </a>`;
        };
        anexosBlock = `
        <div class="ver-pub-section">
            <div class="ver-pub-section-label"><i class="fas fa-paperclip"></i> Anexos</div>
            <div class="ver-pub-anexos-grid">
                ${anexos.map(_cardHtml).join('')}
            </div>
        </div>`;
    }

    document.getElementById('verPubContent').innerHTML = metaPills + extras + descBlock + clBlock + rncBlock + anexosBlock;

    window._verPubId = id;
    window._verPubTab = tab;
    window._verPubIndex = index;

    const _vpTab = _normalizeTab(tab);
    let _vpItem = null;
    if (_vpTab === 'auditoria') _vpItem = audits.find(i => i.id === id);
    else if (_vpTab === 'atividades') _vpItem = activities.find(i => i.id === id);
    else if (_vpTab === 'treinamentos') _vpItem = trainings.find(i => i.id === id);
    else if (_vpTab === 'documentos') _vpItem = documents.find(i => i.id === id);
    else if (_vpTab === 'rnc') _vpItem = (window.rncItems || []).find(i => i.id === id);
    const _canMgPubs = typeof userCanManagePubs === 'function' ? userCanManagePubs(_vpItem) : true;
    const footerEl = document.getElementById('verPubFooter');
    if (footerEl) {
        footerEl.innerHTML = `
            <button class="btn-ver-tarefa" onclick="closeModal('modalVerPublicacao');openView(${id},'${tab}')"><i class="fas fa-arrow-up-right-from-square"></i> Visualizar Tarefa</button>
            ${_canMgPubs ? `<button class="btn-secondary" onclick="window._currentViewId=window._verPubId;window._currentViewTab=window._verPubTab;openPublicacaoModal(window._verPubIndex)"><i class="fas fa-pencil-alt"></i> Editar</button>` : ''}
            ${_canMgPubs ? `<button class="btn-danger" onclick="excluirPublicacao(window._verPubId,window._verPubTab,window._verPubIndex)"><i class="fas fa-trash"></i> Excluir</button>` : ''}`;
    }

    document.getElementById('modalVerPublicacao').style.display = 'flex';
};

window.excluirPublicacao = function(id, tab, index) {
    const finalTab = _normalizeTab(tab);
    let item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === id);
    else if (finalTab === 'rnc') item = (window.rncItems || []).find(i => i.id === id);
    if (!item || !item.publicacoes) return;
    if (typeof userCanManagePubs === 'function' && !userCanManagePubs(item)) {
        if (typeof showToast === 'function') showToast('Você não tem permissão para excluir publicações.', 'error');
        return;
    }
    showConfirmDanger({
        title: 'Excluir publicação?',
        message: 'Esta publicação será removida permanentemente e não poderá ser recuperada.',
        confirmLabel: 'Excluir',
        requireReason: false,
        onConfirm: () => {
            const pubRemovida = item.publicacoes[index];
            // Exclui blobs de imagem do RTDB
            (pubRemovida?.anexos || []).forEach(a => {
                if (a.tipo === 'imagem' && a.fileId) {
                    if (typeof window._deleteImgBlob === 'function') window._deleteImgBlob(a.fileId);
                }
            });
            item.publicacoes.splice(index, 1);
            // Reavalia itens do checklist geral após exclusão
            _autoMarkGeralFromPub(item);
            _autoUnmarkGeralFromPub(item);
            saveAll();
            closeModal('modalVerPublicacao');
            // Re-renderiza checklist do modal de visualização para refletir novo estado
            if (typeof renderViewChecklist === 'function') renderViewChecklist(item, finalTab);
            if (typeof renderViewContent === 'function') renderViewContent(id, finalTab);
            renderViewPublicacoes(item);
            _updatePubTabBadge(item);
            renderCards();
            if (typeof showToast === 'function') showToast('Publicação excluída.', 'success');
        }
    });
};

function _updatePubTabBadge(item) {
    const badge = document.getElementById('pubTabBadge');
    if (!badge) return;
    const count = (item.publicacoes || []).length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }
}


function _drawerIdFromPrefix(prefix) {
    if (prefix === 'audit') return 'modalAuditoria';
    if (prefix === 'train') return 'modalTreinamentos';
    if (prefix === 'ativ') return 'modalAtividades';
    if (prefix === 'doc') return 'modalDocumentos';
    return '';
}

function _normalizeTab(tab) {
    if (tab === 'audit') return 'auditoria';
    if (tab === 'train') return 'treinamentos';
    if (tab === 'ativ') return 'atividades';
    if (tab === 'doc' || tab === 'mant') return tab === 'doc' ? 'documentos' : 'manutencao';
    return tab;
}

function _formatDateBR(dateStr) {
    if (!dateStr) return '–';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
}

// ─── Expõe funções de checklist para save* ───────────────────
// Os arquivos auditoria.js, gestao.js, etc. devem chamar getChecklist(prefix) ao salvar
// e restoreChecklist(prefix, item.checklist) ao editar.
// O patch abaixo não é necessário pois as chamadas estarão no modal.js atualizado.

// ─── Lightbox de imagem ──────────────────────────────────────
window.openImgLightbox = function(url, label) {
    const lb  = document.getElementById('imgLightbox');
    const img = document.getElementById('imgLightboxImg');
    const lbl = document.getElementById('imgLightboxLabel');
    if (!lb || !img) return;
    img.src = url;
    if (lbl) lbl.textContent = label || '';
    lb.style.display = 'flex';
    document.addEventListener('keydown', _lightboxKeyHandler);
};

window.openImgLightboxBlob = async function(blobId, label) {
    const lb  = document.getElementById('imgLightbox');
    const img = document.getElementById('imgLightboxImg');
    const lbl = document.getElementById('imgLightboxLabel');
    if (!lb || !img) return;
    // Mostra lightbox com spinner enquanto carrega
    img.src = '';
    img.style.opacity = '0.3';
    if (lbl) lbl.textContent = label || '';
    lb.style.display = 'flex';
    document.addEventListener('keydown', _lightboxKeyHandler);
    try {
        const dataUrl = await window._loadImgBlob(blobId);
        img.src = dataUrl;
        img.style.opacity = '';
    } catch (err) {
        lb.style.display = 'none';
        if (typeof showToast === 'function') showToast('Erro ao carregar imagem: ' + err.message, 'error');
    }
};

window.closeImgLightbox = function() {
    const lb  = document.getElementById('imgLightbox');
    const img = document.getElementById('imgLightboxImg');
    if (lb) lb.style.display = 'none';
    if (img) img.src = '';
    document.removeEventListener('keydown', _lightboxKeyHandler);
};

function _lightboxKeyHandler(e) {
    if (e.key === 'Escape') window.closeImgLightbox();
}
