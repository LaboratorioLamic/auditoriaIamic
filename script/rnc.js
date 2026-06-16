// =========================================================================
//  GESTÃO DE N/C — RNC (Relatório de Não Conformidade)
//  Módulo independente: Kanban, Lista (cards), Calendário
//  Filtros: Setor e Data próprios no header + sino próprio
//  Persistência: array global `rncItems` (Firebase) + masterLists
// =========================================================================
(function () {
    'use strict';

    // ── Estado global ──
    if (typeof window.rncItems === 'undefined') window.rncItems = [];

    // ── Estado de UI ──
    var rncView = 'kanban';
    var rncSearch = '';
    var rncClassFilter = '';       // '' | 'critica' | 'maior' | 'menor'
    var rncMyMode = 'all'; // 'responsavel' | 'revisor' | 'all'
    var rncSetorFilter = [];
    var rncOrigemFilter = [];
    var rncDetFilter = [];
    var rncDateFilter = { type: 'all', month: null, year: null, ini: '', fim: '' };
    var rncPage = 1;
    var rncTableSort = { col: 'dataConclusao', dir: 'asc' };
    var rncEditingId = null;
    var rncViewId = null;
    var rncCalYear = null;
    var rncCalMonth = null;
    var rncManagerKind = null;

    var MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    // ── Marcadores: somente os cadastrados pelo usuário (sem pré-cadastro) ──
    function getMarker(id) {
        if (!id) return null;
        var custom = (typeof masterLists !== 'undefined' && Array.isArray(masterLists.rncMarcadores)) ? masterLists.rncMarcadores : [];
        return custom.find(function(m){ return String(m.id) === String(id); }) || null;
    }
    function getAllMarkers() {
        return (typeof masterLists !== 'undefined' && Array.isArray(masterLists.rncMarcadores)) ? masterLists.rncMarcadores : [];
    }
    function _updateMarkerDisplay(id) {
        var disp = document.getElementById('rncFMarcadorDisplay');
        if (!disp) return;
        var mk = getMarker(id);
        if (mk) {
            disp.innerHTML = '<span class="rnc-marker-badge" style="background:' + mk.bg + ';color:' + mk.color + '"><i class="fas ' + mk.icon + '"></i> ' + esc(mk.label) + '</span>';
        } else {
            disp.innerHTML = '<span style="color:#94a3b8">Nenhum</span>';
        }
    }
    window.rncToggleMarkerDropdown = function() {
        var dd = document.getElementById('rncMarkerDropdown');
        if (!dd) return;
        if (dd.classList.contains('open')) { dd.classList.remove('open'); return; }
        var selectedId = (document.getElementById('rncFMarcador') || {}).value || '';
        var markers = getAllMarkers();
        dd.innerHTML =
            '<button class="rnc-ac-option rnc-marker-opt' + (!selectedId ? ' active' : '') + '" onclick="rncPickMarker(\'\')" style="display:flex;align-items:center;gap:8px">' +
                '<span class="rnc-marker-badge" style="background:#f1f5f9;color:#64748b"><i class="fas fa-ban"></i> Nenhum</span>' +
            '</button>' +
            markers.map(function(m) {
                return '<button class="rnc-ac-option rnc-marker-opt' + (selectedId === m.id ? ' active' : '') + '" onclick="rncPickMarker(\'' + esc(m.id) + '\')" style="display:flex;align-items:center;gap:8px">' +
                    '<span class="rnc-marker-badge" style="background:' + (m.bg || '#f1f5f9') + ';color:' + m.color + '"><i class="fas ' + m.icon + '"></i> ' + esc(m.label || m.name) + '</span>' +
                '</button>';
            }).join('') +
            '<button class="rnc-ac-option rnc-marker-opt" onclick="rncOpenMarkerManager()" style="display:flex;align-items:center;gap:8px;color:#8b5cf6;font-weight:600;border-top:1px solid #f1f5f9;margin-top:4px">' +
                '<i class="fas fa-plus"></i> Gerenciar marcadores' +
            '</button>';
        dd.classList.add('open');
    };
    window.rncPickMarker = function(id) {
        var inp = document.getElementById('rncFMarcador');
        if (inp) inp.value = id;
        _updateMarkerDisplay(id);
        var dd = document.getElementById('rncMarkerDropdown');
        if (dd) dd.classList.remove('open');
    };
    // ── Editor de marcadores (modal dedicado, criar/editar com ícone e cor) ──
    var RNC_MK_COLORS = [
        '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e',
        '#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7',
        '#ec4899','#f43f5e','#64748b','#0f172a'
    ];
    var RNC_MK_ICONS = [
        'fa-tag','fa-fire','fa-triangle-exclamation','fa-clock','fa-magnifying-glass',
        'fa-circle-check','fa-ban','fa-star','fa-flag','fa-bookmark','fa-bolt','fa-heart',
        'fa-thumbtack','fa-bell','fa-shield-halved','fa-gem','fa-rocket','fa-bug',
        'fa-wrench','fa-leaf','fa-lightbulb','fa-lock','fa-hourglass-half','fa-thumbs-up'
    ];
    var _rncMkColor = RNC_MK_COLORS[0];
    var _rncMkIcon  = RNC_MK_ICONS[0];
    var _rncMkEditId = null;

    function _rncHexToBg(hex) { return hex + '22'; }

    window.rncOpenMarkerManager = function() {
        if (!canManage()) { toast('Sem permissão para gerenciar marcadores.', 'error'); return; }
        ensureLists();
        rncMkResetForm();
        _rncMkRenderExisting();
        _rncMkRenderColors();
        _rncMkRenderIcons();
        rncMkUpdatePreview();
        var modal = document.getElementById('rncMarkerEditorModal');
        if (modal) modal.style.display = 'flex';
    };
    window.rncCloseMarkerEditor = function() {
        var modal = document.getElementById('rncMarkerEditorModal');
        if (modal) modal.style.display = 'none';
    };

    function _rncMkRenderExisting() {
        var wrap = document.getElementById('rncMkExisting');
        if (!wrap) return;
        var list = getAllMarkers();
        if (!list.length) {
            wrap.innerHTML = '<div class="rnc-mk-empty"><i class="fas fa-tags"></i><span>Nenhum marcador cadastrado ainda.</span></div>';
            return;
        }
        wrap.innerHTML = list.map(function(m, i){
            return '<div class="rnc-mk-chip-row">' +
                '<span class="rnc-marker-badge" style="background:' + (m.bg || _rncHexToBg(m.color)) + ';color:' + m.color + '"><i class="fas ' + m.icon + '"></i> ' + esc(m.label || m.name) + '</span>' +
                '<div class="rnc-mk-chip-actions">' +
                    '<button onclick="rncMkEdit(' + i + ')" title="Editar"><i class="fas fa-pen"></i></button>' +
                    '<button class="danger" onclick="rncMkRemove(' + i + ')" title="Remover"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function _rncMkRenderColors() {
        var wrap = document.getElementById('rncMkColors');
        if (!wrap) return;
        wrap.innerHTML = RNC_MK_COLORS.map(function(c){
            return '<button type="button" class="rnc-mk-color' + (_rncMkColor===c?' active':'') + '" style="background:' + c + '" onclick="rncMkPickColor(\'' + c + '\')"><i class="fas fa-check"></i></button>';
        }).join('');
    }
    function _rncMkRenderIcons() {
        var wrap = document.getElementById('rncMkIcons');
        if (!wrap) return;
        wrap.innerHTML = RNC_MK_ICONS.map(function(ic){
            return '<button type="button" class="rnc-mk-icon' + (_rncMkIcon===ic?' active':'') + '" onclick="rncMkPickIcon(\'' + ic + '\')"><i class="fas ' + ic + '"></i></button>';
        }).join('');
    }
    window.rncMkPickColor = function(c){ _rncMkColor = c; _rncMkRenderColors(); rncMkUpdatePreview(); };
    window.rncMkPickIcon  = function(ic){ _rncMkIcon = ic; _rncMkRenderIcons(); rncMkUpdatePreview(); };

    window.rncMkUpdatePreview = function() {
        var prev = document.getElementById('rncMkPreview');
        if (!prev) return;
        var name = (document.getElementById('rncMkName') || {}).value || 'Marcador';
        prev.style.background = _rncHexToBg(_rncMkColor);
        prev.style.color = _rncMkColor;
        prev.innerHTML = '<i class="fas ' + _rncMkIcon + '"></i> ' + esc(name);
    };

    window.rncMkResetForm = function() {
        _rncMkEditId = null;
        _rncMkColor = RNC_MK_COLORS[0];
        _rncMkIcon  = RNC_MK_ICONS[0];
        var n = document.getElementById('rncMkName'); if (n) n.value = '';
        var ft = document.getElementById('rncMkFormTitle'); if (ft) ft.textContent = 'Novo marcador';
        var sl = document.getElementById('rncMkSaveLabel'); if (sl) sl.textContent = 'Adicionar marcador';
        var cb = document.getElementById('rncMkCancelBtn'); if (cb) cb.style.display = 'none';
        _rncMkRenderColors(); _rncMkRenderIcons(); rncMkUpdatePreview();
    };

    window.rncMkEdit = function(idx) {
        var list = getAllMarkers();
        var m = list[idx]; if (!m) return;
        _rncMkEditId = m.id;
        _rncMkColor = m.color || RNC_MK_COLORS[0];
        _rncMkIcon  = m.icon || RNC_MK_ICONS[0];
        var n = document.getElementById('rncMkName'); if (n) n.value = m.label || m.name || '';
        var ft = document.getElementById('rncMkFormTitle'); if (ft) ft.textContent = 'Editar marcador';
        var sl = document.getElementById('rncMkSaveLabel'); if (sl) sl.textContent = 'Salvar alterações';
        var cb = document.getElementById('rncMkCancelBtn'); if (cb) cb.style.display = '';
        _rncMkRenderColors(); _rncMkRenderIcons(); rncMkUpdatePreview();
    };

    window.rncMkSave = function() {
        ensureLists();
        var n = document.getElementById('rncMkName');
        var name = n ? n.value.trim() : '';
        if (!name) { toast('Informe o nome do marcador.', 'error'); if (n) n.focus(); return; }
        var list = masterLists.rncMarcadores;
        var dup = list.some(function(x){ return String(x.id) !== String(_rncMkEditId) && String(x.label || x.name).trim().toLowerCase() === name.toLowerCase(); });
        if (dup) { toast('Já existe um marcador com este nome.', 'warn'); return; }

        if (_rncMkEditId) {
            var m = list.find(function(x){ return String(x.id) === String(_rncMkEditId); });
            if (m) { m.name = name; m.label = name; m.color = _rncMkColor; m.icon = _rncMkIcon; m.bg = _rncHexToBg(_rncMkColor); }
            toast('Marcador atualizado.', 'success');
        } else {
            list.push({ id: String(Date.now()), name: name, label: name, color: _rncMkColor, icon: _rncMkIcon, bg: _rncHexToBg(_rncMkColor) });
            toast('Marcador adicionado.', 'success');
        }
        persist();
        rncMkResetForm();
        _rncMkRenderExisting();
        renderRnc();
    };

    window.rncMkRemove = function(idx) {
        var list = getAllMarkers();
        var m = list[idx]; if (!m) return;
        rncConfirm({
            title: 'Remover marcador',
            message: 'Remover o marcador "' + (m.label || m.name) + '"?',
            confirmLabel: 'Remover', icon: 'fa-trash'
        }, function() {
            masterLists.rncMarcadores.splice(idx, 1);
            persist(); _rncMkRenderExisting(); renderRnc();
            toast('Marcador removido.', 'success');
        });
    };
    // Inicializa display do marcador ao carregar o form
    function renderMarkerChips(selectedId) {
        _updateMarkerDisplay(selectedId);
        var inp = document.getElementById('rncFMarcador');
        if (inp) inp.value = selectedId || '';
    }

    // ── Classificações (com ícones e cores) ──
    var CLASSES = [
        { id: 'critica', label: 'NC - Crítica',  icon: 'fa-circle-exclamation',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
        { id: 'maior',   label: 'NC - Maior',    icon: 'fa-triangle-exclamation', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
        { id: 'menor',   label: 'NC - Menor',    icon: 'fa-circle-info',          color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }
    ];

    // ══════════════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════════════

    // ── Donut de progresso do checklist (espelha o módulo de Atividades) ──
    function rncDonutHtml(done, total, size) {
        size = size || 46;
        var pct = total > 0 ? Math.round((done / total) * 100) : 0;
        var sw = size <= 32 ? 3 : 4;
        var r = (size / 2) - sw - 1;
        var cx = size / 2;
        var circ = 2 * Math.PI * r;
        var filled = circ * (pct / 100);
        var gap = circ - filled;
        var offset = circ * 0.25;
        var trackColor = pct === 100 ? '#86efac' : '#e5e7eb';
        var fillColor  = pct === 100 ? '#22c55e' : pct >= 50 ? '#2563eb' : '#f59e0b';
        var textColor  = pct === 100 ? '#15803d' : fillColor;
        var fs = size <= 32 ? 7 : 9;
        var ty = cx + fs * 0.38;
        return '' +
            '<div class="rnc-cl-donut-wrap">' +
                '<svg class="rnc-cl-donut" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' +
                    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + trackColor + '" stroke-width="' + sw + '"/>' +
                    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + fillColor + '" stroke-width="' + sw + '"' +
                        ' stroke-dasharray="' + filled.toFixed(2) + ' ' + gap.toFixed(2) + '"' +
                        ' stroke-dashoffset="' + offset.toFixed(2) + '"' +
                        ' stroke-linecap="round" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
                    '<text x="' + cx + '" y="' + ty + '" text-anchor="middle" font-size="' + fs + '" font-weight="700" fill="' + textColor + '">' + pct + '%</text>' +
                '</svg>' +
                '<span class="rnc-cl-donut-label">' + done + '/' + total + '</span>' +
            '</div>';
    }

    function uid() { return Date.now(); } // numeric, compatível com renderViewChecklist
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    function fmtDate(d) {
        if (!d) return '—';
        if (typeof formatBR === 'function') return formatBR(d);
        var p = String(d).split('-');
        return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : d;
    }
    function fmtDateTime(iso) {
        if (!iso) return '';
        try {
            var dt = new Date(iso);
            return String(dt.getDate()).padStart(2,'0') + '/' +
                   String(dt.getMonth()+1).padStart(2,'0') + '/' +
                   String(dt.getFullYear()).slice(-2) + ' ' +
                   String(dt.getHours()).padStart(2,'0') + ':' +
                   String(dt.getMinutes()).padStart(2,'0');
        } catch(e) { return ''; }
    }
    function toast(msg, type) {
        if (typeof window.showToast === 'function') window.showToast(msg, type || 'info');
    }
    function canEdit() { return typeof userCanEditCards !== 'function' || userCanEditCards(); }
    function canManage() { return typeof userCanManageLists !== 'function' || userCanManageLists(); }
    function meName() {
        if (typeof currentuser === 'undefined' || !currentuser) return '';
        return String(currentuser.name || currentuser.user || '').trim();
    }
    function persist() { if (typeof saveAll === 'function') saveAll(); }
    function getCI(id) { return CLASSES.find(function(c){ return c.id === id; }) || CLASSES[0]; }
    function setVal(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; }
    function getVal(id) { var el = document.getElementById(id); return el ? el.value : ''; }
    function focusEl(id) { var el = document.getElementById(id); if (el) el.focus(); }

    // ── Listas em masterLists ──
    function ensureLists() {
        if (typeof masterLists === 'undefined' || !masterLists) return;
        if (!Array.isArray(masterLists.rncOrigens)) masterLists.rncOrigens = [];
        if (!Array.isArray(masterLists.rncDetalhamentos)) masterLists.rncDetalhamentos = [];
        if (!Array.isArray(masterLists.rncStatus)) masterLists.rncStatus = [];
        if (!Array.isArray(masterLists.rncMarcadores)) masterLists.rncMarcadores = [];
        if (!Array.isArray(masterLists.setores)) masterLists.setores = [];
    }
    function getOrigens() { ensureLists(); return masterLists.rncOrigens; }
    function getDetalhamentos() { ensureLists(); return masterLists.rncDetalhamentos; }
    function getRncStatusList() { ensureLists(); return masterLists.rncStatus; }
    function getSetores() {
        ensureLists();
        return (masterLists.setores || []).slice().sort(function(a,b){
            return String(a).localeCompare(String(b),'pt');
        });
    }

    // ── Confirm modal ──
    function rncConfirm(opts, callback) {
        var el = document.getElementById('rncConfirmModal');
        if (!el) { el = document.createElement('div'); el.id = 'rncConfirmModal'; document.body.appendChild(el); }
        var icon = opts.icon || 'fa-triangle-exclamation';
        var cc = opts.confirmClass || 'oc-confirm-btn-danger';
        el.innerHTML =
            '<div class="oc-confirm-backdrop" id="rncConfirmBackdrop">' +
                '<div class="oc-confirm-box">' +
                    '<div class="oc-confirm-icon-wrap"><i class="fas ' + esc(icon) + ' oc-confirm-icon"></i></div>' +
                    '<div class="oc-confirm-title">' + esc(opts.title || 'Confirmar') + '</div>' +
                    '<div class="oc-confirm-msg">' + esc(opts.message || '') + '</div>' +
                    '<div class="oc-confirm-actions">' +
                        '<button class="oc-confirm-btn-cancel" onclick="document.getElementById(\'rncConfirmModal\').innerHTML=\'\'">Cancelar</button>' +
                        '<button class="' + esc(cc) + '" id="rncConfOkBtn">' + esc(opts.confirmLabel || 'Confirmar') + '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.getElementById('rncConfOkBtn').onclick = function() { el.innerHTML = ''; callback(); };
        document.getElementById('rncConfirmBackdrop').addEventListener('click', function(e) {
            if (e.target === e.currentTarget) el.innerHTML = '';
        });
    }

    // ── Date matching ──
    function dateMatches(dateStr) {
        var f = rncDateFilter;
        if (f.type === 'all') return true;
        if (!dateStr) return false;
        var d = new Date(dateStr + 'T00:00:00');
        if (f.type === 'month') return d.getFullYear() === f.year && d.getMonth() === f.month;
        if (f.type === 'year')  return d.getFullYear() === f.year;
        if (f.type === 'custom') {
            if (f.ini && dateStr < f.ini) return false;
            if (f.fim && dateStr > f.fim) return false;
            return true;
        }
        return true;
    }

    // ══════════════════════════════════════════════════════════════════
    //  FILTROS
    // ══════════════════════════════════════════════════════════════════

    function getFiltered() {
        var arr = (window.rncItems || []).filter(function(r){ return r && !r.deleted; });
        if (rncMyMode === 'responsavel') {
            var me = meName().toLowerCase();
            arr = arr.filter(function(r){ return String(r.responsavel || '').trim().toLowerCase() === me; });
        } else if (rncMyMode === 'revisor') {
            var me2 = meName().toLowerCase();
            arr = arr.filter(function(r){ return String(r.revisor || '').trim().toLowerCase() === me2; });
        }
        if (rncClassFilter) arr = arr.filter(function(r){ return r.classificacao === rncClassFilter; });
        if (rncSetorFilter.length) {
            var ss = rncSetorFilter.map(function(s){ return s.trim().toLowerCase(); });
            arr = arr.filter(function(r){ return ss.indexOf(String(r.setor || '').trim().toLowerCase()) !== -1; });
        }
        if (rncOrigemFilter.length) {
            var so = rncOrigemFilter.map(function(s){ return s.trim().toLowerCase(); });
            arr = arr.filter(function(r){ return so.indexOf(String(r.origem || '').trim().toLowerCase()) !== -1; });
        }
        if (rncDetFilter.length) {
            var sd = rncDetFilter.map(function(s){ return s.trim().toLowerCase(); });
            arr = arr.filter(function(r){ return sd.indexOf(String(r.detalhamento || '').trim().toLowerCase()) !== -1; });
        }
        if (rncDateFilter.type !== 'all') {
            arr = arr.filter(function(r){ return dateMatches(r.dataConclusao || r.dataInicio || (r.createdAt || '').slice(0,10)); });
        }
        if (rncSearch) {
            var s = rncSearch;
            arr = arr.filter(function(r){
                return [r.titulo, r.setor, r.origem, r.detalhamento, r.descricao, r.responsavel]
                    .some(function(v){ return String(v || '').toLowerCase().indexOf(s) !== -1; });
            });
        }
        arr.sort(function(a,b){
            var da = a.dataConclusao || '';
            var db = b.dataConclusao || '';
            if (!da && !db) return 0;
            if (!da) return 1;
            if (!db) return -1;
            return da > db ? 1 : (da < db ? -1 : 0);
        });
        return arr;
    }

    // ── Helpers de card (metadados + alerta) compartilhados entre vistas ──
    // Linhas de informação no estilo do módulo de Atividades (ícone + texto)
    function rncCardInfoRows(r) {
        var rows = '';
        rows += '<div class="rnc-card-info-row"><i class="fas fa-building"></i> <span>' + esc(r.setor || 'ND') + '</span></div>';
        if (r.responsavel) rows += '<div class="rnc-card-info-row"><i class="fas fa-user"></i> <span>' + esc(r.responsavel) + '</span></div>';
        rows += '<div class="rnc-card-info-row"><i class="far fa-calendar-check"></i> <span>Conclusão: <strong>' + esc(fmtDate(r.dataConclusao)) + '</strong></span></div>';
        return rows;
    }
    function rncCardMetaHtml(r) {
        return '<div class="rnc-card-meta">' + rncCardInfoRows(r) + '</div>';
    }
    // Constrói um card padrão (estilo Atividades) reutilizado em Cards/Origens
    function rncBuildCard(r, opts) {
        opts = opts || {};
        var ci = getCI(r.classificacao);
        var mk = getMarker(r.marcador);
        var cl  = Array.isArray(r.checklist) ? r.checklist : [];
        var clD = cl.filter(function(c){ return c.checked; }).length;
        var donut = cl.length > 0 ? rncDonutHtml(clD, cl.length, 46) : '';
        var actions = (opts.actions && canEdit()) ?
            '<div class="rnc-card-actions" onclick="event.stopPropagation()">' +
                '<i class="fas fa-pen" onclick="rncOpenEdit(' + r.id + ')" title="Editar"></i>' +
                '<i class="fas fa-trash danger" onclick="rncDelete(' + r.id + ')" title="Excluir"></i>' +
            '</div>' : '';
        return '<div class="rnc-card' + rncAlertClass(r) + (donut ? ' has-donut' : '') + '" onclick="rncOpenView(' + r.id + ')" style="--rnc-card-accent:' + ci.color + '">' +
            '<div class="rnc-card-main">' +
                '<div class="rnc-card-header">' +
                    '<span class="rnc-class-badge rnc-class-badge--sm" style="background:' + ci.bg + ';color:' + ci.color + ';border-color:' + ci.border + '">' +
                        '<i class="fas ' + ci.icon + '"></i> ' + esc(ci.label) +
                    '</span>' +
                    rncAlertBadgeHtml(r) +
                    actions +
                '</div>' +
                '<div class="rnc-card-title">' + esc(r.titulo || 'Sem título') + '</div>' +
                '<div class="rnc-card-body">' +
                    rncCardInfoRows(r) +
                    '<div class="rnc-card-status-row">' +
                        (r.status ? '<span class="rnc-card-status" style="' + rncStatusColorStyle(r.status) + '">' + esc(r.status) + '</span>' : '<span></span>') +
                        (mk ? '<div class="rnc-card-marker" style="background:' + mk.color + '"><i class="fas ' + mk.icon + '"></i> ' + esc(mk.label) + '</div>' : '') +
                    '</div>' +
                '</div>' +
            '</div>' +
            donut +
        '</div>';
    }
    function rncAlertBadgeHtml(r) {
        var a = (typeof rncAlertState === 'function') ? rncAlertState(r) : null;
        if (!a) return '';
        if (a.state === 'overdue') {
            var n = Math.abs(a.diff);
            return '<span class="rnc-alert-badge rnc-alert-overdue"><i class="fas fa-circle-exclamation"></i> ' + n + ' dia' + (n!==1?'s':'') + ' em atraso</span>';
        }
        var txt = a.diff === 0 ? 'Vence hoje' : 'Vence em ' + a.diff + ' dia' + (a.diff!==1?'s':'');
        return '<span class="rnc-alert-badge rnc-alert-warn"><i class="fas fa-bell"></i> ' + txt + '</span>';
    }
    function rncAlertClass(r) {
        var a = (typeof rncAlertState === 'function') ? rncAlertState(r) : null;
        return a ? (' rnc-card--' + a.state) : '';
    }

    // ── Filter bar actions ──
    window.rncOnSearch = function() {
        rncSearch = (document.getElementById('rncSearchInput').value || '').trim().toLowerCase();
        rncPage = 1; renderRnc();
    };
    window.rncToggleSearch = function() {
        var wrap = document.getElementById('rncSearchWrap');
        var input = document.getElementById('rncSearchInput');
        var btn = document.getElementById('rncSearchToggleBtn');
        if (!wrap || !input) return;
        var show = wrap.style.display === 'none';
        wrap.style.display = show ? '' : 'none';
        if (btn) btn.classList.toggle('active', show);
        if (show) input.focus();
        else { input.value = ''; rncSearch = ''; rncPage = 1; renderRnc(); }
    };
    var RNC_CLASS_LABELS = { critica: 'NC - Crítica', maior: 'NC - Maior', menor: 'NC - Menor' };
    window.rncToggleClassFilter = function(cls) {
        rncClassFilter = rncClassFilter === cls ? '' : cls;
        var dd = document.getElementById('rncClassDropdown');
        if (dd) dd.querySelectorAll('button').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-cls') === rncClassFilter);
        });
        var btn = document.getElementById('rncClassBtn');
        var lbl = document.getElementById('rncClassLabel');
        if (lbl) lbl.textContent = rncClassFilter ? RNC_CLASS_LABELS[rncClassFilter] : 'Classificação';
        if (btn) btn.classList.toggle('active', !!rncClassFilter);
        if (dd) dd.classList.remove('open');
        rncPage = 1; renderRnc();
    };
    window.rncToggleClassDropdown = function() {
        var dd = document.getElementById('rncClassDropdown');
        if (dd) dd.classList.toggle('open');
    };

    // ── Filtros de Origem / Detalhamento (multi-seleção, opções só dos cards publicados) ──
    function rncPublishedItems() {
        return (window.rncItems || []).filter(function(r){ return r && !r.deleted; });
    }
    function rncDistinctValues(field) {
        var seen = {}, out = [];
        rncPublishedItems().forEach(function(r){
            var v = String(r[field] || '').trim();
            if (!v || seen[v]) return;
            seen[v] = true; out.push(v);
        });
        return out.sort(function(a,b){ return a.localeCompare(b, 'pt'); });
    }
    function _renderRncFilterChecklist(ddId, values, selected, toggleFn) {
        var dd = document.getElementById(ddId);
        if (!dd) return;
        if (!values.length) {
            dd.innerHTML = '<div class="rnc-filter-empty">Nenhuma opção disponível</div>';
            return;
        }
        dd.innerHTML = values.map(function(v){
            var active = selected.indexOf(v) !== -1;
            return '<button class="' + (active ? 'active' : '') + '" onclick="' + toggleFn + '(\'' + esc(v) + '\')">' +
                '<i class="fas ' + (active ? 'fa-square-check' : 'fa-square') + '"></i> ' + esc(v) +
            '</button>';
        }).join('');
    }
    function updateRncOrigemFilterLabel() {
        var lbl = document.getElementById('rncOrigemFilterLabel');
        var btn = document.getElementById('rncOrigemBtn');
        var n = rncOrigemFilter.length;
        if (lbl) lbl.textContent = n === 0 ? 'Origem' : (n === 1 ? rncOrigemFilter[0] : n + ' origens');
        if (btn) btn.classList.toggle('active', n > 0);
    }
    function updateRncDetFilterLabel() {
        var lbl = document.getElementById('rncDetFilterLabel');
        var btn = document.getElementById('rncDetBtn');
        var n = rncDetFilter.length;
        if (lbl) lbl.textContent = n === 0 ? 'Detalhamento' : (n === 1 ? rncDetFilter[0] : n + ' detalhamentos');
        if (btn) btn.classList.toggle('active', n > 0);
    }
    window.rncToggleOrigemFilterDropdown = function() {
        var dd = document.getElementById('rncOrigemFilterDropdown');
        if (!dd) return;
        var opening = !dd.classList.contains('open');
        if (opening) _renderRncFilterChecklist('rncOrigemFilterDropdown', rncDistinctValues('origem'), rncOrigemFilter, 'rncToggleOrigemFilterValue');
        dd.classList.toggle('open', opening);
    };
    window.rncToggleDetFilterDropdown = function() {
        var dd = document.getElementById('rncDetFilterDropdown');
        if (!dd) return;
        var opening = !dd.classList.contains('open');
        if (opening) _renderRncFilterChecklist('rncDetFilterDropdown', rncDistinctValues('detalhamento'), rncDetFilter, 'rncToggleDetFilterValue');
        dd.classList.toggle('open', opening);
    };
    window.rncToggleOrigemFilterValue = function(v) {
        var idx = rncOrigemFilter.indexOf(v);
        if (idx === -1) rncOrigemFilter.push(v); else rncOrigemFilter.splice(idx, 1);
        _renderRncFilterChecklist('rncOrigemFilterDropdown', rncDistinctValues('origem'), rncOrigemFilter, 'rncToggleOrigemFilterValue');
        updateRncOrigemFilterLabel();
        rncPage = 1; renderRnc();
    };
    window.rncToggleDetFilterValue = function(v) {
        var idx = rncDetFilter.indexOf(v);
        if (idx === -1) rncDetFilter.push(v); else rncDetFilter.splice(idx, 1);
        _renderRncFilterChecklist('rncDetFilterDropdown', rncDistinctValues('detalhamento'), rncDetFilter, 'rncToggleDetFilterValue');
        updateRncDetFilterLabel();
        rncPage = 1; renderRnc();
    };
    window.rncSetMyMode = function(mode) {
        rncMyMode = mode;
        var btn = document.getElementById('rncMyBtn');
        var lbl = document.getElementById('rncMyLabel');
        var labels = { responsavel: 'Como responsável', revisor: 'Como revisor', all: "Todas RNC's" };
        if (lbl) lbl.textContent = labels[mode] || "Todas RNC's";
        if (btn) btn.classList.toggle('active', mode !== 'all');
        var dd = document.getElementById('rncMyDropdown');
        if (dd) {
            dd.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-mode') === mode); });
            dd.classList.remove('open');
        }
        rncPage = 1; renderRnc();
    };
    window.rncToggleMyDropdown = function() {
        var dd = document.getElementById('rncMyDropdown');
        if (dd) dd.classList.toggle('open');
    };
    window.rncClearFilters = function() {
        rncSearch = ''; var si = document.getElementById('rncSearchInput'); if (si) si.value = '';
        rncClassFilter = '';
        var cdd = document.getElementById('rncClassDropdown');
        if (cdd) cdd.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
        var cbtn = document.getElementById('rncClassBtn'); if (cbtn) cbtn.classList.remove('active');
        var clbl = document.getElementById('rncClassLabel'); if (clbl) clbl.textContent = 'Classificação';
        rncSetorFilter = []; rncDateFilter = { type:'all', month:null, year:null, ini:'', fim:'' };
        rncOrigemFilter = []; rncDetFilter = [];
        updateRncOrigemFilterLabel(); updateRncDetFilterLabel();
        rncMyMode = 'all';
        var btn = document.getElementById('rncMyBtn'); if (btn) btn.classList.remove('active');
        var lbl = document.getElementById('rncMyLabel'); if (lbl) lbl.textContent = "Todas RNC's";
        var mdd = document.getElementById('rncMyDropdown');
        if (mdd) mdd.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-mode') === 'all'); });
        updateRncSetorHeadLabel(); updateRncDateHeadLabel();
        rncPage = 1; renderRnc();
    };

    // ── Manage dropdown ──
    window.rncToggleManageDropdown = function() {
        var dd = document.getElementById('rncManageDropdown'); if (dd) dd.classList.toggle('open');
    };
    window.rncCloseManageDropdown = function() {
        var dd = document.getElementById('rncManageDropdown'); if (dd) dd.classList.remove('open');
    };

    // ══════════════════════════════════════════════════════════════════
    //  VIEW SYSTEM (Lista / Kanban / Calendário)
    // ══════════════════════════════════════════════════════════════════

    window.switchRncView = function(view) {
        rncView = view;
        ['cards','kanban','calendar'].forEach(function(v) {
            var btn = document.getElementById('rncViewBtn-' + v);
            var pnl = document.getElementById('rncPane-' + v);
            if (btn) btn.classList.toggle('active', v === view);
            if (pnl) pnl.style.display = v === view ? '' : 'none';
        });
        renderRnc();
    };

    function renderRnc() {
        if (rncView === 'cards') {
            var activeSub = document.querySelector('.rnc-list-subtab.active');
            var sub = activeSub ? activeSub.id.replace('rncSubTab','').toLowerCase() : 'origens';
            if (sub === 'table') _renderRncTable();
            else _renderRncOrigens();
        }
        else if (rncView === 'kanban')   renderRncKanban();
        else if (rncView === 'calendar') renderRncCalendar();
    }

    // ── Sub-abas da Lista (Tabela / Origens) ──
    window.rncSwitchListTab = function(tab, btn) {
        document.querySelectorAll('.rnc-list-subtab').forEach(function(b){ b.classList.remove('active'); });
        if (btn) btn.classList.add('active');
        ['table','origens'].forEach(function(t){
            var p = document.getElementById('rncListPane-' + t);
            if (p) p.style.display = t === tab ? '' : 'none';
        });
        if (tab === 'table')   { _renderRncTable(); }
        if (tab === 'origens') { _renderRncOrigens(); }
    };

    var rncTableCols = [
        { key: 'titulo', label: 'Título' },
        { key: 'setor', label: 'Setor' },
        { key: 'classificacao', label: 'Classificação' },
        { key: 'origem', label: 'Origem' },
        { key: 'marcador', label: 'Marcador' },
        { key: 'responsavel', label: 'Responsável' },
        { key: 'dataConclusao', label: 'Conclusão' },
        { key: 'status', label: 'Status' }
    ];
    window.rncSortTable = function(col) {
        if (rncTableSort.col === col) {
            rncTableSort.dir = rncTableSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            rncTableSort.col = col;
            rncTableSort.dir = 'asc';
        }
        _renderRncTable();
    };
    function _sortRncArr(arr) {
        var col = rncTableSort.col, dir = rncTableSort.dir;
        arr.sort(function(a, b) {
            var va = String(a[col] || '');
            var vb = String(b[col] || '');
            if (!va && !vb) return 0;
            if (!va) return 1;
            if (!vb) return -1;
            var cmp = va > vb ? 1 : (va < vb ? -1 : 0);
            return dir === 'asc' ? cmp : -cmp;
        });
        return arr;
    }
    function _renderRncTable() {
        var container = document.getElementById('rncTableContent');
        if (!container) return;
        var arr = _sortRncArr(getFiltered());
        if (!arr.length) {
            container.innerHTML = '<div class="rnc-empty"><i class="fas fa-table"></i><p>Nenhuma RNC encontrada.</p></div>';
            return;
        }
        container.innerHTML =
            '<div class="rnc-table-wrap">' +
            '<table class="rnc-table">' +
            '<thead><tr>' +
                rncTableCols.map(function(c) {
                    var active = rncTableSort.col === c.key;
                    var arrow = active ? (rncTableSort.dir === 'asc' ? ' <i class="fas fa-arrow-up"></i>' : ' <i class="fas fa-arrow-down"></i>') : '';
                    return '<th class="rnc-table-th-sort' + (active ? ' active' : '') + '" onclick="rncSortTable(\'' + c.key + '\')">' + c.label + arrow + '</th>';
                }).join('') +
                '<th></th>' +
            '</tr></thead>' +
            '<tbody>' +
            arr.map(function(r) {
                var ci = getCI(r.classificacao);
                var mk = getMarker(r.marcador);
                return '<tr class="rnc-table-row" onclick="rncOpenView(' + r.id + ')">' +
                    '<td class="rnc-table-title">' + esc(r.titulo || '—') + '</td>' +
                    '<td>' + esc(r.setor || '—') + '</td>' +
                    '<td><span class="rnc-class-badge rnc-class-badge--sm" style="background:' + ci.bg + ';color:' + ci.color + ';border-color:' + ci.border + '"><i class="fas ' + ci.icon + '"></i> ' + esc(ci.label) + '</span></td>' +
                    '<td>' + esc(r.origem || '—') + '</td>' +
                    '<td>' + (mk ? '<span class="rnc-marker-badge" style="background:' + mk.bg + ';color:' + mk.color + '"><i class="fas ' + mk.icon + '"></i> ' + esc(mk.label) + '</span>' : '<span style="color:#cbd5e1">—</span>') + '</td>' +
                    '<td>' + esc(r.responsavel || '—') + '</td>' +
                    '<td>' + (r.dataConclusao ? esc(fmtDate(r.dataConclusao)) : '<span style="color:#cbd5e1">—</span>') + '</td>' +
                    '<td>' + (r.status ? '<span class="rnc-card-status" style="' + rncStatusColorStyle(r.status) + '">' + esc(r.status) + '</span>' : '<span style="color:#cbd5e1">—</span>') + '</td>' +
                    '<td onclick="event.stopPropagation()">' +
                        (canEdit() ? '<div style="display:flex;gap:4px">' +
                            '<button class="rnc-tbl-btn" onclick="rncOpenEdit(' + r.id + ')" title="Editar"><i class="fas fa-pen"></i></button>' +
                            '<button class="rnc-tbl-btn danger" onclick="rncDelete(' + r.id + ')" title="Excluir"><i class="fas fa-trash"></i></button>' +
                        '</div>' : '') +
                    '</td>' +
                '</tr>';
            }).join('') +
            '</tbody></table></div>';
    }

    function _renderRncOrigens() {
        var container = document.getElementById('rncOrigensContent');
        if (!container) return;
        var arr = getFiltered();
        if (!arr.length) {
            container.innerHTML = '<div class="rnc-empty"><i class="fas fa-folder-open"></i><p>Nenhuma RNC encontrada.</p></div>';
            return;
        }
        var groups = {};
        arr.forEach(function(r) {
            var key = r.origem || 'Sem Origem';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        var keys = Object.keys(groups).sort(function(a,b){ return a.localeCompare(b,'pt'); });
        container.innerHTML = keys.map(function(orig) {
            var items = groups[orig];
            return '<div class="rnc-origem-folder">' +
                '<div class="rnc-origem-folder-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
                    '<div class="rnc-origem-folder-title">' +
                        '<i class="fas fa-folder rnc-folder-icon-closed"></i>' +
                        '<i class="fas fa-folder-open rnc-folder-icon-open"></i>' +
                        '<span>' + esc(orig) + '</span>' +
                    '</div>' +
                    '<span class="rnc-origem-folder-count">' + items.length + '</span>' +
                '</div>' +
                '<div class="rnc-origem-folder-body">' +
                '<div class="rnc-origem-cards-grid">' +
                items.map(function(r) {
                    return rncBuildCard(r, { actions: false });
                }).join('') +
                '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    // ── Mapa de cores do kanban (igual ao kanban.js) ──
    var RNC_COLOR_MAP = {
        blue:    'var(--rnc-blue,    #3b82f6)',
        green:   'var(--rnc-green,   #22c55e)',
        red:     'var(--rnc-red,     #ef4444)',
        orange:  'var(--rnc-orange,  #f97316)',
        yellow:  'var(--rnc-yellow,  #eab308)',
        purple:  'var(--rnc-purple,  #a855f7)',
        pink:    'var(--rnc-pink,    #ec4899)',
        teal:    'var(--rnc-teal,    #14b8a6)',
        default: 'var(--rnc-default, #94a3b8)'
    };
    function rncResolveColor(colorKey) {
        return RNC_COLOR_MAP[colorKey] || RNC_COLOR_MAP.default;
    }
    // Estilo inline (bg/cor/borda) para o badge de status, igual ao usado no Kanban
    function rncStatusColorStyle(statusName) {
        var s = getRncStatusList().find(function(x){ return x.name === statusName; });
        var color = rncResolveColor(s ? s.color : null);
        return 'background:color-mix(in srgb,' + color + ' 14%,#fff);color:' + color + ';border-color:color-mix(in srgb,' + color + ' 35%,#fff)';
    }

    // ── KANBAN ──
    function renderRncKanban() {
        var board = document.getElementById('rncKanbanBoard');
        if (!board) return;
        ensureLists();
        var statuses = getRncStatusList();
        var arr = getFiltered();
        if (statuses.length === 0) {
            board.innerHTML =
                '<div class="rnc-empty" style="flex-direction:column;align-items:center;">' +
                    '<i class="fas fa-columns" style="font-size:48px;opacity:.3;margin-bottom:16px;"></i>' +
                    '<p>Nenhum status cadastrado.</p>' +
                    (canManage() ? '<button class="rnc-btn-add-status" style="margin-top:12px" onclick="rncOpenManager(\'status\')"><i class="fas fa-plus"></i> Adicionar Status</button>' : '') +
                '</div>';
            return;
        }
        var canDrag = canEdit();
        var canMng = canManage();
        board.innerHTML = statuses.map(function(s, idx) {
            var color = rncResolveColor(s.color);
            var items = arr.filter(function(r){ return r.status === s.name; });
            var collapsed = !!s.collapsed;
            return '<div class="rnc-kb-col">' +
                '<div class="rnc-kb-col-header" style="--rnc-col-color:' + color + '">' +
                    '<div class="rnc-kb-col-title-row">' +
                        '<span class="rnc-kb-col-dot"></span>' +
                        '<span class="rnc-kb-col-name">' + esc(s.name) + '</span>' +
                        '<span class="rnc-kb-col-count">' + items.length + '</span>' +
                    '</div>' +
                    (canMng ? (
                    '<div class="rnc-kb-col-actions">' +
                        '<button class="rnc-kb-col-act" title="Mover para a esquerda"' + (idx === 0 ? ' disabled' : '') + ' onclick="rncMoveStatusCol(' + idx + ',-1)"><i class="fas fa-arrow-left"></i></button>' +
                        '<button class="rnc-kb-col-act" title="Mover para a direita"' + (idx === statuses.length - 1 ? ' disabled' : '') + ' onclick="rncMoveStatusCol(' + idx + ',1)"><i class="fas fa-arrow-right"></i></button>' +
                        '<button class="rnc-kb-col-act" title="Editar coluna" onclick="rncEditStatusCol(' + idx + ')"><i class="fas fa-pen"></i></button>' +
                        '<button class="rnc-kb-col-act danger" title="Excluir coluna" onclick="rncRemoveStatusCol(' + idx + ')"><i class="fas fa-trash"></i></button>' +
                        '<button class="rnc-kb-col-act rnc-kb-col-collapse" title="' + (collapsed ? 'Mostrar coluna' : 'Ocultar coluna') + '" onclick="rncToggleColCollapse(' + idx + ')"><i class="fas fa-chevron-' + (collapsed ? 'down' : 'up') + '"></i></button>' +
                    '</div>'
                    ) : '') +
                '</div>' +
                (collapsed ?
                    '<div class="rnc-kb-cards rnc-kb-cards-collapsed" data-status="' + esc(s.name) + '"></div>'
                :
                    '<div class="rnc-kb-cards" data-status="' + esc(s.name) + '">' +
                        (items.length > 0 ? items.map(function(r) {
                            var ci = getCI(r.classificacao);
                            var mk = getMarker(r.marcador);
                            var cl  = Array.isArray(r.checklist) ? r.checklist : [];
                            var clD = cl.filter(function(c){ return c.checked; }).length;
                            var donut = cl.length > 0 ? rncDonutHtml(clD, cl.length, 38) : '';
                            var kbActions = canEdit() ?
                                '<div class="rnc-kb-card-actions" onclick="event.stopPropagation()">' +
                                    '<button class="rnc-kb-card-act" onclick="rncOpenEdit(' + r.id + ')" title="Editar"><i class="fas fa-pen"></i></button>' +
                                    '<button class="rnc-kb-card-act danger" onclick="rncDelete(' + r.id + ')" title="Excluir"><i class="fas fa-trash"></i></button>' +
                                '</div>' : '';
                            return '<div class="rnc-kb-card' + rncAlertClass(r) + (donut ? ' has-donut' : '') + (mk ? ' has-marker' : '') + '"' +
                                (canDrag ? ' draggable="true"' : '') + ' data-id="' + r.id + '"' +
                                ' onclick="rncOpenView(' + r.id + ')" style="--rnc-kb-card-color:' + ci.color + '">' +
                                '<div class="rnc-kb-card-main">' +
                                    '<div class="rnc-kb-card-title-row">' +
                                        '<div class="rnc-kb-card-title">' + esc(r.titulo || 'Sem título') + '</div>' +
                                        kbActions +
                                    '</div>' +
                                    rncCardMetaHtml(r) +
                                    rncAlertBadgeHtml(r) +
                                    (mk ? '<span class="rnc-kb-card-marker" style="background:' + mk.color + '"><i class="fas ' + mk.icon + '"></i> ' + esc(mk.label) + '</span>' : '') +
                                '</div>' +
                                donut +
                            '</div>';
                        }).join('') : '') +
                        '<div class="rnc-kb-empty"' + (items.length > 0 ? ' style="display:none"' : '') + '><i class="fas fa-inbox"></i><span>Nenhum item</span></div>' +
                    '</div>'
                ) +
            '</div>';
        }).join('');
        if (canDrag) _rncKanbanBindDnd(board);
    }

    // ── Ações do cabeçalho da coluna (mover / ocultar) ──
    window.rncMoveStatusCol = function(idx, dir) {
        if (!canManage()) { toast('Sem permissão para gerenciar listas.', 'error'); return; }
        var list = getRncStatusList();
        var newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= list.length) return;
        var tmp = list[idx]; list[idx] = list[newIdx]; list[newIdx] = tmp;
        persist(); renderRncKanban();
    };
    window.rncToggleColCollapse = function(idx) {
        var list = getRncStatusList();
        var s = list[idx]; if (!s) return;
        s.collapsed = !s.collapsed;
        persist(); renderRncKanban();
    };
    window.rncEditStatusCol = function(idx) {
        rncOpenColumnEditModal(idx);
    };

    // ── Modal moderno de edição de coluna do Kanban ──
    var _rncColEditIdx = null;
    var _rncColEditColor = 'default';
    function rncOpenColumnEditModal(idx) {
        var list = getRncStatusList();
        var item = list[idx]; if (!item) return;
        _rncColEditIdx = idx;
        _rncColEditColor = item.color || 'default';
        var el = document.getElementById('rncColEditModal');
        if (!el) { el = document.createElement('div'); el.id = 'rncColEditModal'; document.body.appendChild(el); }
        el.innerHTML =
            '<div class="rnc-coledit-backdrop" id="rncColEditBackdrop" onclick="if(event.target===this)rncCloseColumnEditModal()">' +
                '<div class="rnc-coledit-box">' +
                    '<div class="rnc-coledit-header">' +
                        '<div class="rnc-coledit-icon"><i class="fas fa-columns"></i></div>' +
                        '<div>' +
                            '<div class="rnc-coledit-title">Editar coluna</div>' +
                            '<div class="rnc-coledit-subtitle">Personalize o nome, a cor e o tipo de encerramento</div>' +
                        '</div>' +
                        '<button class="rnc-coledit-close" onclick="rncCloseColumnEditModal()"><i class="fas fa-times"></i></button>' +
                    '</div>' +
                    '<div class="rnc-coledit-body">' +
                        '<div class="field-group">' +
                            '<label class="field-label">Nome da coluna</label>' +
                            '<input type="text" id="rncColEditName" class="form-input" value="' + esc(item.name) + '" placeholder="Nome do status...">' +
                        '</div>' +
                        '<div class="field-group">' +
                            '<label class="field-label">Cor</label>' +
                            '<div class="rnc-coledit-colors" id="rncColEditColors"></div>' +
                        '</div>' +
                        '<div class="field-group">' +
                            '<label class="field-label">Encerramento</label>' +
                            '<div class="rnc-coledit-final">' +
                                '<button type="button" class="rnc-final-toggle' + (item.finalKind === 'concluido' ? ' active-ok' : '') + '" id="rncColEditFinalOk" onclick="rncColEditPickFinal(\'concluido\')"><i class="fas fa-circle-check"></i> Concluído</button>' +
                                '<button type="button" class="rnc-final-toggle' + (item.finalKind === 'cancelado' ? ' active-cancel' : '') + '" id="rncColEditFinalCancel" onclick="rncColEditPickFinal(\'cancelado\')"><i class="fas fa-circle-xmark"></i> Cancelado</button>' +
                            '</div>' +
                            '<span class="rnc-coledit-hint">Cards nesta coluna param de gerar alertas de prazo quando marcada como Concluído ou Cancelado.</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="rnc-coledit-footer">' +
                        '<button class="btn-cancel" onclick="rncCloseColumnEditModal()">Cancelar</button>' +
                        '<button class="btn-save" onclick="rncSaveColumnEditModal()"><i class="fas fa-check"></i> Salvar</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        _renderRncColEditColors();
        requestAnimationFrame(function(){ el.querySelector('.rnc-coledit-backdrop').classList.add('open'); });
        var nameInput = document.getElementById('rncColEditName');
        if (nameInput) { nameInput.focus(); nameInput.select(); }
    }
    function _renderRncColEditColors() {
        var wrap = document.getElementById('rncColEditColors');
        if (!wrap) return;
        wrap.innerHTML = RNC_PALETTE.map(function(p) {
            return '<button type="button" class="rnc-color-dot-btn' + (_rncColEditColor===p.key?' active':'') + '" ' +
                'style="background:' + p.hex + '" title="' + p.key + '" onclick="rncColEditPickColor(\'' + p.key + '\')">' +
                '<i class="fas fa-check"></i>' +
            '</button>';
        }).join('');
    }
    window.rncColEditPickColor = function(key) {
        _rncColEditColor = key;
        _renderRncColEditColors();
    };
    window.rncColEditPickFinal = function(kind) {
        var list = getRncStatusList();
        var item = list[_rncColEditIdx]; if (!item) return;
        var current = item._pendingFinalKind !== undefined ? item._pendingFinalKind : item.finalKind;
        item._pendingFinalKind = (current === kind) ? null : kind;
        var ok = document.getElementById('rncColEditFinalOk');
        var cancel = document.getElementById('rncColEditFinalCancel');
        if (ok) ok.classList.toggle('active-ok', item._pendingFinalKind === 'concluido');
        if (cancel) cancel.classList.toggle('active-cancel', item._pendingFinalKind === 'cancelado');
    };
    window.rncCloseColumnEditModal = function() {
        var el = document.getElementById('rncColEditModal');
        if (!el) return;
        var bk = el.querySelector('.rnc-coledit-backdrop');
        if (bk) bk.classList.remove('open');
        setTimeout(function(){ el.innerHTML = ''; }, 150);
        var list = getRncStatusList();
        var item = list[_rncColEditIdx];
        if (item) delete item._pendingFinalKind;
        _rncColEditIdx = null;
    };
    window.rncSaveColumnEditModal = function() {
        var list = getRncStatusList();
        var item = list[_rncColEditIdx]; if (!item) { rncCloseColumnEditModal(); return; }
        var newName = (getVal('rncColEditName') || '').trim();
        if (!newName) { toast('Informe o nome.', 'error'); return; }
        if (list.some(function(x, i){ return i !== _rncColEditIdx && String(x.name).trim().toLowerCase() === newName.toLowerCase(); })) {
            toast('Já existe uma coluna com este nome.', 'warn'); return;
        }
        item.name = newName;
        item.color = _rncColEditColor;
        if (item._pendingFinalKind !== undefined) {
            var finalKind = item._pendingFinalKind;
            if (finalKind) list.forEach(function(s, i){ if (i !== _rncColEditIdx && s.finalKind === finalKind) s.finalKind = null; });
            item.finalKind = finalKind;
            delete item._pendingFinalKind;
        }
        persist(); renderRnc();
        toast('Coluna atualizada.', 'success');
        rncCloseColumnEditModal();
    };
    window.rncRemoveStatusCol = function(idx) {
        rncManagerKind = 'status';
        rncManagerRemove(idx);
    };

    // ── Drag & drop entre colunas do kanban ──
    var _rncDragId = null;
    function _rncKanbanBindDnd(board) {
        var cards = board.querySelectorAll('.rnc-kb-card[draggable="true"]');
        cards.forEach(function(card) {
            card.addEventListener('dragstart', function(e) {
                _rncDragId = card.getAttribute('data-id');
                card.classList.add('rnc-kb-card-dragging');
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    try { e.dataTransfer.setData('text/plain', _rncDragId); } catch (_) {}
                }
            });
            card.addEventListener('dragend', function() {
                card.classList.remove('rnc-kb-card-dragging');
                _rncDragId = null;
                board.querySelectorAll('.rnc-kb-cards.rnc-kb-drop-over')
                     .forEach(function(z){ z.classList.remove('rnc-kb-drop-over'); });
            });
        });
        var zones = board.querySelectorAll('.rnc-kb-cards[data-status]');
        zones.forEach(function(zone) {
            zone.addEventListener('dragover', function(e) {
                if (_rncDragId == null) return;
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                zone.classList.add('rnc-kb-drop-over');
            });
            zone.addEventListener('dragleave', function(e) {
                if (e.target === zone) zone.classList.remove('rnc-kb-drop-over');
            });
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                zone.classList.remove('rnc-kb-drop-over');
                var id = _rncDragId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
                if (id == null) return;
                _rncMoveCardToStatus(Number(id), zone.getAttribute('data-status'));
            });
        });
    }

    function _rncMoveCardToStatus(id, newStatus) {
        var r = (window.rncItems || []).find(function(x){ return x.id === id; });
        if (!r || r.status === newStatus) return;
        if (!canEdit()) { toast('Sem permissão para mover este card.', 'error'); return; }
        r.status = newStatus;
        r.updatedAt = new Date().toISOString();
        persist();
        renderRncKanban();
    }

    // ══════════════════════════════════════════════════════════════════
    //  CALENDÁRIO (espelha o módulo de Atividades: mensal/semanal,
    //  visualização por RNC / Publicação / Ambos)
    // ══════════════════════════════════════════════════════════════════
    var rncCalMode   = 'monthly';                       // 'monthly' | 'weekly'
    var rncCalWeek   = _rncWeekStart(new Date());       // segunda-feira da semana
    var rncCalFilter = 'rnc';                           // 'rnc' | 'publicacoes' | 'ambos'
    var RNC_WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

    function _rncWeekStart(date) {
        var d = new Date(date);
        var day = d.getDay();
        var diff = (day === 0) ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0,0,0,0);
        return d;
    }
    function _rncDateStr(d) {
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
    function _rncToday() { var t = new Date(); t.setHours(0,0,0,0); return t; }
    function _rncTrunc(s, max) { s = s || ''; return s.length > max ? s.slice(0, max) + '…' : s; }

    // ── Monta mapa dia → eventos (tarefas RNC + publicações) ──
    function _rncCalBuildDayMap(rangeStart, rangeEnd) {
        var arr = getFiltered();
        var map = {};
        function push(ds, entry) { if (!map[ds]) map[ds] = []; map[ds].push(entry); }

        arr.forEach(function(r) {
            // RNCs: no dia da conclusão (ou início como fallback)
            if (rncCalFilter !== 'publicacoes') {
                var ds = (r.dataConclusao || r.dataInicio || '').slice(0,10);
                if (ds) {
                    var d = new Date(ds + 'T00:00:00');
                    if (d >= rangeStart && d <= rangeEnd) push(ds, { item: r, type: 'rnc' });
                }
            }
            // Publicações registradas
            if (rncCalFilter !== 'rnc') {
                (r.publicacoes || []).forEach(function(pub, pubIdx) {
                    if (!pub.data) return;
                    var pd = new Date(pub.data + 'T00:00:00');
                    if (pd >= rangeStart && pd <= rangeEnd) {
                        push(pub.data.slice(0,10), { item: r, type: 'publicacao', pub: pub, pubIdx: pubIdx });
                    }
                });
            }
        });
        return map;
    }

    function renderRncCalendar() {
        var board = document.getElementById('rncCalendarBoard');
        if (!board) return;
        var now = new Date();
        if (!rncCalYear) rncCalYear = now.getFullYear();
        if (rncCalMonth === null) rncCalMonth = now.getMonth();

        board.innerHTML = '';
        board.appendChild(_rncCalHeader());
        var grade = document.createElement('div');
        grade.id = 'rncCalGrade';
        board.appendChild(grade);
        _rncCalRenderGrade();
    }

    function _rncCalRenderGrade() {
        var grade = document.getElementById('rncCalGrade');
        if (!grade) return;
        if (rncCalMode === 'monthly') _rncCalRenderMonthly(grade);
        else _rncCalRenderWeekly(grade);
    }

    // ── Header (navegação + filtros de visualização/modo) ──
    function _rncCalHeader() {
        var wrap = document.createElement('div');
        wrap.className = 'rnc-cal-header';

        var nav = document.createElement('div');
        nav.className = 'rnc-cal-nav-area';
        var prev = document.createElement('button');
        prev.className = 'rnc-cal-nav-btn';
        prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prev.onclick = function(){ _rncCalNavigate(-1); };
        var today = document.createElement('button');
        today.className = 'rnc-cal-today-btn';
        today.textContent = 'Hoje';
        today.onclick = _rncCalGoToday;
        var title = document.createElement('span');
        title.className = 'rnc-cal-nav-title';
        title.id = 'rncCalNavTitle';
        title.textContent = _rncCalNavTitle();
        var next = document.createElement('button');
        next.className = 'rnc-cal-nav-btn';
        next.innerHTML = '<i class="fas fa-chevron-right"></i>';
        next.onclick = function(){ _rncCalNavigate(1); };
        nav.appendChild(prev); nav.appendChild(today); nav.appendChild(title); nav.appendChild(next);

        var ctrl = document.createElement('div');
        ctrl.className = 'rnc-cal-ctrl-area';
        ctrl.appendChild(_rncCalViewFilter());
        ctrl.appendChild(_rncCalModeToggle());

        wrap.appendChild(nav);
        wrap.appendChild(ctrl);
        return wrap;
    }

    function _rncCalNavTitle() {
        if (rncCalMode === 'monthly') return MONTH_NAMES[rncCalMonth] + ' ' + rncCalYear;
        var end = new Date(rncCalWeek); end.setDate(end.getDate() + 6);
        var sm = MONTH_NAMES[rncCalWeek.getMonth()], em = MONTH_NAMES[end.getMonth()];
        if (sm === em) return rncCalWeek.getDate() + ' – ' + end.getDate() + ' de ' + sm + ' ' + end.getFullYear();
        return rncCalWeek.getDate() + ' ' + sm + ' – ' + end.getDate() + ' ' + em + ' ' + end.getFullYear();
    }

    function _rncCalViewFilter() {
        var wrap = document.createElement('div');
        wrap.className = 'rnc-cal-vf-wrap';
        var labels = { rnc: 'RNCs', publicacoes: 'Publicações', ambos: 'Ambos' };
        var btn = document.createElement('button');
        btn.className = 'rnc-cal-vf-btn' + (rncCalFilter !== 'ambos' ? ' active' : '');
        btn.id = 'rncCalVfBtn';
        btn.innerHTML = '<i class="fas fa-eye"></i> <span>' + labels[rncCalFilter] + '</span> <i class="fas fa-caret-down" style="margin-left:4px;font-size:11px"></i>';
        btn.onclick = function(e){
            e.stopPropagation();
            var dd = document.getElementById('rncCalVfDropdown');
            if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
        };
        var dd = document.createElement('div');
        dd.className = 'rnc-cal-vf-dropdown';
        dd.id = 'rncCalVfDropdown';
        var opts = [
            { v:'rnc',         l:'RNCs',        d:'Exibe as RNCs na agenda',        icon:'fa-clipboard-list' },
            { v:'publicacoes', l:'Publicações', d:'Exibe as publicações na agenda', icon:'fa-paper-plane' },
            { v:'ambos',       l:'Ambos',       d:'RNCs e publicações',             icon:'fa-layer-group' }
        ];
        dd.innerHTML = opts.map(function(o){
            return '<button class="rnc-cal-vf-opt' + (rncCalFilter===o.v?' active':'') + '" data-v="' + o.v + '">' +
                '<i class="fas ' + o.icon + '"></i>' +
                '<span class="rnc-cal-vf-opt-txt"><span class="rnc-cal-vf-opt-l">' + o.l + '</span><span class="rnc-cal-vf-opt-d">' + o.d + '</span></span>' +
            '</button>';
        }).join('');
        dd.querySelectorAll('.rnc-cal-vf-opt').forEach(function(b){
            b.onclick = function(){ rncCalFilter = b.getAttribute('data-v'); dd.style.display = 'none'; renderRncCalendar(); };
        });
        wrap.appendChild(btn); wrap.appendChild(dd);
        return wrap;
    }

    function _rncCalModeToggle() {
        var wrap = document.createElement('div');
        wrap.className = 'rnc-cal-mode-toggle';
        var m = document.createElement('button');
        m.className = 'rnc-cal-mode-tab' + (rncCalMode === 'monthly' ? ' active' : '');
        m.innerHTML = '<i class="fas fa-calendar-alt"></i> Mensal';
        m.onclick = function(){ rncCalMode = 'monthly'; renderRncCalendar(); };
        var w = document.createElement('button');
        w.className = 'rnc-cal-mode-tab' + (rncCalMode === 'weekly' ? ' active' : '');
        w.innerHTML = '<i class="fas fa-calendar-week"></i> Semanal';
        w.onclick = function(){ rncCalMode = 'weekly'; renderRncCalendar(); };
        wrap.appendChild(m); wrap.appendChild(w);
        return wrap;
    }

    function _rncCalNavigate(dir) {
        if (rncCalMode === 'monthly') {
            rncCalMonth += dir;
            if (rncCalMonth < 0)  { rncCalMonth = 11; rncCalYear--; }
            if (rncCalMonth > 11) { rncCalMonth = 0;  rncCalYear++; }
        } else {
            var d = new Date(rncCalWeek); d.setDate(d.getDate() + dir * 7); rncCalWeek = d;
        }
        var t = document.getElementById('rncCalNavTitle');
        if (t) t.textContent = _rncCalNavTitle();
        _rncCalRenderGrade();
    }
    function _rncCalGoToday() {
        var now = new Date();
        rncCalYear = now.getFullYear(); rncCalMonth = now.getMonth();
        rncCalWeek = _rncWeekStart(now);
        renderRncCalendar();
    }
    // Compat: navegação antiga
    window.rncCalPrev = function(){ _rncCalNavigate(-1); };
    window.rncCalNext = function(){ _rncCalNavigate(1); };

    // ── Renderização mensal ──
    function _rncCalRenderMonthly(container) {
        var rangeStart = new Date(rncCalYear, rncCalMonth, 1);
        var rangeEnd   = new Date(rncCalYear, rncCalMonth + 1, 0);
        var map = _rncCalBuildDayMap(rangeStart, rangeEnd);
        var today = _rncToday();

        var grid = document.createElement('div');
        grid.className = 'rnc-cal-monthly-grid';
        RNC_WEEKDAYS.forEach(function(d){
            var th = document.createElement('div'); th.className = 'rnc-cal-wd-header'; th.textContent = d; grid.appendChild(th);
        });

        var startDow = rangeStart.getDay(); startDow = (startDow === 0) ? 6 : startDow - 1;
        for (var i = 0; i < startDow; i++) {
            var em = document.createElement('div'); em.className = 'rnc-cal-day-cell rnc-cal-day-other'; grid.appendChild(em);
        }
        var daysInMonth = rangeEnd.getDate();
        for (var dd = 1; dd <= daysInMonth; dd++) {
            (function(dd){
                var dateObj = new Date(rncCalYear, rncCalMonth, dd);
                var ds = _rncDateStr(dateObj);
                var isToday = dateObj.getTime() === today.getTime();
                var entries = map[ds] || [];
                var cell = document.createElement('div');
                cell.className = 'rnc-cal-day-cell' + (isToday ? ' rnc-cal-day-today' : '');

                var num = document.createElement('span');
                num.className = 'rnc-cal-day-num'; num.textContent = dd;
                cell.appendChild(num);

                if (entries.length) {
                    var ew = document.createElement('div'); ew.className = 'rnc-cal-events-wrap';
                    var maxShow = 3;
                    entries.slice(0, maxShow).forEach(function(e){ ew.appendChild(_rncCalChip(e)); });
                    if (entries.length > maxShow) {
                        var more = document.createElement('button');
                        more.className = 'rnc-cal-more-btn';
                        more.textContent = '+' + (entries.length - maxShow) + ' mais';
                        more.onclick = function(ev){ ev.stopPropagation(); _rncCalDayModal(ds, entries); };
                        ew.appendChild(more);
                    }
                    cell.appendChild(ew);
                    cell.style.cursor = 'pointer';
                    cell.onclick = function(){ _rncCalDayModal(ds, entries); };
                }
                grid.appendChild(cell);
            })(dd);
        }
        var total = startDow + daysInMonth, rem = total % 7;
        if (rem !== 0) for (var k = 0; k < 7 - rem; k++) {
            var ec = document.createElement('div'); ec.className = 'rnc-cal-day-cell rnc-cal-day-other'; grid.appendChild(ec);
        }
        container.innerHTML = '';
        container.appendChild(grid);
    }

    // ── Renderização semanal ──
    function _rncCalRenderWeekly(container) {
        var rangeStart = new Date(rncCalWeek);
        var rangeEnd = new Date(rncCalWeek); rangeEnd.setDate(rangeEnd.getDate() + 6);
        var map = _rncCalBuildDayMap(rangeStart, rangeEnd);
        var today = _rncToday();

        var grid = document.createElement('div');
        grid.className = 'rnc-cal-weekly-grid';
        for (var i = 0; i < 7; i++) {
            (function(i){
                var dateObj = new Date(rncCalWeek); dateObj.setDate(dateObj.getDate() + i);
                var ds = _rncDateStr(dateObj);
                var isToday = dateObj.getTime() === today.getTime();
                var entries = map[ds] || [];
                var col = document.createElement('div');
                col.className = 'rnc-cal-week-col' + (isToday ? ' rnc-cal-week-col-today' : '');
                var head = document.createElement('div');
                head.className = 'rnc-cal-week-col-header';
                head.innerHTML = '<span class="rnc-cal-wk-dayname">' + RNC_WEEKDAYS[i] + '</span>' +
                    '<span class="rnc-cal-wk-daynum' + (isToday ? ' rnc-cal-wk-today-num' : '') + '">' + dateObj.getDate() + '</span>';
                col.appendChild(head);
                var ew = document.createElement('div'); ew.className = 'rnc-cal-week-events';
                if (!entries.length) {
                    var e0 = document.createElement('div'); e0.className = 'rnc-cal-week-empty'; e0.textContent = '—'; ew.appendChild(e0);
                } else entries.forEach(function(e){ ew.appendChild(_rncCalCard(e)); });
                col.appendChild(ew);
                grid.appendChild(col);
            })(i);
        }
        container.innerHTML = '';
        container.appendChild(grid);
    }

    // ── Chip de evento (mensal) ──
    function _rncCalChip(entry) {
        var chip = document.createElement('button');
        chip.className = 'rnc-cal-event-chip';
        if (entry.type === 'publicacao') {
            var pub = entry.pub;
            chip.classList.add('rnc-cal-evt-pub');
            chip.innerHTML = '<i class="fas fa-paper-plane"></i> ' + esc(_rncTrunc(entry.item.titulo || 'RNC', 16));
            chip.title = (pub.tipo || 'Publicação') + ' — ' + (entry.item.titulo || '');
            chip.onclick = function(ev){ ev.stopPropagation(); _rncCalOpenEntry(entry); };
        } else {
            var ci = getCI(entry.item.classificacao);
            chip.classList.add('rnc-cal-evt-rnc');
            chip.style.setProperty('--rnc-evt-color', ci.color);
            chip.innerHTML = '<span class="rnc-cal-evt-dot" style="background:' + ci.color + '"></span>' + esc(_rncTrunc(entry.item.titulo || 'RNC', 16));
            chip.title = entry.item.titulo || 'RNC';
            chip.onclick = function(ev){ ev.stopPropagation(); _rncCalOpenEntry(entry); };
        }
        return chip;
    }

    // ── Card de evento (semanal / modal do dia) ──
    function _rncCalCard(entry) {
        var card = document.createElement('button');
        card.className = 'rnc-cal-event-card';
        if (entry.type === 'publicacao') {
            var pub = entry.pub;
            card.classList.add('rnc-cal-evt-pub');
            card.innerHTML =
                '<div class="rnc-cal-ecard-top"><i class="fas fa-paper-plane" style="color:#8b5cf6"></i>' +
                    '<span class="rnc-cal-ecard-type">' + esc(pub.tipo || 'Publicação') + '</span></div>' +
                '<div class="rnc-cal-ecard-title">' + esc(entry.item.titulo || 'RNC') + '</div>' +
                (pub.descricao ? '<div class="rnc-cal-ecard-desc">' + esc(_rncTrunc(pub.descricao, 60)) + '</div>' : '') +
                (pub.usuario ? '<div class="rnc-cal-ecard-meta"><i class="fas fa-user"></i> ' + esc(pub.usuario) + '</div>' : '');
        } else {
            var ci = getCI(entry.item.classificacao);
            var mk = getMarker(entry.item.marcador);
            card.classList.add('rnc-cal-evt-rnc');
            card.style.setProperty('--rnc-evt-color', ci.color);
            card.innerHTML =
                '<div class="rnc-cal-ecard-top">' +
                    '<span class="rnc-class-badge rnc-class-badge--sm" style="background:' + ci.bg + ';color:' + ci.color + ';border-color:' + ci.border + '"><i class="fas ' + ci.icon + '"></i> ' + esc(ci.label) + '</span>' +
                    rncAlertBadgeHtml(entry.item) +
                '</div>' +
                '<div class="rnc-cal-ecard-title">' + esc(entry.item.titulo || 'RNC') + '</div>' +
                (entry.item.responsavel ? '<div class="rnc-cal-ecard-meta"><i class="fas fa-user"></i> ' + esc(entry.item.responsavel) + '</div>' : '') +
                (entry.item.setor ? '<div class="rnc-cal-ecard-meta"><i class="fas fa-building"></i> ' + esc(entry.item.setor) + '</div>' : '') +
                (mk ? '<div class="rnc-cal-ecard-marker" style="background:' + mk.color + '"><i class="fas ' + mk.icon + '"></i> ' + esc(mk.label) + '</div>' : '');
        }
        card.onclick = function(){ _rncCalOpenEntry(entry); };
        return card;
    }

    function _rncCalOpenEntry(entry) {
        var modal = document.getElementById('rncCalDayModal');
        if (modal) modal.style.display = 'none';
        if (entry.type === 'publicacao') {
            // Abre a RNC e ativa a aba de publicações
            window.rncOpenView(entry.item.id);
            setTimeout(function(){
                var tab = document.querySelector('.rnc-view-tab[onclick*="rnc-vpub"]');
                if (tab) tab.click();
            }, 150);
        } else {
            window.rncOpenView(entry.item.id);
        }
    }

    // ── Modal do dia (+N mais) ──
    function _rncCalDayModal(ds, entries) {
        var modal = document.getElementById('rncCalDayModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'rncCalDayModal';
            modal.className = 'rnc-cal-day-modal-overlay';
            modal.onclick = function(e){ if (e.target === modal) modal.style.display = 'none'; };
            document.body.appendChild(modal);
        }
        var d = new Date(ds + 'T00:00:00');
        var label = d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
        modal.innerHTML =
            '<div class="rnc-cal-day-modal">' +
                '<div class="rnc-cal-day-modal-header">' +
                    '<span class="rnc-cal-day-modal-title">' + esc(label) + '</span>' +
                    '<button class="rnc-cal-day-modal-close" onclick="document.getElementById(\'rncCalDayModal\').style.display=\'none\'"><i class="fas fa-times"></i></button>' +
                '</div>' +
                '<div class="rnc-cal-day-modal-body" id="rncCalDayModalBody"></div>' +
            '</div>';
        var body = modal.querySelector('#rncCalDayModalBody');
        entries.forEach(function(e){ body.appendChild(_rncCalCard(e)); });
        modal.style.display = 'flex';
    }

    // Fecha dropdown de visualização ao clicar fora
    document.addEventListener('click', function(e){
        var dd = document.getElementById('rncCalVfDropdown');
        var btn = document.getElementById('rncCalVfBtn');
        if (dd && dd.style.display === 'block' && !dd.contains(e.target) && btn && !btn.contains(e.target)) {
            dd.style.display = 'none';
        }
    });

    // ══════════════════════════════════════════════════════════════════
    //  HEADER FILTERS (Data e Setor, mesmos padrões de Ocorrências)
    // ══════════════════════════════════════════════════════════════════

    window.rncToggleHeadDate = function() {
        var dd = document.getElementById('rncHeadDateDropdown');
        if (!dd) return;
        var open = dd.classList.contains('open');
        rncCloseHeadDropdowns();
        if (!open) { renderRncDateDropdown(); dd.style.display = 'block'; dd.classList.add('open'); }
    };

    function renderRncDateDropdown() {
        var dd = document.getElementById('rncHeadDateDropdown');
        if (!dd) return;
        var f = rncDateFilter, now = new Date();
        var y0 = now.getFullYear();
        var years = [];
        for (var y = y0 + 1; y >= y0 - 4; y--) years.push(y);

        var typeOpts = [
            { v:'all',    l:'Todas',   icon:'fa-infinity' },
            { v:'month',  l:'Mensal',  icon:'fa-calendar-days' },
            { v:'year',   l:'Anual',   icon:'fa-calendar' },
            { v:'custom', l:'Período', icon:'fa-calendar-range' }
        ];

        var html = '<div class="rnc-date-dd">' +
            '<div class="rnc-date-dd-header"><span class="rnc-date-dd-title"><i class="fas fa-calendar-alt"></i> Filtro de Data</span></div>' +
            '<div class="rnc-date-type-btns">' +
            typeOpts.map(function(t){
                return '<button class="rnc-date-type-btn' + (f.type===t.v?' active':'') + '" onclick="rncSetDateFilter(\'' + t.v + '\')">' +
                    '<i class="fas ' + t.icon + '"></i><span>' + t.l + '</span>' +
                '</button>';
            }).join('') +
            '</div>';

        if (f.type === 'month') {
            var selYear = f.year || y0;
            html += '<div class="rnc-date-year-nav">' +
                '<button class="rnc-date-yn-btn" onclick="rncSetDateFilterYear(' + (selYear-1) + ')"><i class="fas fa-chevron-left"></i></button>' +
                '<span class="rnc-date-yn-label">' + selYear + '</span>' +
                '<button class="rnc-date-yn-btn" onclick="rncSetDateFilterYear(' + (selYear+1) + ')"><i class="fas fa-chevron-right"></i></button>' +
            '</div>' +
            '<div class="rnc-date-month-grid">' +
            MONTH_SHORT.map(function(m, i){
                var isActive = f.month === i && f.year === selYear;
                return '<button class="rnc-date-month-btn' + (isActive?' active':'') + '" onclick="rncPickMonth(' + i + ',' + selYear + ')">' +
                    '<span class="rnc-month-abbr">' + m + '</span>' +
                '</button>';
            }).join('') +
            '</div>';
        }

        if (f.type === 'year') {
            html += '<div class="rnc-date-year-grid">' +
            years.map(function(yi){
                return '<button class="rnc-date-year-btn' + (f.year===yi?' active':'') + '" onclick="rncSetDateFilterYear(' + yi + ')">' + yi + '</button>';
            }).join('') +
            '</div>';
        }

        if (f.type === 'custom') {
            html += '<div class="rnc-date-custom">' +
                '<div class="rnc-date-custom-field">' +
                    '<label class="rnc-date-custom-label"><i class="fas fa-calendar-plus"></i> De</label>' +
                    '<input type="date" class="rnc-date-input" value="'+(f.ini||'')+'" onchange="rncSetCustomDate(\'ini\',this.value)">' +
                '</div>' +
                '<div class="rnc-date-custom-sep"><i class="fas fa-arrow-right"></i></div>' +
                '<div class="rnc-date-custom-field">' +
                    '<label class="rnc-date-custom-label"><i class="fas fa-calendar-minus"></i> Até</label>' +
                    '<input type="date" class="rnc-date-input" value="'+(f.fim||'')+'" onchange="rncSetCustomDate(\'fim\',this.value)">' +
                '</div>' +
            '</div>';
        }

        if (f.type !== 'all') {
            html += '<div class="rnc-date-dd-footer">' +
                '<button class="rnc-date-clear-btn" onclick="rncSetDateFilter(\'all\')"><i class="fas fa-times"></i> Limpar filtro</button>' +
            '</div>';
        }

        html += '</div>';
        dd.innerHTML = html;
    }

    window.rncSetDateFilter = function(type) {
        var now = new Date();
        rncDateFilter.type = type;
        if (type === 'month' && rncDateFilter.month === null) { rncDateFilter.month = now.getMonth(); rncDateFilter.year = now.getFullYear(); }
        if (type === 'year' && !rncDateFilter.year) rncDateFilter.year = now.getFullYear();
        renderRncDateDropdown(); updateRncDateHeadLabel(); rncPage = 1; renderRnc();
    };
    window.rncPickMonth = function(m, y) {
        rncDateFilter.month = m; rncDateFilter.year = parseInt(y);
        renderRncDateDropdown(); updateRncDateHeadLabel(); rncPage = 1; renderRnc();
    };
    window.rncSetDateFilterYear = function(y) {
        rncDateFilter.year = parseInt(y);
        if (rncDateFilter.type === 'month') {
            renderRncDateDropdown(); updateRncDateHeadLabel(); rncPage = 1; renderRnc();
        } else {
            rncDateFilter.type = 'year';
            renderRncDateDropdown(); updateRncDateHeadLabel(); rncPage = 1; renderRnc();
        }
    };
    window.rncSetCustomDate = function(key, val) {
        rncDateFilter[key] = val; updateRncDateHeadLabel(); rncPage = 1; renderRnc();
    };

    function updateRncDateHeadLabel() {
        var lbl = document.getElementById('rncHeadDateLabel');
        var btn = document.getElementById('rncHeadDateBtn');
        if (!lbl) return;
        var f = rncDateFilter, txt = 'Data', act = false;
        if (f.type === 'all') { txt = 'Data'; act = false; }
        else if (f.type === 'month' && f.month !== null) { txt = MONTH_SHORT[f.month] + (f.year ? '/' + f.year : ''); act = true; }
        else if (f.type === 'year' && f.year) { txt = String(f.year); act = true; }
        else if (f.type === 'custom' && (f.ini || f.fim)) { txt = 'Período'; act = true; }
        lbl.textContent = txt;
        if (btn) btn.classList.toggle('active', act);
    }

    // ── Filtro Setor ──
    var _rncTempSetorSelection = null;

    window.rncToggleHeadSetor = function() {
        rncOpenSetorModal();
    };

    function rncOpenSetorModal() {
        var modal = document.getElementById('modalRncSetorFilter');
        if (!modal) return;
        var setores = getSetores();
        _rncTempSetorSelection = rncSetorFilter.length ? rncSetorFilter.slice() : setores.slice();
        _renderRncSetorFilterGrid(setores);
        _updateRncSetorFilterCount();
        modal.style.display = 'flex';
    }

    window.rncCloseSetorModal = function() {
        var modal = document.getElementById('modalRncSetorFilter');
        if (modal) modal.style.display = 'none';
        _rncTempSetorSelection = null;
    };

    window.rncConfirmSetorFilter = function() {
        if (!_rncTempSetorSelection) return;
        var setores = getSetores();
        rncSetorFilter = (_rncTempSetorSelection.length === setores.length) ? [] : _rncTempSetorSelection.slice();
        rncCloseSetorModal();
        updateRncSetorHeadLabel();
        rncPage = 1; renderRnc();
    };

    function _renderRncSetorFilterGrid(setores) {
        var grid = document.getElementById('rncSetorFilterGrid');
        var subtitle = document.getElementById('rncSetorFilterSubtitle');
        if (!grid) return;
        if (subtitle) subtitle.textContent = setores.length + ' setor' + (setores.length !== 1 ? 'es' : '') + ' disponí' + (setores.length !== 1 ? 'veis' : 'vel');
        grid.innerHTML = setores.map(function(s) {
            var sel = _rncTempSetorSelection && _rncTempSetorSelection.indexOf(s) !== -1;
            return '<div class="setor-chip' + (sel ? ' selected' : '') + '" onclick="_rncToggleSetorChip(this, \'' + esc(s) + '\')">' +
                '<div class="setor-chip-check"><i class="fas fa-check"></i></div>' +
                '<span class="setor-chip-label" title="' + esc(s) + '">' + esc(s) + '</span>' +
            '</div>';
        }).join('');
    }

    window._rncToggleSetorChip = function(el, s) {
        if (!_rncTempSetorSelection) return;
        var idx = _rncTempSetorSelection.indexOf(s);
        if (idx === -1) { _rncTempSetorSelection.push(s); el.classList.add('selected'); }
        else { _rncTempSetorSelection.splice(idx, 1); el.classList.remove('selected'); }
        _updateRncSetorFilterCount();
    };

    function _updateRncSetorFilterCount() {
        var el = document.getElementById('rncSetorFilterCount');
        var btn = document.getElementById('rncSetorFilterToggleAllBtn');
        var total = getSetores().length;
        var sel = _rncTempSetorSelection ? _rncTempSetorSelection.length : total;
        if (el) el.textContent = sel + ' de ' + total + ' selecionados';
        if (btn) {
            var allSelected = sel === total;
            btn.innerHTML = allSelected
                ? '<i class="fas fa-times"></i> Desmarcar todos'
                : '<i class="fas fa-check"></i> Marcar todos';
        }
    }

    window.rncSetorFilterToggleAll = function() {
        var total = getSetores().length;
        var allSelected = _rncTempSetorSelection && _rncTempSetorSelection.length === total;
        _rncTempSetorSelection = allSelected ? [] : getSetores().slice();
        _renderRncSetorFilterGrid(getSetores());
        _updateRncSetorFilterCount();
    };

    window.rncSelectAllSetores = function() {
        rncSetorFilter = getSetores().slice();
        updateRncSetorHeadLabel(); rncPage = 1; renderRnc();
    };
    window.rncClearSetores = function() {
        rncSetorFilter = [];
        updateRncSetorHeadLabel(); rncPage = 1; renderRnc();
    };
    function updateRncSetorHeadLabel() {
        var lbl = document.getElementById('rncHeadSetorLabel');
        var btn = document.getElementById('rncHeadSetorBtn');
        if (!lbl) return;
        var n = rncSetorFilter.length;
        var txt = n === 0 ? 'Setores' : (n === 1 ? rncSetorFilter[0] : n + ' setores');
        lbl.textContent = txt;
        if (btn) btn.classList.toggle('active', n > 0);
    }

    function rncCloseHeadDropdowns() {
        var dateEl = document.getElementById('rncHeadDateDropdown');
        if (dateEl) { dateEl.style.display = 'none'; dateEl.classList.remove('open'); }
        var setorEl = document.getElementById('rncHeadSetorDropdown');
        if (setorEl) setorEl.style.display = 'none';
    }
    window.rncCloseHeadDropdowns = rncCloseHeadDropdowns;

    // ── Mostra/oculta filtros do header e sino ──
    window.rncSetHeaderFilters = function(show) {
        ['rncHeadDateWrap','rncHeadSetorWrap'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = show ? 'block' : 'none';
        });
        var bell = document.getElementById('notificationContainer');
        if (bell) bell.style.display = show ? 'none' : '';
        var rncBell = document.getElementById('rncNotificationContainer');
        if (rncBell) rncBell.style.display = show ? 'flex' : 'none';
        if (!show) rncCloseHeadDropdowns();
    };

    // ══════════════════════════════════════════════════════════════════
    //  SINO DE NOTIFICAÇÕES RNC
    // ══════════════════════════════════════════════════════════════════

    // Calcula o estado de alerta de uma RNC.
    // Retorna { state:'overdue'|'alert', diff } ou null se ainda não deve alertar.
    // Status concluído/cancelado nunca alerta.
    function rncStatusIsFinal(name) {
        var item = getRncStatusList().find(function(s){ return s.name === name; });
        if (item && (item.finalKind === 'concluido' || item.finalKind === 'cancelado')) return true;
        var st = String(name || '').toLowerCase();
        return st.indexOf('conclu') !== -1 || st.indexOf('cancel') !== -1;
    }
    window.rncStatusIsFinal = rncStatusIsFinal;

    function rncAlertState(r) {
        if (!r || r.deleted) return null;
        if (rncStatusIsFinal(r.status)) return null;
        var df = r.dataConclusao || r.dataInicio;
        if (!df) return null;
        var now = new Date(); now.setHours(0,0,0,0);
        var d = new Date(String(df).slice(0,10) + 'T00:00:00');
        if (isNaN(d.getTime())) return null;
        var diff = Math.floor((d - now) / (1000*60*60*24)); // dias até a data (negativo = atrasado)
        // janela de alerta: alertaDias do card, ou 7 como padrão
        var window = (r.alertaDias != null && r.alertaDias !== '') ? Number(r.alertaDias) : 7;
        if (diff < 0) return { state: 'overdue', diff: diff };
        if (diff <= window) return { state: 'alert', diff: diff };
        return null;
    }
    window.rncAlertState = rncAlertState;

    function getRncNotifications() {
        var arr = (window.rncItems || []).filter(function(r){ return r && !r.deleted; });
        var notifs = [];
        arr.forEach(function(r) {
            var a = rncAlertState(r);
            if (!a) return;
            notifs.push({
                id: r.id, titulo: r.titulo, diff: a.diff, state: a.state,
                ci: getCI(r.classificacao), priority: a.state === 'overdue' ? 0 : 1,
                df: r.dataConclusao || r.dataInicio
            });
        });
        notifs.sort(function(a,b){ return a.priority - b.priority || (new Date(a.df) - new Date(b.df)); });
        return notifs;
    }

    function updateRncNotificationBell() {
        var badge = document.getElementById('rncNotificationBadge');
        if (!badge) return;
        var n = getRncNotifications().length;
        badge.textContent = n;
        badge.style.display = n > 0 ? '' : 'none';
    }

    window.rncToggleNotifications = function() {
        var modal = document.getElementById('rncNotificationModal');
        if (!modal) return;
        var open = modal.classList.contains('open');
        if (open) { modal.classList.remove('open'); return; }
        var notifs = getRncNotifications();
        var content = document.getElementById('rncNotifContent');
        if (content) {
            if (notifs.length === 0) {
                content.innerHTML = '<div class="rnc-notif-empty"><i class="fas fa-check-circle"></i><p>Nenhuma RNC com prazo próximo.</p></div>';
            } else {
                content.innerHTML = notifs.map(function(n) {
                    var diffText = n.state === 'overdue'
                        ? (Math.abs(n.diff) + ' dia' + (Math.abs(n.diff)!==1?'s':'') + ' em atraso')
                        : (n.diff === 0 ? 'Vence hoje' : 'Vence em ' + n.diff + ' dia' + (n.diff!==1?'s':''));
                    var ic = n.state === 'overdue' ? '#dc2626' : '#f59e0b';
                    var icBg = n.state === 'overdue' ? '#fef2f2' : '#fffbeb';
                    return '<div class="rnc-notif-item" onclick="rncCloseNotifications();rncOpenView(' + n.id + ')">' +
                        '<div class="rnc-notif-icon" style="background:' + icBg + ';color:' + ic + '">' +
                            '<i class="fas ' + (n.state === 'overdue' ? 'fa-circle-exclamation' : 'fa-bell') + '"></i>' +
                        '</div>' +
                        '<div class="rnc-notif-body">' +
                            '<div class="rnc-notif-title">' + esc(n.titulo || 'RNC') + '</div>' +
                            '<div class="rnc-notif-meta">' + esc(diffText) + '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }
        }
        modal.classList.add('open');
    };
    window.rncCloseNotifications = function() {
        var modal = document.getElementById('rncNotificationModal');
        if (modal) modal.classList.remove('open');
    };

    // ══════════════════════════════════════════════════════════════════
    //  DRAWER — FORMULÁRIO
    // ══════════════════════════════════════════════════════════════════

    window.rncOpenNew = function() {
        if (!canEdit()) { toast('Você não tem permissão para criar RNCs.', 'error'); return; }
        ensureLists();
        rncEditingId = null;
        document.getElementById('rncDrawerTitle').textContent = 'Nova RNC';
        document.getElementById('rncDrawerSubtitle').textContent = 'Preencha os dados abaixo';
        clearRncForm();
        if (typeof clearAnexosUpload === 'function') clearAnexosUpload('rnc');
        if (typeof clearChecklist === 'function') clearChecklist('rnc');
        rncCloseAllDropdowns();
        openRncDrawer();
    };

    window.rncOpenEdit = function(id) {
        if (!canEdit()) { toast('Você não tem permissão para editar.', 'error'); return; }
        id = Number(id);
        var r = (window.rncItems || []).find(function(x){ return x.id === id; });
        if (!r) return;
        ensureLists();
        rncEditingId = id;
        document.getElementById('rncDrawerTitle').textContent = 'Editar RNC';
        document.getElementById('rncDrawerSubtitle').textContent = 'Atualize os dados abaixo';
        fillRncForm(r);
        if (typeof restoreAnexosUpload === 'function') restoreAnexosUpload('rnc', r.anexos);
        if (typeof restoreChecklist === 'function') restoreChecklist('rnc', r.checklist, r.checklistPublicacao);
        rncCloseAllDropdowns();
        openRncDrawer();
    };

    function clearRncForm() {
        var todayVal = typeof today === 'function' ? today() : new Date().toISOString().split('T')[0];
        setVal('rncFTitulo', '');
        setVal('rncFSetor', '');
        setVal('rncFOrigem', '');
        setVal('rncFDetalhamento', '');
        setVal('rncFDescricao', '');
        setVal('rncFPlanoAcao', '');
        var stList = getRncStatusList();
        setVal('rncFStatus', (stList && stList.length) ? stList[0].name : '');
        setVal('rncFDataInicio', todayVal);
        setVal('rncFDataConclusao', '');
        setVal('rncFResponsavel', meName());
        setVal('rncFRevisor', '');
        setVal('rncFAlerta', '');
        setVal('rncFMarcador', '');
        renderMarkerChips('');
        document.querySelectorAll('.rnc-class-chip').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-cls') === 'critica');
        });
    }

    function fillRncForm(r) {
        setVal('rncFTitulo', r.titulo);
        setVal('rncFSetor', r.setor);
        setVal('rncFOrigem', r.origem);
        setVal('rncFDetalhamento', r.detalhamento);
        setVal('rncFDescricao', r.descricao);
        setVal('rncFPlanoAcao', r.planoAcao);
        setVal('rncFStatus', r.status);
        setVal('rncFDataInicio', r.dataInicio);
        setVal('rncFDataConclusao', r.dataConclusao);
        setVal('rncFResponsavel', r.responsavel || meName());
        setVal('rncFRevisor', r.revisor || '');
        setVal('rncFAlerta', (r.alertaDias != null ? r.alertaDias : ''));
        setVal('rncFMarcador', r.marcador || '');
        renderMarkerChips(r.marcador || '');
        document.querySelectorAll('.rnc-class-chip').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-cls') === (r.classificacao || 'critica'));
        });
    }

    function openRncDrawer() {
        var d = document.getElementById('modalRnc');
        var bk = document.getElementById('formDrawerBackdrop');
        if (typeof closeFormDrawer === 'function') closeFormDrawer();
        if (d) d.classList.add('open');
        if (bk) bk.classList.add('open');
        var firstTab = d && d.querySelector('.drawer-tab');
        if (firstTab && typeof switchDrawerTab === 'function') switchDrawerTab('rnc', 'info', firstTab);
    }

    window.rncCloseDrawer = function() {
        var d = document.getElementById('modalRnc');
        var bk = document.getElementById('formDrawerBackdrop');
        if (d) d.classList.remove('open');
        if (bk) bk.classList.remove('open');
        rncCloseAllDropdowns();
    };

    window.rncSelectClass = function(cls) {
        document.querySelectorAll('.rnc-class-chip').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-cls') === cls);
        });
    };

    window.rncSaveForm = function() {
        var titulo       = getVal('rncFTitulo').trim();
        var setor        = getVal('rncFSetor').trim();
        var origem       = getVal('rncFOrigem').trim();
        var detalhamento = getVal('rncFDetalhamento').trim();
        var descricao    = getVal('rncFDescricao').trim();
        var planoAcao    = getVal('rncFPlanoAcao').trim();
        var status       = getVal('rncFStatus').trim();
        var dataInicio   = getVal('rncFDataInicio');
        var dataConclusao= getVal('rncFDataConclusao');
        var chip = document.querySelector('.rnc-class-chip.active');
        var classificacao = chip ? chip.getAttribute('data-cls') : 'critica';
        var marcador = getVal('rncFMarcador');
        var responsavel = getVal('rncFResponsavel').trim() || meName();
        var revisor = getVal('rncFRevisor').trim();
        var alertaRaw = getVal('rncFAlerta');
        var alertaDias = (alertaRaw === '' || alertaRaw == null) ? null : Math.max(0, parseInt(alertaRaw, 10) || 0);

        // Validações
        if (!titulo)       { toast('Informe o título.', 'error');                 focusEl('rncFTitulo');       return; }
        if (!setor)        { toast('Informe o setor.', 'error');                  focusEl('rncFSetor');        return; }
        if (!classificacao){ toast('Selecione a classificação.', 'error');                                     return; }
        if (!origem)       { toast('Informe a origem.', 'error');                 focusEl('rncFOrigem');       return; }
        if (!detalhamento) { toast('Informe o detalhamento.', 'error');           focusEl('rncFDetalhamento'); return; }
        if (!descricao)    { toast('Informe a descrição do ocorrido.', 'error');  focusEl('rncFDescricao');    return; }

        var anexos             = (typeof getAnexosUpload === 'function') ? getAnexosUpload('rnc') : [];
        var checklist          = (typeof getChecklist === 'function') ? getChecklist('rnc') : [];
        var checklistPublicacao= (typeof getChecklistPub === 'function') ? getChecklistPub('rnc') : [];

        ensureLists();
        // Auto-adiciona origem/detalhamento se não existirem
        var origens = getOrigens();
        if (!origens.some(function(o){ return String(o.name).trim().toLowerCase() === origem.toLowerCase(); })) {
            origens.push({ id: Date.now() + '_o', name: origem });
        }
        var dets = getDetalhamentos();
        if (!dets.some(function(d){ return String(d.name).trim().toLowerCase() === detalhamento.toLowerCase(); })) {
            dets.push({ id: Date.now() + '_d', name: detalhamento });
        }

        if (rncEditingId) {
            var r = (window.rncItems || []).find(function(x){ return x.id === rncEditingId; });
            if (r) {
                r.titulo = titulo; r.setor = setor; r.classificacao = classificacao;
                r.origem = origem; r.detalhamento = detalhamento; r.descricao = descricao;
                r.planoAcao = planoAcao; r.status = status; r.marcador = marcador;
                r.responsavel = responsavel; r.revisor = revisor;
                r.alertaDias = alertaDias;
                r.dataInicio = dataInicio; r.dataConclusao = dataConclusao;
                r.anexos = anexos; r.checklist = checklist; r.checklistPublicacao = checklistPublicacao;
                r.updatedAt = new Date().toISOString();
                if (!r.historico) r.historico = [];
                r.historico.push({ acao: 'Editado', usuario: meName(), data: new Date().toISOString() });
            }
            toast('RNC atualizada.', 'success');
        } else {
            if (!window.rncItems) window.rncItems = [];
            window.rncItems.push({
                id: Date.now(),
                titulo: titulo, setor: setor, classificacao: classificacao,
                origem: origem, detalhamento: detalhamento, descricao: descricao,
                planoAcao: planoAcao, status: status, marcador: marcador,
                dataInicio: dataInicio, dataConclusao: dataConclusao,
                responsavel: responsavel, revisor: revisor,
                alertaDias: alertaDias,
                anexos: anexos, checklist: checklist, checklistPublicacao: checklistPublicacao,
                publicacoes: [],
                historico: [{ acao: 'Criado', usuario: meName(), data: new Date().toISOString() }],
                createdAt: new Date().toISOString()
            });
            toast('RNC registrada.', 'success');
        }
        persist();
        window.rncCloseDrawer();
        renderRnc();
        updateRncNotificationBell();
    };

    window.rncDelete = function(id) {
        id = Number(id);
        if (!canEdit()) { toast('Sem permissão para excluir.', 'error'); return; }
        rncConfirm({
            title: 'Excluir RNC',
            message: 'Esta RNC será removida permanentemente.',
            confirmLabel: 'Excluir', confirmClass: 'oc-confirm-btn-danger', icon: 'fa-trash'
        }, function() {
            var arr = window.rncItems || [];
            var idx = arr.findIndex(function(x){ return x.id === id; });
            if (idx !== -1) { arr[idx].deleted = true; arr[idx].deletedAt = new Date().toISOString(); }
            persist(); renderRnc(); updateRncNotificationBell();
            toast('RNC removida.', 'success');
            // Fecha view modal se o item excluído estava aberto
            if (rncViewId === id) window.rncCloseView();
        });
    };

    // ── Autocomplete dos campos ──
    function rncCloseAllDropdowns() {
        ['rncSetorDropdown','rncOrigemDropdown','rncDetalhamentoDropdown','rncStatusDropdown',
         'rncResponsavelDropdown','rncRevisorDropdown','rncMarkerDropdown'].forEach(function(id){
            var el = document.getElementById(id); if (el) el.classList.remove('open');
        });
    }
    window.rncCloseAllDropdowns = rncCloseAllDropdowns;

    window.rncSetorInput = function() {
        var input = document.getElementById('rncFSetor');
        var dd = document.getElementById('rncSetorDropdown');
        if (!input || !dd) return;
        var val = (input.value || '').toLowerCase();
        var setores = getSetores();
        var filtered = val ? setores.filter(function(x){ return String(x).toLowerCase().indexOf(val) !== -1; }) : setores;
        if (!filtered.length) { dd.classList.remove('open'); return; }
        dd.innerHTML = filtered.map(function(x){
            return '<button class="rnc-ac-option" onclick="rncSelectSetor(\'' + esc(x) + '\')">' + esc(x) + '</button>';
        }).join('');
        dd.classList.add('open');
    };
    window.rncSelectSetor = function(v) {
        setVal('rncFSetor', v);
        var dd = document.getElementById('rncSetorDropdown'); if (dd) dd.classList.remove('open');
    };
    function buildRncAcFull(inputId, dropId, items, selectFn) {
        var input = document.getElementById(inputId), dd = document.getElementById(dropId);
        if (!input || !dd) return;
        var val = (input.value || '').toLowerCase();
        var filtered = val ? items.filter(function(x){ return String(x).toLowerCase().indexOf(val) !== -1; }) : items;
        if (!filtered.length) { dd.classList.remove('open'); return; }
        dd.innerHTML = filtered.map(function(x){
            return '<button class="rnc-ac-option" onclick="' + selectFn + '(\'' + esc(x) + '\')">' + esc(x) + '</button>';
        }).join('');
        dd.classList.add('open');
    }

    window.rncOrigemInput = function() {
        buildRncAcFull('rncFOrigem', 'rncOrigemDropdown', getOrigens().map(function(o){ return o.name; }), 'rncSelectOrigem');
    };
    window.rncSelectOrigem = function(v) {
        setVal('rncFOrigem', v);
        var dd = document.getElementById('rncOrigemDropdown'); if (dd) dd.classList.remove('open');
    };
    window.rncDetalhamentoInput = function() {
        buildRncAcFull('rncFDetalhamento', 'rncDetalhamentoDropdown', getDetalhamentos().map(function(d){ return d.name; }), 'rncSelectDetalhamento');
    };
    window.rncSelectDetalhamento = function(v) {
        setVal('rncFDetalhamento', v);
        var dd = document.getElementById('rncDetalhamentoDropdown'); if (dd) dd.classList.remove('open');
    };
    window.rncStatusInput = function() {
        buildRncAcFull('rncFStatus', 'rncStatusDropdown', getRncStatusList().map(function(s){ return s.name; }), 'rncSelectStatus');
    };
    window.rncSelectStatus = function(v) {
        setVal('rncFStatus', v);
        var dd = document.getElementById('rncStatusDropdown'); if (dd) dd.classList.remove('open');
    };

    // ── Autocomplete de usuários (responsável e revisor) ──
    function getUserNames() {
        var u = typeof users !== 'undefined' ? users : [];
        return u.filter(function(x){ return x && x.name; }).map(function(x){ return x.name; }).sort(function(a,b){ return a.localeCompare(b,'pt'); });
    }
    window.rncResponsavelInput = function() {
        buildRncAcFull('rncFResponsavel', 'rncResponsavelDropdown', getUserNames(), 'rncSelectResponsavel');
    };
    window.rncSelectResponsavel = function(v) {
        setVal('rncFResponsavel', v);
        var dd = document.getElementById('rncResponsavelDropdown'); if (dd) dd.classList.remove('open');
    };
    window.rncRevisorInput = function() {
        buildRncAcFull('rncFRevisor', 'rncRevisorDropdown', getUserNames(), 'rncSelectRevisor');
    };
    window.rncSelectRevisor = function(v) {
        setVal('rncFRevisor', v);
        var dd = document.getElementById('rncRevisorDropdown'); if (dd) dd.classList.remove('open');
    };

    // ══════════════════════════════════════════════════════════════════
    //  VIEW MODAL (modal de visualização)
    // ══════════════════════════════════════════════════════════════════

    window.rncOpenView = function(id) {
        id = Number(id);
        var r = (window.rncItems || []).find(function(x){ return x.id === id; });
        if (!r) return;
        rncViewId = id;
        // Expõe para o sistema de publicações reutilizar o #modalPublicacao
        window._currentViewId = id;
        window._currentViewTab = 'rnc';
        window.currentViewItemId = id;
        _renderRncView(r);
        var modal = document.getElementById('rncViewModal');
        var bk = document.getElementById('rncViewBackdrop');
        if (modal) modal.classList.add('open');
        if (bk) bk.classList.add('open');
        // Ativa primeira aba
        var firstTab = modal && modal.querySelector('.rnc-view-tab');
        if (firstTab) rncSwitchViewTab('rnc-vinfo', firstTab);
    };

    window.rncCloseView = function() {
        var modal = document.getElementById('rncViewModal');
        var bk = document.getElementById('rncViewBackdrop');
        if (modal) modal.classList.remove('open');
        if (bk) bk.classList.remove('open');
        rncViewId = null;
        window._currentViewId = null;
        window._currentViewTab = null;
        window.currentViewItemId = null;
    };

    window.rncSwitchViewTab = function(panelId, btn) {
        var modal = document.getElementById('rncViewModal');
        if (!modal) return;
        modal.querySelectorAll('.rnc-view-tab').forEach(function(t){ t.classList.remove('active'); });
        modal.querySelectorAll('.rnc-view-panel').forEach(function(p){ p.classList.remove('active'); });
        if (btn) btn.classList.add('active');
        var panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');
        // FAB "Nova Publicação" fixo no rodapé: visível apenas na aba de Dados
        var fab = document.getElementById('rncViewPubFab');
        if (fab) fab.style.display = (panelId === 'rnc-vinfo' && canEdit()) ? '' : 'none';
    };
    function rncSwitchViewTab(panelId, btn) { window.rncSwitchViewTab(panelId, btn); }

    function _renderRncView(r) {
        var ci = getCI(r.classificacao);
        var mk = getMarker(r.marcador);
        window.rncViewEditId = r.id;

        // Header com gradiente (espelha a visualização de Ocorrência)
        var hdr = document.getElementById('rncViewHeader');
        if (hdr) hdr.style.setProperty('--rnc-view-accent', ci.color);
        var hicon = document.getElementById('rncViewHeaderIcon');
        if (hicon) hicon.innerHTML = '<i class="fas ' + ci.icon + '"></i>';
        var hedit = document.getElementById('rncViewHeaderEdit');
        if (hedit) hedit.style.display = canEdit() ? '' : 'none';

        // Título
        var t = document.getElementById('rncViewTitle'); if (t) t.textContent = r.titulo || 'RNC';

        // Linha de metadados (setor · responsável · conclusão)
        var meta = [];
        if (r.setor)         meta.push('<span><i class="fas fa-building"></i> ' + esc(r.setor) + '</span>');
        if (r.responsavel)   meta.push('<span><i class="fas fa-user"></i> ' + esc(r.responsavel) + '</span>');
        if (r.dataConclusao) meta.push('<span><i class="far fa-calendar-check"></i> ' + esc(fmtDate(r.dataConclusao)) + '</span>');
        var sub = document.getElementById('rncViewSubtitle');
        if (sub) sub.innerHTML = meta.join('<span class="rnc-view-meta-sep">·</span>');

        // Chips (classificação + marcador)
        var chips = document.getElementById('rncViewHeaderChips');
        if (chips) chips.innerHTML =
            '<span class="rnc-view-hchip"><i class="fas ' + ci.icon + '"></i> ' + esc(ci.label) + '</span>' +
            (mk ? '<span class="rnc-view-hchip"><i class="fas ' + mk.icon + '"></i> ' + esc(mk.label) + '</span>' : '') +
            (r.status ? '<span class="rnc-view-hchip"><i class="fas fa-circle-dot"></i> ' + esc(r.status) + '</span>' : '');

        // Painel Info
        var info = document.getElementById('rncViewInfoContent');
        if (info) {
            var mkv = getMarker(r.marcador);
            info.innerHTML =
                '<div class="rnc-view-groups">' +
                _vgroup('fa-triangle-exclamation', '#2563eb', 'Identificação',
                    _vrow('fa-heading', 'Título', '<strong>' + esc(r.titulo || '—') + '</strong>') +
                    _vrow('fa-building', 'Setor', esc(r.setor || '—')) +
                    _vrow('fa-tag', 'Classificação', '<span class="rnc-class-badge rnc-class-badge--sm" style="background:' + ci.bg + ';color:' + ci.color + ';border-color:' + ci.border + '"><i class="fas ' + ci.icon + '"></i> ' + esc(ci.label) + '</span>') +
                    _vrow('fa-circle-dot', 'Status', r.status ? '<span class="rnc-vrow-pill" style="' + rncStatusColorStyle(r.status) + '">' + esc(r.status) + '</span>' : '<em class="rnc-vrow-empty">Não definido</em>') +
                    _vrow('fa-bookmark', 'Marcador', mkv ? '<span class="rnc-vrow-pill" style="background:' + mkv.bg + ';color:' + mkv.color + ';border-color:' + mkv.color + '33"><i class="fas ' + mkv.icon + '"></i> ' + esc(mkv.label) + '</span>' : '<em class="rnc-vrow-empty">Nenhum</em>')
                ) +
                _vgroup('fa-calendar-days', '#7c3aed', 'Datas & Responsabilidade',
                    _vrow('fa-calendar-plus', 'Início', r.dataInicio ? esc(fmtDate(r.dataInicio)) : '<em class="rnc-vrow-empty">—</em>') +
                    _vrow('fa-calendar-check', 'Conclusão prevista', r.dataConclusao ? esc(fmtDate(r.dataConclusao)) : '<em class="rnc-vrow-empty">—</em>') +
                    _vrow('fa-user-tie', 'Responsável', esc(r.responsavel || '—')) +
                    (r.revisor ? _vrow('fa-user-check', 'Revisor', esc(r.revisor)) : '') +
                    _vrow('fa-clock', 'Registrado em', esc(fmtDateTime(r.createdAt)))
                ) +
                _vgroup('fa-map-pin', '#0891b2', 'Origem & Detalhamento',
                    _vrow('fa-location-dot', 'Origem', esc(r.origem || '—')) +
                    _vrow('fa-list-ul', 'Detalhamento', esc(r.detalhamento || '—'))
                ) +
                _vgroup('fa-file-lines', '#16a34a', 'Descrição & Plano de Ação',
                    _vtext('Descrição do Ocorrido', esc(r.descricao || '—').replace(/\n/g,'<br>')) +
                    _vtext('Plano de Ação', r.planoAcao ? esc(r.planoAcao).replace(/\n/g,'<br>') : '<em class="rnc-vrow-empty">Não informado</em>')
                ) +
                '</div>';
        }

        // Painel Checklist
        _renderRncViewCl(r);

        // Painel Publicações
        _renderRncViewPubs(r);

        // Painel Anexos
        _renderRncViewAx(r);

        // Badges
        _updateRncViewBadges(r);
    }

    function _field(label, valueHtml) {
        return '<div class="rnc-view-field"><label>' + esc(label) + '</label><div>' + valueHtml + '</div></div>';
    }
    function _vgroup(icon, color, title, fields) {
        return '<div class="rnc-vgroup" style="--vg-color:' + color + '">' +
            '<div class="rnc-vgroup-header">' +
                '<span class="rnc-vgroup-icon"><i class="fas ' + icon + '"></i></span>' +
                '<span class="rnc-vgroup-title">' + title + '</span>' +
            '</div>' +
            '<div class="rnc-vgroup-body">' + fields + '</div>' +
        '</div>';
    }
    function _vrow(icon, label, valueHtml) {
        return '<div class="rnc-vrow">' +
            '<span class="rnc-vrow-icon"><i class="fas ' + icon + '"></i></span>' +
            '<span class="rnc-vrow-label">' + esc(label) + '</span>' +
            '<span class="rnc-vrow-value">' + valueHtml + '</span>' +
        '</div>';
    }
    function _vtext(label, valueHtml) {
        return '<div class="rnc-vtext-block"><label>' + esc(label) + '</label><div class="rnc-vtext-body">' + valueHtml + '</div></div>';
    }

    function _updateRncViewBadges(r) {
        var cl = r.checklist || []; var clDone = cl.filter(function(c){ return c.checked; }).length;
        var el = document.getElementById('rncViewClBadge');
        if (el) { el.textContent = cl.length > 0 ? clDone+'/'+cl.length : ''; el.style.display = cl.length > 0 ? '' : 'none'; }
        var pb = document.getElementById('rncViewPubBadge');
        if (pb) { var np = (r.publicacoes||[]).length; pb.textContent = np||''; pb.style.display = np>0?'':'none'; }
        var ab = document.getElementById('rncViewAxBadge');
        if (ab) { var na = (r.anexos||[]).length; ab.textContent = na||''; ab.style.display = na>0?'':'none'; }
    }

    // ── Checklist no view modal ──
    function _renderRncViewCl(r) {
        var container = document.getElementById('rncViewClContent');
        if (!container) return;
        var cl = r.checklist || [];
        if (cl.length === 0) {
            container.innerHTML = '<div class="rnc-pub-empty"><i class="fas fa-list-check"></i><p>Nenhum item de checklist cadastrado.</p></div>';
            return;
        }
        var done = cl.filter(function(c){ return c.checked; }).length;
        var pct = Math.round((done/cl.length)*100);
        container.innerHTML =
            '<div class="rnc-view-cl-progress">' +
                '<div class="rnc-view-cl-bar"><div class="rnc-view-cl-bar-fill" style="width:' + pct + '%"></div></div>' +
                '<span class="rnc-view-cl-count">' + done + '/' + cl.length + ' (' + pct + '%)</span>' +
            '</div>' +
            cl.map(function(item, i) {
                var disabled = !canEdit() || (!item.checked && item.requiresComment && !(item.comment||'').trim());
                return '<div class="rnc-view-cl-item' + (item.checked?' checked':'') + '" id="rncvcl-' + r.id + '-' + i + '">' +
                    '<input type="checkbox" ' + (item.checked?'checked':'') + (disabled?' disabled':'') +
                        ' onchange="rncToggleCl(' + r.id + ',' + i + ')">' +
                    '<span class="cl-text">' + esc(item.texto||'') + '</span>' +
                '</div>';
            }).join('');
    }

    window.rncToggleCl = function(id, idx) {
        id = Number(id);
        var r = (window.rncItems||[]).find(function(x){ return x.id===id; });
        if (!r || !r.checklist) return;
        var c = r.checklist[idx]; if (!c) return;
        if (!canEdit()) return;
        if (!c.checked && c.requiresComment && !(c.comment||'').trim()) return;
        c.checked = !c.checked;
        persist();
        _renderRncViewCl(r);
        _updateRncViewBadges(r);
        renderRnc();
    };

    // ── Publicações no view modal (sub-abas: Comentário / Atualização / Evidência) ──
    var RNC_PUB_TIPOS = [
        { key: 'Comentário',  label: 'Comentário',  icon: 'fa-comment-dots',        color: '#2563eb' },
        { key: 'Atualização', label: 'Atualização', icon: 'fa-rotate',              color: '#0891b2' },
        { key: 'Evidência',   label: 'Evidência',   icon: 'fa-file-circle-check',   color: '#16a34a' }
    ];
    var rncPubSubtab = 'Comentário';

    function _rncPubItemHtml(r, p, i, canMg) {
        return '<div class="rnc-pub-item">' +
            '<div class="rnc-pub-item-header">' +
                '<div class="rnc-pub-item-meta">' +
                    '<span class="rnc-pub-item-type">' + esc(p.tipo||'Comentário') + '</span>' +
                    '<span class="rnc-pub-item-date"><i class="fas fa-calendar"></i> ' + esc(fmtDate(p.data)) + (p.hora ? ' ' + esc(p.hora) : '') + '</span>' +
                    (p.usuario ? '<span class="rnc-pub-item-user"><i class="fas fa-user"></i> ' + esc(p.usuario) + '</span>' : '') +
                '</div>' +
                (canMg ? '<div class="rnc-pub-item-actions">' +
                    '<button class="rnc-pub-btn" onclick="rncOpenPubModal(' + i + ')" title="Editar"><i class="fas fa-pen"></i></button>' +
                    '<button class="rnc-pub-btn danger" onclick="rncDeletePub(' + r.id + ',' + i + ')" title="Excluir"><i class="fas fa-trash"></i></button>' +
                '</div>' : '') +
            '</div>' +
            '<div class="rnc-pub-item-desc">' + esc(p.descricao||'').replace(/\n/g,'<br>') + '</div>' +
            (p.anexos && p.anexos.length > 0 ? '<div style="margin-top:6px;font-size:12px;color:#94a3b8"><i class="fas fa-paperclip"></i> ' + p.anexos.length + ' anexo(s)</div>' : '') +
        '</div>';
    }

    function _renderRncViewPubs(r) {
        var container = document.getElementById('rncViewPubContent');
        if (!container) return;
        var pubs = r.publicacoes || [];
        var canMg = canEdit();

        // Conta por tipo (mapeia tipos legados para "Comentário")
        function tipoOf(p) {
            var t = p.tipo || 'Comentário';
            return (t === 'Comentário' || t === 'Atualização' || t === 'Evidência') ? t : 'Comentário';
        }
        var counts = { 'Comentário': 0, 'Atualização': 0, 'Evidência': 0 };
        pubs.forEach(function(p){ counts[tipoOf(p)]++; });

        // Barra de sub-abas
        var subtabs = '<div class="rnc-pub-subtabs">' +
            RNC_PUB_TIPOS.map(function(t){
                var active = rncPubSubtab === t.key;
                return '<button class="rnc-pub-subtab' + (active ? ' active' : '') + '" style="--rnc-pst-color:' + t.color + '" onclick="rncSwitchPubSubtab(\'' + t.key + '\')">' +
                    '<i class="fas ' + t.icon + '"></i> ' + t.label +
                    (counts[t.key] > 0 ? '<span class="rnc-pub-subtab-badge">' + counts[t.key] + '</span>' : '') +
                '</button>';
            }).join('') +
        '</div>';

        // Lista filtrada pela sub-aba ativa
        var filtered = pubs.map(function(p, idx){ return { p: p, i: idx }; })
                           .filter(function(o){ return tipoOf(o.p) === rncPubSubtab; });
        var listHtml;
        if (filtered.length === 0) {
            var cur = RNC_PUB_TIPOS.find(function(t){ return t.key === rncPubSubtab; }) || RNC_PUB_TIPOS[0];
            listHtml = '<div class="rnc-pub-empty"><i class="fas ' + cur.icon + '"></i><p>Nenhuma publicação do tipo "' + cur.label + '".</p></div>';
        } else {
            listHtml = '<div class="rnc-pub-list">' +
                filtered.slice().reverse().map(function(o){ return _rncPubItemHtml(r, o.p, o.i, canMg); }).join('') +
            '</div>';
        }
        container.innerHTML = subtabs + listHtml;
    }

    window.rncSwitchPubSubtab = function(key) {
        rncPubSubtab = key;
        if (!rncViewId) return;
        var r = (window.rncItems||[]).find(function(x){ return x.id === rncViewId; });
        if (r) _renderRncViewPubs(r);
    };

    window.rncOpenPubModal = function(editIndex) {
        if (!rncViewId) return;
        // Usa o modal de publicação existente configurando o contexto para 'rnc'
        if (typeof openPublicacaoModal === 'function') {
            openPublicacaoModal(editIndex);
            // Em nova publicação, pré-seleciona o tipo conforme a sub-aba ativa
            var isNew = (editIndex === undefined || editIndex === null);
            if (isNew) {
                var sel = document.getElementById('pubTipo');
                if (sel) sel.value = rncPubSubtab;
            }
        }
    };

    window.rncDeletePub = function(id, index) {
        id = Number(id);
        var r = (window.rncItems||[]).find(function(x){ return x.id===id; });
        if (!r || !r.publicacoes) return;
        rncConfirm({
            title: 'Excluir publicação?',
            message: 'Esta publicação será removida permanentemente.',
            confirmLabel: 'Excluir', icon: 'fa-trash'
        }, function() {
            r.publicacoes.splice(index, 1);
            persist();
            _renderRncViewPubs(r);
            _updateRncViewBadges(r);
            renderRnc();
            toast('Publicação excluída.', 'success');
        });
    };

    // Chamado após confirmarPublicacao quando tab='rnc'
    window.rncRefreshViewPubs = function() {
        if (!rncViewId) return;
        var r = (window.rncItems||[]).find(function(x){ return x.id===rncViewId; });
        if (!r) return;
        _renderRncViewPubs(r);
        _updateRncViewBadges(r);
        renderRnc();
    };

    // ── Anexos no view modal ──
    function _renderRncViewAx(r) {
        var container = document.getElementById('rncViewAxContent');
        if (!container) return;
        var anexos = r.anexos || [];
        if (anexos.length === 0) {
            container.innerHTML = '<div class="rnc-pub-empty"><i class="fas fa-paperclip"></i><p>Nenhum anexo cadastrado.</p></div>';
            return;
        }
        container.innerHTML = '<div class="view-anexos-grid">' +
            anexos.map(function(a) {
                var name = a.titulo || a.url || 'Arquivo';
                var ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
                var icon = 'fa-file';
                if (ext==='.pdf') icon='fa-file-pdf';
                else if (['.xls','.xlsx'].includes(ext)) icon='fa-file-excel';
                else if (['.jpg','.jpeg','.png','.gif','.webp'].includes(ext)) icon='fa-file-image';
                else if (['.ppt','.pptx'].includes(ext)) icon='fa-file-powerpoint';
                return '<a href="' + esc(a.url||'') + '" target="_blank" class="view-anexo-card">' +
                    '<i class="fas ' + icon + ' anexo-icon"></i>' +
                    '<span class="anexo-name">' + esc(name) + '</span>' +
                '</a>';
            }).join('') +
        '</div>';
    }

    // ══════════════════════════════════════════════════════════════════
    //  GERENCIADOR DE LISTAS
    // ══════════════════════════════════════════════════════════════════

    window.rncOpenManager = function(kind) {
        if (!canManage()) { toast('Sem permissão para gerenciar listas.', 'error'); return; }
        rncManagerKind = kind;
        _rncManagerNewColor = 'default';
        var titles = { origens: 'Origens', detalhamentos: 'Detalhamentos', status: 'Status (Kanban)' };
        var el = document.getElementById('rncManagerTitle');
        if (el) el.textContent = 'Gerenciar ' + (titles[kind] || kind);
        // Mostra/oculta seletor de cores
        var needsColor = kind === 'status';
        var cp = document.getElementById('rncManagerColorPicker');
        if (cp) { cp.style.display = needsColor ? 'flex' : 'none'; }
        if (needsColor) _renderRncManagerColorPicker();
        _renderRncManagerList();
        var modal = document.getElementById('rncManagerModal');
        if (modal) modal.style.display = 'flex';
    };

    window.rncCloseManager = function() {
        var modal = document.getElementById('rncManagerModal');
        if (modal) modal.style.display = 'none';
        rncManagerKind = null;
    };

    function _getManagerList() {
        ensureLists();
        if (rncManagerKind === 'origens')       return masterLists.rncOrigens;
        if (rncManagerKind === 'detalhamentos') return masterLists.rncDetalhamentos;
        if (rncManagerKind === 'status')        return masterLists.rncStatus;
        return [];
    }

    var RNC_PALETTE = [
        { key:'default', hex:'#94a3b8' }, { key:'blue',   hex:'#3b82f6' },
        { key:'green',   hex:'#22c55e' }, { key:'red',    hex:'#ef4444' },
        { key:'orange',  hex:'#f97316' }, { key:'yellow', hex:'#eab308' },
        { key:'purple',  hex:'#a855f7' }, { key:'pink',   hex:'#ec4899' },
        { key:'teal',    hex:'#14b8a6' }
    ];
    var _rncManagerNewColor = 'default';

    function _renderRncManagerList() {
        var list = _getManagerList();
        var body = document.getElementById('rncManagerList');
        if (!body) return;
        var isStatus = rncManagerKind === 'status';
        if (!list.length) {
            body.innerHTML = '<div style="text-align:center;padding:28px;color:#94a3b8;font-size:13px;">Nenhum item cadastrado.</div>';
            return;
        }
        body.innerHTML = list.map(function(item, i) {
            var color = isStatus ? rncResolveColor(item.color) : null;
            return '<div class="rnc-manager-item">' +
                '<div class="rnc-manager-item-left">' +
                    (isStatus ? '<span class="rnc-manager-item-dot" style="background:' + color + '"></span>' : '') +
                    '<span>' + esc(item.name) + '</span>' +
                '</div>' +
                (isStatus ?
                '<div class="rnc-manager-item-final">' +
                    '<button class="rnc-final-toggle' + (item.finalKind === 'concluido' ? ' active-ok' : '') + '" title="Marcar como status de conclusão" onclick="rncSetStatusFinalKind(' + i + ',\'concluido\')"><i class="fas fa-circle-check"></i> Concluído</button>' +
                    '<button class="rnc-final-toggle' + (item.finalKind === 'cancelado' ? ' active-cancel' : '') + '" title="Marcar como status de cancelamento" onclick="rncSetStatusFinalKind(' + i + ',\'cancelado\')"><i class="fas fa-circle-xmark"></i> Cancelado</button>' +
                '</div>' : '') +
                '<div class="rnc-manager-item-actions">' +
                    '<button onclick="rncManagerEdit(' + i + ')" title="Editar"><i class="fas fa-pen"></i></button>' +
                    '<button class="danger" onclick="rncManagerRemove(' + i + ')" title="Remover"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function _renderRncManagerColorPicker() {
        var wrap = document.getElementById('rncManagerColorPicker');
        if (!wrap) return;
        wrap.innerHTML = '<span class="rnc-color-picker-label">Cor:</span>' +
            RNC_PALETTE.map(function(p) {
                return '<button type="button" class="rnc-color-dot-btn' + (_rncManagerNewColor===p.key?' active':'') + '" ' +
                    'style="background:' + p.hex + '" ' +
                    'title="' + p.key + '" ' +
                    'onclick="rncManagerPickColor(\'' + p.key + '\')">' +
                    '<i class="fas fa-check"></i>' +
                '</button>';
            }).join('');
    }

    window.rncSetStatusFinalKind = function(idx, kind) {
        var list = _getManagerList();
        var item = list[idx]; if (!item) return;
        var turningOn = item.finalKind !== kind;
        list.forEach(function(s, i) { if (i !== idx && s.finalKind === kind) s.finalKind = null; });
        item.finalKind = turningOn ? kind : null;
        persist(); _renderRncManagerList(); renderRnc();
    };

    window.rncManagerPickColor = function(key) {
        _rncManagerNewColor = key;
        _renderRncManagerColorPicker();
    };

    window.rncManagerAdd = function() {
        var input = document.getElementById('rncManagerInput');
        if (!input) return;
        var name = input.value.trim();
        if (!name) { toast('Informe o nome.', 'error'); return; }
        var list = _getManagerList();
        if (list.some(function(x){ return String(x.name).trim().toLowerCase() === name.toLowerCase(); })) {
            toast('Já existe um item com este nome.', 'warn'); return;
        }
        var item = { id: String(Date.now()), name: name };
        if (rncManagerKind === 'status')    item.color = _rncManagerNewColor;
        list.push(item);
        input.value = ''; input.focus();
        persist(); _renderRncManagerList();
        toast('Item adicionado.', 'success');
    };

    window.rncManagerEdit = function(idx) {
        var list = _getManagerList();
        var item = list[idx]; if (!item) return;
        var newName = prompt('Editar: ' + item.name, item.name);
        if (!newName || !newName.trim()) return;
        item.name = newName.trim();
        persist(); _renderRncManagerList(); renderRnc();
        toast('Item atualizado.', 'success');
    };

    window.rncManagerRemove = function(idx) {
        var list = _getManagerList();
        if (!list[idx]) return;
        rncConfirm({
            title: 'Remover item',
            message: 'Tem certeza que deseja remover "' + list[idx].name + '"?',
            confirmLabel: 'Remover', icon: 'fa-trash'
        }, function() {
            list.splice(idx, 1);
            persist(); _renderRncManagerList(); renderRnc();
            toast('Item removido.', 'success');
        });
    };

    // ══════════════════════════════════════════════════════════════════
    //  ATIVAÇÃO DA ABA
    // ══════════════════════════════════════════════════════════════════

    window.rncActivateTab = function() {
        ensureLists();
        rncPage = 1;
        window.rncSetHeaderFilters(true);
        updateRncSetorHeadLabel();
        updateRncDateHeadLabel();
        updateRncNotificationBell();
        // Reset view toggle
        window.switchRncView(rncView);
    };

    // Expõe para o listener do Firebase
    window.rncRenderTable = renderRnc;

    // ══════════════════════════════════════════════════════════════════
    //  CLICK OUTSIDE
    // ══════════════════════════════════════════════════════════════════

    document.addEventListener('click', function(e) {
        // My dropdown
        if (!e.target.closest('.rnc-my-wrap')) {
            var dd = document.getElementById('rncMyDropdown'); if (dd) dd.classList.remove('open');
        }
        // Classificação / Origem / Detalhamento dropdowns
        if (!e.target.closest('.rnc-class-wrap')) {
            ['rncClassDropdown','rncOrigemFilterDropdown','rncDetFilterDropdown'].forEach(function(id){
                var d = document.getElementById(id); if (d) d.classList.remove('open');
            });
        }
        // Manage dropdown
        if (!e.target.closest('.rnc-manage-wrap')) {
            window.rncCloseManageDropdown();
        }
        // Head dropdowns
        if (!e.target.closest('.rnc-head-filter')) {
            rncCloseHeadDropdowns();
        }
        // Autocomplete e marcador
        if (!e.target.closest('.rnc-ac-wrap') && !e.target.closest('.rnc-field-inline') && !e.target.closest('.rnc-marker-trigger')) {
            rncCloseAllDropdowns();
            var mdd = document.getElementById('rncMarkerDropdown');
            if (mdd) mdd.classList.remove('open');
        }
        // Notification modal
        var nm = document.getElementById('rncNotificationModal');
        var nc = document.getElementById('rncNotificationContainer');
        if (nm && nc && !nm.contains(e.target) && !nc.contains(e.target)) {
            nm.classList.remove('open');
        }
    });

})();
