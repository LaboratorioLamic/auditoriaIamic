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

function renderChecklistEditor(prefix) {
    const container = document.getElementById(`${prefix}-checklist-editor`);
    if (!container) return;
    const items = _getChecklistData(prefix);
    if (items.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;"><i class="fas fa-list-check" style="font-size:24px;display:block;margin-bottom:8px;"></i>Nenhum item ainda. Adicione abaixo.</div>';
        return;
    }
    const isPubPrefix = prefix.endsWith('-pub');
    container.innerHTML = items.map((item, i) => {
        const requiresComment = !!item.requiresComment;
        const requiredForPub = !!item.requiredForPub;
        const commentVal = (item.comment || '').replace(/"/g, '&quot;');
        return `
        <div class="checklist-editor-item">
            <div class="checklist-editor-item-top">
                <input type="text" class="checklist-item-text-input" value="${(item.texto || '').replace(/"/g, '&quot;')}"
                    onchange="updateChecklistItemText('${prefix}', ${i}, this.value)"
                    placeholder="Texto do item">
                ${isPubPrefix ? `
                <button class="checklist-item-required-toggle ${requiredForPub ? 'active required-for-pub' : ''}"
                    onclick="toggleChecklistItemRequiredForPub('${prefix}', ${i}, this)"
                    title="${requiredForPub ? 'Obrigatório para publicar (clique para remover)' : 'Tornar obrigatório para publicar'}">
                    <i class="fas fa-exclamation-circle" style="font-size:11px;"></i>
                    ${requiredForPub ? 'Obrigatório' : 'Opcional'}
                </button>` : `
                <button class="checklist-item-required-toggle ${requiresComment ? 'active' : ''}"
                    onclick="toggleChecklistItemRequired('${prefix}', ${i}, this)"
                    title="${requiresComment ? 'Comentário obrigatório ativado' : 'Exigir comentário para marcar'}">
                    <i class="fas fa-comment-dots" style="font-size:11px;"></i>
                    ${requiresComment ? 'Comentário obrigatório' : 'Exigir comentário'}
                </button>`}
                <button class="checklist-item-del-btn" onclick="removeChecklistItem('${prefix}',${i})" title="Remover">&times;</button>
            </div>
            ${!isPubPrefix && requiresComment ? `
            <div class="checklist-editor-comment-area">
                <textarea class="checklist-editor-comment-input"
                    placeholder="Comentário pré-preenchido (opcional)…"
                    onchange="updateChecklistItemComment('${prefix}', ${i}, this.value)"
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
    items.push({ texto: text, checked: false, requiresComment: false, comment: '' });
    _setChecklistData(prefix, items);
    renderChecklistEditor(prefix);
    input.value = '';
    input.focus();
};

window.removeChecklistItem = function(prefix, index) {
    const items = _getChecklistData(prefix);
    items.splice(index, 1);
    _setChecklistData(prefix, items);
    renderChecklistEditor(prefix);
};

window.updateChecklistItemText = function(prefix, index, value) {
    const items = _getChecklistData(prefix);
    if (items[index]) items[index].texto = value;
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
        texto: i.texto || '',
        checked: !!i.checked,
        requiresComment: !!i.requiresComment,
        requiredForPub: !!i.requiredForPub,
        comment: i.comment || ''
    }));
};

// Limpa ao fechar/resetar
window.clearChecklist = function(prefix) {
    _setChecklistData(prefix, []);
    renderChecklistEditor(prefix);
    _setChecklistData(prefix + '-pub', []);
    renderChecklistEditor(prefix + '-pub');
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
        return `
        <div class="view-checklist-item ${c.checked ? 'checked' : ''} ${blockedByPerm ? 'vcl-perm-locked' : ''}" id="vcl-item-${item.id}-${i}">
            <div class="view-checklist-item-row">
                <input type="checkbox" class="view-checklist-cb" ${c.checked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}
                    onchange="toggleViewChecklistItem(${item.id},'${tab}',${i})"
                    title="${title}">
                <span class="view-checklist-item-text">${c.texto || ''}</span>
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
        <div class="view-checklist-footer">${done}/${checklist.length} itens marcados</div>`;

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
    // Debounce save
    clearTimeout(window._checklistCommentSaveTimer);
    window._checklistCommentSaveTimer = setTimeout(() => saveAll(), 800);
};

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
    const allDone = found.checklist.every(c => c.checked);
    found.checklist.forEach(c => {
        // Only toggle items that are not blocked by required comment
        if (allDone || !c.requiresComment || (c.comment || '').trim()) {
            c.checked = !allDone;
        }
    });
    saveAll();
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
    c.checked = !c.checked;
    saveAll();
    renderViewChecklist(found, finalTab);
    renderCards();
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
    container.innerHTML = `<div class="view-anexos-grid">${anexos.map(a => {
        const name = a.titulo || a.url || 'Arquivo';
        const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
        let icon = 'fa-file';
        if (ext === '.pdf') icon = 'fa-file-pdf';
        else if (['.xls','.xlsx','.ods'].includes(ext)) icon = 'fa-file-excel';
        else if (['.ppt','.pptx','.odp'].includes(ext)) icon = 'fa-file-powerpoint';
        else if (['.jpg','.jpeg','.png','.gif','.webp','.svg'].includes(ext)) icon = 'fa-file-image';
        return `<a href="${a.url}" target="_blank" class="view-anexo-card">
            <i class="fas ${icon} anexo-icon"></i>
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

function _renderPubChecklistItems() {
    return (window._pubChecklistState || []).map((c, i) => {
        const isRequired = !!c.requiredForPub;
        const needsWarning = isRequired && !c.checked;
        return `
        <label class="pub-cl-item ${c.checked ? 'checked' : ''} ${needsWarning ? 'pub-cl-required-warn' : ''}" data-pub-cl-index="${i}">
            <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="togglePubClItem(${i}, this)">
            ${isRequired ? `<i class="fas fa-exclamation-circle pub-cl-required-icon" title="Item obrigatório para publicar"></i>` : ''}
            <span>${c.texto || ''}</span>
        </label>`;
    }).join('');
}

function _updatePubClToggleBtn() {
    const btn = document.getElementById('pubClToggleAllBtn');
    if (!btn || !window._pubChecklistState) return;
    const allChecked = window._pubChecklistState.length > 0 && window._pubChecklistState.every(c => c.checked);
    btn.textContent = allChecked ? 'Desmarcar todos' : 'Marcar todos';
}

window.togglePubClItem = function(i, cb) {
    if (!window._pubChecklistState || !window._pubChecklistState[i]) return;
    window._pubChecklistState[i].checked = cb.checked;
    const label = cb.closest('.pub-cl-item');
    if (label) {
        label.classList.toggle('checked', cb.checked);
        if (window._pubChecklistState[i].requiredForPub) {
            label.classList.toggle('pub-cl-required-warn', !cb.checked);
        }
    }
    _updatePubClToggleBtn();
};

window.toggleAllPubChecklist = function() {
    if (!window._pubChecklistState || window._pubChecklistState.length === 0) return;
    const allChecked = window._pubChecklistState.every(c => c.checked);
    const newState = !allChecked;
    window._pubChecklistState.forEach(c => c.checked = newState);
    document.getElementById('pubChecklistItems').innerHTML = _renderPubChecklistItems();
    _updatePubClToggleBtn();
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
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field-group full-width">
                <label>Título da Publicação</label>
                <input type="text" id="pubTitulo" placeholder="Título desta revisão/publicação" value="${existingPub ? (existingPub.titulo || '') : ''}">
            </div>
            <div class="field-group">
                <label>Data <span class="req-star">*</span></label>
                <input type="date" id="pubData" value="${dateVal}">
            </div>
            <div class="field-group">
                <label>Hora <span class="req-star">*</span></label>
                <input type="time" id="pubHora" value="${timeVal}">
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
        const tipoVal = existingPub ? (existingPub.tipo || 'Comentário') : 'Comentário';
        fieldsHtml = `
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field-group">
                <label>Tipo</label>
                <select id="pubTipo">
                    <option value="Comentário"${tipoVal==='Comentário'?' selected':''}>Comentário</option>
                    <option value="Atualização"${tipoVal==='Atualização'?' selected':''}>Atualização</option>
                    <option value="Evidência"${tipoVal==='Evidência'?' selected':''}>Evidência</option>
                </select>
            </div>
            <div class="field-group">
                <label>Data <span class="req-star">*</span></label>
                <input type="date" id="pubData" value="${dateVal}">
            </div>
            <div class="field-group">
                <label>Hora <span class="req-star">*</span></label>
                <input type="time" id="pubHora" value="${timeVal}">
            </div>
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
            // Ao editar: carrega o snapshot salvo preservando o estado marcado
            window._pubChecklistState = existingPub.checklistSnapshot.map(c => ({ ...c }));
            clItems.innerHTML = _renderPubChecklistItems();
            clWrap.style.display = '';
            _updatePubClToggleBtn();
        } else if (pubCL.length > 0 && !isEditing) {
            window._pubChecklistState = pubCL.map(c => ({ ...c, checked: false, comment: '' }));
            clItems.innerHTML = _renderPubChecklistItems();
            clWrap.style.display = '';
            _updatePubClToggleBtn();
        } else {
            clWrap.style.display = 'none';
            window._pubChecklistState = [];
        }
    }

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
    const horaVal = document.getElementById('pubHora')?.value || _nowTimeStr();
    const descVal = document.getElementById('pubDescricao')?.value.trim() || '';

    const anexos = (typeof getAnexosUpload === 'function') ? getAnexosUpload('pub') : [];

    // Validações obrigatórias
    const _markReq = (id, bad) => { const el = document.getElementById(id); if (el) el.classList.toggle('field-required-error', bad); };
    const _dataOk = !!dataVal, _horaOk = !!horaVal, _descOk = !!descVal;
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
    // Validação doc: anexo obrigatório apenas para novas publicações
    if (!isEditing && finalTab === 'documentos' && anexos.length === 0) {
        if (typeof showToast === 'function') showToast('Anexo obrigatório para publicações de documentos.', 'error');
        return;
    }

    if (!item.publicacoes) item.publicacoes = [];

    // Preserva id original ao editar
    const existingId = isEditing ? (item.publicacoes[editIndex]?.id || Date.now()) : Date.now();

    let pub = {
        id: existingId,
        data: dataVal,
        hora: horaVal,
        descricao: descVal,
        usuario: isEditing ? (item.publicacoes[editIndex]?.usuario || '') : (window.currentuser ? (window.currentuser.name || window.currentuser.user || '') : ''),
        anexos: anexos
    };

    // Salva snapshot do checklist de publicação
    if (window._pubChecklistState && window._pubChecklistState.length > 0) {
        pub.checklistSnapshot = window._pubChecklistState.map(c => ({ texto: c.texto, checked: c.checked, requiredForPub: !!c.requiredForPub }));
    } else if (isEditing && item.publicacoes[editIndex]?.checklistSnapshot) {
        pub.checklistSnapshot = item.publicacoes[editIndex].checklistSnapshot;
    }

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
    } else {
        item.publicacoes.unshift(pub);
        _updateItemDatesAfterPublicacao(item, finalTab, dataVal);
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

window.renderViewPublicacoes = function(item) {
    const container = document.getElementById('viewPublicacoesContent');
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

    // Filtra pelo tipo ativo
    const filtroAtivo = window._pubSubtabAtivo || 'Todos';
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

    const totalPages = Math.max(1, Math.ceil(pubs.length / _VP_PUB_PER_PAGE));
    if (_vpPubPage > totalPages) _vpPubPage = totalPages;

    const pagePubs = pubs.slice((_vpPubPage - 1) * _VP_PUB_PER_PAGE, _vpPubPage * _VP_PUB_PER_PAGE);
    const _canMgPubs = typeof userCanManagePubs === 'function' ? userCanManagePubs(item) : true;

    const _sortIcon = (col) => {
        if (_vpPubSortCol !== col) return '<i class="fas fa-sort" style="opacity:0.3;margin-left:4px;font-size:10px"></i>';
        return _vpPubSortDir === 'asc'
            ? '<i class="fas fa-sort-up" style="color:var(--accent);margin-left:4px;font-size:10px"></i>'
            : '<i class="fas fa-sort-down" style="color:var(--accent);margin-left:4px;font-size:10px"></i>';
    };

    const rows = pagePubs.map((p) => {
        const i = allPubs.indexOf(p);
        const typeClass = {
            'Evidência': 'evidencia', 'Atualização': 'atualizacao',
            'Comentário': 'comentario', 'Treinamento': 'evidencia', 'Documento': 'documento'
        }[p.tipo] || '';
        const dateStr = p.data ? _formatDateBR(p.data) : '–';
        const descPreview = (p.descricao || '').slice(0, 60) + ((p.descricao || '').length > 60 ? '…' : '');
        const nAnexos = (p.anexos || []).length;
        return `<tr onclick="verPublicacao(${item.id},'${window._currentViewTab}',${i})" title="Ver publicação">
            <td><span class="pub-type-badge ${typeClass}">${p.tipo || '–'}</span></td>
            <td>${p.titulo || descPreview || '–'}</td>
            <td>${dateStr}${p.hora ? ' ' + p.hora : ''}</td>
            <td>${p.usuario || '–'}</td>
            <td>${nAnexos > 0 ? `<i class="fas fa-paperclip" style="color:#94a3b8"></i> ${nAnexos}` : '–'}</td>
            <td onclick="event.stopPropagation();" style="white-space:nowrap;">
                ${_canMgPubs ? `<button class="pub-action-btn" title="Editar" onclick="openPublicacaoModal(${i})"><i class="fas fa-pencil-alt"></i></button>` : ''}
                ${_canMgPubs ? `<button class="pub-action-btn pub-action-btn-del" title="Excluir" onclick="excluirPublicacao(${item.id},'${window._currentViewTab}',${i})"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        </tr>`;
    }).join('');

    // Paginação
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
            <table class="pub-table">
                <thead><tr>
                    <th style="cursor:pointer" onclick="_vpSortPublicacoes('tipo')">Tipo${_sortIcon('tipo')}</th>
                    <th style="cursor:pointer" onclick="_vpSortPublicacoes('desc')">Descrição${_sortIcon('desc')}</th>
                    <th style="cursor:pointer" onclick="_vpSortPublicacoes('data')">Data/Hora${_sortIcon('data')}</th>
                    <th style="cursor:pointer" onclick="_vpSortPublicacoes('usuario')">Usuário${_sortIcon('usuario')}</th>
                    <th>Anexos</th><th></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${paginationHtml}`
;};

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
    if (iconEl) { iconEl.innerHTML = `<i class="${cfg.icon}"></i>`; iconEl.style.background = cfg.bg; iconEl.style.color = cfg.color; }
    if (labelEl) { labelEl.textContent = tipo; labelEl.style.color = cfg.color; }
    if (titleEl) titleEl.textContent = item.titulo || '';

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

    // Checklist de publicação (salvo no pub)
    const clItems = pub.checklistSnapshot || [];
    let clBlock = '';
    if (clItems.length > 0) {
        const done = clItems.filter(c => c.checked).length;
        const pct = Math.round((done / clItems.length) * 100);
        clBlock = `
        <div class="ver-pub-section">
            <div class="ver-pub-section-label"><i class="fas fa-list-check"></i> Checklist de Publicação <span class="ver-pub-cl-badge">${done}/${clItems.length}</span></div>
            <div class="ver-pub-cl-progress"><div class="ver-pub-cl-progress-bar" style="width:${pct}%"></div></div>
            <div class="ver-pub-cl-list">
                ${clItems.map(c => `
                    <div class="ver-pub-cl-item ${c.checked ? 'done' : ''}">
                        <span class="ver-pub-cl-dot">${c.checked ? '<i class="fas fa-check"></i>' : ''}</span>
                        <span>${c.texto || ''}</span>
                    </div>`).join('')}
            </div>
        </div>`;
    }

    // Anexos
    const anexos = pub.anexos || [];
    let anexosBlock = '';
    if (anexos.length > 0) {
        const _extIcon = (name, tipo) => {
            if (tipo === 'link') return `<i class="fas fa-link" style="color:#2563eb"></i>`;
            const ext = (name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '');
            if (ext === '.pdf') return `<i class="fas fa-file-pdf" style="color:#ef4444"></i>`;
            if (['.xls','.xlsx','.ods'].includes(ext)) return `<i class="fas fa-file-excel" style="color:#16a34a"></i>`;
            if (['.ppt','.pptx','.odp'].includes(ext)) return `<i class="fas fa-file-powerpoint" style="color:#ea580c"></i>`;
            if (['.jpg','.jpeg','.png','.gif','.webp','.svg'].includes(ext)) return `<i class="fas fa-file-image" style="color:#0891b2"></i>`;
            return `<i class="fas fa-file" style="color:#6b7280"></i>`;
        };
        anexosBlock = `
        <div class="ver-pub-section">
            <div class="ver-pub-section-label"><i class="fas fa-paperclip"></i> Anexos</div>
            <div class="ver-pub-anexos-grid">
                ${anexos.map(a => `
                    <a href="${a.url}" target="_blank" class="ver-pub-anexo-card">
                        <span class="ver-pub-anexo-icon">${_extIcon(a.titulo || '', a.tipo)}</span>
                        <span class="ver-pub-anexo-name">${a.titulo || 'Arquivo'}</span>
                    </a>`).join('')}
            </div>
        </div>`;
    }

    document.getElementById('verPubContent').innerHTML = metaPills + extras + descBlock + clBlock + anexosBlock;

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
            <button class="btn-cancel" onclick="closeModal('modalVerPublicacao')">Fechar</button>
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
            item.publicacoes.splice(index, 1);
            saveAll();
            closeModal('modalVerPublicacao');
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
