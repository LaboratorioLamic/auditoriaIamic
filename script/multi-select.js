// === MULTI-SELECT DE RESPONSÁVEIS E REVISORES ===
// Campos: audit/ativ/tren/doc × resp/rev
// Hidden inputs (auditResponsavel, auditRevisor, etc.) armazenam JSON array

(function () {

    // Configuração de todos os campos multi-select
    var MS_FIELDS = [
        { key: 'audit-resp', hidden: 'auditResponsavel', field: 'ms-audit-resp', tags: 'ms-audit-resp-tags', input: 'ms-audit-resp-input', drop: 'ms-audit-resp-drop' },
        { key: 'audit-rev',  hidden: 'auditRevisor',     field: 'ms-audit-rev',  tags: 'ms-audit-rev-tags',  input: 'ms-audit-rev-input',  drop: 'ms-audit-rev-drop' },
        { key: 'ativ-resp',  hidden: 'ativResponsavel',  field: 'ms-ativ-resp',  tags: 'ms-ativ-resp-tags',  input: 'ms-ativ-resp-input',  drop: 'ms-ativ-resp-drop' },
        { key: 'ativ-rev',   hidden: 'ativRevisor',      field: 'ms-ativ-rev',   tags: 'ms-ativ-rev-tags',   input: 'ms-ativ-rev-input',   drop: 'ms-ativ-rev-drop' },
        { key: 'tren-resp',  hidden: 'trainResponsavel', field: 'ms-tren-resp',  tags: 'ms-tren-resp-tags',  input: 'ms-tren-resp-input',  drop: 'ms-tren-resp-drop' },
        { key: 'tren-rev',   hidden: 'trainRevisor',     field: 'ms-tren-rev',   tags: 'ms-tren-rev-tags',   input: 'ms-tren-rev-input',   drop: 'ms-tren-rev-drop' },
        { key: 'doc-resp',   hidden: 'docResponsavel',   field: 'ms-doc-resp',   tags: 'ms-doc-resp-tags',   input: 'ms-doc-resp-input',   drop: 'ms-doc-resp-drop' },
        { key: 'doc-rev',    hidden: 'docRevisor',       field: 'ms-doc-rev',    tags: 'ms-doc-rev-tags',    input: 'ms-doc-rev-input',    drop: 'ms-doc-rev-drop' },
    ];

    // Estado interno: key → array de nomes selecionados
    var _state = {};
    MS_FIELDS.forEach(function (f) { _state[f.key] = []; });

    // Lista global de usuários (carregada após dados disponíveis)
    var _allUsers = [];

    window.msRefreshUsers = function () {
        var set = new Set();
        var sources = [
            { arr: typeof audits     !== 'undefined' ? audits     : [], field: 'responsavel' },
            { arr: typeof activities !== 'undefined' ? activities : [], field: 'responsavel' },
            { arr: typeof trainings  !== 'undefined' ? trainings  : [], field: 'responsavel' },
            { arr: typeof documents  !== 'undefined' ? documents  : [], field: 'responsavel' },
            { arr: typeof audits     !== 'undefined' ? audits     : [], field: 'revisor' },
            { arr: typeof activities !== 'undefined' ? activities : [], field: 'revisor' },
            { arr: typeof trainings  !== 'undefined' ? trainings  : [], field: 'revisor' },
            { arr: typeof documents  !== 'undefined' ? documents  : [], field: 'revisor' },
        ];
        sources.forEach(function (s) {
            s.arr.forEach(function (item) {
                var val = item[s.field];
                if (!val) return;
                try {
                    var parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) { parsed.forEach(function (n) { if (n) set.add(String(n)); }); }
                    else if (parsed) { set.add(String(parsed)); }
                } catch (_) { set.add(String(val)); }
            });
        });
        if (typeof masterLists !== 'undefined' && masterLists.responsaveis) {
            masterLists.responsaveis.forEach(function (r) { if (r) set.add(String(r)); });
        }
        if (typeof users !== 'undefined') {
            users.forEach(function (u) { if (u && u.name) set.add(String(u.name)); });
        }
        _allUsers = Array.from(set).filter(Boolean).sort();
    };

    // ── Renderiza as tags no campo ───────────────────────────────
    function _renderTags(cfg) {
        var tagsEl = document.getElementById(cfg.tags);
        var hiddenEl = document.getElementById(cfg.hidden);
        if (!tagsEl) return;
        var selected = _state[cfg.key];
        tagsEl.innerHTML = selected.map(function (name) {
            var safe = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return '<span class="ms-tag">'
                + _escHtml(name)
                + '<button type="button" onclick="msRemove(\'' + cfg.key + '\',\'' + safe + '\')" title="Remover"><i class="fas fa-times"></i></button>'
                + '</span>';
        }).join('');
        if (hiddenEl) hiddenEl.value = JSON.stringify(selected);
    }

    // ── Abre/atualiza o dropdown ─────────────────────────────────
    function _renderDrop(cfg) {
        var dropEl = document.getElementById(cfg.drop);
        var inputEl = document.getElementById(cfg.input);
        if (!dropEl) return;
        var q = (inputEl ? inputEl.value : '').toLowerCase().trim();
        var selected = _state[cfg.key];
        var filtered = _allUsers.filter(function (u) {
            return !q || u.toLowerCase().includes(q);
        });
        if (!filtered.length) {
            dropEl.innerHTML = '<div class="ms-drop-empty">Nenhum usuário encontrado</div>';
        } else {
            dropEl.innerHTML = filtered.map(function (u) {
                var isSel = selected.includes(u);
                var safe = u.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                return '<div class="ms-option' + (isSel ? ' ms-option--sel' : '') + '" onclick="msToggle(\'' + cfg.key + '\',\'' + safe + '\')">'
                    + (isSel ? '<i class="fas fa-check" style="margin-right:6px;font-size:10px;color:var(--accent)"></i>' : '<span style="width:16px;display:inline-block"></span>')
                    + _escHtml(u)
                    + '</div>';
            }).join('');
        }
        dropEl.classList.add('ms-drop--open');
    }

    function _closeDrop(cfg) {
        var dropEl = document.getElementById(cfg.drop);
        if (dropEl) dropEl.classList.remove('ms-drop--open');
        var inputEl = document.getElementById(cfg.input);
        if (inputEl) inputEl.value = '';
    }

    function _escHtml(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── API pública ──────────────────────────────────────────────
    window.msToggle = function (key, name) {
        var arr = _state[key];
        var idx = arr.indexOf(name);
        if (idx > -1) { arr.splice(idx, 1); } else { arr.push(name); }
        var cfg = MS_FIELDS.find(function (f) { return f.key === key; });
        if (!cfg) return;
        _renderTags(cfg);
        _renderDrop(cfg);
        var inputEl = document.getElementById(cfg.input);
        if (inputEl) inputEl.focus();
    };

    window.msRemove = function (key, name) {
        var arr = _state[key];
        var idx = arr.indexOf(name);
        if (idx > -1) arr.splice(idx, 1);
        var cfg = MS_FIELDS.find(function (f) { return f.key === key; });
        if (cfg) _renderTags(cfg);
    };

    // Carrega dados salvos no hidden input para o estado interno
    window.msLoad = function (key) {
        var cfg = MS_FIELDS.find(function (f) { return f.key === key; });
        if (!cfg) return;
        var hiddenEl = document.getElementById(cfg.hidden);
        if (!hiddenEl) return;
        var val = hiddenEl.value || '';
        try {
            var parsed = JSON.parse(val);
            _state[key] = Array.isArray(parsed) ? parsed.map(String).filter(Boolean)
                : (parsed ? [String(parsed)] : []);
        } catch (_) {
            _state[key] = val ? [val] : [];
        }
        _renderTags(cfg);
    };

    // Reseta um campo (usado em resetModal)
    window.msReset = function (key) {
        _state[key] = [];
        var cfg = MS_FIELDS.find(function (f) { return f.key === key; });
        if (!cfg) return;
        _renderTags(cfg);
        _closeDrop(cfg);
        var hiddenEl = document.getElementById(cfg.hidden);
        if (hiddenEl) hiddenEl.value = '';
    };

    // Reseta todos os campos de um prefixo (audit/ativ/tren/doc)
    window.msResetPrefix = function (prefix) {
        MS_FIELDS.forEach(function (f) {
            if (f.key.startsWith(prefix + '-')) msReset(f.key);
        });
    };

    // Lê o valor como array de nomes (para salvar no Firebase)
    window.msGetValue = function (key) {
        return _state[key].slice();
    };

    // Define valor programaticamente (ao abrir edição)
    window.msSetValue = function (key, value) {
        var arr;
        if (Array.isArray(value)) {
            arr = value.map(String).filter(Boolean);
        } else if (typeof value === 'string' && value.startsWith('[')) {
            try { arr = JSON.parse(value).map(String).filter(Boolean); } catch (_) { arr = value ? [value] : []; }
        } else {
            arr = value ? [String(value)] : [];
        }
        _state[key] = arr;
        var cfg = MS_FIELDS.find(function (f) { return f.key === key; });
        if (cfg) {
            _renderTags(cfg);
            var hiddenEl = document.getElementById(cfg.hidden);
            if (hiddenEl) hiddenEl.value = JSON.stringify(arr);
        }
    };

    // ── Inicializa eventos de cada campo ─────────────────────────
    function _initField(cfg) {
        var fieldEl = document.getElementById(cfg.field);
        var inputEl = document.getElementById(cfg.input);
        var dropEl  = document.getElementById(cfg.drop);
        if (!fieldEl || !inputEl || !dropEl) return;

        // Clique no container abre o dropdown
        fieldEl.addEventListener('click', function (e) {
            if (e.target.closest('.ms-tag')) return;
            if (_allUsers.length === 0) msRefreshUsers();
            _renderDrop(cfg);
            inputEl.focus();
        });

        // Digitação filtra o dropdown
        inputEl.addEventListener('input', function () {
            _renderDrop(cfg);
        });

        // Tecla Escape fecha
        inputEl.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { _closeDrop(cfg); }
            if (e.key === 'Enter') { e.preventDefault(); }
        });
    }

    // Fecha dropdowns ao clicar fora
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.ms-field')) {
            MS_FIELDS.forEach(function (cfg) { _closeDrop(cfg); });
        }
    });

    // Inicialização após DOM pronto
    document.addEventListener('DOMContentLoaded', function () {
        MS_FIELDS.forEach(_initField);
    });

})();
