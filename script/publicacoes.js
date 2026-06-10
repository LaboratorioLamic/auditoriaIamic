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
    container.innerHTML = items.map((item, i) => {
        const requiresComment = !!item.requiresComment;
        return `
        <div class="checklist-editor-item">
            <div class="checklist-editor-item-top">
                <input type="text" class="checklist-item-text-input" value="${(item.texto || '').replace(/"/g, '&quot;')}"
                    onchange="updateChecklistItemText('${prefix}', ${i}, this.value)"
                    placeholder="Texto do item">
                <button class="checklist-item-required-toggle ${requiresComment ? 'active' : ''}"
                    onclick="toggleChecklistItemRequired('${prefix}', ${i}, this)"
                    title="${requiresComment ? 'Comentário obrigatório ativado' : 'Exigir comentário para marcar'}">
                    <i class="fas fa-comment-dots" style="font-size:11px;"></i>
                    ${requiresComment ? 'Comentário obrigatório' : 'Exigir comentário'}
                </button>
                <button class="checklist-item-del-btn" onclick="removeChecklistItem('${prefix}',${i})" title="Remover">&times;</button>
            </div>
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

// Chamado ao abrir drawer em modo edição
window.restoreChecklist = function(prefix, checklistArr) {
    _setChecklistData(prefix, checklistArr ? JSON.parse(JSON.stringify(checklistArr)) : []);
    renderChecklistEditor(prefix);
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

// Limpa ao fechar/resetar
window.clearChecklist = function(prefix) {
    _setChecklistData(prefix, []);
    renderChecklistEditor(prefix);
};

// ─── VIEW CHECKLIST ──────────────────────────────────────────
window.renderViewChecklist = function(item, tab) {
    const container = document.getElementById('viewChecklistContent');
    if (!container) return;
    const checklist = item.checklist || [];
    if (checklist.length === 0) {
        container.innerHTML = '<div class="pub-empty"><i class="fas fa-list-check"></i><p>Nenhum item de checklist cadastrado.</p></div>';
        return;
    }
    const done = checklist.filter(c => c.checked).length;
    const pct = checklist.length > 0 ? Math.round((done / checklist.length) * 100) : 0;

    const itemsHtml = checklist.map((c, i) => {
        const hasComment = !!(c.comment || '').trim();
        const needsComment = !!c.requiresComment;
        const blocked = needsComment && !hasComment && !c.checked;
        const commentBtnClass = hasComment ? 'has-comment' : '';
        return `
        <div class="view-checklist-item ${c.checked ? 'checked' : ''}" id="vcl-item-${item.id}-${i}">
            <div class="view-checklist-item-row">
                <input type="checkbox" class="view-checklist-cb" ${c.checked ? 'checked' : ''} ${blocked ? 'disabled' : ''}
                    onchange="toggleViewChecklistItem(${item.id},'${tab}',${i})"
                    title="${blocked ? 'Digite um comentário antes de marcar este item' : ''}">
                <span class="view-checklist-item-text">${c.texto || ''}</span>
                <button class="view-checklist-comment-btn ${commentBtnClass}"
                    onclick="toggleViewChecklistComment('vcl-item-${item.id}-${i}')"
                    title="${hasComment ? 'Ver/editar comentário' : 'Adicionar comentário'}">
                    <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;">
                        <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
            <div class="view-checklist-comment-area ${hasComment ? 'open' : ''}" id="vcl-cmt-${item.id}-${i}">
                ${needsComment && !c.checked ? `<div class="view-checklist-required-hint"><i class="fas fa-exclamation-circle"></i> Comentário obrigatório para marcar este item</div>` : ''}
                <textarea class="view-checklist-comment-input"
                    placeholder="Adicione um comentário..."
                    oninput="saveViewChecklistComment(${item.id},'${tab}',${i},this.value)"
                >${(c.comment || '').replace(/</g,'&lt;')}</textarea>
            </div>
        </div>`;
    }).join('');

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
        <div class="view-checklist-header">
            <button class="view-checklist-select-all" onclick="selectAllViewChecklist(${item.id},'${tab}')">Selecionar todos</button>
        </div>
        <div class="view-checklist-list">${itemsHtml}</div>
        <div class="view-checklist-footer">${done}/${checklist.length} itens marcados</div>`;
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
    if (!found || !found.checklist || !found.checklist[index]) return;
    found.checklist[index].comment = value;
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
    if (!found || !found.checklist) return;
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
    if (!found) return;
    if (!found.checklist) found.checklist = [];
    const c = found.checklist[index];
    if (!c) return;
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
// Abre modal de publicação para o item atualmente em view
window.openPublicacaoModal = function() {
    const id = window._currentViewId;
    const tab = window._currentViewTab;
    if (id === undefined || !tab) return;

    const finalTab = _normalizeTab(tab);
    let item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === id);
    if (!item) return;

    // Limpa upload
    if (typeof restoreAnexosUpload === 'function') restoreAnexosUpload('pub', []);

    // Renderiza campos dinâmicos por tipo
    const fieldsEl = document.getElementById('pubModalFields');
    document.getElementById('pubModalSubtitle').textContent = item.titulo || '';

    let fieldsHtml = '';
    const now = new Date();
    const dateVal = now.toISOString().split('T')[0];
    const timeVal = now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

    if (finalTab === 'treinamentos') {
        // Treinamento: Instrutor, Participantes, Local, Carga Horária, Descrição
        fieldsHtml = `
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field-group">
                <label>Data</label>
                <input type="date" id="pubData" value="${dateVal}">
            </div>
            <div class="field-group">
                <label>Hora</label>
                <input type="time" id="pubHora" value="${timeVal}">
            </div>
            <div class="field-group">
                <label>Instrutor</label>
                <input type="text" id="pubInstrutor" placeholder="Nome do instrutor">
            </div>
            <div class="field-group">
                <label>Carga Horária (HH:MM)</label>
                <div style="display:flex;gap:6px;align-items:center;">
                    <input type="number" id="pubCHoras" min="0" max="23" placeholder="00" style="width:60px;text-align:center;">
                    <span>:</span>
                    <input type="number" id="pubCMinutos" min="0" max="59" placeholder="00" style="width:60px;text-align:center;">
                </div>
            </div>
            <div class="field-group full-width">
                <label>Participantes</label>
                <textarea id="pubParticipantes" rows="2" placeholder="Nomes dos participantes..."></textarea>
            </div>
            <div class="field-group full-width">
                <label>Local do Evento</label>
                <input type="text" id="pubLocal" placeholder="Ex: Sala de Treinamento A">
            </div>
            <div class="field-group full-width">
                <label>Descrição</label>
                <textarea id="pubDescricao" rows="3" placeholder="Descreva o treinamento realizado..."></textarea>
            </div>
        </div>`;
    } else if (finalTab === 'documentos') {
        // Documentos: Título, Data, Hora, Descrição, Anexo (obrigatório)
        fieldsHtml = `
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field-group full-width">
                <label>Título da Publicação</label>
                <input type="text" id="pubTitulo" placeholder="Título desta revisão/publicação">
            </div>
            <div class="field-group">
                <label>Data</label>
                <input type="date" id="pubData" value="${dateVal}">
            </div>
            <div class="field-group">
                <label>Hora</label>
                <input type="time" id="pubHora" value="${timeVal}">
            </div>
            <div class="field-group full-width">
                <label>Descrição</label>
                <textarea id="pubDescricao" rows="3" placeholder="Descreva as alterações ou o conteúdo..."></textarea>
            </div>
        </div>
        <div style="padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;margin-top:4px;">
            <i class="fas fa-info-circle"></i> O anexo é obrigatório para documentos.
        </div>`;
    } else {
        // Auditoria / Atividades: Tipo, Data, Hora, Descrição
        fieldsHtml = `
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field-group">
                <label>Tipo</label>
                <select id="pubTipo">
                    <option value="Comentário">Comentário</option>
                    <option value="Atualização">Atualização</option>
                    <option value="Evidência">Evidência</option>
                </select>
            </div>
            <div class="field-group">
                <label>Data</label>
                <input type="date" id="pubData" value="${dateVal}">
            </div>
            <div class="field-group">
                <label>Hora</label>
                <input type="time" id="pubHora" value="${timeVal}">
            </div>
            <div class="field-group full-width">
                <label>Descrição</label>
                <textarea id="pubDescricao" rows="3" placeholder="Descreva o comentário, atualização ou evidência..."></textarea>
            </div>
        </div>`;
    }

    fieldsEl.innerHTML = fieldsHtml;
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
    if (!item) return;

    const dataEl = document.getElementById('pubData');
    const horaEl = document.getElementById('pubHora');
    const descEl = document.getElementById('pubDescricao');
    const dataVal = dataEl ? dataEl.value : _nowDateStr();
    const horaVal = horaEl ? horaEl.value : _nowTimeStr();
    const descVal = descEl ? descEl.value.trim() : '';

    // Anexos
    const anexos = (typeof getAnexosUpload === 'function') ? getAnexosUpload('pub') : [];

    // Validação doc: anexo obrigatório
    if (finalTab === 'documentos' && anexos.length === 0) {
        if (typeof showToast === 'function') showToast('Anexo obrigatório para publicações de documentos.', 'error');
        return;
    }

    let pub = {
        id: Date.now(),
        data: dataVal,
        hora: horaVal,
        descricao: descVal,
        usuario: window.currentuser ? (window.currentuser.name || window.currentuser.user || '') : '',
        anexos: anexos
    };

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

    // Adiciona publicação ao item
    if (!item.publicacoes) item.publicacoes = [];
    item.publicacoes.unshift(pub);

    // Atualiza data de publicação e recalcula próxima data
    _updateItemDatesAfterPublicacao(item, finalTab, dataVal);

    saveAll();
    closeModal('modalPublicacao');

    // Refresca view
    if (typeof renderViewContent === 'function') renderViewContent(id, finalTab);
    // Vai para aba de publicações
    const pubTab = document.querySelector('.view-modal-tab:last-child');
    if (pubTab) switchViewTab('publicacoes', pubTab);
    renderViewPublicacoes(item);
    _updatePubTabBadge(item);
    renderCards();
    if (typeof showToast === 'function') showToast('Publicação registrada com sucesso!', 'success');
};

function _updateItemDatesAfterPublicacao(item, tab, newDate) {
    if (tab === 'auditoria') {
        item.dataPublicacao = newDate;
    } else if (tab === 'atividades') {
        item.dataInicio = newDate;
    } else if (tab === 'treinamentos') {
        item.dataPublicacao = newDate;
        const per = parseInt(item.periodicidade) || 0;
        if (per > 0 && newDate) {
            const next = new Date(newDate);
            next.setDate(next.getDate() + per);
            item.dataPrevisao = next.toISOString().split('T')[0];
        }
    } else if (tab === 'documentos') {
        item.dataCriacao = newDate;
        const inter = parseInt(item.docIntervalo) || 0;
        if (inter > 0 && newDate) {
            const next = new Date(newDate);
            next.setDate(next.getDate() + inter);
            item.dataProximaRevisao = next.toISOString().split('T')[0];
        }
    }
}

// ─── RENDER PUBLICAÇÕES (aba view modal) ─────────────────────
window.renderViewPublicacoes = function(item) {
    const container = document.getElementById('viewPublicacoesContent');
    if (!container) return;
    const pubs = item.publicacoes || [];
    if (pubs.length === 0) {
        container.innerHTML = '<div class="pub-empty"><i class="fas fa-paper-plane"></i><p>Nenhuma publicação registrada ainda.</p></div>';
        return;
    }
    const rows = pubs.map((p, i) => {
        const typeClass = {
            'Evidência': 'evidencia',
            'Atualização': 'atualizacao',
            'Comentário': 'comentario',
            'Treinamento': 'evidencia',
            'Documento': 'documento'
        }[p.tipo] || '';
        const dateStr = p.data ? _formatDateBR(p.data) : '–';
        const descPreview = (p.descricao || '').slice(0, 60) + ((p.descricao || '').length > 60 ? '…' : '');
        const nAnexos = (p.anexos || []).length;
        return `<tr onclick="verPublicacao(${item.id},'${window._currentViewTab}',${i})" title="Ver publicação">
            <td><span class="pub-type-badge ${typeClass}">${p.tipo || '–'}</span></td>
            <td>${p.titulo || descPreview || '–'}</td>
            <td>${dateStr} ${p.hora || ''}</td>
            <td>${p.usuario || '–'}</td>
            <td>${nAnexos > 0 ? `<i class="fas fa-paperclip" style="color:#94a3b8"></i> ${nAnexos}` : '–'}</td>
        </tr>`;
    }).join('');
    container.innerHTML = `
        <div class="pub-table-wrap">
            <table class="pub-table">
                <thead><tr>
                    <th>Tipo</th><th>Descrição</th><th>Data/Hora</th><th>Usuário</th><th>Anexos</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
};

window.verPublicacao = function(id, tab, index) {
    const finalTab = _normalizeTab(tab);
    let item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === id);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === id);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === id);
    if (!item) return;
    const pub = (item.publicacoes || [])[index];
    if (!pub) return;

    document.getElementById('verPubTitle').textContent = `Publicação — ${pub.tipo || ''}`;

    let fields = `
        <div class="ver-pub-grid">
            <div class="ver-pub-field"><label>Tipo</label><div>${pub.tipo || '–'}</div></div>
            <div class="ver-pub-field"><label>Data</label><div>${_formatDateBR(pub.data)} ${pub.hora || ''}</div></div>
            <div class="ver-pub-field"><label>Usuário</label><div>${pub.usuario || '–'}</div></div>`;

    if (pub.titulo) fields += `<div class="ver-pub-field full-width" style="grid-column:1/-1"><label>Título</label><div>${pub.titulo}</div></div>`;
    if (pub.instrutor) fields += `<div class="ver-pub-field"><label>Instrutor</label><div>${pub.instrutor}</div></div>`;
    if (pub.cargaHoraria) fields += `<div class="ver-pub-field"><label>Carga Horária</label><div>${pub.cargaHoraria}</div></div>`;
    if (pub.localEvento) fields += `<div class="ver-pub-field"><label>Local</label><div>${pub.localEvento}</div></div>`;
    if (pub.participantes) fields += `<div class="ver-pub-field" style="grid-column:1/-1"><label>Participantes</label><div>${pub.participantes}</div></div>`;

    fields += '</div>';

    if (pub.descricao) {
        fields += `<div style="margin-bottom:16px;">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:6px;">Descrição</div>
            <div class="view-desc-block">${pub.descricao.replace(/\n/g,'<br>')}</div>
        </div>`;
    }

    const anexos = pub.anexos || [];
    if (anexos.length > 0) {
        fields += `<div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Anexos</div>
            <div class="view-anexos-grid">${anexos.map(a => {
                const name = a.titulo || 'Arquivo';
                return `<a href="${a.url}" target="_blank" class="view-anexo-card">
                    <i class="fas fa-file-pdf anexo-icon"></i>
                    <span class="anexo-name">${name}</span>
                </a>`;
            }).join('')}</div>
        </div>`;
    }

    document.getElementById('verPubContent').innerHTML = fields;
    document.getElementById('modalVerPublicacao').style.display = 'flex';
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

// ─── INTEGRAÇÃO COM SAVE (inject no reset) ───────────────────
// Patch: limpa checklist ao resetar drawer
const _origResetModal = window.resetModal;
if (typeof _origResetModal === 'function') {
    window.resetModal = function(prefix) {
        _origResetModal(prefix);
        clearChecklist(prefix);
        // Reset drawer para primeira aba
        const drawer = document.getElementById(_drawerIdFromPrefix(prefix));
        if (drawer) {
            drawer.querySelectorAll('.drawer-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
            drawer.querySelectorAll('.drawer-tab-panel').forEach((p, i) => p.classList.toggle('active', i === 0));
        }
    };
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
