    // --- CONFIGURAÇÃO FIREBASE ---
    // Firebase já inicializado no módulo acima
    // Função auxiliar para garantir que Firebase está carregado
    function getFirebaseDatabase() {
        if (!window.firebaseDatabase) {
            throw new Error('Firebase ainda não foi carregado. Aguarde alguns instantes e tente novamente.');
        }
        return window.firebaseDatabase;
    }
    
    function getFirebaseRef() {
        if (!window.firebaseRef) {
            throw new Error('Firebase ainda não foi carregado. Aguarde alguns instantes e tente novamente.');
        }
        return window.firebaseRef;
    }
    
    function getFirebaseGet() {
        if (!window.firebaseGet) {
            throw new Error('Firebase ainda não foi carregado. Aguarde alguns instantes e tente novamente.');
        }
        return window.firebaseGet;
    }
    
    function getFirebaseSet() {
        if (!window.firebaseSet) {
            throw new Error('Firebase ainda não foi carregado. Aguarde alguns instantes e tente novamente.');
        }
        return window.firebaseSet;
    }
    
    function getFirebaseOnValue() {
        if (!window.firebaseOnValue) {
            throw new Error('Firebase ainda não foi carregado. Aguarde alguns instantes e tente novamente.');
        }
        return window.firebaseOnValue;
    }
    
    function getFirebaseOff() {
        if (!window.firebaseOff) {
            throw new Error('Firebase ainda não foi carregado. Aguarde alguns instantes e tente novamente.');
        }
        return window.firebaseOff;
    }
    
    // ===== SISTEMA DE CACHE COM LOCALSTORAGE =====
    var CACHE_KEYS = {
        audits: 'lamic_audits_cache',
        trainings: 'lamic_trainings_cache',
        activities: 'lamic_activities_cache',
        maintenances: 'lamic_maintenances_cache',
        documents: 'lamic_documents_cache',
        masterLists: 'lamic_masterLists_cache',
        lastSync: 'lamic_lastSync_timestamp',
        users: 'lamic_users_cache',
        filters: 'lamic_filters_cache'
    };

    function saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(CACHE_KEYS[key], JSON.stringify(data));
            localStorage.setItem(CACHE_KEYS.lastSync, new Date().toISOString());
        } catch (error) {
            console.error(`Erro ao salvar ${key} no localStorage:`, error);
        }
    }

    function loadFromLocalStorage(key) {
        try {
            const cached = localStorage.getItem(CACHE_KEYS[key]);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error(`Erro ao carregar ${key} do localStorage:`, error);
            return null;
        }
    }

    function getLastSyncTime() {
        try {
            const lastSync = localStorage.getItem(CACHE_KEYS.lastSync);
            return lastSync ? new Date(lastSync) : null;
        } catch (error) {
            console.error('Erro ao obter último sincronismo:', error);
            return null;
        }
    }

    function clearAllCache() {
        try {
            // PROTEÇÃO: Limpa TODOS os dados cacheados incluindo sincronização
            // Preserva apenas filtros do usuário para melhor experiência
            const filtersBackup = localStorage.getItem(CACHE_KEYS.filters);
            
            Object.values(CACHE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Restaura apenas filtros se existiam
            if (filtersBackup) {
                localStorage.setItem(CACHE_KEYS.filters, filtersBackup);
            }
            
            console.log('Cache de dados completamente limpo. Apenas filtros do usuário foram preservados.');
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
        }
    }

    // ===== SISTEMA DE PERSISTÊNCIA DE FILTROS =====
    function saveFiltersToLocalStorage() {
        try {
            const filters = {
                // Dashboard
                fDashArea: document.getElementById('fDashArea')?.value || '',
                fDashSetor: document.getElementById('fDashSetor')?.value || '',
                fDashCat: document.getElementById('fDashCat')?.value || '',
                fDashSub: document.getElementById('fDashSub')?.value || '',
                fDashStatus: document.getElementById('fDashStatus')?.value || '',
                fDashResponsavel: document.getElementById('fDashResponsavel')?.value || '',
                fDashRevisor: document.getElementById('fDashRevisor')?.value || '',
                fDashDateType: document.getElementById('fDashDateType')?.value || 'all',
                fDashMonth: document.getElementById('fDashMonth')?.value || currentMonth,
                fDashYearForMonth: document.getElementById('fDashYearForMonth')?.value || currentYear,
                fDashYearOnly: document.getElementById('fDashYearOnly')?.value || currentYear,
                fDashDataIni: document.getElementById('fDashDataIni')?.value || '',
                fDashDataFim: document.getElementById('fDashDataFim')?.value || '',

                // Auditoria
                fAuditSetor: document.getElementById('fAuditSetor')?.value || '',
                fAuditCat: document.getElementById('fAuditCat')?.value || '',
                fAuditSub: document.getElementById('fAuditSub')?.value || '',
                fAuditStatus: document.getElementById('fAuditStatus')?.value || '',
                fAuditResponsavel: document.getElementById('fAuditResponsavel')?.value || '',
                fAuditRevisor: document.getElementById('fAuditRevisor')?.value || '',
                fAuditMarcador: document.getElementById('fAuditMarcador')?.value || '',
                fAuditDateType: document.getElementById('fAuditDateType')?.value || 'all',
                fAuditMonth: document.getElementById('fAuditMonth')?.value || currentMonth,
                fAuditYearForMonth: document.getElementById('fAuditYearForMonth')?.value || currentYear,
                fAuditYearOnly: document.getElementById('fAuditYearOnly')?.value || currentYear,
                fAuditDataIni: document.getElementById('fAuditDataIni')?.value || '',
                fAuditDataFim: document.getElementById('fAuditDataFim')?.value || '',

                // Atividades
                fAtivSetor: document.getElementById('fAtivSetor')?.value || '',
                fAtivCat: document.getElementById('fAtivCat')?.value || '',
                fAtivSub: document.getElementById('fAtivSub')?.value || '',
                fAtivStatus: document.getElementById('fAtivStatus')?.value || '',
                fAtivResponsavel: document.getElementById('fAtivResponsavel')?.value || '',
                fAtivRevisor: document.getElementById('fAtivRevisor')?.value || '',
                fAtivMarcador: document.getElementById('fAtivMarcador')?.value || '',
                fAtivDateType: document.getElementById('fAtivDateType')?.value || 'all',
                fAtivMonth: document.getElementById('fAtivMonth')?.value || currentMonth,
                fAtivYearForMonth: document.getElementById('fAtivYearForMonth')?.value || currentYear,
                fAtivYearOnly: document.getElementById('fAtivYearOnly')?.value || currentYear,
                fAtivDataIni: document.getElementById('fAtivDataIni')?.value || '',
                fAtivDataFim: document.getElementById('fAtivDataFim')?.value || '',

                // Manutenção
                fMantSetor: document.getElementById('fMantSetor')?.value || '',
                fMantCat: document.getElementById('fMantCat')?.value || '',
                fMantItem: document.getElementById('fMantItem')?.value || '',
                fMantTipo: document.getElementById('fMantTipo')?.value || '',
                fMantStatus: document.getElementById('fMantStatus')?.value || '',
                fMantResponsavel: document.getElementById('fMantResponsavel')?.value || '',
                fMantRevisor: document.getElementById('fMantRevisor')?.value || '',
                fMantMarcador: document.getElementById('fMantMarcador')?.value || '',
                fMantDateType: document.getElementById('fMantDateType')?.value || 'all',
                fMantMonth: document.getElementById('fMantMonth')?.value || currentMonth,
                fMantYearForMonth: document.getElementById('fMantYearForMonth')?.value || currentYear,
                fMantYearOnly: document.getElementById('fMantYearOnly')?.value || currentYear,
                fMantDataIni: document.getElementById('fMantDataIni')?.value || '',
                fMantDataFim: document.getElementById('fMantDataFim')?.value || '',

                // Documentos
                fDocSetor: document.getElementById('fDocSetor')?.value || '',
                fDocCat: document.getElementById('fDocCat')?.value || '',
                fDocSub: document.getElementById('fDocSub')?.value || '',
                fDocStatus: document.getElementById('fDocStatus')?.value || '',
                fDocResponsavel: document.getElementById('fDocResponsavel')?.value || '',
                fDocRevisor: document.getElementById('fDocRevisor')?.value || '',
                fDocMarcador: document.getElementById('fDocMarcador')?.value || '',
                fDocDateType: document.getElementById('fDocDateType')?.value || 'all',
                fDocMonth: document.getElementById('fDocMonth')?.value || currentMonth,
                fDocYearForMonth: document.getElementById('fDocYearForMonth')?.value || currentYear,
                fDocYearOnly: document.getElementById('fDocYearOnly')?.value || currentYear,
                fDocDataIni: document.getElementById('fDocDataIni')?.value || '',
                fDocDataFim: document.getElementById('fDocDataFim')?.value || ''
            };
            localStorage.setItem(CACHE_KEYS.filters, JSON.stringify(filters));
        } catch (error) {
            console.error('Erro ao salvar filtros:', error);
        }
    }

    function restoreFiltersFromLocalStorage() {
        try {
            const saved = localStorage.getItem(CACHE_KEYS.filters);
            if (!saved) return;
            
            const filters = JSON.parse(saved);
            const filterIds = Object.keys(filters);
            
            filterIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    try {
                        el.value = filters[id];
                    } catch(_) {
                        // Elemento pode não estar pronto
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao restaurar filtros:', error);
        }
    }

    // ===== FIM SISTEMA DE PERSISTÊNCIA DE FILTROS =====
    
    // Referências do Firebase Realtime Database
    var dataListener = null; // Listener para dados em tempo real
    var usersListener = null; // Listener para usuários em tempo real
    
    var failedAttempts = 0;
    var lockoutTimer = null;
    
    // --- DADOS E ESTADO (Iniciam vazios) ---
    var audits = [];
    var trainings = [];
    var activities = [];
    var maintenances = [];
    var documents = [];
    var users = [];            // usuários carregados do bin de usuários
    var currentuser = null;    // usuário atualmente logado
    
    // NOVO: Armazena o item original no momento da abertura do modal de edição
    var originalItem = null; 

    // --- CORREÇÃO: ZERANDO ESTRUTURAS PRÉ-CADASTRADAS DE STATUS ---
    var defaultMasterLists = {
        // Listas Principais (Limpas)
        setores: [], 
        auditCategorias: [],
        trainCategorias: [],
        ativCategorias: [],
        mantCategorias: [],
        docCategorias: [], 
    
        // Listas de Subcategorias/Itens (Limpas)
        auditSubcats: {},
        trainSubcats: {},
        ativSubcats: {},
        mantItens: {},
        docSubcats: {},
    
        // Listas de Status: ZERADAS (Serão preenchidas via interface/API)
        // Se estiverem vazias, o usuário deve criá-las via modal.
        auditStatus: [], 
        trainStatus: [],
        ativStatus: [], 
        mantStatus: [], 
        docStatus: [], 

        // Listas de Marcadores (objetos { name, color })
        auditMarcadores: [],
        trainMarcadores: [],
        ativMarcadores: [],
        mantMarcadores: [],
        docMarcadores: [],
    
        // Lista de Tipos para Manutenção
        mantTipos: [],
    
        // Lista de Responsáveis
        responsaveis: [],
    
        // O unifiedStatusMap também será removido ou gerado dinamicamente para usar apenas os nomes das listas acima.
    };
    
    var masterLists = JSON.parse(JSON.stringify(defaultMasterLists)); // Clone inicial
    
    var currentTab = 'dashboard'; 
    var editingAuditId = null;
    var editingTrainId = null;
    var editingAtivId = null;
    var editingMantId = null;
    var editingDocId = null; 
    var currentListKey = null; 
    var selectedColorTemp = 'default';
    var currentHistoryPage = 1; // NOVO: Para controle da paginação do histórico
    var currentViewItemId = null;   // ID do item atualmente aberto na visualização
    var currentViewTab = null;      // Aba do item atualmente aberto na visualização
    
    // --- UTILITÁRIOS ---
    var today = () => new Date().toISOString().split('T')[0];
    var currentYear = new Date().getFullYear();
    var currentMonth = new Date().getMonth();
    var formatBR = dateStr => {
        if (!dateStr) return 'ND';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };
    var truncateText = (text, max = 55) => {
        const s = String(text || '');
        if (s.length <= max) return s;
        if (max <= 3) return '.'.repeat(max);
        return s.slice(0, max - 3).trimEnd() + '...';
    };
    var daysDiff = dateStr => {
        if (!dateStr) return Infinity;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return Infinity;
        return Math.ceil((d - new Date()) / (1000*60*60*24));
    };
    
    // Função para limpar responsáveis que não são usuários cadastrados
    function cleanInvalidResponsaveis() {
        // Coleta todos os nomes de usuários cadastrados
        const validUserNames = new Set();
        if (typeof users !== 'undefined') {
            users.forEach(user => {
                if (user.name) validUserNames.add(String(user.name));
            });
        }
        if (masterLists.responsaveis) {
            masterLists.responsaveis.forEach(r => validUserNames.add(String(r)));
        }
        
        const cleanResponsavel = (responsavel) => {
            if (!responsavel) return '';
            try {
                // Se for JSON array, pega o primeiro responsável
                const parsed = JSON.parse(responsavel);
                if (Array.isArray(parsed)) {
                    const firstValid = parsed.find(r => validUserNames.has(String(r)));
                    return firstValid ? String(firstValid) : '';
                }
                return validUserNames.has(String(parsed)) ? String(parsed) : '';
            } catch {
                return validUserNames.has(String(responsavel)) ? String(responsavel) : '';
            }
        };
        
        // Limpa responsáveis em cada tipo de item
        [audits, trainings, activities, documents].forEach(arr => {
            arr.forEach(item => {
                if (item.responsavel) {
                    item.responsavel = cleanResponsavel(item.responsavel);
                }
            });
        });
        
        maintenances.forEach(item => {
            if (item.responsavelTecnico) {
                item.responsavelTecnico = cleanResponsavel(item.responsavelTecnico);
            }
            // responsavelManutencao é campo de texto, não precisa limpar (pode ser qualquer valor)
        });
        
        documents.forEach(item => {
            if (item.responsavel) {
                item.responsavel = cleanResponsavel(item.responsavel);
            }
        });
        
        // Limpa a lista mestre de responsáveis, mantendo apenas usuários válidos
        // COMENTADO: Não filtra responsáveis para garantir que TODOS os usuários apareçam nos modais de edição
        // if (masterLists.responsaveis) {
        //     masterLists.responsaveis = masterLists.responsaveis.filter(r => validUserNames.has(String(r)));
        // }
    }

    function cleanMalformedItems() {
        // Remove itens [object Object] e objetos malformados de todas as listas do masterLists
        const cleanList = (list) => {
            if (!Array.isArray(list)) return list;
            
            return list.filter(item => {
                // Rejeita itens que são [object Object] (strings que resultariam nisso)
                if (item === '[object Object]') return false;
                
                // Rejeita objetos sem propriedades de valor úteis
                if (typeof item === 'object' && item !== null) {
                    // Se é um objeto de status/marcador, verifica se tem 'name'
                    if (item.name !== undefined) return true;
                    // Se é um objeto de soft delete, verifica se tem 'value' e ainda não foi marcado deleted permanentemente
                    if (item.value !== undefined && !item.deleted) return true;
                    // Se tem propriedades úteis (não é totalmente vazio), mantém
                    if (Object.keys(item).length > 0 && !item.deleted) return true;
                    // Se é vazio ou só tem 'deleted', rejeita
                    return false;
                }
                
                // Strings vazias são rejeitadas
                if (typeof item === 'string' && item.trim() === '') return false;
                
                // Mantém itens válidos (strings com conteúdo)
                return true;
            });
        };
        
        // Limpa todas as listas no masterLists
        Object.keys(masterLists).forEach(key => {
            const list = masterLists[key];
            
            if (Array.isArray(list)) {
                // Listas simples
                masterLists[key] = cleanList(list);
            } else if (typeof list === 'object' && list !== null) {
                // Listas aninhadas (como mantItens, auditSubcats, etc)
                Object.keys(list).forEach(subKey => {
                    if (Array.isArray(list[subKey])) {
                        list[subKey] = cleanList(list[subKey]);
                    }
                });
            }
        });
    }
    var isBlankPeriodicity = val => {
        if (val === null || val === undefined) return true;
        const s = String(val).trim();
        if (s === '') return true;
        const n = Number(s);
        return !Number.isFinite(n) || n <= 0;
    };

    // Cards (Manutenção/Documentos):
    // - "Data" = publicação/criação (sempre)
    // - "Próx" = próxima (ou N/A quando periodicidade estiver vazia)
    var getMaintenanceCardDate = item => item?.ultima; // publicação (última manutenção)
    var getMaintenanceDeadlineDate = item => (isBlankPeriodicity(item?.intervalo) ? null : item?.proxima);
    var getDocumentCardDate = item => item?.dataCriacao; // publicação (criação)
    var getDocumentDeadlineDate = item => (isBlankPeriodicity(item?.docIntervalo) ? null : item?.dataProximaRevisao);

    // Normalização de texto (corrige mismatch no mobile por Unicode/acentos)
    // Função auxiliar para normalizar responsável (pode ser string, JSON array, ou null)
    function normalizeResponsavel(responsavel) {
        if (!responsavel) return '';
        try {
            // Tenta fazer parse se for JSON array
            const parsed = JSON.parse(responsavel);
            if (Array.isArray(parsed)) {
                // Pega apenas o primeiro responsável para compatibilidade
                return String(parsed[0] || '').trim().toLowerCase();
            }
            return String(parsed || '').trim().toLowerCase();
        } catch {
            // Se não for JSON, trata como string simples
            return String(responsavel || '').trim().toLowerCase();
        }
    }
    
    function normalizeText(input) {
        let s = (input ?? '').toString();
        // remove zero-width chars comuns em teclado mobile
        s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
        s = s.trim().toLowerCase();
        // normaliza acentos para comparação mais robusta
        try {
            s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (_) {
            // ignore - navegadores antigos
        }
        // colapsa espaços
        s = s.replace(/\s+/g, ' ');
        return s;
    }

    // Busca por título (lupa)
    var titleSearchCardsEnabled = false;
    var titleSearchCardsQuery = '';
    var titleSearchDashEnabled = false;
    var titleSearchDashQuery = '';

    function setTitleSearchEnabled(context, enabled) {
        if (context === 'dash') {
            titleSearchDashEnabled = enabled;
            if (!enabled) {
                titleSearchDashQuery = '';
                const inEl = document.getElementById('dashTitleSearchInput');
                if (inEl) inEl.value = '';
                const dd = document.getElementById('dashTitleSearchDropdown');
                if (dd) dd.style.display = 'none';
            }
            renderDashboard();
        } else {
            titleSearchCardsEnabled = enabled;
            if (!enabled) {
                titleSearchCardsQuery = '';
                const inEl = document.getElementById('titleSearchInput');
                if (inEl) inEl.value = '';
                const dd = document.getElementById('titleSearchDropdown');
                if (dd) dd.style.display = 'none';
            }
            renderCards();
        }
    }

    function toggleTitleSearch(context) {
        const dropdownId = context === 'dash' ? 'dashTitleSearchDropdown' : 'titleSearchDropdown';
        const inputId = context === 'dash' ? 'dashTitleSearchInput' : 'titleSearchInput';
        const dd = document.getElementById(dropdownId);
        if (!dd) return;
        const isOpen = dd.style.display !== 'none';
        if (isOpen) {
            dd.style.display = 'none';
            setTitleSearchEnabled(context, false);
        } else {
            dd.style.display = 'block';
            setTitleSearchEnabled(context, true);
            const inEl = document.getElementById(inputId);
            if (inEl) inEl.focus();
        }
    }

    function onTitleSearchInput(context) {
        const inputId = context === 'dash' ? 'dashTitleSearchInput' : 'titleSearchInput';
        const inEl = document.getElementById(inputId);
        const q = normalizeText(inEl?.value || '');
        if (context === 'dash') {
            titleSearchDashQuery = q;
            if (titleSearchDashEnabled) renderDashboard();
        } else {
            titleSearchCardsQuery = q;
            if (titleSearchCardsEnabled) renderCards();
        }
    }
    
    // --- Dropdown de Filtros (sincroniza com os selects reais das abas) ---
    function toggleFiltersDropdown() {
        const dd = document.getElementById('filtersDropdown');
        if (!dd) return;
        const isOpen = dd.style.display === 'block';
        if (isOpen) {
            dd.style.display = 'none';
        } else {
            populateFiltersDropdown();
            dd.style.display = 'block';
        }
    }

    function populateFiltersDropdown() {
        const map = { 'auditoria':'Audit', 'treinamentos':'Train', 'atividades':'Ativ', 'manutencao':'Mant', 'documentos':'Doc' };
        const prefix = map[currentTab] || 'Audit';

        const ids = {
            setor: `f${prefix}Setor`,
            categoria: `f${prefix}Cat`,
            subcategoria: prefix === 'Mant' ? `f${prefix}Item` : `f${prefix}Sub`,
            marcador: `f${prefix}Marcador`
        };

        // Copia opções e valor dos selects reais para os selects do dropdown
        Object.entries(ids).forEach(([key, realId]) => {
            const realEl = document.getElementById(realId);
            const dropEl = document.getElementById('drop' + (key === 'categoria' ? 'Cat' : (key === 'subcategoria' ? 'Sub' : key.charAt(0).toUpperCase() + key.slice(1))));
            if (!dropEl) return;
            if (realEl) {
                dropEl.innerHTML = realEl.innerHTML;
                try { dropEl.value = realEl.value; } catch(_) { dropEl.selectedIndex = 0; }
            } else {
                dropEl.innerHTML = '<option value="">Nenhuma opção</option>';
                dropEl.value = '';
            }
        });
    }

    function onDropdownFilterChange(type) {
        const map = { 'auditoria':'Audit', 'treinamentos':'Train', 'atividades':'Ativ', 'manutencao':'Mant', 'documentos':'Doc' };
        const prefix = map[currentTab] || 'Audit';

        const realIds = {
            setor: `f${prefix}Setor`,
            categoria: `f${prefix}Cat`,
            subcategoria: prefix === 'Mant' ? `f${prefix}Item` : `f${prefix}Sub`,
            marcador: `f${prefix}Marcador`
        };

        const dropIdMap = { setor: 'dropSetor', categoria: 'dropCat', subcategoria: 'dropSub', marcador: 'dropMarcador' };
        const dropEl = document.getElementById(dropIdMap[type]);
        const realEl = document.getElementById(realIds[type]);
        if (!dropEl || !realEl) return;

        // Atualiza o select real e re-renderiza
        try { realEl.value = dropEl.value; } catch(_) { realEl.selectedIndex = 0; }

        // Se a categoria mudou, atualiza subcategorias reais antes de repopular o dropdown
        if (type === 'categoria') {
            // chama a função de mudança de categoria para reconstruir subcategoria real
            const modalPrefix = prefix.toLowerCase(); // 'audit','ativ','mant','doc'
            try { onCategoryChange(modalPrefix); } catch (_) {}
            // Re-popula o dropdown para refletir novas opções de sub
            populateFiltersDropdown();
        }

        closeFilters();
        saveFiltersToLocalStorage();
        renderCards();
    }
    
    function toggleFiltersDropdownDashboard() {
        const dd = document.getElementById('filtersDropdownDashboard');
        if (!dd) return;
        const isOpen = dd.style.display === 'block';
        if (isOpen) {
            dd.style.display = 'none';
        } else {
            populateFiltersDropdownDashboard();
            dd.style.display = 'block';
        }
    }

    function populateFiltersDropdownDashboard() {
        const ids = {
            setor: 'fDashSetor',
            categoria: 'fDashCat'
        };

        const dropIds = {
            setor: 'dropDashSetor',
            categoria: 'dropDashCat'
        };

        // Copia opções e valor dos selects reais para os selects do dropdown
        Object.entries(ids).forEach(([key, realId]) => {
            const realEl = document.getElementById(realId);
            const dropEl = document.getElementById(dropIds[key]);
            if (!dropEl) return;
            if (realEl) {
                dropEl.innerHTML = realEl.innerHTML;
                try { dropEl.value = realEl.value; } catch(_) { dropEl.selectedIndex = 0; }
            } else {
                dropEl.innerHTML = '<option value="">Nenhuma opção</option>';
                dropEl.value = '';
            }
        });
    }

    function onDropdownFilterChangeDashboard(type) {
        const realIds = {
            setor: 'fDashSetor',
            categoria: 'fDashCat'
        };

        const dropIdMap = { setor: 'dropDashSetor', categoria: 'dropDashCat' };
        const dropEl = document.getElementById(dropIdMap[type]);
        const realEl = document.getElementById(realIds[type]);
        if (!dropEl || !realEl) return;

        try { realEl.value = dropEl.value; } catch(_) { realEl.selectedIndex = 0; }

        if (type === 'categoria') {
            populateFiltersDropdownDashboard();
        }

        closeFilters();
        onFilterDashboardChange();
    }

    function updateDashboardSubcategorias() {
        const fDashArea = document.getElementById('fDashArea')?.value || '';
        const fDashCat = document.getElementById('fDashCat')?.value || '';
        const fDashSub = document.getElementById('fDashSub');
        if (!fDashSub) return;

        // Limpa subcategorias
        fDashSub.innerHTML = '<option value="">Subcategoria: Todas</option>';

        if (!fDashCat) return;

        // Baseado no tipo de área, obtém as subcategorias
        let subcategories = [];
        
        // Se temos a área definida, filtra por ela
        if (fDashArea === 'mant') {
            // Para manutenção, mostra itens
            subcategories = (masterLists.mantItens || []).filter(s => s.categoria === fDashCat);
        } else {
            // Para outras áreas, mostra subcategorias
            subcategories = (masterLists.subcategorias || []).filter(s => s.categoria === fDashCat);
        }

        subcategories.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.subcategoria || sub.item || '';
            opt.textContent = sub.subcategoria || sub.item || '';
            fDashSub.appendChild(opt);
        });
    }
    
    var colorMap = {
        'blue': 'var(--c-blue)',
        'green': 'var(--c-green)',
        'red': 'var(--c-red)',
        'orange': 'var(--c-orange)',
        'yellow': 'var(--c-yellow)',
        'purple': 'var(--c-purple)',
        'default': 'var(--c-default)'
    };

    // NOVO: Dicionário para mapear chaves de objeto para nomes de exibição
    var fieldnames = {
        // Auditoria
        auditTitulo: 'Título', auditDescricao: 'Descrição', auditSetor: 'Setor', auditCategoria: 'Categoria',
        auditSub: 'Subcategoria', auditStatus: 'Status', auditDataPublicacao: 'Data Publicação',
        auditDataPrevisao: 'Data Previsão', auditResponsavel: 'Responsável', auditAuditor: 'Auditor', auditFlagDias: 'Alerta (Dias)',
        auditMarcador: 'Marcador',
        
        // Atividades
        ativTitulo: 'Título', ativDescricao: 'Descrição', ativSetor: 'Setor', ativCategoria: 'Categoria',
        ativSub: 'Subcategoria', ativStatus: 'Status', ativDataInicio: 'Data Início',
        ativDataConclusao: 'Data Conclusão', ativResponsavel: 'Responsável', ativFlagDias: 'Alerta (Dias)',
        ativMarcador: 'Marcador',
        
        // Manutenção
        mantTitulo: 'Título', mantDescricao: 'Descrição', mantSetor: 'Setor', mantCategoria: 'Categoria',
        mantItem: 'Item/Equipamento', mantTipo: 'Tipo', mantUltima: 'Última Manutenção', mantIntervalo: 'Periodicidade (Dias)',
        mantResponsavelTecnico: 'Responsável Técnico', mantResponsavelManutencao: 'Responsável Manutenção',
        mantStatus: 'Status', mantFlagDias: 'Alerta (Dias)', mantProxima: 'Próxima Manutenção',
        mantMarcador: 'Marcador',
        
        // Documentos
        docTitulo: 'Título', docDescricao: 'Descrição', docSetor: 'Setor', docCategoria: 'Categoria',
        docSub: 'Subcategoria', docStatus: 'Status', docDataCriacao: 'Data do Documento',
        docIntervalo: 'Periodicidade (Dias)', docResponsavel: 'Responsável', docRevisor: 'Revisor',
        docFlagDias: 'Alerta (Dias)', docProximaRevisao: 'Próxima Revisão',
        docMarcador: 'Marcador',

        // Anexos (Não é uma propriedade direta, mas ajuda a exibir a mudança)
        anexos: 'Anexos'
    };

    // NOVO: Função para calcular e formatar as mudanças
    function calculateChanges(original, current) {
    var changes = [];
    var silentChanged = false; 
    
    // Lista de chaves técnicas que não devem gerar log de texto, mas disparam o salvamento
    var ignoreKeys = ['id', 'historico', 'type', 'proxima', 'dataProximaRevisao', 'anexos', 'marcadorCor'];
    
    var fieldOrder = [
        'titulo', 'descricao', 'setor', 'categoria', 'subcategoria', 
        'item', 'tipo', 'status', 'dataPublicacao', 'dataPrevisao', 
        'dataInicio', 'dataConclusao', 'ultima', 'intervalo', 
        'dataCriacao', 'docIntervalo', 'responsavel', 'auditor', 
        'responsavelTecnico', 'responsavelManutencao', 'revisor', 
        'flagDias', 'marcador'
    ];

    // Mapeamento de chaves do objeto para nomes legíveis
    var displayNames = {
        titulo: 'Título', 
        descricao: 'Descrição', 
        setor: 'Setor', 
        categoria: 'Categoria',
        subcategoria: 'Subcategoria', 
        item: 'Equipamento', 
        status: 'Status', 
        dataPublicacao: 'Data Publicação', 
        dataPrevisao: 'Data Previsão', 
        responsavel: 'Responsável', 
        auditor: 'Auditor', 
        flagDias: 'Alerta (Dias)',
        dataInicio: 'Data Início', 
        dataConclusao: 'Data Conclusão',
        ultima: 'Última Manutenção', 
        intervalo: 'Periodicidade', 
        tipo: 'Tipo',
        responsavelTecnico: 'Resp. Técnico', 
        responsavelManutencao: 'Resp. Manutenção',
        dataCriacao: 'Data do Documento', 
        docIntervalo: 'Periodicidade', 
        revisor: 'Revisor',
        marcador: 'Marcador'
    };

    // Itera sobre todas as chaves do objeto atual
    for (const key in current) {
        if (ignoreKeys.includes(key)) continue;

        // Normalização para comparação (trata null/undefined/'' como string vazia)
        let valOriginal = original && original[key] !== undefined && original[key] !== null && original[key] !== '' ? String(original[key]).trim() : '';
        let valCurrent = current[key] !== undefined && current[key] !== null && current[key] !== '' ? String(current[key]).trim() : '';

        if (valOriginal !== valCurrent) {
            // Se mudou status ou marcador, consideramos "mudança silenciosa" (salva mas não detalha se for só isso)
            if (key === 'status' || key === 'marcador') {
                silentChanged = true;
            }

            const label = displayNames[key] || key;
            
            // Formatação de datas para o histórico ficar legível
            let displayOrig = valOriginal;
            let displayCurr = valCurrent;

            if (key.toLowerCase().includes('data') || key === 'ultima' || key === 'proxima') {
                displayOrig = (original[key] !== undefined && original[key] !== null && original[key] !== '') ? formatBR(original[key]) : 'vazio';
                displayCurr = (current[key] !== undefined && current[key] !== null && current[key] !== '') ? formatBR(current[key]) : 'vazio';
            }

            if (key === 'descricao') {
                const descHtml = `
                    <div style="margin-top:4px;">
                        <strong>Descrição antiga:</strong><br>
                        <div style="margin-left:10px; margin-top:2px; color:#ff6868;">${valOriginal.replace(/\n/g, '<br>') || '(vazio)'}</div>
                    </div>
                    <div style="margin-top:4px;">
                        <strong>Descrição nova:</strong><br>
                        <div style="margin-left:10px; margin-top:2px; color:#059669;">${valCurrent.replace(/\n/g, '<br>') || '(vazio)'}</div>
                    </div>
                `.trim();
                changes.push(descHtml);
            } else {
                // Outros campos (Título, Setor, etc)
                const label = displayNames[key] || key;
                let displayOrig = valOriginal;
                let displayCurr = valCurrent;

                if (key.toLowerCase().includes('data') || key === 'ultima') {
                    displayOrig = original[key] ? formatBR(original[key]) : 'vazio';
                    displayCurr = current[key] ? formatBR(current[key]) : 'vazio';
                }

                changes.push(`${label}: <strong>${displayOrig || 'vazio'}</strong> &rarr; <strong>${displayCurr || 'vazio'}</strong>`);
            }
        }
    }

    // Verificação de anexos
    var origAnexos = original.anexos || [];
    var currAnexos = current.anexos || [];
    if (JSON.stringify(origAnexos) !== JSON.stringify(currAnexos)) {
        const added = currAnexos.filter(a => !origAnexos.some(o => (o.titulo || o.name || '') === (a.titulo || a.name || '') && (o.url || '') === (a.url || '')));
        const removed = origAnexos.filter(o => !currAnexos.some(a => (a.titulo || a.name || '') === (o.titulo || o.name || '') && (a.url || '') === (o.url || '')));
        if (added.length > 0 || removed.length > 0) {
            let anexoDetails = [];
            if (added.length > 0) {
                anexoDetails.push(`<strong>Anexos adicionados:</strong><br>${added.map(a => `<a href="${a.url || '#'}" target="_blank">${a.titulo || a.name || 'Anexo'}</a>`).join('<br>')}`);
            }
            if (removed.length > 0) {
                anexoDetails.push(`<strong>Anexos removidos:</strong><br>${removed.map(a => `${a.titulo || a.name || 'Anexo'}`).join('<br>')}`);
            }
            changes.push(anexoDetails.join('<br>'));
        } else {
            silentChanged = true; // if only order changed or other differences
        }
    }
    
    // Adiciona propriedade auxiliar para controle do fluxo de salvamento
    changes.silentChanged = silentChanged;
    return changes;
}


    
    // --- PROTEÇÃO DE SINCRONIZAÇÃO FORÇADA ---
    function forceFirebaseSync() {
        console.log('Iniciando sincronização forçada com Firebase...');
        try {
            // Limpa todos os dados cacheados exceto filtros
            Object.keys(CACHE_KEYS).forEach(key => {
                if (key !== 'filters' && key !== 'lastSync') {
                    localStorage.removeItem(CACHE_KEYS[key]);
                }
            });
            
            // Reseta variáveis globais para forçar recarga completa
            audits = [];
            trainings = [];
            activities = [];
            maintenances = [];
            documents = [];
            users = [];
            masterLists = JSON.parse(JSON.stringify(defaultMasterLists));
            
            // Força recarga dos dados do Firebase
            loadCloudData();
            
            console.log('Sincronização forçada iniciada. Dados locais limpos.');
        } catch (error) {
            console.error('Erro na sincronização forçada:', error);
        }
    }

    // --- INTEGRAÇÃO FIREBASE (DATA) ---
    
    async function loadCloudData() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbGet = getFirebaseGet();
            
            // Busca a raiz do banco (ou o nó onde os dados residem)
            const dataRef = dbRef(database, "/"); 
            const snapshot = await dbGet(dataRef);
            
            if (!snapshot.exists()) {
                // PROTEÇÃO: Firebase vazio - não carrega do localStorage
                // Inicia com dados vazios para forçar sincronização limpa
                console.log('Firebase está vazio. Iniciando com dados vazios para sincronização limpa...');
                audits = [];
                trainings = [];
                activities = [];
                maintenances = [];
                documents = [];
                masterLists = JSON.parse(JSON.stringify(defaultMasterLists));
            } else {
                const record = snapshot.val();
                
                // Mapeamento direto das chaves do seu JSON
                audits = record.audits || [];
                trainings = record.trainings || [];
                activities = record.activities || [];
                maintenances = record.maintenances || [];
                documents = record.documents || []; 
                
                if (record.masterLists) {
                    masterLists = { ...defaultMasterLists, ...record.masterLists };
                    // Correção para garantir que itens de manutenção não sejam resetados
                    if (Array.isArray(masterLists.mantItens) && masterLists.mantItens.length === 0) {
                        masterLists.mantItens = defaultMasterLists.mantItens; 
                    }
                }
                
                // Atualiza o cache local com os dados do Firebase
                saveToLocalStorage('audits', audits);
                saveToLocalStorage('trainings', trainings);
                saveToLocalStorage('activities', activities);
                saveToLocalStorage('maintenances', maintenances);
                saveToLocalStorage('documents', documents);
                saveToLocalStorage('masterLists', masterLists);
            }
            
            // Garante integridade do histórico para cada item
            [audits, trainings, activities, maintenances, documents].forEach(array => {
                array.forEach(item => item.historico = item.historico || []);
            });
            
            // Carrega usuários (necessário para populateSelects funcionar corretamente)
            await loadusers();
            
            // Limpa responsáveis inválidos após carregar os dados
            cleanInvalidResponsaveis();

            populateYearSelects();
            populateSelects();          
            
            // Restaura os filtros salvos após popular os selects
            restoreFiltersFromLocalStorage();
            
            // Atualiza a interface baseada na aba atual
            if (currentTab === 'dashboard') {
                renderDashboard();
            } else {
                renderCards();
            }
            
            // Inicia o monitoramento em tempo real
            startFirebaseListener();

        } catch (err) {
            console.error("Erro ao carregar dados do Firebase:", err);
            
            // PROTEÇÃO: Não usa fallback do localStorage
            // Inicia com dados vazios e aguarda sincronização
            console.log('Erro no Firebase. Iniciando com dados vazios até sincronização...');
            audits = [];
            trainings = [];
            activities = [];
            maintenances = [];
            documents = [];
            masterLists = JSON.parse(JSON.stringify(defaultMasterLists));
            
            cleanInvalidResponsaveis();
            populateYearSelects();
            populateSelects();
            
            // Restaura os filtros salvos após popular os selects
            restoreFiltersFromLocalStorage();
            
            if (currentTab === 'dashboard') {
                renderDashboard();
            } else {
                renderCards();
            }
            // Não exibe alerta visual para o usuário, apenas log no console
            console.error("Falha ao carregar dados do Firebase. Aguardando sincronização...");
        }
        switchTab('dashboard');
    }

    function isEditingModalOpen() {
        const ids = [
            'modalAuditoria',
            'modalAtividades',
            'modalManutencao',
            'modalDocumentos',
            'modalListManager'
        ];
        return ids.some(id => {
            const el = document.getElementById(id);
            return el && getComputedStyle(el).display !== 'none';
        });
    }

    // Listener em tempo real do Firebase (substitui o buffer)
    function startFirebaseListener() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbOnValue = getFirebaseOnValue();
            
            if (!currentuser) return;
            
            // Monitora as mudanças gerais no banco
            const dataRef = dbRef(database, "/");
            
            if (dataListener) return; // Evita duplicidade

            dataListener = dbOnValue(dataRef, (snapshot) => {
                if (isEditingModalOpen() || !snapshot.exists()) return;
                
                const record = snapshot.val();
                
                // NOVO: Compara com dados em memória antes de atualizar
                const hasChanges = 
                    JSON.stringify(record.audits) !== JSON.stringify(audits) ||
                    JSON.stringify(record.trainings) !== JSON.stringify(trainings) ||
                    JSON.stringify(record.activities) !== JSON.stringify(activities) ||
                    JSON.stringify(record.maintenances) !== JSON.stringify(maintenances) ||
                    JSON.stringify(record.documents) !== JSON.stringify(documents) ||
                    JSON.stringify(record.masterLists) !== JSON.stringify(masterLists);
                
                if (!hasChanges) {
                    console.log('Nenhuma mudança detectada no Firebase');
                    return;
                }
                
                console.log('Atualizações detectadas no Firebase. Sincronizando...');
                
                audits = record.audits || [];
                trainings = record.trainings || [];
                activities = record.activities || [];
                maintenances = record.maintenances || [];
                documents = record.documents || [];
                
                if (record.masterLists) {
                    masterLists = { ...defaultMasterLists, ...record.masterLists };
                }
                // Atualiza cache local com os dados carregados inicialmente
                saveToLocalStorage('audits', audits);
                saveToLocalStorage('trainings', trainings);
                saveToLocalStorage('activities', activities);
                saveToLocalStorage('maintenances', maintenances);
                saveToLocalStorage('documents', documents);
                saveToLocalStorage('masterLists', masterLists);
                
                // NOVO: Atualiza o cache local após receber mudanças do Firebase
                saveToLocalStorage('audits', audits);
                saveToLocalStorage('trainings', trainings);
                saveToLocalStorage('users', users);
                saveToLocalStorage('activities', activities);
                saveToLocalStorage('maintenances', maintenances);
                saveToLocalStorage('documents', documents);
                saveToLocalStorage('masterLists', masterLists);

                populateSelects();
                currentTab === 'dashboard' ? renderDashboard() : renderCards();
            });

            // Listener separado para usuários (que estão na referência 'passwords')
            const usersRef = dbRef(database, 'passwords');
            if (!usersListener) {
                usersListener = dbOnValue(usersRef, (snapshot) => {
                    if (isEditingModalOpen()) return;
                    
                    let rawUsers = [];
                    if (snapshot.exists()) {
                        rawUsers = snapshot.val();
                        if (!Array.isArray(rawUsers)) rawUsers = [];
                    }
                    
                    // Mapeia os dados garantindo a consistência das flags
                    const newUsers = rawUsers.map(u => ({
                        ...u,
                        name: u.name || u.Name || u.user || '',
                        user: u.user || u.User || '',
                        password: String(u.password || ''),
                        active: u.active !== false,
                        canDeleteCards: !!u.canDeleteCards,
                        canEditCards: u.canEditCards !== false,
                        canManageLists: !!u.canManageLists,
                        isAdmin: !!u.isAdmin || u.user === 'admin'
                    }));
                    
                    // Só atualiza se houve mudanças reais
                    if (JSON.stringify(newUsers) !== JSON.stringify(users)) {
                        console.log('Usuários atualizados no Firebase');
                        users = newUsers;
                        saveToLocalStorage('users', users);
                        
                        // Se estamos na aba de configurações, atualiza a tabela
                        if (currentTab === 'configuracoes') {
                            renderusersConfigTable();
                        }
                        
                        // Atualiza os usuários no multi-select
                        initMultiSelectUsers();
                        
                        // IMPORTANTE: Atualiza os selects de responsável e revisor nos modais
                        populateSelects();
                    }
                });
            }
        } catch (error) {
            console.error('Erro no listener:', error);
        }
    }

    function stopFirebaseListener() {
        try {
            if (dataListener) {
                const database = getFirebaseDatabase();
                const dbRef = getFirebaseRef();
                const dbOff = getFirebaseOff();
                const dataRef = dbRef(database, "/");
                dbOff(dataRef, dataListener);
                dataListener = null;
            }
            if (usersListener) {
                const database = getFirebaseDatabase();
                const dbRef = getFirebaseRef();
                const dbOff = getFirebaseOff();
                const usersRef = dbRef(database, 'passwords');
                dbOff(usersRef, usersListener);
                usersListener = null;
            }
        } catch (error) {
            console.error('Erro ao parar listener do Firebase:', error);
        }
    }
    
    async function saveAll(showAlert = false) {
    try {
        const database = getFirebaseDatabase();
        const dbRef = getFirebaseRef();
        const { update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        // 1. Limpeza de responsáveis inválidos (que não são usuários cadastrados)
        cleanInvalidResponsaveis();
        
        // 2. Limpeza de itens malformados [object Object] das listas
        cleanMalformedItems();

        // 3. Limpeza de Histórico para Performance (Evita lentidão no carregamento)
        const maxHistoryItems = 150;
        const dataArrays = [audits, trainings, activities, maintenances, documents];
        dataArrays.forEach(arr => {
            arr.forEach(item => {
                if (item.historico && item.historico.length > maxHistoryItems) {
                    item.historico = item.historico.slice(-maxHistoryItems);
                }
            });
        });

        // 4. Preparação do Objeto de Atualização Atômica
        const updates = {};
        updates['/audits'] = audits;
        updates['/trainings'] = trainings;
        updates['/activities'] = activities;
        updates['/maintenances'] = maintenances;
        updates['/documents'] = documents;
        updates['/masterLists'] = masterLists;
        updates['/lastUpdate'] = new Date().toISOString();

        // 5. Execução do Update na Raiz (Preserva o nó /passwords)
        const rootRef = dbRef(database, "/");
        await update(rootRef, updates);
        
        // 6. NOVO: Atualizar localStorage APENAS se o Firebase foi bem-sucedido
        console.log('Sincronização com Firebase bem-sucedida. Atualizando cache local...');
        saveToLocalStorage('audits', audits);
        saveToLocalStorage('trainings', trainings);
        saveToLocalStorage('activities', activities);
        saveToLocalStorage('maintenances', maintenances);
        saveToLocalStorage('documents', documents);
        saveToLocalStorage('masterLists', masterLists);
        
        if (showAlert) alert("Dados sincronizados com sucesso!");
        
        // Nota: O renderDashboard/Cards ocorrerá via Listener (onValue)
    } catch (err) {
        console.error("Erro na sincronização com Firebase:", err);
        
        // PROTEÇÃO: Não salva no localStorage em caso de falha
        // Apenas registra o erro no console, sem salvar localmente
        console.error('Falha na sincronização com Firebase. Dados não foram salvos localmente para manter consistência.');
        
        if (showAlert) {
            // Não exibe alerta visual para o usuário conforme solicitado
            // Apenas log no console para debugging
            console.error("❌ Erro ao sincronizar dados com Firebase:", err.message);
        }
    }
}

    // NOVO: Função para obter o statusType dinamicamente
    function getStatusType(statusname) {
        const finalizadoKeywords = ['concluído', 'finalizado', 'publicado'];
        const inativoKeywords = ['cancelado', 'obsoleto'];
        const nameLower = statusname.toLowerCase();
        
        if (finalizadoKeywords.includes(nameLower)) return 'finalizado';
        if (inativoKeywords.includes(nameLower)) return 'inativo';
        
        // Qualquer outro status é considerado ativo para fins de G1 e G3
        return 'ativo';
    }

    function normalizeStatusName(name) {
        return String(name || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }

    function isStatusCancelled(name) {
        return normalizeStatusName(name) === 'cancelado';
    }

    function isStatusStandby(name) {
        const n = normalizeStatusName(name);
        return n === 'standby' || n === 'stand by';
    }
    
    // NOVO: Função para obter a cor de um status específico (agora a cor é pega da lista mestra dinâmica)
    function getStatusColor(statusname, category) {
        let list;
        if (category === 'audit') list = masterLists.auditStatus;
        else if (category === 'ativ') list = masterLists.ativStatus;
        else if (category === 'mant') list = masterLists.mantStatus;
        else if (category === 'doc') list = masterLists.docStatus;
        
        const statusObj = (list || []).find(s => s.name === statusname);
        return statusObj ? statusObj.color : 'default';
    }
    
    
    function calculateDashboardData() {
        
        // --- OBTENÇÃO DOS VALORES DE FILTRO ---
        const fArea = document.getElementById('fDashArea').value; 
        const fSetor = document.getElementById('fDashSetor').value;
        const fCat = document.getElementById('fDashCat')?.value || '';
        const fStatus = document.getElementById('fDashStatus').value;
        const fResponsavel = document.getElementById('fDashResponsavel').value;
        const fRevisor = document.getElementById('fDashRevisor').value;
        const fDateType = document.getElementById('fDashDateType').value;
        const fMonth = parseInt(document.getElementById('fDashMonth').value);
        const fYearForMonth = parseInt(document.getElementById('fDashYearForMonth').value);
        const fYearOnly = parseInt(document.getElementById('fDashYearOnly').value);
        const fYear = (fDateType === 'year') ? fYearOnly : fYearForMonth;
        const fDataIni = document.getElementById('fDashDataIni').value;
        const fDataFim = document.getElementById('fDashDataFim').value;
        const fTitleQuery = titleSearchDashEnabled ? titleSearchDashQuery : '';
        
        // Obtém as abas que o usuário tem permissão
        const allowedTabs = userAllowedTabs();
        const areaMapping = {
            'audit': 'auditoria',
            'ativ': 'atividades',
            'mant': 'manutencao',
            'doc': 'documentos'
        };
    
        // Constrói uma lista completa de todos os itens com metadados unificados
        // Filtra apenas dados das abas que o usuário tem permissão
        let rawItems = [];
        
        if (!allowedTabs || allowedTabs.includes('auditoria')) {
            rawItems = rawItems.concat(
                audits.map(a => ({ ...a, type: 'audit', statusType: getStatusType(a.status), dateField: a.dataPublicacao, deadlineField: a.dataPrevisao, color: getStatusColor(a.status, 'audit') }))
            );
        }
        if (!allowedTabs || allowedTabs.includes('atividades')) {
            rawItems = rawItems.concat(
                activities.map(a => ({ ...a, type: 'ativ', statusType: getStatusType(a.status), dateField: a.dataInicio, deadlineField: a.dataConclusao, color: getStatusColor(a.status, 'ativ') }))
            );
        }
        if (!allowedTabs || allowedTabs.includes('manutencao')) {
            rawItems = rawItems.concat(
                maintenances.map(m => ({ ...m, type: 'mant', statusType: getStatusType(m.status), dateField: m.ultima, deadlineField: isBlankPeriodicity(m.intervalo) ? null : m.proxima, color: getStatusColor(m.status, 'mant') }))
            );
        }
        if (!allowedTabs || allowedTabs.includes('documentos')) {
            rawItems = rawItems.concat(
                documents.map(d => ({ ...d, type: 'doc', statusType: getStatusType(d.status), dateField: d.dataCriacao, deadlineField: isBlankPeriodicity(d.docIntervalo) ? null : d.dataProximaRevisao, color: getStatusColor(d.status, 'doc') }))
            );
        }
        
        // SOFT DELETE: Filtrar itens deletados do dashboard
        rawItems = rawItems.filter(item => !item.deleted);
        
        // Aplicar filtro de permissões de setores
        const allowedSetores = getAllowedSetores();
        if (allowedSetores !== null) {
            rawItems = rawItems.filter(item => allowedSetores.includes(item.setor));
        }
        
        // --- FILTRAGEM ---
        let filteredItems = rawItems.filter(item => {
            
            // 1. Filtro por Área/Aba
            if (fArea && item.type !== fArea) return false;
    
            // 2. Filtro por Setor
            const itemSetor = item.setor || 'Setor Não Definido';
            if (fSetor && itemSetor !== fSetor) return false;
    
            // 2.1. Filtro por Categoria
            if (fCat && item.categoria !== fCat) return false;
    
            // 3. Filtro por Status Consolidado
            if (fStatus && item.status !== fStatus) return false;

            // 3.2 Filtro por Responsável
            if (fResponsavel) {
                let itemResponsavel = '';
                if (item.type === 'mant') {
                    itemResponsavel = item.responsavelTecnico || item.responsavelManutencao || '';
                } else {
                    itemResponsavel = item.responsavel || '';
                }
                if (!itemResponsavel || !itemResponsavel.includes(fResponsavel)) return false;
            }

            // 3.3 Filtro por Revisor
            if (fRevisor) {
                const itemRevisor = item.revisor || '';
                if (!itemRevisor || !itemRevisor.includes(fRevisor)) return false;
            }

            // 3.1 Filtro por Título (lupa)
            if (fTitleQuery) {
                const t = normalizeText(item.titulo || '');
                if (!t.includes(fTitleQuery)) return false;
            }
    
            // 4. Filtro por Período de Publicação/Criação (dateField)
            if (fDateType !== 'all') {
                const date = item.dateField;
                if (!date) return false;
                
                const itemDate = new Date(date);
    
                if (fDateType === 'month') {
                    if (itemDate.getMonth() !== fMonth || itemDate.getFullYear() !== fYear) return false;
                } else if (fDateType === 'year') {
                    if (itemDate.getFullYear() !== fYear) return false;
                } else if (fDateType === 'custom') {
                    if (fDataIni && date < fDataIni) return false;
                    if (fDataFim && date > fDataFim) return false;
                }
            }
            return true;
        });
    
        // --- CÁLCULOS E AGRUPAMENTOS ---
        const totalCount = filteredItems.length;
        
        const activeItems = filteredItems.filter(item => item.statusType === 'ativo');
        const activeCount = activeItems.length;
    
        const completedCount = filteredItems.filter(item => item.statusType === 'finalizado').length;
        const cancelledCount = filteredItems.filter(item => isStatusCancelled(item.status)).length;
        const standbyCount = filteredItems.filter(item => isStatusStandby(item.status)).length;
        
        const activeItemsWithDeadline = activeItems.filter(item => !!item.deadlineField);
        const activeDeadlineCount = activeItemsWithDeadline.length;

        const overdueCount = activeItemsWithDeadline.filter(item => {
            const d = daysDiff(item.deadlineField);
            return d < 0;
        }).length;
    
        // G1: Status Consolidado
        const statusCounts = {};
        activeItems.forEach(item => {
            const key = `${item.status} (${item.type.toUpperCase()})`;
            statusCounts[key] = {
                count: (statusCounts[key]?.count || 0) + 1,
                color: item.color,
                type: item.type.toUpperCase()
            };
        });
    
        // G2: Distribuição por Setor
        const setorCounts = {};
        activeItems.forEach(item => {
            const setor = item.setor || 'Setor Não Definido';
            setorCounts[setor] = (setorCounts[setor] || 0) + 1;
        });
    
        // G3: Alerta de Prazos
        const prazoCounts = {
            atrasados: { count: 0, color: 'var(--ind-red)', percent: 0 },
            criticos: { count: 0, color: 'var(--ind-yellow)', percent: 0 },
            curtoPrazo: { count: 0, color: 'var(--c-orange)', percent: 0 },
            medioPrazo: { count: 0, color: 'var(--c-blue)', percent: 0 },
            longoPrazo: { count: 0, color: 'var(--ind-green)', percent: 0 }
        };
    
        activeItemsWithDeadline.forEach(item => {
            const d = daysDiff(item.deadlineField);
            if (d < 0) prazoCounts.atrasados.count++;
            else if (d <= 7) prazoCounts.criticos.count++;
            else if (d <= 30) prazoCounts.curtoPrazo.count++;
            else if (d <= 90) prazoCounts.medioPrazo.count++;
            else prazoCounts.longoPrazo.count++;
        });
        
        // Calcula porcentagens para G3 (baseado apenas nos itens ativos)
        Object.keys(prazoCounts).forEach(key => {
            prazoCounts[key].percent = activeDeadlineCount > 0 ? (prazoCounts[key].count / activeDeadlineCount) * 100 : 0;
        });
    
        return { totalCount, activeCount, completedCount, cancelledCount, standbyCount, overdueCount, statusCounts, setorCounts, prazoCounts };
    }
    
    function renderDashboard() {
        // Atualiza os filtros para mostrar apenas opções com dados disponíveis
        updateDashboardFilterOptions();
        
        const { totalCount, activeCount, completedCount, cancelledCount, standbyCount, overdueCount, statusCounts, setorCounts, prazoCounts } = calculateDashboardData();
        
        // --- Cartões de Resumo ---
        document.getElementById('summaryTotalCount').textContent = totalCount;
        document.getElementById('summaryActiveCount').textContent = activeCount;
        document.getElementById('summaryCompletedCount').textContent = completedCount;
        document.getElementById('summaryCancelledCount').textContent = cancelledCount;
        document.getElementById('summaryOverdueCount').textContent = overdueCount;
    
        // --- G1: Status Consolidado ---
        const listStatusConsolidado = document.getElementById('chartStatusConsolidado');
        listStatusConsolidado.innerHTML = '';
        
        // Ordena os status ativos por contagem
        const sortedStatus = Object.entries(statusCounts).sort(([, a], [, b]) => b.count - a.count);
    
        sortedStatus.forEach(([statusKey, data]) => {
            const count = data.count;
            const percentage = activeCount > 0 ? ((count / activeCount) * 100) : 0;
            const percentageFixed = percentage.toFixed(1);
            const colorVar = colorMap[data.color] || colorMap['default'];
            
            listStatusConsolidado.innerHTML += `
                <li>
                    <div class="chart-list-header">
                        <span class="status-info">
                            <span class="color-dot" style="background-color:${colorVar}"></span>
                            ${statusKey}
                        </span>
                        <div>
                            <span class="value">${count}</span>
                            <span class="percent">(${percentageFixed}%)</span>
                        </div>
                    </div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width:${percentage}%; background-color:${colorVar}"></div>
                    </div>
                </li>
            `;
        });
        if (listStatusConsolidado.innerHTML === '') {
            listStatusConsolidado.innerHTML = '<li style="text-align:center; padding:20px; flex-direction:row; justify-content:center; border-bottom:none;">Nenhum item ativo encontrado com os filtros atuais.</li>';
        }
    
        // --- G2: Distribuição por Setor ---
        const listDistribuicaoSetor = document.getElementById('chartDistribuicaoSetor');
        listDistribuicaoSetor.innerHTML = '';
        
        const sortedSetores = Object.entries(setorCounts).sort(([, a], [, b]) => b - a);
    
        sortedSetores.forEach(([setor, count]) => {
            const percentage = activeCount > 0 ? ((count / activeCount) * 100) : 0;
            const percentageFixed = percentage.toFixed(1);
            const colorVar = colorMap['default'];
            
            listDistribuicaoSetor.innerHTML += `
                <li>
                    <div class="chart-list-header">
                        <span class="status-info"><i class="fas fa-building" style="margin-right:8px; color:${colorVar}"></i>${setor}</span>
                        <div>
                            <span class="value">${count}</span>
                            <span class="percent">(${percentageFixed}%)</span>
                        </div>
                    </div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width:${percentage}%; background-color:var(--accent)"></div>
                    </div>
                </li>
            `;
        });
        if (listDistribuicaoSetor.innerHTML === '') {
            listDistribuicaoSetor.innerHTML = '<li style="text-align:center; padding:20px; flex-direction:row; justify-content:center; border-bottom:none;">Nenhum item ativo encontrado com os filtros atuais.</li>';
        }
    
    
        // --- G3: Alerta de Prazos ---
        const listAlertaPrazos = document.getElementById('chartAlertaPrazos');
        
        const prazoData = [
            { label: 'Atrasados (Vencidos)', key: 'atrasados', icon: 'fas fa-exclamation-circle' },
            { label: 'Críticos (0 a 7 dias)', key: 'criticos', icon: 'fas fa-exclamation-triangle' },
            { label: 'Curto Prazo (8 a 30 dias)', key: 'curtoPrazo', icon: 'fas fa-hourglass-start' },
            { label: 'Médio Prazo (31 a 90 dias)', key: 'medioPrazo', icon: 'fas fa-clock' },
            { label: 'Longo Prazo (> 90 dias)', key: 'longoPrazo', icon: 'fas fa-check-circle' }
        ];

        listAlertaPrazos.innerHTML = prazoData.map(item => {
            const data = prazoCounts[item.key];
            const count = data.count;
            const percentage = data.percent;
            const percentageFixed = percentage.toFixed(1);
            const color = data.color;
            const barColor = item.key === 'atrasados' ? 'var(--ind-red)' : (item.key === 'criticos' ? 'var(--ind-yellow)' : 'var(--c-blue)');

            return `
                <li>
                    <div class="chart-list-header">
                        <span class="status-info"><i class="${item.icon}" style="margin-right:8px; color:${color}"></i> ${item.label}</span>
                        <div>
                            <span class="deadline-info" style="color:${color}">${count}</span>
                            <span class="percent">(${percentageFixed}%)</span>
                        </div>
                    </div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width:${percentage}%; background-color:${barColor}"></div>
                    </div>
                </li>
            `;
        }).join('');
    
        if (activeCount === 0) {
            listAlertaPrazos.innerHTML = '<li style="text-align:center; padding:20px; flex-direction:row; justify-content:center; border-bottom:none;">Nenhum item ativo para análise de prazos com os filtros atuais.</li>';
        }
        
        // Atualiza contador de notificações
        updateNotificationCount();
    }
    
    
    // --- CONFIGURAÇÃO DE DATAS ---
    function populateYearSelects() {
        const years = [];
        for(let i = currentYear - 4; i <= currentYear + 1; i++) {
            years.push(i);
        }
        const options = years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('');
        
        ['fAuditYearForMonth', 'fAuditYearOnly', 'fAtivYearForMonth', 'fAtivYearOnly', 'fMantYearForMonth', 'fMantYearOnly', 'fDocYearForMonth', 'fDocYearOnly', 'fTrainYearForMonth', 'fTrainYearOnly', 'fDashYearForMonth', 'fDashYearOnly'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = options;
        });
    
        ['fAuditMonth', 'fAtivMonth', 'fMantMonth', 'fDocMonth', 'fTrainMonth', 'fDashMonth'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = currentMonth;
        });
    }
    
    function updateDateInputs(prefix) {
        const type = document.getElementById(`f${prefix}DateType`).value;
        document.getElementById(`f${prefix}GroupMonth`).style.display = type === 'month' ? 'flex' : 'none';
        document.getElementById(`f${prefix}YearOnly`).style.display = type === 'year' ? 'block' : 'none';
        document.getElementById(`f${prefix}GroupCustom`).style.display = type === 'custom' ? 'flex' : 'none';
        
        if (prefix === 'Dash') {
            renderDashboard();
        } else {
            renderCards();
        }
    }
    
    // --- RENDERIZAÇÃO DE CARDS E FILTROS ---
    function renderCards() {
        if(currentTab === 'backup' || currentTab === 'dashboard') return;
        if(currentTab === 'atividades' && typeof kanbanActive !== 'undefined' && kanbanActive) {
            if(typeof renderKanban === 'function') renderKanban();
            return;
        }

        // Atualiza dinamicamente os filtros (selects) para mostrar apenas opções
        // que possuem ao menos 1 card possível com os filtros atuais
        const tabToFilterPrefix = (tab) => {
            if (tab === 'auditoria') return 'Audit';
            if (tab === 'treinamentos') return 'Train';
            if (tab === 'atividades') return 'Ativ';
            if (tab === 'manutencao') return 'Mant';
            if (tab === 'documentos') return 'Doc';
            return '';
        };
        const currentFilterPrefix = tabToFilterPrefix(currentTab);
        if (currentFilterPrefix) updateFilterFacetOptions(currentFilterPrefix);
    
        const grid = document.getElementById('cardsGrid');
        grid.innerHTML = '';
        
        let data = [];
        let statusList = [];
        let dateField = '';
        let getSortDate = null;     // data usada para ordenar e para filtro de data (especial em mant/doc)
        let getDeadlineDate = null; // data usada para indicador/prazo (N/A => null)
        let filterCatId = '';
        let filterSubcatId = '';
    
        if (currentTab === 'auditoria') {
            statusList = masterLists.auditStatus || [];
            dateField = 'dataPrevisao';
            getSortDate = (it) => it.dataPrevisao;
            getDeadlineDate = (it) => it.dataPrevisao;
            filterSetorId = 'fAuditSetor';
            filterCatId = 'fAuditCat';

            const setor = document.getElementById(filterSetorId)?.value || '';
            const cat = document.getElementById(filterCatId)?.value || '';
            const stat = document.getElementById('fAuditStatus')?.value || '';
            const marcador = document.getElementById('fAuditMarcador')?.value || '';
            const responsavel = document.getElementById('fAuditResponsavel')?.value || '';
            const revisor = document.getElementById('fAuditRevisor')?.value || '';
            const dateType = document.getElementById('fAuditDateType')?.value || 'all';
            
            data = audits;
            
            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);
            
            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }
            
            data = data.filter(item => {
                if (setor && item.setor !== setor) return false; 
                if (cat && item.categoria !== cat) return false;
                if (sub && item.subcategoria !== sub) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;
                if (revisor && item.revisor !== revisor) return false; // CORREÇÃO: Filtro Revisor
                
                if (responsavel) {
                    const itemResponsavel = normalizeResponsavel(item.responsavel);
                    const filterLower = responsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }
                
                if (dateType !== 'all') {
                    const itemDate = new Date(item[dateField]);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fAuditMonth').value) || 
                            itemDate.getFullYear() !== parseInt(document.getElementById('fAuditYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fAuditYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fAuditDataIni').value;
                        const fim = document.getElementById('fAuditDataFim').value;
                        if (ini && item[dateField] < ini) return false;
                        if (fim && item[dateField] > fim) return false;
                    }
                }
                return true;
            });
            
        } else if (currentTab === 'treinamentos') {
            statusList = masterLists.trainStatus || [];
            dateField = 'dataPrevisao';
            getSortDate = (it) => it.dataPrevisao;
            getDeadlineDate = (it) => it.dataPrevisao;
            filterSetorId = 'fTrainSetor';
            filterCatId = 'fTrainCat';

            const setor = document.getElementById(filterSetorId)?.value || '';
            const cat = document.getElementById(filterCatId)?.value || '';
            const stat = document.getElementById('fTrainStatus')?.value || '';
            const marcador = document.getElementById('fTrainMarcador')?.value || '';
            const responsavel = document.getElementById('fTrainResponsavel')?.value || '';
            const dateType = document.getElementById('fTrainDateType')?.value || 'all';

            data = trainings;
            
            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);
            
            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }
            
            data = data.filter(item => {
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;

                if (responsavel) {
                    const itemResponsavel = normalizeResponsavel(item.responsavel || '');
                    const filterLower = responsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }

                if (dateType !== 'all') {
                    const itemDate = new Date(item[dateField]);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fTrainMonth').value) ||
                            itemDate.getFullYear() !== parseInt(document.getElementById('fTrainYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fTrainYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fTrainDataIni').value;
                        const fim = document.getElementById('fTrainDataFim').value;
                        if (ini && item[dateField] < ini) return false;
                        if (fim && item[dateField] > fim) return false;
                    }
                }
                return true;
            });

        } else if (currentTab === 'atividades') {
            statusList = masterLists.ativStatus || [];
            dateField = 'dataConclusao';
            getSortDate = (it) => it.dataConclusao;
            getDeadlineDate = (it) => it.dataConclusao;
            filterSetorId = 'fAtivSetor';
            filterCatId = 'fAtivCat';

            const setor = document.getElementById(filterSetorId)?.value || '';
            const cat = document.getElementById(filterCatId)?.value || '';
            const stat = document.getElementById('fAtivStatus')?.value || '';
            const marcador = document.getElementById('fAtivMarcador')?.value || '';
            const responsavel = document.getElementById('fAtivResponsavel')?.value || '';
            const revisor = document.getElementById('fAtivRevisor')?.value || '';
            const dateType = document.getElementById('fAtivDateType')?.value || 'all';
    
            data = activities;
            
            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);
            
            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }
            
            data = data.filter(item => {
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;
                if (revisor && item.revisor !== revisor) return false;

                if (responsavel) {
                    const itemResponsavel = normalizeResponsavel(item.responsavel);
                    const filterLower = responsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }

                if (dateType !== 'all') {
                    const itemDate = new Date(item[dateField]);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fAtivMonth').value) ||
                            itemDate.getFullYear() !== parseInt(document.getElementById('fAtivYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fAtivYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fAtivDataIni').value;
                        const fim = document.getElementById('fAtivDataFim').value;
                        if (ini && item[dateField] < ini) return false;
                        if (fim && item[dateField] > fim) return false;
                    }
                }
                return true;
            });
    
        } else if (currentTab === 'manutencao') {
            statusList = masterLists.mantStatus || [];
            dateField = 'proxima';
            // ordenar sempre pela "próxima" manutenção (mais próxima primeiro)
            getSortDate = (it) => getMaintenanceDeadlineDate(it) || ''; // Data de próxima manutenção
            getDeadlineDate = (it) => getMaintenanceDeadlineDate(it);
            filterSetorId = 'fMantSetor'; 
            filterCatId = 'fMantCat';
            filterSubcatId = 'fMantItem'; 
    
            const setor = document.getElementById(filterSetorId).value; 
            const cat = document.getElementById(filterCatId).value;
            const itemVal = document.getElementById(filterSubcatId).value;
            const tipo = document.getElementById('fMantTipo').value;
            const stat = document.getElementById('fMantStatus').value;
            const marcador = document.getElementById('fMantMarcador')?.value || '';
            const responsavel = document.getElementById('fMantResponsavel')?.value || '';
            const dateType = document.getElementById('fMantDateType').value;
            
            data = maintenances;
            
            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);
            
            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }
            
            data = data.filter(item => {
                if (setor && item.setor !== setor) return false; 
                if (cat && item.categoria !== cat) return false;
                if (itemVal && item.item !== itemVal) return false;
                if (tipo && item.tipo !== tipo) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;
                
                if (responsavel) {
                    const responsavelTec = normalizeResponsavel(item.responsavelTecnico);
                    const filterLower = responsavel.toLowerCase();
                    if (!responsavelTec.includes(filterLower)) return false;
                }
    
                if (dateType !== 'all') {
                    const dateForFilter = getMaintenanceCardDate(item); // Data (publicação)
                    const itemDate = new Date(dateForFilter);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fMantMonth').value) || 
                            itemDate.getFullYear() !== parseInt(document.getElementById('fMantYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fMantYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fMantDataIni').value;
                        const fim = document.getElementById('fMantDataFim').value;
                        if (ini && dateForFilter < ini) return false;
                        if (fim && dateForFilter > fim) return false;
                    }
                }
                return true;
            });
        } else if (currentTab === 'documentos') { 
            statusList = masterLists.docStatus || [];
            dateField = 'dataProximaRevisao'; 
            getSortDate = (it) => getDocumentCardDate(it); // Data (publicação)
            getDeadlineDate = (it) => getDocumentDeadlineDate(it);
            filterSetorId = 'fDocSetor';
            filterCatId = 'fDocCat';

            const setor = document.getElementById(filterSetorId)?.value || '';
            const cat = document.getElementById(filterCatId)?.value || '';
            const stat = document.getElementById('fDocStatus')?.value || '';
            const marcador = document.getElementById('fDocMarcador')?.value || '';
            const responsavel = document.getElementById('fDocResponsavel')?.value || '';
            const revisor = document.getElementById('fDocRevisor')?.value || '';
            const dateType = document.getElementById('fDocDateType')?.value || 'all';
    
            data = documents;
            
            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);
            
            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }
            
            data = data.filter(item => {
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;
                if (revisor && item.revisor !== revisor) return false;

                if (responsavel) {
                    const itemResponsavel = normalizeResponsavel(item.responsavel);
                    const filterLower = responsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }

                if (dateType !== 'all') {
                    const dateForFilter = getDocumentCardDate(item);
                    const itemDate = new Date(dateForFilter);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fDocMonth').value) || 
                            itemDate.getFullYear() !== parseInt(document.getElementById('fDocYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fDocYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fDocDataIni').value;
                        const fim = document.getElementById('fDocDataFim').value;
                        if (ini && dateForFilter < ini) return false;
                        if (fim && dateForFilter > fim) return false;
                    }
                }
                return true;
            });
        }
    
        // Busca por Título (lupa) - só quando o campo estiver ativo
        if (titleSearchCardsEnabled && titleSearchCardsQuery) {
            data = data.filter(item => normalizeText(item.titulo || '').includes(titleSearchCardsQuery));
        }
    
        // Filtro de finalizados (Concluído e Cancelado)
        const showFinalized = document.getElementById('showFinalizedCheckbox')?.checked !== false;
        if (!showFinalized) {
            data = data.filter(item => {
                const statusNormalized = normalizeStatusName(item.status || '');
                return statusNormalized !== 'concluído' && statusNormalized !== 'cancelado';
            });
        }
    
        // ORDENAÇÃO
        if (dateField) {
            data.sort((a, b) => {
                // 1) Itens com status "Concluído" ou "Cancelado" vão para o final
                const isAClosed = a.status === 'Concluído' || a.status === 'Cancelado';
                const isBClosed = b.status === 'Concluído' || b.status === 'Cancelado';

                if (isAClosed !== isBClosed) {
                    // false (0) vem antes de true (1)
                    return isAClosed ? 1 : -1;
                }

                // 2) Entre itens "abertos", os que estão no prazo de alerta vêm primeiro
                if (!isAClosed && !isBClosed) {
                    const flagA = a.flagDias || 7;
                    const flagB = b.flagDias || 7;
                    const dA = daysDiff(getDeadlineDate ? getDeadlineDate(a) : a[dateField]);
                    const dB = daysDiff(getDeadlineDate ? getDeadlineDate(b) : b[dateField]);
                    const isAAlert = dA <= flagA;
                    const isBAlert = dB <= flagB;

                    if (isAAlert !== isBAlert) {
                        return isAAlert ? -1 : 1;
                    }
                }

                // 2.5) Entre itens "abertos" sem alerta, os com data válida vêm antes dos com "ND"
                const sortA = getSortDate ? (getSortDate(a) || '') : (a[dateField] || '');
                const sortB = getSortDate ? (getSortDate(b) || '') : (b[dateField] || '');
                const dateA = new Date(sortA);
                const dateB = new Date(sortB);
                const isAInvalid = isNaN(dateA.getTime());
                const isBInvalid = isNaN(dateB.getTime());

                if (isAInvalid !== isBInvalid) {
                    return isAInvalid ? 1 : -1;  // Datas inválidas ("ND") por último
                }

                // 3) Dentro do mesmo grupo, ordena por data (mais antiga primeiro)
                return dateA - dateB;
            });
        }
    
        if(data.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#9ca3af"><i class="fas fa-search fa-2x"></i><p>Nenhum registro encontrado.</p></div>';
            return;
        }
    
        const canEdit = userCanEditCards();
        const canDelete = userCanDeleteCards();

        data.forEach(item => {
            try {
            const div = document.createElement('div');
            const flagDays = item.flagDias || 7;
            let targetDate = (getDeadlineDate ? getDeadlineDate(item) : null);
            const fullTitle = item.titulo || '';
            const displayTitle = truncateText(fullTitle, 55);
    
            const d = daysDiff(targetDate);
            
            let indicatorClass = 'ind-green';
            // Cards com status "Concluído" permanecem verdes mesmo se atrasados
            if (item.status !== 'Concluído' && d !== Infinity) {
                if (d < 0) indicatorClass = 'ind-red';
                else if (d <= flagDays) indicatorClass = 'ind-yellow';
            }
    
            const statusObj = statusList.find(s => s.name === item.status) || { color: 'default' };
            const statusColorVar = colorMap[statusObj.color] || colorMap['default'];

            // Marcador do card
            const marcadorText = item.marcador || '';
            const marcadorColorVar = colorMap[item.marcadorCor] || colorMap['default'];
    
            // layout interativo original dos cards
            div.className = `card ${indicatorClass}`;
            div.onclick = () => {
                currentHistoryPage = 1; // Reseta a página ao abrir a visualização
                openView(item.id, currentTab);
            };
    
            let specificContent = '';

                // Função para formatar responsável para exibição
                const formatResponsavel = (responsavel) => {
                    if (!responsavel) return '';
                    return String(responsavel).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                };

            if (currentTab === 'auditoria') {
                const responsaveis = formatResponsavel(item.responsavel);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar"></i> <span>Pub: <strong>${formatBR(item.dataPublicacao)}</strong></span></div>
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Prev: <strong>${formatBR(item.dataPrevisao)}</strong></span></div>
                `;
            } else if (currentTab === 'treinamentos') {
                const responsaveis = formatResponsavel(item.responsavel || '');
                const isNA = isBlankPeriodicity(item.periodicidade);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar"></i> <span>Pub: ${formatBR(item.dataPublicacao)}</span></div>
                    ${!isNA ? `<div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Prev: ${formatBR(item.dataPrevisao)}</span></div>` : ''}
                `;
            } else if (currentTab === 'atividades') {
                const responsaveis = formatResponsavel(item.responsavel);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar"></i> <span>Inicio: <strong>${formatBR(item.dataInicio)}</strong></span></div>
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Fim: <strong>${formatBR(item.dataConclusao)}</strong></span></div>
                `;
            } else if (currentTab === 'manutencao') {
                const isNA = isBlankPeriodicity(item.intervalo);
                const responsavelTec = formatResponsavel(item.responsavelTecnico);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    <div class="card-info-row"><i class="fas fa-tag"></i> <span>${item.tipo || 'ND'}</span></div>
                    ${responsavelTec ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsavelTec}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Próx: <strong>${isNA ? 'N/A' : formatBR(item.proxima)}</strong></span></div>
                `;
            } else { // Documentos
                const isNA = isBlankPeriodicity(item.docIntervalo);
                const responsaveis = formatResponsavel(item.responsavel);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Próx: <strong>${isNA ? 'N/A' : formatBR(item.dataProximaRevisao)}</strong></span></div>
                `;
            }
    
            // Garante que specificContent seja sempre uma string válida
            if (!specificContent || typeof specificContent !== 'string') {
                specificContent = '';
            }
    
            const editIconHtml = canEdit
                ? `<i class="fas fa-pen" onclick="editItem(${item.id}, '${currentTab}')" title="Editar"></i>`
                : '';

            const deleteIconHtml = canDelete
                ? `<i class="fas fa-trash" onclick="deleteItem(${item.id}, '${currentTab}')" title="Excluir"></i>`
                : '';

            div.innerHTML = `
                <div class="card-header">
                    <span class="tag" style="background-color:${statusColorVar}">${item.status || 'Novo'}</span>
                    <div class="card-actions" onclick="event.stopPropagation()">
                        ${editIconHtml}
                        ${deleteIconHtml}
                    </div>
                </div>
                <div class="card-title">
                    <h4 title="${fullTitle}">${displayTitle}</h4>
                </div>
                <div class="card-body">
                    ${specificContent}
                    ${marcadorText ? `<div class="card-marker" style="background:${marcadorColorVar}"><i class="fas fa-bookmark"></i> ${marcadorText}</div>` : ''}
                </div>
            `;
            grid.appendChild(div);
            } catch (error) {
                console.error('Erro ao renderizar card:', error, item);
                // Cria um card de fallback mesmo que ocorra erro
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'card ind-green';
                fallbackDiv.innerHTML = `
                    <div class="card-header">
                        <span class="tag" style="background-color:#6b7280">Erro</span>
                    </div>
                    <div class="card-title">
                        <h4>Erro ao exibir item</h4>
                    </div>
                    <div class="card-body">
                        <div class="card-info-row"><i class="fas fa-exclamation-triangle"></i> <span>Item ID: ${item.id}</span></div>
                    </div>
                `;
                grid.appendChild(fallbackDiv);
            }
        });
        
        // Atualiza contador de notificações após renderizar cards
        updateNotificationCount();
    }
    
    // Filtro do Dashboard
    function onFilterDashboardChange() {
        if (document.getElementById('fDashDateType').value !== 'all') {
            updateDateInputs('Dash');
        }
        updateDashboardFilterOptions();
        saveFiltersToLocalStorage();
        renderDashboard();
    }
    
    function updateDashboardFilterOptions() {
        // Obtém as abas que o usuário tem permissão
        const allowedTabs = userAllowedTabs();
        
        // Constrói uma lista completa de todos os itens (filtrando apenas abas permitidas)
        let rawItems = [];
        
        if (!allowedTabs || allowedTabs.includes('auditoria')) {
            rawItems = rawItems.concat(audits.map(a => ({ ...a, type: 'audit' })));
        }
        if (!allowedTabs || allowedTabs.includes('atividades')) {
            rawItems = rawItems.concat(activities.map(a => ({ ...a, type: 'ativ' })));
        }
        if (!allowedTabs || allowedTabs.includes('manutencao')) {
            rawItems = rawItems.concat(maintenances.map(m => ({ ...m, type: 'mant' })));
        }
        if (!allowedTabs || allowedTabs.includes('documentos')) {
            rawItems = rawItems.concat(documents.map(d => ({ ...d, type: 'doc' })));
        }
        
        // SOFT DELETE: Filtrar itens deletados do dashboard
        rawItems = rawItems.filter(item => !item.deleted);
        
        // Aplicar filtro de permissões de setores
        const allowedSetores = getAllowedSetores();
        if (allowedSetores !== null) {
            rawItems = rawItems.filter(item => allowedSetores.includes(item.setor));
        }
        
        // Obtém valores atuais dos filtros (exceto o que estamos atualizando)
        const fArea = document.getElementById('fDashArea')?.value || '';
        const fSetor = document.getElementById('fDashSetor')?.value || '';
        const fCat = document.getElementById('fDashCat')?.value || '';
        const fStatus = document.getElementById('fDashStatus')?.value || '';
        const fResponsavel = document.getElementById('fDashResponsavel')?.value || '';
        const fDateType = document.getElementById('fDashDateType')?.value || 'all';
        const fMonth = parseInt(document.getElementById('fDashMonth')?.value || currentMonth);
        const fYearForMonth = parseInt(document.getElementById('fDashYearForMonth')?.value || currentYear);
        const fYearOnly = parseInt(document.getElementById('fDashYearOnly')?.value || currentYear);
        const fYear = (fDateType === 'year') ? fYearOnly : fYearForMonth;
        const fDataIni = document.getElementById('fDashDataIni')?.value || '';
        const fDataFim = document.getElementById('fDashDataFim')?.value || '';
        const fTitleQuery = titleSearchDashEnabled ? titleSearchDashQuery : '';
        
        // Função auxiliar para verificar se um item passa pelos filtros (exceto o filtro sendo atualizado)
        const passesOtherFilters = (item, excludeFilter) => {
            // Filtro por Área/Aba (exceto se estiver sendo atualizado)
            if (excludeFilter !== 'area' && fArea && item.type !== fArea) return false;
            
            // Filtro por Setor (exceto se estiver sendo atualizado)
            if (excludeFilter !== 'setor') {
                const itemSetor = item.setor || 'Setor Não Definido';
                if (fSetor && itemSetor !== fSetor) return false;
            }
            
            // Filtro por Categoria (exceto se estiver sendo atualizado)
            if (excludeFilter !== 'cat' && fCat && item.categoria !== fCat) return false;
            
            // Filtro por Status (exceto se estiver sendo atualizado)
            if (excludeFilter !== 'status' && fStatus && item.status !== fStatus) return false;
            
            // Filtro por Responsável (exceto se estiver sendo atualizado)
            if (excludeFilter !== 'responsavel' && fResponsavel) {
                if (item.type === 'mant') {
                    // Para manutenção, verifica apenas responsável técnico
                    const respTec = normalizeResponsavel(item.responsavelTecnico);
                    const filterLower = fResponsavel.toLowerCase();
                    if (!respTec.includes(filterLower)) return false;
                } else {
                    itemResponsavel = normalizeResponsavel(item.responsavel);
                    const filterLower = fResponsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }
            }
            
            // Filtro por Título
            if (fTitleQuery) {
                const t = normalizeText(item.titulo || '');
                if (!t.includes(fTitleQuery)) return false;
            }
            
            // Filtro por Período
            if (fDateType !== 'all') {
                const dateField = item.type === 'audit' ? item.dataPublicacao :
                                 item.type === 'ativ' ? item.dataInicio :
                                 item.type === 'mant' ? item.ultima :
                                 item.dataCriacao;
                if (!dateField) return false;
                
                const itemDate = new Date(dateField);
                if (fDateType === 'month') {
                    if (itemDate.getMonth() !== fMonth || itemDate.getFullYear() !== fYear) return false;
                } else if (fDateType === 'year') {
                    if (itemDate.getFullYear() !== fYear) return false;
                } else if (fDateType === 'custom') {
                    if (fDataIni && dateField < fDataIni) return false;
                    if (fDataFim && dateField > fDataFim) return false;
                }
            }
            return true;
        };
        
        // Atualiza filtro de Área
        {
            const el = document.getElementById('fDashArea');
            if (el) {
                const currentValue = el.value || '';
                const availableAreas = new Set();
                rawItems.forEach(item => {
                    if (passesOtherFilters(item, 'area')) {
                        availableAreas.add(item.type);
                    }
                });
                
                // Ordem das abas conforme aparecem na sidebar
                const areaOrder = ['audit', 'ativ', 'mant', 'doc'];
                // Filtra apenas as áreas que o usuário tem permissão e que estão disponíveis
                const allowedTabs = userAllowedTabs();
                const areaMapping = {
                    'audit': 'auditoria',
                    'ativ': 'atividades',
                    'mant': 'manutencao',
                    'doc': 'documentos'
                };
                
                const options = areaOrder.filter(area => {
                    const tabName = areaMapping[area];
                    return availableAreas.has(area) && (!allowedTabs || allowedTabs.includes(tabName));
                });
                
                const labels = {
                    'audit': 'Auditoria',
                    'ativ': 'Gestão de Atividades',
                    'mant': 'Manutenção',
                    'doc': 'Documentos'
                };
                
                const html = '<option value="">Área: Todas</option>' + 
                    options.map(area => `<option value="${area}">${labels[area]}</option>`).join('');
                el.innerHTML = html;
                if (currentValue && options.includes(currentValue)) el.value = currentValue;
                else el.value = '';
            }
        }
        
        // Atualiza filtro de Setor
        {
            const el = document.getElementById('fDashSetor');
            if (el) {
                const currentValue = el.value || '';
                const availableSetores = new Set();
                rawItems.forEach(item => {
                    if (passesOtherFilters(item, 'setor')) {
                        const setor = item.setor || 'Setor Não Definido';
                        availableSetores.add(setor);
                    }
                });
                const masterSetores = getMasterSetores();
                const ordered = masterSetores.filter(s => availableSetores.has(s));
                const extras = [...availableSetores].filter(s => !masterSetores.includes(s)).sort();
                setSelectOptions(el, 'Setor: Todos', [...ordered, ...extras], currentValue);
            }
        }
        
        // Atualiza filtro de Categoria
        {
            const el = document.getElementById('fDashCat');
            if (el) {
                const currentValue = el.value || '';
                const availableCategorias = new Set();
                rawItems.forEach(item => {
                    if (passesOtherFilters(item, 'cat') && item.categoria) {
                        availableCategorias.add(item.categoria);
                    }
                });
                // Coleta todas as categorias das listas mestre
                const allCategorias = [];
                ['auditCategorias', 'ativCategorias', 'mantCategorias', 'docCategorias'].forEach(key => {
                    (masterLists[key] || []).forEach(cat => { if (cat) allCategorias.push(cat); });
                });
                const masterCategorias = [...new Set(allCategorias)].sort();
                const ordered = masterCategorias.filter(c => availableCategorias.has(c));
                const extras = [...availableCategorias].filter(c => !masterCategorias.includes(c)).sort();
                setSelectOptions(el, 'Categoria: Todas', [...ordered, ...extras], currentValue);
            }
        }
        
        // Atualiza filtro de Status
        {
            const el = document.getElementById('fDashStatus');
            if (el) {
                const currentValue = el.value || '';
                const availableStatus = new Set();
                rawItems.forEach(item => {
                    if (passesOtherFilters(item, 'status') && item.status) {
                        availableStatus.add(item.status);
                    }
                });
                // Coleta todos os status das listas mestre
                const allStatusnames = [];
                ['auditStatus', 'ativStatus', 'mantStatus', 'docStatus'].forEach(key => {
                    (masterLists[key] || []).forEach(s => { if (s.name) allStatusnames.push(s.name); });
                });
                const masterStatus = [...new Set(allStatusnames)].sort();
                const ordered = masterStatus.filter(s => availableStatus.has(s));
                const extras = [...availableStatus].filter(s => !masterStatus.includes(s)).sort();
                setSelectOptions(el, 'Status: Todos', [...ordered, ...extras], currentValue);
            }
        }
        
        // Atualiza filtro de Responsável (Dashboard) - mostra apenas dos cards visíveis
        {
            const el = document.getElementById('fDashResponsavel');
            if (el) {
                const currentValue = el.value || '';
                const availableResponsaveis = new Set();
                rawItems.forEach(item => {
                    if (passesOtherFilters(item, 'responsavel')) {
                        if (item.type === 'mant') {
                            const respTec = normalizeResponsavel(item.responsavelTecnico);
                            if (respTec) availableResponsaveis.add(respTec);
                        } else if (item.responsavel) {
                            const resp = normalizeResponsavel(item.responsavel);
                            if (resp) availableResponsaveis.add(resp);
                        }
                    }
                });
                const realNames = new Set();
                [...availableResponsaveis].forEach(normalized => {
                    const user = users?.find(u => u.name && u.name.toLowerCase() === normalized);
                    if (user) {
                        realNames.add(user.name);
                    } else {
                        const resp = masterLists.responsaveis?.find(r => r && r.toLowerCase() === normalized);
                        if (resp) realNames.add(resp);
                        else realNames.add(normalized);
                    }
                });
                const sorted = [...realNames].sort((a, b) => a.localeCompare(b));
                const html = '<option value="">Responsável: Todos</option>' + sorted.map(r => `<option value="${r}">${r}</option>`).join('');
                el.innerHTML = html;
                el.value = currentValue;
            }
        }
        
        // Atualiza filtro de Revisor (Dashboard) - mostra apenas dos cards visíveis
        {
            const el = document.getElementById('fDashRevisor');
            if (el) {
                const currentValue = el.value || '';
                const availableRevisores = new Set();
                rawItems.forEach(item => {
                    if (passesOtherFilters(item, 'revisor') && item.revisor && item.type !== 'mant') {
                        const rev = normalizeResponsavel(item.revisor);
                        if (rev) availableRevisores.add(rev);
                    }
                });
                const realNames = new Set();
                [...availableRevisores].forEach(normalized => {
                    const user = users?.find(u => u.name && u.name.toLowerCase() === normalized);
                    if (user) {
                        realNames.add(user.name);
                    } else {
                        const resp = masterLists.responsaveis?.find(r => r && r.toLowerCase() === normalized);
                        if (resp) realNames.add(resp);
                        else realNames.add(normalized);
                    }
                });
                const sorted = [...realNames].sort((a, b) => a.localeCompare(b));
                const html = '<option value="">Revisor: Todos</option>' + sorted.map(r => `<option value="${r}">${r}</option>`).join('');
                el.innerHTML = html;
                el.value = currentValue;
            }
        }
    }
    
    // Limpa filtros do Dashboard
    function clearDashboardFilters() {
        document.getElementById('fDashArea').value = "";
        document.getElementById('fDashSetor').value = "";
        document.getElementById('fDashCat').value = "";
        // subcategoria removida
        document.getElementById('fDashStatus').value = "";
        document.getElementById('fDashResponsavel').value = "";
        document.getElementById('fDashRevisor').value = "";
        
        document.getElementById('fDashDateType').value = 'all';
        document.getElementById('fDashDataIni').value = "";
        document.getElementById('fDashDataFim').value = "";
        
        setTitleSearchEnabled('dash', false);
        updateDateInputs('Dash');
        updateDashboardFilterOptions();
        saveFiltersToLocalStorage();
        renderDashboard();
    }
    
    
    function clearFilters() {
        // Mapeia a aba atual para o prefixo dos filtros
        const tabPrefix = {
            'auditoria': 'Audit',
            'treinamentos': 'Train',
            'atividades': 'Ativ',
            'manutencao': 'Mant',
            'documentos': 'Doc'
        }[currentTab] || 'Audit';

        const filterPrefix = `f${tabPrefix}`;

        // Limpa apenas os filtros da aba atual
        document.querySelectorAll('.filters-bar select').forEach(s => {
            // Só limpa se for filtro da aba atual
            if (s.id.startsWith(filterPrefix) && !s.id.includes('DateType') && !s.id.includes('Month') && !s.id.includes('Year')) {
                s.value = "";
            }
        });
        
        // Limpa apenas a data type da aba atual
        const dateTypeId = `f${tabPrefix}DateType`;
        const dateTypeEl = document.getElementById(dateTypeId);
        if (dateTypeEl) dateTypeEl.value = 'all';
        
        // Limpa inputs de data da aba atual
        const dataIniId = `f${tabPrefix}DataIni`;
        const dataFimId = `f${tabPrefix}DataFim`;
        const dataIniEl = document.getElementById(dataIniId);
        const dataFimEl = document.getElementById(dataFimId);
        if (dataIniEl) dataIniEl.value = "";
        if (dataFimEl) dataFimEl.value = "";

        setTitleSearchEnabled('cards', false);
        
        updateDateInputs(tabPrefix);
        
        saveFiltersToLocalStorage();
        
        onFilterSetorChange(tabPrefix);
        renderCards();
    }
    
    
    // Função para obter setores permitidos do usuário atual
    function getAllowedSetores() {
        if (!currentuser) return null; // null = todos os setores (admin ou sem restrição)
        if (userIsAdmin()) return null;
        if (currentuser.canManageLists === true) return null; // Usuários com permissão de gerenciar listas veem todos
        if (Array.isArray(currentuser.allowedSetores) && currentuser.allowedSetores.length > 0) {
            return currentuser.allowedSetores;
        }
        return []; // Se não tem setores permitidos, não vê nenhum
    }
    
    function populateSelects() {
    var setores = masterLists.setores || []; 
    var allowedSetores = getAllowedSetores(); // null = todos, array = apenas os permitidos 
    
    // Captura os valores selecionados antes de reconstruir os selects para evitar o reset
    var currentValues = {
        // MODAIS
        audit: { setor: document.getElementById('auditSetor')?.value, cat: document.getElementById('auditCategoria')?.value, status: document.getElementById('auditStatus')?.value, mark: document.getElementById('auditMarcador')?.value },
        train: { setor: document.getElementById('trainSetor')?.value, cat: document.getElementById('trainCategoria')?.value, status: document.getElementById('trainStatus')?.value, mark: document.getElementById('trainMarcador')?.value },
        ativ: { setor: document.getElementById('ativSetor')?.value, cat: document.getElementById('ativCategoria')?.value, status: document.getElementById('ativStatus')?.value, mark: document.getElementById('ativMarcador')?.value },
        mant: { setor: document.getElementById('mantSetor')?.value, cat: document.getElementById('mantCategoria')?.value, status: document.getElementById('mantStatus')?.value, mark: document.getElementById('mantMarcador')?.value, tipo: document.getElementById('mantTipo')?.value },
        doc: { setor: document.getElementById('docSetor')?.value, cat: document.getElementById('docCategoria')?.value, status: document.getElementById('docStatus')?.value, mark: document.getElementById('docMarcador')?.value },

        // FILTROS (persistência ao editar listas)
        dash: {
            area: document.getElementById('fDashArea')?.value,
            setor: document.getElementById('fDashSetor')?.value,
            cat: document.getElementById('fDashCat')?.value,
            sub: document.getElementById('fDashSub')?.value,
            status: document.getElementById('fDashStatus')?.value,
            responsavel: document.getElementById('fDashResponsavel')?.value,
            revisor: document.getElementById('fDashRevisor')?.value,
            dateType: document.getElementById('fDashDateType')?.value,
            month: document.getElementById('fDashMonth')?.value,
            yearForMonth: document.getElementById('fDashYearForMonth')?.value,
            yearOnly: document.getElementById('fDashYearOnly')?.value,
            dataIni: document.getElementById('fDashDataIni')?.value,
            dataFim: document.getElementById('fDashDataFim')?.value
        },
        Audit: {
            setor: document.getElementById('fAuditSetor')?.value,
            cat: document.getElementById('fAuditCat')?.value,
            sub: document.getElementById('fAuditSub')?.value,
            status: document.getElementById('fAuditStatus')?.value,
            marcador: document.getElementById('fAuditMarcador')?.value || ''
        },
        Train: {
            setor: document.getElementById('fTrainSetor')?.value,
            cat: document.getElementById('fTrainCat')?.value,
            sub: document.getElementById('fTrainSub')?.value,
            status: document.getElementById('fTrainStatus')?.value,
            marcador: document.getElementById('fTrainMarcador')?.value || ''
        },
        Ativ: {
            setor: document.getElementById('fAtivSetor')?.value,
            cat: document.getElementById('fAtivCat')?.value,
            sub: document.getElementById('fAtivSub')?.value,
            status: document.getElementById('fAtivStatus')?.value,
            marcador: document.getElementById('fAtivMarcador')?.value || ''
        },
        Mant: {
            setor: document.getElementById('fMantSetor')?.value,
            cat: document.getElementById('fMantCat')?.value,
            item: document.getElementById('fMantItem')?.value,
            tipo: document.getElementById('fMantTipo')?.value,
            status: document.getElementById('fMantStatus')?.value,
            marcador: document.getElementById('fMantMarcador')?.value || ''
        },
        Doc: {
            setor: document.getElementById('fDocSetor')?.value,
            cat: document.getElementById('fDocCat')?.value,
            sub: document.getElementById('fDocSub')?.value,
            status: document.getElementById('fDocStatus')?.value,
            marcador: document.getElementById('fDocMarcador')?.value || ''
        }
    };

    // Coleta TODOS os status para o Dashboard
    var allStatusnames = [];
    ['auditStatus', 'trainStatus', 'ativStatus', 'mantStatus', 'docStatus'].forEach(key => {
        (masterLists[key] || []).forEach(s => { if (s.name) allStatusnames.push(s.name); });
    });
    var unifiedStatusnames = [...new Set(allStatusnames)].sort();

    // Função auxiliar para extrair valor de um item (string ou objeto)
    var extractValue = (item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.value) return item.value;
        if (item && typeof item === 'object' && item.name) return item.name;
        return String(item);
    };
    
    // Função auxiliar para extrair nome de um item para exibição (string ou objeto)
    var extractDisplayName = (item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.name) return item.name;
        if (item && typeof item === 'object' && item.value) return item.value;
        return String(item);
    };

    var makeOpts = (list) => (list || [])
        .filter(i => {
            // Filtra itens deletados e objetos malformados
            if (typeof i === 'object') {
                return i && !i.deleted && (i.name || i.value);
            }
            return i; // Strings simples são mantidas
        })
        .map(i => {
            const val = extractValue(i);
            const display = extractDisplayName(i);
            return `<option value="${val}">${display}</option>`;
        })
        .join('');
        
    var makeStatusOpts = (list) => (list || [])
        .filter(i => i && !i.deleted && i.name)
        .map(i => `<option value="${i.name}">${i.name}</option>`)
        .join('');
        
    var makeFilterOpts = (list, label) => `<option value="">${label}</option>` + (list || [])
        .filter(i => {
            if (typeof i === 'object') {
                return i && !i.deleted && (i.name || i.value);
            }
            return i;
        })
        .map(i => {
            const val = extractValue(i);
            const display = extractDisplayName(i);
            return `<option value="${val}">${display}</option>`;
        })
        .join('');
        
    var makeStatusFilterOpts = (list, label) => `<option value="">${label}</option>` + (list || [])
        .filter(i => i && !i.deleted && i.name)
        .map(i => `<option value="${i.name}">${i.name}</option>`)
        .join('');
    
    // Filtra setores baseado nas permissões do usuário (allowedSetores já declarado acima)
    var filteredSetores = allowedSetores === null ? setores : setores.filter(s => allowedSetores.includes(s));
    
    // --- FILTROS DASHBOARD ---
    document.getElementById('fDashSetor').innerHTML = makeFilterOpts(filteredSetores, "Setor: Todos");
    // Categoria será populada dinamicamente por updateDashboardFilterOptions
    document.getElementById('fDashCat').innerHTML = '<option value="">Categoria: Todas</option>';
    // subcategoria removida
    document.getElementById('fDashStatus').innerHTML = makeFilterOpts(unifiedStatusnames, "Status: Todos");
    if (currentValues.dash.area != null) document.getElementById('fDashArea').value = currentValues.dash.area;
    if (currentValues.dash.setor != null) document.getElementById('fDashSetor').value = currentValues.dash.setor;
    if (currentValues.dash.cat != null) document.getElementById('fDashCat').value = currentValues.dash.cat;
    // subcategoria removida da interface
    if (currentValues.dash.status != null) document.getElementById('fDashStatus').value = currentValues.dash.status;
    // Restaura filtros de Data e Responsável/Revisor do Dashboard (serão atualizados dinamicamente em updateDashboardFilterOptions)
    if (currentValues.dash.dateType != null) document.getElementById('fDashDateType').value = currentValues.dash.dateType;
    if (currentValues.dash.month != null) document.getElementById('fDashMonth').value = currentValues.dash.month;
    if (currentValues.dash.yearForMonth != null) document.getElementById('fDashYearForMonth').value = currentValues.dash.yearForMonth;
    if (currentValues.dash.yearOnly != null) document.getElementById('fDashYearOnly').value = currentValues.dash.yearOnly;
    if (currentValues.dash.dataIni != null) document.getElementById('fDashDataIni').value = currentValues.dash.dataIni;
    if (currentValues.dash.dataFim != null) document.getElementById('fDashDataFim').value = currentValues.dash.dataFim;
    // Responsável e Revisor serão restaurados após updateDashboardFilterOptions
    var dashResponsavelValue = currentValues.dash.responsavel;
    var dashRevisorValue = currentValues.dash.revisor;

    // --- POPULAR MODAIS (Setores e Categorias) ---
    ['audit', 'train', 'ativ', 'doc'].forEach(p => {
        const setorEl = document.getElementById(`${p}Setor`);
        const catEl = document.getElementById(`${p}Categoria`);
        const statusEl = document.getElementById(`${p}Status`);
        if (!setorEl || !catEl || !statusEl) return;
        setorEl.innerHTML = makeOpts(filteredSetores);
        catEl.innerHTML = makeOpts(masterLists[`${p}Categorias`] || []);
        statusEl.innerHTML = makeStatusOpts(masterLists[`${p}Status`] || []);

        const markerSelect = document.getElementById(`${p}Marcador`);
        if (markerSelect) markerSelect.innerHTML = `<option value="">Selecionar marcador</option>` + makeStatusOpts(masterLists[`${p}Marcadores`] || []);

        if (currentValues[p] && currentValues[p].setor) setorEl.value = currentValues[p].setor;
        if (currentValues[p] && currentValues[p].cat) catEl.value = currentValues[p].cat;
        if (currentValues[p] && currentValues[p].status) statusEl.value = currentValues[p].status;
        if (markerSelect && currentValues[p] && currentValues[p].mark) markerSelect.value = currentValues[p].mark;
    });

    // Atualiza Subcategorias/Itens baseado na categoria restaurada
    onCategoryChange('audit');
    onCategoryChange('train');
    onCategoryChange('ativ');
    onCategoryChange('doc');
    
    // Popula os selects de responsáveis e revisores
    // GARANTE que TODOS os usuários disponíveis apareçam, sem nenhuma filtragem
    var responsaveisOptions = ['<option value="">Selecione um responsável...</option>'];
    
    // Adiciona TODOS os nomes de usuários cadastrados (sem filtragem)
    if (typeof users !== 'undefined') {
        users.forEach(user => {
            if (user.name && user.name.trim()) {
                responsaveisOptions.push(`<option value="${user.name}">${user.name}</option>`);
            }
        });
    }
    
    // Adiciona responsáveis da lista mestre (se houver)
    if (masterLists.responsaveis) {
        masterLists.responsaveis.forEach(r => {
            if (r && r.trim()) {
                responsaveisOptions.push(`<option value="${r}">${r}</option>`);
            }
        });
    }
    
    // Remove duplicatas e ordena
    var uniqueOptions = [...new Set(responsaveisOptions)];
    var sortedOptions = uniqueOptions.sort((a, b) => {
        const aText = a.match(/>(.*?)</)[1] || '';
        const bText = b.match(/>(.*?)</)[1] || '';
        return aText.localeCompare(bText);
    });
    
    // Popula os selects de responsáveis e revisores
    ['auditResponsavel', 'trainResponsavel', 'ativResponsavel', 'mantResponsavelTecnico', 'docResponsavel', 'auditRevisor', 'ativRevisor', 'docRevisor'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = sortedOptions.join('');
            select.value = currentValue;
        }
    });

    // --- FILTROS DAS ABAS ---
    document.getElementById('fAuditSetor').innerHTML = makeFilterOpts(filteredSetores, "Setor: Todos"); 
    document.getElementById('fTrainSetor').innerHTML = makeFilterOpts(filteredSetores, "Setor: Todos"); 
    document.getElementById('fAtivSetor').innerHTML = makeFilterOpts(filteredSetores, "Setor: Todos"); 
    document.getElementById('fDocSetor').innerHTML = makeFilterOpts(filteredSetores, "Setor: Todos");

    document.getElementById('fAuditCat').innerHTML = makeFilterOpts(masterLists.auditCategorias, "Categoria: Todas");
    document.getElementById('fAuditStatus').innerHTML = makeStatusFilterOpts(masterLists.auditStatus, "Status: Todos");
    document.getElementById('fTrainCat').innerHTML = makeFilterOpts(masterLists.trainCategorias, "Categoria: Todas");
    document.getElementById('fTrainStatus').innerHTML = makeStatusFilterOpts(masterLists.trainStatus, "Status: Todos");
    document.getElementById('fAtivCat').innerHTML = makeFilterOpts(masterLists.ativCategorias, "Categoria: Todas");
    document.getElementById('fAtivStatus').innerHTML = makeStatusFilterOpts(masterLists.ativStatus, "Status: Todos");
    document.getElementById('fDocCat').innerHTML = makeFilterOpts(masterLists.docCategorias, "Categoria: Todas"); 
    document.getElementById('fDocStatus').innerHTML = makeStatusFilterOpts(masterLists.docStatus, "Status: Todos"); 

    // Popula selects ocultos de Marcador
    document.getElementById('fAuditMarcador').innerHTML = makeStatusOpts(masterLists.auditMarcadores || []);
    document.getElementById('fTrainMarcador').innerHTML = makeStatusOpts(masterLists.trainMarcadores || []);
    document.getElementById('fAtivMarcador').innerHTML = makeStatusOpts(masterLists.ativMarcadores || []);
    document.getElementById('fDocMarcador').innerHTML = makeStatusOpts(masterLists.docMarcadores || []);

    // Restaura valores de filtros para evitar voltar ao primeiro item após editar listas
    if (currentValues.Audit?.setor != null) document.getElementById('fAuditSetor').value = currentValues.Audit.setor;
    if (currentValues.Train?.setor != null) document.getElementById('fTrainSetor').value = currentValues.Train.setor;
    if (currentValues.Ativ?.setor != null) document.getElementById('fAtivSetor').value = currentValues.Ativ.setor;
    if (currentValues.Doc?.setor != null) document.getElementById('fDocSetor').value = currentValues.Doc.setor;

    if (currentValues.Audit?.cat != null) document.getElementById('fAuditCat').value = currentValues.Audit.cat;
    if (currentValues.Train?.cat != null) document.getElementById('fTrainCat').value = currentValues.Train.cat;
    if (currentValues.Ativ?.cat != null) document.getElementById('fAtivCat').value = currentValues.Ativ.cat;
    if (currentValues.Doc?.cat != null) document.getElementById('fDocCat').value = currentValues.Doc.cat;

    if (currentValues.Audit?.status != null) document.getElementById('fAuditStatus').value = currentValues.Audit.status;
    if (currentValues.Train?.status != null) document.getElementById('fTrainStatus').value = currentValues.Train.status;
    if (currentValues.Ativ?.status != null) document.getElementById('fAtivStatus').value = currentValues.Ativ.status;
    if (currentValues.Doc?.status != null) document.getElementById('fDocStatus').value = currentValues.Doc.status;

    if (currentValues.Audit?.marcador != null) document.getElementById('fAuditMarcador').value = currentValues.Audit.marcador;
    if (currentValues.Train?.marcador != null) document.getElementById('fTrainMarcador').value = currentValues.Train.marcador;
    if (currentValues.Ativ?.marcador != null) document.getElementById('fAtivMarcador').value = currentValues.Ativ.marcador;
    if (currentValues.Doc?.marcador != null) document.getElementById('fDocMarcador').value = currentValues.Doc.marcador;

    // Subcategoria/Item são facetados dinamicamente; tenta restaurar seleção e, em seguida, recalcula opções visíveis
    if (typeof updateFilterFacetOptions === 'function') {
        ['Audit', 'Train', 'Ativ', 'Mant', 'Doc'].forEach(p => updateFilterFacetOptions(p));
        // restaura sub/itens após recálculo (se ainda existirem)
        const aSub = document.getElementById('fAuditSub'); if (aSub && currentValues.Audit.sub != null) aSub.value = currentValues.Audit.sub;
        const tSub = document.getElementById('fAtivSub'); if (tSub && currentValues.Ativ.sub != null) tSub.value = currentValues.Ativ.sub;
        const mItem = document.getElementById('fMantItem'); if (mItem && currentValues.Mant.item != null) mItem.value = currentValues.Mant.item;
        const dSub = document.getElementById('fDocSub'); if (dSub && currentValues.Doc.sub != null) dSub.value = currentValues.Doc.sub;
    }

    // Atualiza filtros dinâmicos do Dashboard (Responsável, Revisor, etc)
    updateDashboardFilterOptions();

    // Restaura valores de Responsável e Revisor do Dashboard após updateDashboardFilterOptions populá-los
    // Note: Os valores são passados como variáveis globais de populateSelects
    if (typeof dashResponsavelValue !== 'undefined' && dashResponsavelValue != null) {
        const elResp = document.getElementById('fDashResponsavel');
        if (elResp) elResp.value = dashResponsavelValue;
    }
    if (typeof dashRevisorValue !== 'undefined' && dashRevisorValue != null) {
        const elRev = document.getElementById('fDashRevisor');
        if (elRev) elRev.value = dashRevisorValue;
    }
}
    
    // Funções auxiliares para obter prefixos de ID corretos
    function getTabPrefix(tab) {
        if (tab === 'auditoria') return 'audit';
        if (tab === 'treinamentos') return 'train';
        if (tab === 'atividades') return 'ativ';
        if (tab === 'manutencao') return 'mant';
        if (tab === 'documentos') return 'doc';
        return '';
    }
    
    // Funções de atualização em cascata para MODAIS (Setor não interfere, mantido apenas para CategoryChange)
    function onCategoryChange(prefix) {
    var catSelect = document.getElementById(`${prefix}Categoria`);
    if (!catSelect || !masterLists) return; 

    var subcatSelect;
    var listKey;
    var subcatFieldGroup;
    
    if (prefix === 'mant') {
        subcatSelect = document.getElementById(`${prefix}Item`);
        listKey = 'mantItens';
        // Para manutenção não há subcategoria, então não precisa ocultar
    } else {
        subcatSelect = document.getElementById(`${prefix}Sub`);
        listKey = `${prefix}Subcats`;
        // Encontra o field-group pai da subcategoria para ocultar/mostrar
        if (subcatSelect) {
            subcatFieldGroup = subcatSelect.closest('.field-group');
        }
    }
    
    var selectedCat = catSelect.value;
    
    // Se categoria estiver vazia ou for "todas", oculta o campo de subcategoria
    if (!selectedCat || selectedCat === '') {
        if (subcatFieldGroup) {
            subcatFieldGroup.style.display = 'none';
        }
        if (subcatSelect) {
            subcatSelect.innerHTML = '<option value="">Nenhuma opção disponível</option>';
        }
        return;
    }
    
    // Subcategoria removida da interface — mantém sempre oculto
    if (subcatFieldGroup) {
        subcatFieldGroup.style.display = 'none';
    }
    
    if (!subcatSelect) return; 

    var currentSubcat = subcatSelect.value; 
    
    // Debug: Garante que a estrutura de dados exista antes do acesso
    masterLists[listKey] = masterLists[listKey] || {};
    var subcats = masterLists[listKey][selectedCat] || [];
    
    // Função auxiliar para extrair valor de um item (string ou objeto)
    var extractItemValue = (item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.value) return item.value;
        if (item && typeof item === 'object' && item.name) return item.name;
        return String(item);
    };
    
    // Filtra itens deletados e malformados
    subcats = subcats.filter(i => {
        if (typeof i === 'object') {
            return i && !i.deleted && (i.value || i.name);
        }
        return i;
    });
    
    subcatSelect.innerHTML = subcats.length > 0 ? 
        subcats.map(i => {
            const val = extractItemValue(i);
            return `<option value="${val}">${val}</option>`;
        }).join('') :
        `<option value="">Nenhuma opção disponível</option>`;

    // Tenta restaurar a seleção anterior se ela ainda existir na nova lista
    var subcatValues = subcats.map(extractItemValue);
    if (subcatValues.includes(currentSubcat)) subcatSelect.value = currentSubcat;
}

    // NOVO: Filtro de Setor (Setor NÃO afeta a Categoria no cadastro/filtro)
    function onFilterSetorChange(prefix) {
        closeFilters();
        renderCards();
    }
    
    // Função para fechar a janela de filtros
    function closeFilters() {
        // Fechar filtros das abas
        const dd = document.getElementById('filtersDropdown');
        if (dd) dd.style.display = 'none';
        
        // Fechar filtros do dashboard
        const ddDash = document.getElementById('filtersDropdownDashboard');
        if (ddDash) ddDash.style.display = 'none';
    }
    
    // Opções de Subcategoria/Item (FILTROS):
    // - Se Categoria = Todas: listar opções baseadas nos itens já filtrados pelos demais filtros
    // - Se Categoria selecionada: listar opções do array mestre daquela categoria
    function getItemsForFilterPrefix(prefix) {
        let items = [];
        if (prefix === 'Audit') items = audits || [];
        else if (prefix === 'Train') items = trainings || [];
        else if (prefix === 'Ativ') items = activities || [];
        else if (prefix === 'Mant') items = maintenances || [];
        else if (prefix === 'Doc') items = documents || [];
        
        // SOFT DELETE: Filtrar itens deletados
        items = items.filter(item => !item.deleted);
        
        // Aplicar filtro de permissões de setores
        const allowedSetores = getAllowedSetores();
        if (allowedSetores !== null) {
            items = items.filter(item => allowedSetores.includes(item.setor));
        }
        
        // Aplica filtro de finalizados se o checkbox estiver desmarcado
        const showFinalized = document.getElementById('showFinalizedCheckbox')?.checked !== false;
        if (!showFinalized) {
            items = items.filter(item => {
                const statusNormalized = normalizeStatusName(item.status || '');
                return statusNormalized !== 'concluído' && statusNormalized !== 'cancelado';
            });
        }
        
        return items;
    }

    function getDateStrForFilterPrefix(prefix, item) {
        if (prefix === 'Audit') return item?.dataPrevisao;
        if (prefix === 'Train') return item?.dataPrevisao;
        if (prefix === 'Ativ') return item?.dataConclusao;
        if (prefix === 'Mant') return getMaintenanceCardDate(item); // Data (publicação)
        if (prefix === 'Doc') return getDocumentCardDate(item);      // Data (publicação)
        return null;
    }

    function passesDateFilter(prefix, item) {
        const dateType = document.getElementById(`f${prefix}DateType`)?.value || 'all';
        if (dateType === 'all') return true;

        const dateStr = getDateStrForFilterPrefix(prefix, item);
        if (!dateStr) return false;

        const itemDate = new Date(dateStr);
        if (Number.isNaN(itemDate.getTime())) return false;

        if (dateType === 'month') {
            const m = parseInt(document.getElementById(`f${prefix}Month`)?.value);
            const y = parseInt(document.getElementById(`f${prefix}YearForMonth`)?.value);
            if (itemDate.getMonth() !== m || itemDate.getFullYear() !== y) return false;
        } else if (dateType === 'year') {
            const y = parseInt(document.getElementById(`f${prefix}YearOnly`)?.value);
            if (itemDate.getFullYear() !== y) return false;
        } else if (dateType === 'custom') {
            const ini = document.getElementById(`f${prefix}DataIni`)?.value;
            const fim = document.getElementById(`f${prefix}DataFim`)?.value;
            if (ini && dateStr < ini) return false;
            if (fim && dateStr > fim) return false;
        }
        return true;
    }

    function passesOtherFilters(prefix, item) {
        // Backward compat: agora usa passesFilters (sem exclusões)
        return passesFilters(prefix, item, {});
    }

    function passesFilters(prefix, item, excluded = {}) {
    // 1. Setor
        if (!excluded.setor) {
            const setor = document.getElementById(`f${prefix}Setor`)?.value || '';
            if (setor && (item.setor || '') !== setor) return false;
        }

    // 2. Categoria
        if (!excluded.cat) {
            const cat = document.getElementById(`f${prefix}Cat`)?.value || '';
            if (cat && (item.categoria || '') !== cat) return false;
        }

    // 3. Subcategoria / Item / Equipamento
        if (!excluded.sub) {
            let subVal = '';
            if (prefix === 'Mant') subVal = document.getElementById('fMantItem')?.value || '';
            else subVal = document.getElementById(`f${prefix}Sub`)?.value || '';

            if (subVal) {
                const itemSub = (prefix === 'Mant') ? (item.item || '') : (item.subcategoria || '');
                if (itemSub !== subVal) return false;
            }
        }

    // 4. Status
        if (!excluded.status) {
            const stat = document.getElementById(`f${prefix}Status`)?.value || '';
            if (stat && (item.status || '') !== stat) return false;
        }

    // 5. Responsável (Adicionado/Corrigido para suportar Multi-select)
    if (!excluded.responsavel) {
        const filterResp = document.getElementById(`f${prefix}Responsavel`)?.value || '';
        if (filterResp) {
            // Obtém o campo de responsável dependendo da aba
            const itemRespRaw = (prefix === 'Mant') ? (item.responsavelTecnico || '') : (item.responsavel || '');
            // Usa sua função existente para normalizar (trata string ou JSON array)
            const normalizedItemResp = normalizeResponsavel(itemRespRaw);
            
            // Verifica se o responsável selecionado no filtro está contido no(s) responsável(eis) do item
            if (!normalizedItemResp.includes(filterResp.toLowerCase())) return false;
        }
    }

    // 6. Instrutor (Apenas para Treinamentos)
    if (prefix === 'Train' && !excluded.instrutor) {
        const filterInstr = document.getElementById('fTrainAuditor')?.value || '';
        if (filterInstr) {
            const itemInstr = (item.instrutor || '');
            if (itemInstr !== filterInstr) return false;
        }
    }
    
    // 7. Revisor (Exceto para Manutenção e Treinamentos)
    if (prefix !== 'Mant' && prefix !== 'Train' && !excluded.revisor) {
        const filterRev = document.getElementById(`f${prefix}Revisor`)?.value || '';
        if (filterRev) {
            const itemRev = (item.revisor || '');
            // Comparação exata para evitar nomes parciais (ex: "Ana" não pegar "Mariana")
            if (itemRev !== filterRev) return false;
        }
    }

    // 7. Marcador
        if (!excluded.marcador) {
            const marcador = document.getElementById(`f${prefix}Marcador`)?.value || '';
            if (marcador && (item.marcador || '') !== marcador) return false;
        }

    // 8. Tipo (Somente Manutenção)
        if (prefix === 'Mant' && !excluded.tipo) {
            const tipo = document.getElementById('fMantTipo')?.value || '';
            if (tipo && (item.tipo || '') !== tipo) return false;
        }

    // 9. Data
        if (!excluded.date) {
            if (!passesDateFilter(prefix, item)) return false;
        }

    // 10. Título (Lupa Search)
        if (!excluded.title) {
            if (titleSearchCardsEnabled && titleSearchCardsQuery) {
                if (!normalizeText(item.titulo || '').includes(titleSearchCardsQuery)) return false;
            }
        }

        return true;
    }

    function uniq(list) {
        return [...new Set((list || []).filter(Boolean))];
    }

    function setSelectOptions(el, placeholder, options, currentValue) {
        if (!el) return;
        const html = `<option value="">${placeholder}</option>` + options.map(v => `<option value="${v}">${v}</option>`).join('');
        el.innerHTML = html;
        if (currentValue && options.includes(currentValue)) el.value = currentValue;
        else el.value = '';
    }

    function getMasterSetores() {
        return (masterLists?.setores || []).slice();
    }
    function getMasterCategorias(prefix) {
        if (prefix === 'Audit') return (masterLists?.auditCategorias || []).slice();
        if (prefix === 'Train') return (masterLists?.trainCategorias || []).slice();
        if (prefix === 'Ativ') return (masterLists?.ativCategorias || []).slice();
        if (prefix === 'Mant') return (masterLists?.mantCategorias || []).slice();
        if (prefix === 'Doc') return (masterLists?.docCategorias || []).slice();
        return [];
    }
    function getMasterStatus(prefix) {
        if (prefix === 'Audit') return (masterLists?.auditStatus || []).slice();
        if (prefix === 'Train') return (masterLists?.trainStatus || []).slice();
        if (prefix === 'Ativ') return (masterLists?.ativStatus || []).slice();
        if (prefix === 'Mant') return (masterLists?.mantStatus || []).slice();
        if (prefix === 'Doc') return (masterLists?.docStatus || []).slice();
        return [];
    }
    function getMasterMarcadores(prefix) {
        if (prefix === 'Audit') return (masterLists?.auditMarcadores || []).slice();
        if (prefix === 'Train') return (masterLists?.trainMarcadores || []).slice();
        if (prefix === 'Ativ') return (masterLists?.ativMarcadores || []).slice();
        if (prefix === 'Mant') return (masterLists?.mantMarcadores || []).slice();
        if (prefix === 'Doc') return (masterLists?.docMarcadores || []).slice();
        return [];
    }

    function updateFilterFacetOptions(prefix) {
        // Setor
        {
            const el = document.getElementById(`f${prefix}Setor`);
            const currentValue = el?.value || '';
            const items = getItemsForFilterPrefix(prefix).filter(it => passesFilters(prefix, it, { setor: true }));
            const present = new Set(uniq(items.map(it => it.setor || '').filter(Boolean)));
            const master = getMasterSetores();
            const ordered = master.filter(v => present.has(v));
            const extras = [...present].filter(v => !master.includes(v)).sort();
            setSelectOptions(el, 'Setor: Todos', [...ordered, ...extras], currentValue);
        }

        // Categoria
        {
            const el = document.getElementById(`f${prefix}Cat`);
            const currentValue = el?.value || '';
            const items = getItemsForFilterPrefix(prefix).filter(it => passesFilters(prefix, it, { cat: true }));
            const present = new Set(uniq(items.map(it => it.categoria || '').filter(Boolean)));
            const master = getMasterCategorias(prefix);
            const ordered = master.filter(v => present.has(v));
            const extras = [...present].filter(v => !master.includes(v)).sort();
            setSelectOptions(el, 'Categoria: Todas', [...ordered, ...extras], currentValue);
        }

        // Status
        {
            const el = document.getElementById(`f${prefix}Status`);
            const currentValue = el?.value || '';
            const items = getItemsForFilterPrefix(prefix).filter(it => passesFilters(prefix, it, { status: true }));
            const present = new Set(uniq(items.map(it => it.status || '').filter(Boolean)));
            const master = getMasterStatus(prefix).map(s => s.name).filter(Boolean);
            const ordered = master.filter(v => present.has(v));
            const extras = [...present].filter(v => !master.includes(v)).sort();
            setSelectOptions(el, 'Status: Todos', [...ordered, ...extras], currentValue);
        }

        // Marcador
        {
            const el = document.getElementById(`f${prefix}Marcador`);
            if (el) {
                const currentValue = el?.value || '';
                const items = getItemsForFilterPrefix(prefix).filter(it => passesFilters(prefix, it, { marcador: true }));
                const present = new Set(uniq(items.map(it => it.marcador || '').filter(Boolean)));
                const master = getMasterMarcadores(prefix).map(m => m.name).filter(Boolean);
                const ordered = master.filter(v => present.has(v));
                const extras = [...present].filter(v => !master.includes(v)).sort();
                let options = [...ordered, ...extras];

                if (currentValue && !options.includes(currentValue)) {
                    options = [currentValue, ...options];
                }

                if (options.length > 0 || currentValue) {
                    el.style.display = 'block';
                    setSelectOptions(el, 'Marcador: Todos', options, currentValue || '');
                } else {
                    el.style.display = 'none';
                    el.value = '';
                }
            }
        }

        // Tipo (Manutenção)
        if (prefix === 'Mant') {
            const el = document.getElementById('fMantTipo');
            const currentValue = el?.value || '';
            const items = getItemsForFilterPrefix(prefix).filter(it => passesFilters(prefix, it, { tipo: true }));
            const present = new Set(uniq(items.map(it => it.tipo || '').filter(Boolean)));
            const master = (masterLists?.mantTipos || []).slice();
            const ordered = master.filter(v => present.has(v));
            const extras = [...present].filter(v => !master.includes(v)).sort();
            setSelectOptions(el, 'Tipo: Todos', [...ordered, ...extras], currentValue);
        }

    // Responsável - mostra apenas dos cards visíveis
    {
        const el = document.getElementById(`f${prefix}Responsavel`);
        if (el) {
            const currentValue = el?.value || '';
            const items = getItemsForFilterPrefix(prefix).filter(it => passesFilters(prefix, it, { responsavel: true }));
            const availableResponsaveis = new Set();
            items.forEach(item => {
                if (prefix === 'Mant') {
                    const respTec = normalizeResponsavel(item.responsavelTecnico);
                    if (respTec) availableResponsaveis.add(respTec);
                } else if (item.responsavel) {
                    const resp = normalizeResponsavel(item.responsavel);
                    if (resp) availableResponsaveis.add(resp);
                }
            });
            const realNames = new Set();
            [...availableResponsaveis].forEach(normalized => {
                const user = users?.find(u => u.name && u.name.toLowerCase() === normalized);
                if (user) {
                    realNames.add(user.name);
                } else {
                    const resp = masterLists.responsaveis?.find(r => r && r.toLowerCase() === normalized);
                    if (resp) realNames.add(resp);
                    else realNames.add(normalized);
                }
            });
            const sorted = [...realNames].sort((a, b) => a.localeCompare(b));
            const html = '<option value="">Responsável: Todos</option>' + sorted.map(r => `<option value="${r}">${r}</option>`).join('');
            el.innerHTML = html;
            el.value = currentValue;
            el.style.display = 'block';
        }
    }

    // Revisor - mostra apenas dos cards visíveis (CORRIGIDO)
    if (prefix !== 'Mant') {
        const revEl = document.getElementById(`f${prefix}Revisor`);
        if (revEl) {
            const currentRevValue = revEl.value || '';
            const items = getItemsForFilterPrefix(prefix).filter(it => passesFilters(prefix, it, { revisor: true }));
            const availableRevisores = new Set();
            items.forEach(item => {
                if (item.revisor) {
                    const rev = normalizeResponsavel(item.revisor);
                    if (rev) availableRevisores.add(rev);
                }
            });
            const realNames = new Set();
            [...availableRevisores].forEach(normalized => {
                const user = users?.find(u => u.name && u.name.toLowerCase() === normalized);
                if (user) {
                    realNames.add(user.name);
                } else {
                    const resp = masterLists.responsaveis?.find(r => r && r.toLowerCase() === normalized);
                    if (resp) realNames.add(resp);
                    else realNames.add(normalized);
                }
            });
            const sorted = [...realNames].sort((a, b) => a.localeCompare(b));
            const html = '<option value="">Revisor: Todos</option>' + sorted.map(r => `<option value="${r}">${r}</option>`).join('');
            revEl.innerHTML = html;
            revEl.value = currentRevValue;
            revEl.style.display = 'block';
        }
    }

    // Subcategoria/Item
        updateFilterSubcatOptions(prefix);
    }

    function updateFilterSubcatOptions(prefix) {
        const catSelect = document.getElementById(`f${prefix}Cat`);
        if (!catSelect) return;

        let subcatSelect;
        let listKey;
        let label;
        let valueGetter;

        if (prefix === 'Mant') {
            subcatSelect = document.getElementById(`f${prefix}Item`);
            listKey = 'mantItens';
            label = 'Item: Todos';
            valueGetter = (it) => it.item;
        } else {
            subcatSelect = document.getElementById(`f${prefix}Sub`);
            listKey = `${prefix.toLowerCase()}Subcats`;
            label = 'Subcategoria: Todas';
            valueGetter = (it) => it.subcategoria;
        }
        if (!subcatSelect) return;

        const selectedCat = catSelect.value;
        const currentSubcat = subcatSelect.value;

        let options = [];

        // Base: itens possíveis com os demais filtros (exclui o próprio filtro de subcat/item)
        const itemsPossible = getItemsForFilterPrefix(prefix).filter(it => passesFilters(prefix, it, { sub: true }));
        const present = new Set(uniq(itemsPossible.map(valueGetter)).filter(Boolean));

        if (selectedCat !== "") {
            // Categoria selecionada => usa array mestre daquela categoria,
            // porém oculta itens/subcats que não possuem cards visíveis com os demais filtros
            const masterArr = (masterLists?.[listKey]?.[selectedCat] || []).slice();
            const ordered = masterArr.filter(v => present.has(v));
            const extras = [...present].filter(v => !masterArr.includes(v)).sort();
            options = [...ordered, ...extras];
        } else {
            // Categoria = Todas => opções baseadas nos itens filtrados pelos demais filtros
            options = [...present].sort();
        }

        subcatSelect.innerHTML = `<option value="">${label}</option>` + options.map(v => `<option value="${v}">${v}</option>`).join('');

        // preserva seleção se ainda existir, senão volta para "Todos"
        if (options.includes(currentSubcat)) subcatSelect.value = currentSubcat;
        else subcatSelect.value = "";
    }

    // Funções de atualização em cascata para FILTROS
    function onFilterCategoryChange(prefix) {
        const catSelect = document.getElementById(`f${prefix}Cat`);
        if (!catSelect) return;

        updateFilterSubcatOptions(prefix);
        closeFilters();
        renderCards();
    }
    
    // Função de cálculo para Manutenção e Documentos (Periodicidade)
    function calculateNextDate(prefix = 'mant') {
        let ultima, intervaloId, proximaDisplayId, intervalValue;
    
        if (prefix === 'mant') {
            ultima = document.getElementById('mantUltima').value;
            intervaloId = 'mantIntervalo';
            proximaDisplayId = 'mantProxima';
            const intervalStr = (document.getElementById(intervaloId).value || '').trim();
            intervalValue = intervalStr === '' ? null : parseInt(intervalStr);
        } else if (prefix === 'doc') {
            ultima = document.getElementById('docDataCriacao').value; 
            intervaloId = 'docIntervalo';
            proximaDisplayId = 'docProximaRevisao';
            const intervalStr = (document.getElementById(intervaloId).value || '').trim();
            intervalValue = intervalStr === '' ? null : parseInt(intervalStr);
        } else {
            return;
        }
        
        if (!ultima) return;
        if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
            document.getElementById(proximaDisplayId).textContent = 'N/A';
            return;
        }
        if (ultima) {
            const next = new Date(ultima);
            next.setDate(next.getDate() + intervalValue);
            const nextStr = next.toISOString().split('T')[0];
            document.getElementById(proximaDisplayId).textContent = formatBR(nextStr);
        }
    }
    
    // --- TAB CONTROL ---
    function switchTab(tab) {
    currentTab = tab;
    
    // Fechar janela de filtros ao mudar de aba
    closeFilters();
    
    // 1. Gerenciamento visual dos botões da sidebar
    document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
    var tabId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    var btn = document.getElementById(tabId);
    if(btn) btn.classList.add('active');
    
    // 2. Atualização de títulos e subtítulos
    var titles = { 
        dashboard: 'Dashboard', 
        auditoria: 'Auditoria', 
        treinamentos: 'Treinamentos',
        atividades: 'Gestão de Atividades', 
        manutencao: 'Manutenção',
        documentos: 'Documentos', 
        backup: 'Backup do Sistema'
    };
    var subtitles = { 
        dashboard: 'Visão geral e indicadores de desempenho', 
        auditoria: 'Planejamento e execução de auditorias', 
        treinamentos: 'Planejamento e execução de treinamentos',
        atividades: 'Controle de tarefas, reuniões e projetos',
        manutencao: 'Controle preventivo de equipamentos',
        documentos: 'Gerenciamento e controle de revisões', 
        backup: 'Segurança dos dados'
    };
    
    document.getElementById('pageTitle').textContent = titles[tab];
    document.getElementById('pageSubtitle').textContent = subtitles[tab];
    
    // 3. Controle de visibilidade das seções principais
    var isBackup = tab === 'backup';
    var isDashboard = tab === 'dashboard';
    var isConfig = tab === 'configuracoes';

    // Garante que a busca por título só atue quando o campo estiver ativo/visível
    if (isDashboard) setTitleSearchEnabled('cards', false);
    else setTitleSearchEnabled('dash', false);

    document.getElementById('filtersBar').style.display = (isBackup || isDashboard || isConfig) ? 'none' : 'flex';
    document.getElementById('filtersBarDashboard').style.display = isDashboard ? 'flex' : 'none';

    // Kanban: controla grid vs board kanban
    var _isKanbanMode = tab === 'atividades' && typeof kanbanActive !== 'undefined' && kanbanActive;
    var _hideGrid = isBackup || isDashboard || isConfig || _isKanbanMode;
    document.getElementById('cardsGrid').style.display = _hideGrid ? 'none' : 'grid';
    var _kbBoard = document.getElementById('kanbanBoard');
    if (_kbBoard) _kbBoard.style.display = _isKanbanMode ? 'flex' : 'none';

    // Toggle Lista/Kanban — só aparece na aba atividades
    var _kbToggle = document.getElementById('viewToggleAtivBar');
    if (_kbToggle) _kbToggle.style.display = (tab === 'atividades') ? 'block' : 'none';
    
    // --- Controle do botão "Novo Registro" e "Nova Coluna" ---
    var addBtn    = document.getElementById('addBtn');
    var addColBtn = document.getElementById('addColBtn');
    var _isKanbanNow = tab === 'atividades' && typeof kanbanActive !== 'undefined' && kanbanActive;
    var canUserEdit  = userCanEditCards();
    var showActions  = !isBackup && !isDashboard && !isConfig && canUserEdit;

    if (addBtn)    addBtn.style.display    = (showActions && !_isKanbanNow) ? 'flex' : 'none';
    if (addColBtn) addColBtn.style.display = (showActions && _isKanbanNow)  ? 'flex' : 'none';
    
    // --- Controle do botão de LIXEIRA ---
    var trashBtn = document.getElementById('trashBtn');
    if (trashBtn) {
        // O botão de lixeira aparece se NÃO for backup/dash/config
        if (!isBackup && !isDashboard && !isConfig) {
            trashBtn.style.display = 'flex';
        } else {
            trashBtn.style.display = 'none';
        }
    }
    updateTrashBadge();
    
    // 4. Exibição do conteúdo específico das abas
    document.getElementById('backupContent').style.display = isBackup ? 'flex' : 'none';
    document.getElementById('dashboardContent').style.display = isDashboard ? 'flex' : 'none';
    var cfgEl = document.getElementById('configContent');
    if (cfgEl) {
        cfgEl.style.display = isConfig ? 'block' : 'none';
        if (isConfig) {
            renderusersConfigTable();
            // Atualiza o botão de setores se necessário
            if (masterLists && masterLists.setores && typeof updateSetoresButtonText === 'function') {
                updateSetoresButtonText();
            }
        }
    }

    // 5. Ativação dos grupos de filtros específicos
    document.getElementById('filtersAuditoria').style.display = tab === 'auditoria' ? 'flex' : 'none';
    document.getElementById('filtersTreinamentos').style.display = tab === 'treinamentos' ? 'flex' : 'none';
    document.getElementById('filtersAtividades').style.display = tab === 'atividades' ? 'flex' : 'none';
    document.getElementById('filtersDocumentos').style.display = tab === 'documentos' ? 'flex' : 'none'; 
    
    // 6. Renderização inicial dos dados da aba
    if(isDashboard) {
        renderDashboard();
    } else if(!isBackup && !isConfig) {
        renderCards();
    }
    
    // 7. Atualiza o contador de notificações para a aba
    updateNotificationCount();
    
    // 8. Salva os filtros no localStorage
    saveFiltersToLocalStorage();
}
    
    document.getElementById('tabDashboard').onclick = () => switchTab('dashboard'); 
    document.getElementById('tabAuditoria').onclick = () => switchTab('auditoria');
    document.getElementById('tabTreinamentos').onclick = () => switchTab('treinamentos');
    document.getElementById('tabAtividades').onclick = () => switchTab('atividades');
    document.getElementById('tabDocumentos').onclick = () => switchTab('documentos'); 
    document.getElementById('tabBackup').onclick = () => switchTab('backup');
    document.getElementById('tabConfiguracoes').onclick = () => {
        if (!userIsAdmin()) {
            alert('Aba Configurações disponível apenas para o usuário "admin".');
            return;
        }
        switchTab('configuracoes');
    };
    
    // Fechar notificações ao clicar fora do modal
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('notificationModal');
        const container = document.getElementById('notificationContainer');
        if (modal && !modal.contains(e.target) && !container.contains(e.target)) {
            closeNotificationModal();
        }
    });
    
// --- MODAL & FORM LOGIC (CORRIGIDA) ---

function resetModal(prefix) {
    // 1. Resetar campos comuns
    document.getElementById(`${prefix}Titulo`).value = '';
    document.getElementById(`${prefix}Descricao`).value = '';
    document.getElementById(`${prefix}Anexos`).innerHTML = '';

    // Lida com Responsáveis
    var respEl = document.getElementById(`${prefix}Responsavel`);
    if (respEl) respEl.value = '';

    // Lida com Revisores (exceto em manutenção)
    if (prefix !== 'mant') {
        const revEl = document.getElementById(`${prefix}Revisor`);
        if (revEl) revEl.value = '';
    }

        // Marcador (select)
        const markEl = document.getElementById(`${prefix}Marcador`);
        if (markEl && markEl.options.length > 0) markEl.selectedIndex = 0;
    
    // Define o Setor
    var defaultSetor = masterLists.setores[0] || '';
    document.getElementById(`${prefix}Setor`).value = defaultSetor;
    
    // Define o Status (seleciona o primeiro, se houver)
    if (document.getElementById(`${prefix}Status`).options.length > 0) {
        document.getElementById(`${prefix}Status`).selectedIndex = 0;
    }

    // 2. Resetar campos específicos e cálculos

    if (prefix === 'audit') {
        document.getElementById('auditDataPublicacao').value = today();
        document.getElementById('auditDataPrevisao').value = today();
        document.getElementById('auditFlagDias').value = 7;
        document.getElementById('auditAuditor').value = '';
        const defaultAuditCat = masterLists.auditCategorias[0] || '';
        document.getElementById('auditCategoria').value = defaultAuditCat;
    } else if (prefix === 'train') {
        document.getElementById('trainDataPublicacao').value = today();
        document.getElementById('trainPeriodicidade').value = 0;
        document.getElementById('trainDataPrevisao').textContent = '--/--/----';
        document.getElementById('trainDataPrevisaoValue').value = '';
        document.getElementById('trainFlagDias').value = 7;
        document.getElementById('trainInstrutor').value = '';
        document.getElementById('trainParticipantes').value = '';
        document.getElementById('trainLocalEvento').value = '';
        document.getElementById('trainCargaHorariaHoras').value = '';
        document.getElementById('trainCargaHorariaMinutos').value = '';
        const defaultTrainCat = masterLists.trainCategorias[0] || '';
        document.getElementById('trainCategoria').value = defaultTrainCat;
    } else if (prefix === 'ativ') {
        document.getElementById('ativDataInicio').value = today();
        document.getElementById('ativDataConclusao').value = today();
        document.getElementById('ativFlagDias').value = 3;
        const defaultAtivCat = masterLists.ativCategorias[0] || '';
        document.getElementById('ativCategoria').value = defaultAtivCat;
    } else if (prefix === 'mant') {
        document.getElementById('mantUltima').value = today();
        document.getElementById('mantIntervalo').value = 30;
        document.getElementById('mantEmpresaResponsavel').value = '';
        document.getElementById('mantResponsavelTecnico').value = '';
        document.getElementById('mantResponsavelManutencao').value = '';
        document.getElementById('mantFlagDias').value = 7;
        const defaultMantCat = masterLists.mantCategorias[0] || '';
        document.getElementById('mantCategoria').value = defaultMantCat;
        document.getElementById('mantTipo').value = '';
        calculateNextDate('mant');
    } else if (prefix === 'doc') {
        document.getElementById('docDataCriacao').value = today();
        document.getElementById('docIntervalo').value = 365;
        document.getElementById('docRevisor').value = '';
        document.getElementById('docFlagDias').value = 30;
        const defaultDocCat = masterLists.docCategorias[0] || '';
        document.getElementById('docCategoria').value = defaultDocCat;
        calculateNextDate('doc');
    }

    // 3. Chamar onCategoryChange após definir a categoria (se a categoria existir)
    var catEl = document.getElementById(`${prefix}Categoria`);
    if (catEl) onCategoryChange(prefix);
}


    document.getElementById('addBtn').onclick = () => {
        originalItem = null;
    
        if (currentTab === 'auditoria') {
            editingAuditId = null;
            resetModal('audit');
            document.getElementById('modalAuditoria').style.display = 'flex';
        } else if (currentTab === 'treinamentos') {
            editingTrainId = null;
            resetModal('train');
            document.getElementById('modalTreinamentos').style.display = 'flex';
        } else if (currentTab === 'atividades') {
            editingAtivId = null;
            resetModal('ativ');
            document.getElementById('modalAtividades').style.display = 'flex';
        } else if (currentTab === 'manutencao') {
            editingMantId = null;
            resetModal('mant');
            document.getElementById('modalManutencao').style.display = 'flex';
        } else if (currentTab === 'documentos') { 
            editingDocId = null;
            resetModal('doc');
            document.getElementById('modalDocumentos').style.display = 'flex';
        }
    };
    
    
    // Função para sincronizar referências em todos os cards quando um item de lista é alterado
    function syncReferenceAcrossCards(cardType, fieldName, oldValue, newValue) {
        if (!oldValue || oldValue === newValue) return; // Não atualiza se não mudou
        
        // Função auxiliar para atualizar cards de um tipo
        const updateCardArray = (cardArray) => {
            cardArray.forEach(card => {
                if (card[fieldName] === oldValue) {
                    card[fieldName] = newValue;
                }
            });
        };
        
        // Atualiza o tipo de card correto
        if (cardType === 'audit' || cardType === 'auditoria') {
            updateCardArray(audits);
        } else if (cardType === 'ativ' || cardType === 'atividades') {
            updateCardArray(activities);
        } else if (cardType === 'mant' || cardType === 'manutencao') {
            updateCardArray(maintenances);
        } else if (cardType === 'doc' || cardType === 'documentos') {
            updateCardArray(documents);
        }
    }
    
    function editItem(id, tab) {
        if (!userCanEditCards()) {
            alert('Você não tem permissão para editar cards. Seu acesso está configurado como somente leitura.');
            return;
        }
        
        // Busca o item em todos os arrays se não encontrar no tab especificado
        let item = null;
        let finalTab = tab;
        
        if (tab === 'audit' || tab === 'auditoria') {
            item = audits.find(a => a.id === id);
            finalTab = 'auditoria';
        } else if (tab === 'train' || tab === 'treinamentos') {
            item = trainings.find(t => t.id === id);
            finalTab = 'treinamentos';
        } else if (tab === 'ativ' || tab === 'atividades') {
            item = activities.find(a => a.id === id);
            finalTab = 'atividades';
        } else if (tab === 'mant' || tab === 'manutencao') {
            item = maintenances.find(m => m.id === id);
            finalTab = 'manutencao';
        } else if (tab === 'doc' || tab === 'documentos') {
            item = documents.find(d => d.id === id);
            finalTab = 'documentos';
        }
        
        // Se não encontrou, tenta procurar em todos os arrays
        if (!item) {
            item = audits.find(a => a.id === id);
            if (item) finalTab = 'auditoria';
            else {
                item = trainings.find(t => t.id === id);
                if (item) finalTab = 'treinamentos';
            else {
                item = activities.find(a => a.id === id);
                if (item) finalTab = 'atividades';
                else {
                    item = maintenances.find(m => m.id === id);
                    if (item) finalTab = 'manutencao';
                    else {
                        item = documents.find(d => d.id === id);
                        if (item) finalTab = 'documentos';
                        }
                    }
                }
            }
        }
        
        if (!item) {
            alert('Item não encontrado.');
            return;
        }
        
        if (finalTab === 'auditoria') {
            editingAuditId = id;
            document.getElementById('auditTitulo').value = item.titulo;
            document.getElementById('auditDescricao').value = item.descricao;
            document.getElementById('auditSetor').value = item.setor || ''; 
            document.getElementById('auditCategoria').value = item.categoria;
            onCategoryChange('audit'); 
            var auditSubEl = document.getElementById('auditSub');
            if (auditSubEl) auditSubEl.value = item.subcategoria || '';
            document.getElementById('auditStatus').value = item.status;
            document.getElementById('auditDataPublicacao').value = item.dataPublicacao;
            document.getElementById('auditDataPrevisao').value = item.dataPrevisao;
            let auditResp = item.responsavel;
            if (Array.isArray(auditResp)) auditResp = auditResp[0];
            else if (typeof auditResp === 'string' && auditResp.startsWith('[')) {
                try { auditResp = JSON.parse(auditResp)[0]; } catch {}
            }
            document.getElementById('auditResponsavel').value = auditResp || '';
            let auditRev = item.revisor;
            if (Array.isArray(auditRev)) auditRev = auditRev[0];
            else if (typeof auditRev === 'string' && auditRev.startsWith('[')) {
                try { auditRev = JSON.parse(auditRev)[0]; } catch {}
            }
            document.getElementById('auditRevisor').value = auditRev || '';
            let auditAud = item.auditor;
            if (Array.isArray(auditAud)) auditAud = auditAud[0];
            else if (typeof auditAud === 'string' && auditAud.startsWith('[')) {
                try { auditAud = JSON.parse(auditAud)[0]; } catch {}
            }
            document.getElementById('auditAuditor').value = auditAud || '';
            document.getElementById('auditFlagDias').value = item.flagDias; // Corrigido
            document.getElementById('auditMarcador').value = item.marcador || '';
            restoreAnexos('audit', item.anexos);
            document.getElementById('modalAuditoria').style.display = 'flex';
        } else if (finalTab === 'atividades') {
            editingAtivId = id;
            document.getElementById('ativTitulo').value = item.titulo;
            document.getElementById('ativDescricao').value = item.descricao;
            document.getElementById('ativSetor').value = item.setor || ''; 
            document.getElementById('ativCategoria').value = item.categoria;
            onCategoryChange('ativ');
            var ativSubEl = document.getElementById('ativSub');
            if (ativSubEl) ativSubEl.value = item.subcategoria || '';
            document.getElementById('ativStatus').value = item.status;
            document.getElementById('ativDataInicio').value = item.dataInicio;
            document.getElementById('ativDataConclusao').value = item.dataConclusao;
            let ativResp = item.responsavel;
            if (Array.isArray(ativResp)) ativResp = ativResp[0];
            else if (typeof ativResp === 'string' && ativResp.startsWith('[')) {
                try { ativResp = JSON.parse(ativResp)[0]; } catch {}
            }
            document.getElementById('ativResponsavel').value = ativResp || ''; 
            let ativRev = item.revisor;
            if (Array.isArray(ativRev)) ativRev = ativRev[0];
            else if (typeof ativRev === 'string' && ativRev.startsWith('[')) {
                try { ativRev = JSON.parse(ativRev)[0]; } catch {}
            }
            document.getElementById('ativRevisor').value = ativRev || '';
            document.getElementById('ativFlagDias').value = item.flagDias; // Corrigido
            document.getElementById('ativMarcador').value = item.marcador || '';
            restoreAnexos('ativ', item.anexos);
            document.getElementById('modalAtividades').style.display = 'flex';
        } else if (finalTab === 'treinamentos') {
            editingTrainId = id;
            document.getElementById('trainTitulo').value = item.titulo;
            document.getElementById('trainDescricao').value = item.descricao;
            document.getElementById('trainSetor').value = item.setor || ''; 
            document.getElementById('trainCategoria').value = item.categoria;
            onCategoryChange('train'); 
            var trainSubEl = document.getElementById('trainSub');
            if (trainSubEl) trainSubEl.value = item.subcategoria || '';
            document.getElementById('trainStatus').value = item.status;
            document.getElementById('trainDataPublicacao').value = item.dataPublicacao;
            document.getElementById('trainPeriodicidade').value = item.periodicidade || 0;
            document.getElementById('trainDataPrevisaoValue').value = item.dataPrevisao || '';
            // Atualiza o display da data de previsão
            const prevDiv = document.getElementById('trainDataPrevisao');
            if (item.dataPrevisao && item.periodicidade > 0) {
                prevDiv.textContent = formatBR(item.dataPrevisao);
            } else {
                prevDiv.textContent = '--/--/----';
            }
            let trainResp = item.responsavel;
            if (Array.isArray(trainResp)) trainResp = trainResp[0];
            else if (typeof trainResp === 'string' && trainResp.startsWith('[')) {
                try { trainResp = JSON.parse(trainResp)[0]; } catch {}
            }
            document.getElementById('trainResponsavel').value = trainResp || '';
            document.getElementById('trainInstrutor').value = item.instrutor || '';
            document.getElementById('trainParticipantes').value = item.participantes || '';
            document.getElementById('trainLocalEvento').value = item.localEvento || '';
            // Separar carga horária em horas e minutos numéricos
            if (item.cargaHoraria && item.cargaHoraria.includes(':')) {
                const [horas, minutos] = item.cargaHoraria.split(':');
                document.getElementById('trainCargaHorariaHoras').value = parseInt(horas) || 0;
                document.getElementById('trainCargaHorariaMinutos').value = parseInt(minutos) || 0;
            } else {
                document.getElementById('trainCargaHorariaHoras').value = '';
                document.getElementById('trainCargaHorariaMinutos').value = '';
            }
            document.getElementById('trainFlagDias').value = item.flagDias;
            document.getElementById('trainMarcador').value = item.marcador || '';
            restoreAnexos('train', item.anexos);
            document.getElementById('modalTreinamentos').style.display = 'flex';
            
            // Armazena o item original no estado atual para calcular as diferenças ao salvar
            originalItem = JSON.parse(JSON.stringify(item));
        } else if (finalTab === 'manutencao') {
            editingMantId = id;
            document.getElementById('mantTitulo').value = item.titulo;
            document.getElementById('mantDescricao').value = item.descricao;
            document.getElementById('mantSetor').value = item.setor || ''; 
            document.getElementById('mantCategoria').value = item.categoria;
            onCategoryChange('mant'); 
            document.getElementById('mantItem').value = item.item;
            document.getElementById('mantTipo').value = item.tipo || '';
            document.getElementById('mantUltima').value = item.ultima;
            document.getElementById('mantIntervalo').value = (item.intervalo ?? ''); // permite vazio
            let mantResp = item.responsavelTecnico;
            if (Array.isArray(mantResp)) mantResp = mantResp[0];
            else if (typeof mantResp === 'string' && mantResp.startsWith('[')) {
                try { mantResp = JSON.parse(mantResp)[0]; } catch {}
            }
            document.getElementById('mantResponsavelTecnico').value = mantResp || ''; 
            document.getElementById('mantResponsavelManutencao').value = item.responsavelManutencao || '';
            document.getElementById('mantEmpresaResponsavel').value = item.empresaResponsavel || ''; 
            document.getElementById('mantStatus').value = item.status;
            document.getElementById('mantFlagDias').value = item.flagDias; // Corrigido
            calculateNextDate('mant');
            restoreAnexos('mant', item.anexos);
            document.getElementById('mantMarcador').value = item.marcador || '';
            document.getElementById('modalManutencao').style.display = 'flex';
        } else if (finalTab === 'documentos') { 
            editingDocId = id;
            document.getElementById('docTitulo').value = item.titulo;
            document.getElementById('docDescricao').value = item.descricao;
            document.getElementById('docSetor').value = item.setor || ''; 
            document.getElementById('docCategoria').value = item.categoria;
            onCategoryChange('doc'); 
            var docSubEl = document.getElementById('docSub');
            if (docSubEl) docSubEl.value = item.subcategoria || '';
            document.getElementById('docStatus').value = item.status;
            document.getElementById('docDataCriacao').value = item.dataCriacao;
            document.getElementById('docIntervalo').value = (item.docIntervalo ?? ''); // permite vazio
            let docResp = item.responsavel;
            if (Array.isArray(docResp)) docResp = docResp[0];
            else if (typeof docResp === 'string' && docResp.startsWith('[')) {
                try { docResp = JSON.parse(docResp)[0]; } catch {}
            }
            document.getElementById('docResponsavel').value = docResp || '';
            let docRev = item.revisor;
            if (Array.isArray(docRev)) docRev = docRev[0];
            else if (typeof docRev === 'string' && docRev.startsWith('[')) {
                try { docRev = JSON.parse(docRev)[0]; } catch {}
            }
            document.getElementById('docRevisor').value = docRev || '';
            document.getElementById('docFlagDias').value = item.flagDias; // Corrigido
            calculateNextDate('doc');
            restoreAnexos('doc', item.anexos);
            document.getElementById('docMarcador').value = item.marcador || '';
            document.getElementById('modalDocumentos').style.display = 'flex';
        }

    }

    function deleteItem(id, tab) {
        if (!currentuser) {
            alert('Você precisa estar logado para excluir registros.');
            return;
        }
        if (!userCanDeleteCards()) {
            alert('Você não tem permissão para fazer isso');
            return;
        }
        if (!confirm('Deseja mover este item para a lixeira? Os dados serão preservados e podem ser restaurados por um administrador.')) {
            return;
        }

        // SOFT DELETE: Marcar item como deleted ao invés de remover do array
        const now = new Date().toISOString();
        const deletedBy = currentuser.email || currentuser.name || 'unknown';

        let item = null;
        if (tab === 'auditoria' || tab === 'audit') {
            item = audits.find(a => String(a.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }
        else if (tab === 'treinamentos' || tab === 'train') {
            item = trainings.find(t => String(t.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }
        else if (tab === 'atividades' || tab === 'ativ') {
            item = activities.find(a => String(a.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }
        else if (tab === 'manutencao' || tab === 'mant') {
            item = maintenances.find(m => String(m.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }
        else if (tab === 'documentos' || tab === 'doc') {
            item = documents.find(d => String(d.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }

        if (item) {
            alert('Item ocultado com sucesso. Os dados foram preservados no banco de dados.');
            saveAll();
            renderCards();
            updateTrashBadge();
        }
    }

    // SOFT DELETE: Função para restaurar itens deletados (apenas admin)
    function restoreDeletedItem(id, tab) {
        if (!userIsAdmin()) {
            alert('Apenas administradores podem restaurar itens deletados.');
            return;
        }

        if (!confirm('Deseja restaurar este item da lixeira?')) {
            return;
        }

        let item = null;
        if (tab === 'auditoria' || tab === 'audit') {
            item = audits.find(a => String(a.id) === String(id));
        }
        else if (tab === 'treinamentos' || tab === 'train') {
            item = trainings.find(t => String(t.id) === String(id));
        }
        else if (tab === 'atividades' || tab === 'ativ') {
            item = activities.find(a => String(a.id) === String(id));
        }
        else if (tab === 'manutencao' || tab === 'mant') {
            item = maintenances.find(m => String(m.id) === String(id));
        }
        else if (tab === 'documentos' || tab === 'doc') {
            item = documents.find(d => String(d.id) === String(id));
        }

        if (item && item.deleted) {
            item.deleted = false;
            item.restoredAt = new Date().toISOString();
            item.restoredBy = currentuser.email || currentuser.name || 'admin';
            
            // Adicionar ao histórico a ação de restauração
            if (!item.historico) item.historico = [];
            item.historico.push({
                timestamp: new Date().toISOString(),
                usuario: item.restoredBy,
                acao: 'Restaurado',
                detalhes: [`Item restaurado pelo usuário ${item.restoredBy}`]
            });
            
            alert('Item restaurado com sucesso!');
            saveAll();
            renderCards();
            
            // Atualizar a lixeira se estiver aberta
            if (document.getElementById('modalTrashBin').style.display === 'flex') {
                openTrashBin();
            }
            updateTrashBadge();
        }
    }

    function getTrashCount() {
        if (currentTab === 'auditoria') {
            return audits.filter(item => item && item.deleted).length;
        }
        if (currentTab === 'treinamentos') {
            return trainings.filter(item => item && item.deleted).length;
        }
        if (currentTab === 'atividades') {
            return activities.filter(item => item && item.deleted).length;
        }
        if (currentTab === 'manutencao') {
            return maintenances.filter(item => item && item.deleted).length;
        }
        if (currentTab === 'documentos') {
            return documents.filter(item => item && item.deleted).length;
        }
        return 0;
    }

    function updateTrashBadge() {
        const badge = document.getElementById('trashBadge');
        if (!badge) return;
        const count = getTrashCount();
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.textContent = '';
            badge.classList.add('hidden');
        }
    }

    // SOFT DELETE: Função para abrir e exibir lixeira (apenas itens da aba atual)
    function openTrashBin() {
        const trashContent = document.getElementById('trashContent');
        trashContent.innerHTML = '';
        
        // Coletar apenas os itens deletados da aba atual
        let deletedItems = [];
        
        if (currentTab === 'auditoria') {
            audits.forEach(a => {
                if (a.deleted) {
                    deletedItems.push({ 
                        id: a.id, 
                        tab: 'auditoria', 
                        titulo: a.titulo, 
                        tipo: 'Auditoria',
                        setor: a.setor,
                        deletedAt: a.deletedAt, 
                        deletedBy: a.deletedBy 
                    });
                }
            });
        } else if (currentTab === 'treinamentos') {
            trainings.forEach(t => {
                if (t.deleted) {
                    deletedItems.push({ 
                        id: t.id, 
                        tab: 'treinamentos', 
                        titulo: t.titulo, 
                        tipo: 'Treinamento',
                        setor: t.setor,
                        deletedAt: t.deletedAt, 
                        deletedBy: t.deletedBy 
                    });
                }
            });
        } else if (currentTab === 'atividades') {
            activities.forEach(a => {
                if (a.deleted) {
                    deletedItems.push({ 
                        id: a.id, 
                        tab: 'atividades', 
                        titulo: a.titulo, 
                        tipo: 'Atividade',
                        setor: a.setor,
                        deletedAt: a.deletedAt, 
                        deletedBy: a.deletedBy 
                    });
                }
            });
        } else if (currentTab === 'manutencao') {
            maintenances.forEach(m => {
                if (m.deleted) {
                    deletedItems.push({ 
                        id: m.id, 
                        tab: 'manutencao', 
                        titulo: m.titulo || m.categoria, 
                        tipo: 'Manutenção',
                        setor: m.setor,
                        deletedAt: m.deletedAt, 
                        deletedBy: m.deletedBy 
                    });
                }
            });
        } else if (currentTab === 'documentos') {
            documents.forEach(d => {
                if (d.deleted) {
                    deletedItems.push({ 
                        id: d.id, 
                        tab: 'documentos', 
                        titulo: d.titulo, 
                        tipo: 'Documento',
                        setor: d.setor,
                        deletedAt: d.deletedAt, 
                        deletedBy: d.deletedBy 
                    });
                }
            });
        }
        
        if (deletedItems.length === 0) {
            trashContent.innerHTML = '<div style="text-align:center; padding:40px; color:#6b7280;"><i class="fas fa-check-circle" style="font-size:48px; margin-bottom:16px; display:block;"></i>Nenhum item na lixeira</div>';
        } else {
            // Ordenar por data de deletação (mais recente primeiro)
            deletedItems.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
            
            let html = '<table style="width:100%; border-collapse:collapse; font-size:14px;">';
            html += '<thead><tr style="border-bottom:2px solid var(--border); background:var(--bg);">';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Título</th>';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Tipo</th>';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Setor</th>';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Deletado por</th>';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Data</th>';
            html += '<th style="padding:12px; text-align:center; font-weight:600;">Ações</th>';
            html += '</tr></thead><tbody>';
            
            deletedItems.forEach(item => {
                const deletedDate = new Date(item.deletedAt).toLocaleDateString('pt-BR') + ' ' + new Date(item.deletedAt).toLocaleTimeString('pt-BR');
                const isAdmin = userIsAdmin();
                
                html += `<tr style="border-bottom:1px solid var(--border); transition:background 0.2s;" onmouseover="this.style.background='rgba(37,99,235,0.05)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:12px; font-weight:500;">${item.titulo}</td>
                    <td style="padding:12px;"><span style="background:var(--accent); color:white; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:500;">${item.tipo}</span></td>
                    <td style="padding:12px;">${item.setor || 'ND'}</td>
                    <td style="padding:12px;">${item.deletedBy || 'desconhecido'}</td>
                    <td style="padding:12px; font-size:12px; color:#6b7280;">${deletedDate}</td>
                    <td style="padding:12px; text-align:center; white-space:nowrap;">
                        <button onclick="closeModal('modalTrashBin'); openView(${item.id}, '${item.tab}')" title="Visualizar" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:500; margin-right:4px; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${isAdmin ? `<button onclick="restoreDeletedItem(${item.id}, '${item.tab}')" title="Restaurar" style="background:#22c55e; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:500; margin-right:4px; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-undo"></i>
                        </button>` : ''}
                        ${isAdmin ? `<button onclick="permanentlyDeleteItem(${item.id}, '${item.tab}')" title="Deletar permanentemente" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:500; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-times"></i>
                        </button>` : ''}
                    </td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            trashContent.innerHTML = html;
        }
        
        document.getElementById('modalTrashBin').style.display = 'flex';
    }
    
    // SOFT DELETE: Função para deletar permanentemente (apenas admin)
    function permanentlyDeleteItem(id, tab) {
        if (!userIsAdmin()) {
            alert('Apenas administradores podem deletar permanentemente itens.');
            return;
        }
        
        const confirmation = prompt('⚠️ DELEÇÃO PERMANENTE IRREVERSÍVEL ⚠️\n\nDigite "SIM" (em maiúsculo) para confirmar a exclusão permanente do item:');
        if (confirmation !== 'SIM') {
            alert('Operação cancelada. A exclusão permanente não foi realizada.');
            return;
        }
        
        // Encontrar e remover o item de forma permanente
        if (tab === 'auditoria' || tab === 'audit') {
            const index = audits.findIndex(a => String(a.id) === String(id));
            if (index > -1) {
                audits.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        else if (tab === 'treinamentos' || tab === 'train') {
            const index = trainings.findIndex(t => String(t.id) === String(id));
            if (index > -1) {
                trainings.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        else if (tab === 'atividades' || tab === 'ativ') {
            const index = activities.findIndex(a => String(a.id) === String(id));
            if (index > -1) {
                activities.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        else if (tab === 'manutencao' || tab === 'mant') {
            const index = maintenances.findIndex(m => String(m.id) === String(id));
            if (index > -1) {
                maintenances.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        else if (tab === 'documentos' || tab === 'doc') {
            const index = documents.findIndex(d => String(d.id) === String(id));
            if (index > -1) {
                documents.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        
        saveAll();
        openTrashBin(); // Atualiza a lixeira
        updateTrashBadge();
    }
    
    // Anexos Logic
    function addAnexo(prefix) {
        const container = document.getElementById(prefix + 'Anexos');
        const div = document.createElement('div');
        div.className = 'anexo-item';
        div.innerHTML = `
            <i class="fas fa-link"></i>
            <input placeholder="Título do arquivo" class="anexo-title">
            <input placeholder="Cole a URL aqui..." class="anexo-url">
            <i class="fas fa-times" style="cursor:pointer; color:var(--ind-red)" onclick="this.parentElement.remove()"></i>
        `;
        container.appendChild(div);
    }
    function getAnexos(prefix) {
    // Seleciona as linhas de anexo específicas do container do modal aberto
    var container = document.getElementById(prefix + 'Anexos');
    if (!container) return [];
    
    return [...container.querySelectorAll('.anexo-item')].map(row => {
        const titleInput = row.querySelector('.anexo-title');
        const urlInput = row.querySelector('.anexo-url');
        return {
            titulo: titleInput ? titleInput.value : '',
            url: urlInput ? urlInput.value : ''
        };
    }).filter(a => a.url.trim() !== ''); // Só persiste se a URL não estiver vazia
}

    function restoreAnexos(prefix, list) {
        const container = document.getElementById(prefix + 'Anexos');
        container.innerHTML = '';
        (list || []).forEach(a => {
            addAnexo(prefix);
            const row = container.lastChild;
            row.querySelector('.anexo-title').value = a.titulo;
            row.querySelector('.anexo-url').value = a.url;
        });
    }
    
    // View Modal e Histórico com Paginação
    function openView(id, tab) {
        currentHistoryPage = 1; // Garante que a primeira página seja carregada
        currentViewItemId = id;
        currentViewTab = tab;
        renderViewContent(id, tab);
    }
    
    function changeHistoryPage(id, tab, direction) {
        currentHistoryPage += direction;
        
        // Normaliza o tab para garantir consistência
        let normalizedTab = tab;
        if (tab === 'audit') normalizedTab = 'auditoria';
        else if (tab === 'train') normalizedTab = 'treinamentos';
        else if (tab === 'ativ') normalizedTab = 'atividades';
        else if (tab === 'mant' || tab === 'manutencao') normalizedTab = 'manutencao';
        else if (tab === 'doc' || tab === 'documentos') normalizedTab = 'documentos';
        
        renderViewContent(id, normalizedTab);
    }

function renderViewContent(id, tab) {
    var item, statusList, finalTab = tab;
    
    // Normaliza o tab para os valores esperados
    if (tab === 'audit') finalTab = 'auditoria';
    else if (tab === 'train') finalTab = 'treinamentos';
    else if (tab === 'ativ') finalTab = 'atividades';
    else if (tab === 'mant' || tab === 'manutencao') finalTab = 'manutencao';
    else if (tab === 'doc' || tab === 'documentos') finalTab = 'documentos';
    
    // Tenta encontrar o item no array correto
    if (finalTab === 'auditoria') { 
        item = audits.find(i => i.id === id); 
        statusList = masterLists.auditStatus; 
    } else if (finalTab === 'treinamentos') { 
        item = trainings.find(i => i.id === id); 
        statusList = masterLists.trainStatus; 
    } else if (finalTab === 'atividades') { 
        item = activities.find(i => i.id === id); 
        statusList = masterLists.ativStatus; 
    } else if (finalTab === 'manutencao') { 
        item = maintenances.find(i => i.id === id); 
        statusList = masterLists.mantStatus; 
    } else if (finalTab === 'documentos') { 
        item = documents.find(i => i.id === id); 
        statusList = masterLists.docStatus; 
    }
    
    // Se não encontrou, procura em todos os arrays
    if (!item) {
        item = audits.find(i => i.id === id);
        if (item) {
            finalTab = 'auditoria';
            statusList = masterLists.auditStatus;
        } else {
            item = activities.find(i => i.id === id);
            if (item) {
                finalTab = 'atividades';
                statusList = masterLists.ativStatus;
            } else {
                item = maintenances.find(i => i.id === id);
                if (item) {
                    finalTab = 'manutencao';
                    statusList = masterLists.mantStatus;
                } else {
                    item = documents.find(i => i.id === id);
                    if (item) {
                        finalTab = 'documentos';
                        statusList = masterLists.docStatus;
                    } else {
                        item = trainings.find(i => i.id === id);
                        if (item) {
                            finalTab = 'treinamentos';
                            statusList = masterLists.trainStatus;
                        }
                    }
                }
            }
        }
    }

    if (!item) return;

    var statusObj = (statusList || []).find(s => s.name === item.status) || { color: 'default' };
    var statusColorVar = colorMap[statusObj.color] || colorMap['default'];
    
    // Montagem do Grid de Detalhes
    var detailsGrid = '';
    if (finalTab === 'auditoria') {
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria}</div></div>
            <div class="view-item"><label>Responsável</label><div>${item.responsavel || 'ND'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${item.revisor || 'ND'}</div></div>
            <div class="view-item"><label>Auditor</label><div>${item.auditor || 'ND'}</div></div>
            <div class="view-item"><label>Publicação</label><div>${formatBR(item.dataPublicacao)}</div></div>
            <div class="view-item"><label>Previsão</label><div>${formatBR(item.dataPrevisao)}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    } else if (finalTab === 'atividades') {
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria}</div></div>
            <div class="view-item"><label>Responsável</label><div>${item.responsavel || 'ND'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${item.revisor || 'ND'}</div></div>
            <div class="view-item"><label>Data Início</label><div>${formatBR(item.dataInicio)}</div></div>
            <div class="view-item"><label>Data Conclusão</label><div>${formatBR(item.dataConclusao)}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    } else if (finalTab === 'manutencao') {
        const isNA = isBlankPeriodicity(item.intervalo);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Tipo</label><div>${item.tipo || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria}</div></div>
            <div class="view-item"><label>Equipamento</label><div>${item.item}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${item.intervalo} dias`}</div></div>
            <div class="view-item"><label>Última Manutenção</label><div>${formatBR(item.ultima)}</div></div>
            <div class="view-item"><label>Próxima Manutenção</label><div>${isNA ? 'N/A' : formatBR(item.proxima)}</div></div>
            <div class="view-item"><label>Responsável Técnico</label><div>${item.responsavelTecnico || 'ND'}</div></div>
            <div class="view-item"><label>Responsável pela Manutenção</label><div>${item.responsavelManutencao || 'ND'}</div></div>
            <div class="view-item"><label>Empresa Responsável</label><div>${item.empresaResponsavel || 'ND'}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    } else if (finalTab === 'treinamentos') {
        const isNA = isBlankPeriodicity(item.periodicidade);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria || '-'}</div></div>
            <div class="view-item"><label>Responsável</label><div>${item.responsavel || 'ND'}</div></div>
            <div class="view-item"><label>Instrutor</label><div>${item.instrutor || 'ND'}</div></div>
            <div class="view-item"><label>Local do Evento</label><div>${item.localEvento || 'ND'}</div></div>
            <div class="view-item"><label>Carga Horária</label><div>${item.cargaHoraria || 'ND'}</div></div>
            <div class="view-item"><label>Participantes</label><div>${item.participantes || 'ND'}</div></div>
            <div class="view-item"><label>Data Publicação</label><div>${formatBR(item.dataPublicacao)}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${item.periodicidade} dias`}</div></div>
            <div class="view-item"><label>Data Previsão</label><div>${isNA ? 'N/A' : formatBR(item.dataPrevisao)}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    } else if (finalTab === 'documentos') { 
        const isNA = isBlankPeriodicity(item.docIntervalo);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${item.docIntervalo} dias`}</div></div>
            <div class="view-item"><label>Responsável</label><div>${item.responsavel || 'ND'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${item.revisor || 'ND'}</div></div>
            <div class="view-item"><label>Data do Documento</label><div>${formatBR(item.dataCriacao)}</div></div>
            <div class="view-item"><label>Próx. Revisão</label><div>${isNA ? 'N/A' : formatBR(item.dataProximaRevisao)}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    }

    var anexosHtml = (item.anexos || []).map(a => 
        `<a href="${a.url}" target="_blank" class="file-chip"><i class="fas fa-external-link-alt"></i> ${a.titulo || 'Anexo'}</a>`
    ).join('');

    // --- LÓGICA DE PAGINAÇÃO E PROCESSAMENTO DE HISTÓRICO ---
    var allHistory = (item.historico || []).slice().reverse().map((entry, revIndex) => ({
        entry,
        originalIndex: item.historico.length - 1 - revIndex
    }));
    
    // SOFT DELETE: Filtrar entradas de histórico deletadas
    var filteredHistory = allHistory.filter(h => !h.entry.deleted);
    
    var itemsPerPage = 10;
    var totalItems = filteredHistory.length;
    var totalPages = Math.ceil(totalItems / itemsPerPage);
    var maxPages = 100;
    var finalPages = Math.min(totalPages, maxPages);
    
    currentHistoryPage = Math.min(Math.max(1, currentHistoryPage), finalPages || 1);
    
    var start = (currentHistoryPage - 1) * itemsPerPage;
    var end = start + itemsPerPage;
    var paginatedHistory = filteredHistory.slice(start, end);

    var isAdmin = userIsAdmin();

    var historyHtml = paginatedHistory.map((h, idx) => {
        h.filteredIndex = start + idx;
        const date = new Date(h.entry.timestamp);
        const dateStr = date.toLocaleDateString('pt-BR');
        const timeStr = date.toLocaleTimeString('pt-BR');
        
        let details = '';
        
        // TRATAMENTO PARA INCOMPATIBILIDADE DE FORMATO (ARRAY VS OBJETO INDEXADO)
        if (h.entry.detalhes) {
            let detailsArray = [];
            if (Array.isArray(h.entry.detalhes)) {
                detailsArray = h.entry.detalhes;
            } else if (typeof h.entry.detalhes === 'object') {
                // Converte chaves numéricas do Firebase para Array
                detailsArray = Object.keys(h.entry.detalhes)
                    .filter(k => k !== 'silentChanged')
                    .map(k => h.entry.detalhes[k]);
            }

            if (detailsArray.length > 0) {
                details = detailsArray.map(d => 
                    `<small style="display:block; margin-left:10px; color:var(--text-light); line-height:1.4;">${d}</small>`
                ).join('');
            }
        }

        // Fallback para mensagens de sistema
        if (!details && (h.entry.acao.includes('Edição') || h.entry.acao.includes('Atualização'))) {
            details = '<small style="display:block; margin-left:10px; color:var(--ind-yellow); font-style:italic;">Detalhamento indisponível para este registro antigo.</small>';
        }
        
        const usuario = h.entry.usuario ? ` - ${h.entry.usuario}` : '';

        const deleteBtn = isAdmin
            ? `<button class="history-delete" title="Excluir" onclick="event.stopPropagation(); deleteHistoryEntry(${id}, '${finalTab}', ${h.originalIndex})" style="border:none; background:transparent; color:var(--ind-red); cursor:pointer; font-size:13px; padding:2px;">
                    <i class="fas fa-trash"></i>
               </button>`
            : '';

        // Cada item possui um toggle à esquerda; clicar na linha agora alterna os detalhes (olho abre a visualização)
        return `
            <div class="history-item" onclick="toggleHistoryDetails(this)" style="cursor:pointer; padding: 10px 0; border-bottom: 1px dotted #e5e7eb; position:relative;">
                <div style="display:flex; gap:8px; align-items:flex-start;">
                    <span class="history-toggle" onclick="event.stopPropagation(); toggleHistoryDetails(this);" title="Mostrar/ocultar">&#8250;</span>
                    <div style="flex:1;">
                        <strong style="display:block; color:var(--primary); font-size:13px;">${h.entry.acao}${usuario}</strong>
                        <small style="color:var(--text-light); font-size:11px;">${dateStr} às ${timeStr}</small>
                        <div class="history-details">${details}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px; margin-left:8px;">
                        <i class="fas fa-eye" style="color:var(--text-light); cursor:pointer; font-size:14px;" onclick="event.stopPropagation(); viewHistoryItem(${id}, '${finalTab}', ${h.filteredIndex})" title="Visualizar registro"></i>
                        ${deleteBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Função utilitária para alternar a exibição dos detalhes do histórico (não abre a visualização do registro)
    window.toggleHistoryDetails = function(el) {
        const item = el.closest('.history-item');
        if (!item) return;
        item.classList.toggle('expanded');
    };
    
    var paginationHtml = finalPages > 1 ? `
        <div class="history-pagination">
            <button ${currentHistoryPage === 1 ? 'disabled' : ''} onclick="changeHistoryPage(${id}, '${finalTab}', -1)">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
            <span>Página ${currentHistoryPage} de ${finalPages}</span>
            <button ${currentHistoryPage === finalPages ? 'disabled' : ''} onclick="changeHistoryPage(${id}, '${finalTab}', 1)">
                Próxima <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    ` : '';

    // Guarda referência para o drawer de histórico
    window._currentViewId = id;
    window._currentViewTab = finalTab;

    var html = `
        <div class="view-header">
            <h2 style="margin:0; color:var(--primary); font-size:20px;">${item.titulo}${item.deleted ? ' <span style="color:#ef4444; font-size:14px; font-weight:500;">[DELETADO]</span>' : ''}</h2>
            <span class="view-status" style="background-color:${statusColorVar}">${item.status}</span>
        </div>
        <div class="view-grid">
            ${detailsGrid}
        </div>
        <div>
            <h4 style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Descrição</h4>
            <div class="view-desc">${(item.descricao || 'Sem descrição.').replace(/\n/g, '<br>')}</div>
        </div>
        ${anexosHtml ? `<div class="view-files" style="margin-top:10px;"><h4>Anexos</h4>${anexosHtml}</div>` : ''}
    `;
    
    document.getElementById('viewContent').innerHTML = html;
    document.getElementById('viewModal').style.display = 'flex';

    var btnEdit = document.getElementById('btnViewEdit');
    if (btnEdit) {
        btnEdit.style.display = (userCanEditCards() && !item.deleted) ? 'inline-flex' : 'none';
    }
}

// --- DRAWER DE HISTÓRICO ---
window._historyDrawerPage = 1;

window.openHistoryDrawer = function() {
    var drawer = document.getElementById('historyDrawer');
    var backdrop = document.getElementById('historyDrawerBackdrop');
    if (!drawer) return;
    window._historyDrawerPage = 1;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    renderHistoryDrawer();
};

window.closeHistoryDrawer = function() {
    var drawer = document.getElementById('historyDrawer');
    var backdrop = document.getElementById('historyDrawerBackdrop');
    if (!drawer) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
};

window.toggleHistoryDateFilter = function() {
    var el = document.getElementById('historyDateFilter');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
};

window.renderHistoryDrawer = function() {
    var id = window._currentViewId;
    var finalTab = window._currentViewTab;
    if (id === undefined || !finalTab) return;

    var item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === id);
    else if (finalTab === 'manutencao') item = maintenances.find(i => i.id === id);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === id);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === id);
    if (!item) return;

    var dateIni = document.getElementById('histFilterDateIni') ? document.getElementById('histFilterDateIni').value : '';
    var dateFim = document.getElementById('histFilterDateFim') ? document.getElementById('histFilterDateFim').value : '';

    var allHistory = (item.historico || []).slice().reverse().map((entry, revIndex) => ({
        entry,
        originalIndex: (item.historico.length - 1) - revIndex
    })).filter(h => !h.entry.deleted);

    if (dateIni) allHistory = allHistory.filter(h => new Date(h.entry.timestamp) >= new Date(dateIni));
    if (dateFim) allHistory = allHistory.filter(h => new Date(h.entry.timestamp) <= new Date(dateFim + 'T23:59:59'));

    var itemsPerPage = 10;
    var totalItems = allHistory.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    window._historyDrawerPage = Math.min(Math.max(1, window._historyDrawerPage), totalPages);
    var start = (window._historyDrawerPage - 1) * itemsPerPage;
    var paginated = allHistory.slice(start, start + itemsPerPage);

    var isAdmin = userIsAdmin();

    var typeColors = {
        'Criação': '#22c55e',
        'Criado': '#22c55e',
        'Edição': '#3b82f6',
        'Editado': '#3b82f6',
        'Atualização': '#3b82f6',
        'Restauração': '#f59e0b',
    };

    function getTypeColor(acao) {
        for (var k in typeColors) { if (acao && acao.toLowerCase().includes(k.toLowerCase())) return typeColors[k]; }
        return '#6b7280';
    }
    function getTypeLabel(acao) {
        if (!acao) return 'AÇÃO';
        if (acao.toLowerCase().includes('cria')) return 'CRIADO';
        if (acao.toLowerCase().includes('edit') || acao.toLowerCase().includes('atualiz')) return 'EDITADO';
        if (acao.toLowerCase().includes('restaur')) return 'RESTAURADO';
        return 'AÇÃO';
    }

    var bodyHtml = paginated.length === 0
        ? '<div class="history-drawer-empty"><i class="fas fa-inbox"></i><p>Nenhuma alteração registrada.</p></div>'
        : paginated.map((h, idx) => {
            var date = new Date(h.entry.timestamp);
            var dateStr = date.toLocaleDateString('pt-BR');
            var timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            var color = getTypeColor(h.entry.acao);
            var label = getTypeLabel(h.entry.acao);
            var usuario = h.entry.usuario || '';

            var detailsArray = [];
            if (h.entry.detalhes) {
                if (Array.isArray(h.entry.detalhes)) detailsArray = h.entry.detalhes;
                else if (typeof h.entry.detalhes === 'object') {
                    detailsArray = Object.keys(h.entry.detalhes).filter(k => k !== 'silentChanged').map(k => h.entry.detalhes[k]);
                }
            }

            var changesHtml = detailsArray.length > 0
                ? detailsArray.map(d => {
                    var parts = String(d).match(/^(.+?):\s*(.+?)\s*→\s*(.+)$/);
                    if (parts) {
                        return `<div class="hd-change-row">
                            <span class="hd-change-field">${parts[1]}</span>
                            <span class="hd-change-from">${parts[2]}</span>
                            <i class="fas fa-arrow-right hd-change-arrow"></i>
                            <span class="hd-change-to">${parts[3]}</span>
                        </div>`;
                    }
                    return `<div class="hd-change-row"><span class="hd-change-field" style="color:#6b7280;">${d}</span></div>`;
                }).join('')
                : '';

            var deleteBtn = isAdmin
                ? `<button class="hd-delete-btn" title="Excluir" onclick="event.stopPropagation(); deleteHistoryEntry(${id}, '${finalTab}', ${h.originalIndex})"><i class="fas fa-trash"></i> Excluir Registro</button>`
                : '';

            var filteredIndex = start + idx;
            return `
            <div class="hd-item" onclick="toggleHdItem(this)">
                <div class="hd-item-top">
                    <div class="hd-item-dot" style="background:${color}"></div>
                    <div class="hd-item-content">
                        <div class="hd-item-meta">
                            ${usuario ? `<span class="hd-user"><i class="fas fa-user"></i> ${usuario}</span>` : ''}
                            <span class="hd-badge" style="background:${color}20; color:${color}; border-color:${color}40;">${label}</span>
                            <span class="hd-date">${dateStr} às ${timeStr}</span>
                        </div>
                        <div class="hd-item-title">${h.entry.acao}</div>
                    </div>
                    <div class="hd-item-actions">
                        <button class="hd-view-btn" title="Ver snapshot" onclick="event.stopPropagation(); viewHistoryItem(${id}, '${finalTab}', ${filteredIndex})"><i class="fas fa-eye"></i></button>
                        <span class="hd-toggle-icon"><i class="fas fa-chevron-down"></i></span>
                    </div>
                </div>
                <div class="hd-item-body">
                    ${changesHtml || '<span style="color:#94a3b8; font-size:12px; font-style:italic;">Sem detalhes adicionais.</span>'}
                    ${deleteBtn}
                </div>
            </div>`;
        }).join('');

    document.getElementById('historyDrawerBody').innerHTML = bodyHtml;

    var paginationHtml = totalPages > 1 ? `
        <span style="color:#94a3b8; font-size:12px;">${start + 1}–${Math.min(start + itemsPerPage, totalItems)} de ${totalItems}</span>
        <div style="display:flex; gap:6px;">
            <button ${window._historyDrawerPage === 1 ? 'disabled' : ''} onclick="window._historyDrawerPage--; renderHistoryDrawer()"><i class="fas fa-chevron-left"></i> Anterior</button>
            <button ${window._historyDrawerPage === totalPages ? 'disabled' : ''} onclick="window._historyDrawerPage++; renderHistoryDrawer()">Próximo <i class="fas fa-chevron-right"></i></button>
        </div>
    ` : `<span style="color:#94a3b8; font-size:12px;">${totalItems} registro${totalItems !== 1 ? 's' : ''}</span>`;

    document.getElementById('historyDrawerPagination').innerHTML = paginationHtml;
};

window.toggleHdItem = function(el) {
    el.classList.toggle('open');
};

function viewHistoryItem(id, tab, historyIndex) {
    var item;
    var finalTab = tab;
    
    // Normaliza o tab
    if (tab === 'audit') finalTab = 'auditoria';
    else if (tab === 'train') finalTab = 'treinamentos';
    else if (tab === 'ativ') finalTab = 'atividades';
    else if (tab === 'mant' || tab === 'manutencao') finalTab = 'manutencao';
    else if (tab === 'doc' || tab === 'documentos') finalTab = 'documentos';
    
    if (finalTab === 'auditoria') { item = audits.find(i => i.id === id); }
    else if (finalTab === 'atividades') { item = activities.find(i => i.id === id); }
    else if (finalTab === 'manutencao') { item = maintenances.find(i => i.id === id); }
    else if (finalTab === 'documentos') { item = documents.find(i => i.id === id); }
    else if (finalTab === 'treinamentos') { item = trainings.find(i => i.id === id); }
    
    if (!item) return;
    
    var history = item.historico || [];
    var allHistory = history.slice().reverse().map((entry, revIndex) => ({
        entry,
        originalIndex: history.length - 1 - revIndex
    }));
    var filteredHistory = allHistory.filter(h => h.entry.acao !== 'Restauração de Backup');
    
    if (historyIndex < 0 || historyIndex >= filteredHistory.length) return;
    
    var h = filteredHistory[historyIndex];
    var date = new Date(h.entry.timestamp);
    var dateStr = date.toLocaleDateString('pt-BR');
    
    document.getElementById('historyViewTitle').textContent = `[Registro de ${dateStr}]`;
    
    var historicalItem;
    if (h.entry.snapshot) {
        historicalItem = JSON.parse(JSON.stringify(h.entry.snapshot));
    } else {
        historicalItem = JSON.parse(JSON.stringify(item));
    }

    // Copiar a lógica de renderização do view
    var statusList = finalTab === 'auditoria' ? masterLists.auditStatus :
                      finalTab === 'treinamentos' ? masterLists.trainStatus :
                      finalTab === 'atividades' ? masterLists.ativStatus :
                      finalTab === 'manutencao' ? masterLists.mantStatus :
                      finalTab === 'documentos' ? masterLists.docStatus : [];
    
    var statusObj = statusList.find(s => s.name === historicalItem.status) || { color: 'default' };
    var statusColorVar = colorMap[statusObj.color] || colorMap['default'];
    
    var detailsGrid = '';
    if (finalTab === 'auditoria') {
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Responsável</label><div>${historicalItem.responsavel || 'N/A'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${historicalItem.revisor || 'N/A'}</div></div>
            <div class="view-item"><label>Auditor</label><div>${historicalItem.auditor || 'N/A'}</div></div>
            <div class="view-item"><label>Data Publicação</label><div>${historicalItem.dataPublicacao ? formatBR(historicalItem.dataPublicacao) : 'N/A'}</div></div>
            <div class="view-item"><label>Previsão</label><div>${historicalItem.dataPrevisao ? formatBR(historicalItem.dataPrevisao) : 'N/A'}</div></div>
        `;
    } else if (finalTab === 'atividades') {
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Responsável</label><div>${historicalItem.responsavel || 'N/A'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${historicalItem.revisor || 'N/A'}</div></div>
            <div class="view-item"><label>Data Início</label><div>${historicalItem.dataInicio ? formatBR(historicalItem.dataInicio) : 'N/A'}</div></div>
            <div class="view-item"><label>Data Conclusão</label><div>${historicalItem.dataConclusao ? formatBR(historicalItem.dataConclusao) : 'N/A'}</div></div>
        `;
    } else if (finalTab === 'manutencao') {
        const isNA = isBlankPeriodicity(historicalItem.intervalo);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Tipo</label><div>${historicalItem.tipo || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Equipamento</label><div>${historicalItem.item || 'N/A'}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${historicalItem.intervalo} dias`}</div></div>
            <div class="view-item"><label>Última Manutenção</label><div>${historicalItem.ultima ? formatBR(historicalItem.ultima) : 'N/A'}</div></div>
            <div class="view-item"><label>Próxima Manutenção</label><div>${isNA ? 'N/A' : formatBR(historicalItem.proxima)}</div></div>
            <div class="view-item"><label>Responsável Técnico</label><div>${historicalItem.responsavelTecnico || 'N/A'}</div></div>
            <div class="view-item"><label>Responsável pela Manutenção</label><div>${historicalItem.responsavelManutencao || 'N/A'}</div></div>
            <div class="view-item"><label>Empresa Responsável</label><div>${historicalItem.empresaResponsavel || 'N/A'}</div></div>
        `;
    } else if (finalTab === 'treinamentos') {
        const isNA = isBlankPeriodicity(historicalItem.periodicidade);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Responsável</label><div>${historicalItem.responsavel || 'N/A'}</div></div>
            <div class="view-item"><label>Instrutor</label><div>${historicalItem.instrutor || 'N/A'}</div></div>
            <div class="view-item"><label>Local do Evento</label><div>${historicalItem.localEvento || 'N/A'}</div></div>
            <div class="view-item"><label>Carga Horária</label><div>${historicalItem.cargaHoraria || 'N/A'}</div></div>
            <div class="view-item"><label>Participantes</label><div>${historicalItem.participantes || 'N/A'}</div></div>
            <div class="view-item"><label>Data Publicação</label><div>${historicalItem.dataPublicacao ? formatBR(historicalItem.dataPublicacao) : 'N/A'}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${historicalItem.periodicidade} dias`}</div></div>
        `;
    } else if (finalTab === 'documentos') {
        const isNA = isBlankPeriodicity(historicalItem.docIntervalo);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${historicalItem.docIntervalo} dias`}</div></div>
            <div class="view-item"><label>Responsável</label><div>${historicalItem.responsavel || 'N/A'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${historicalItem.revisor || 'N/A'}</div></div>
            <div class="view-item"><label>Data do Documento</label><div>${historicalItem.dataCriacao ? formatBR(historicalItem.dataCriacao) : 'N/A'}</div></div>
            <div class="view-item"><label>Próx. Revisão</label><div>${isNA ? 'N/A' : formatBR(historicalItem.dataProximaRevisao)}</div></div>
        `;
    } else {
        detailsGrid = `
            <div class="view-item"><label>Título</label><div>${historicalItem.titulo || 'N/A'}</div></div>
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Status</label><div>${historicalItem.status || 'N/A'}</div></div>
        `;
    }
    
    var anexos = h.entry.snapshot ? (historicalItem.anexos || []) : [];
    var anexosHtml = anexos.length > 0
        ? `<div style="margin-top:16px;"><div class="view-files" style="margin-top:0;"><h4>Anexos</h4>${anexos.map(a => 
            `<a href="${a.url}" target="_blank" class="file-chip"><i class="fas fa-external-link-alt"></i> ${a.titulo || 'Anexo'}</a>`
        ).join('')}</div></div>`
        : '';

    var versionDescription = historicalItem.descricao || 'Sem descrição.';
    var modificationEntries = [];
    if (h.entry.detalhes) {
        if (Array.isArray(h.entry.detalhes)) {
            modificationEntries = h.entry.detalhes;
        } else if (typeof h.entry.detalhes === 'object') {
            modificationEntries = Object.keys(h.entry.detalhes)
                .filter(k => k !== 'silentChanged')
                .map(k => h.entry.detalhes[k]);
        }
    }

    var modificationsHtml = modificationEntries.length > 0
        ? `<div style="margin-top:16px;"><h4 style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Modificações</h4><div class="view-desc">${modificationEntries.map(d => String(d).replace(/\n/g, '<br>')).join('<br>')}</div></div>`
        : '';
    
    var html = `
        <div class="view-header">
            <h2 style="margin:0; color:var(--primary); font-size:20px;">${historicalItem.titulo}</h2>
            <span class="view-status" style="background-color:${statusColorVar}">${historicalItem.status}</span>
        </div>
        <div class="view-grid">
            ${detailsGrid}
        </div>
        <div>
            <h4 style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Descrição</h4>
            <div class="view-desc">${versionDescription.replace(/\n/g, '<br>')}</div>
        </div>
        ${anexosHtml}
        ${modificationsHtml}
    `;
    
    document.getElementById('historyViewContent').innerHTML = html;
    document.getElementById('historyViewModal').style.display = 'flex';
}

    function deleteHistoryEntry(id, tab, historyIndex) {
        // Somente admin pode apagar histórico
        if (!(typeof userIsAdmin === 'function') || !userIsAdmin()) return;
        if (!confirm('Deseja realmente excluir este registro do histórico?')) return;

        let item;
        let finalTab = tab;
        
        // Normaliza o tab
        if (tab === 'audit') finalTab = 'auditoria';
        else if (tab === 'train') finalTab = 'treinamentos';
        else if (tab === 'ativ') finalTab = 'atividades';
        else if (tab === 'mant' || tab === 'manutencao') finalTab = 'manutencao';
        else if (tab === 'doc' || tab === 'documentos') finalTab = 'documentos';
        
        if (finalTab === 'auditoria') { item = audits.find(i => i.id === id); }
        else if (finalTab === 'atividades') { item = activities.find(i => i.id === id); }
        else if (finalTab === 'manutencao') { item = maintenances.find(i => i.id === id); }
        else if (finalTab === 'documentos') { item = documents.find(i => i.id === id); }
        else if (finalTab === 'treinamentos') { item = trainings.find(i => i.id === id); }
        
        // Se não encontrou, tenta procurar em todos os arrays
        if (!item) {
            item = audits.find(i => i.id === id);
            if (item) finalTab = 'auditoria';
            else {
                item = activities.find(i => i.id === id);
                if (item) finalTab = 'atividades';
                else {
                    item = maintenances.find(i => i.id === id);
                    if (item) finalTab = 'manutencao';
                    else {
                        item = documents.find(i => i.id === id);
                        if (item) finalTab = 'documentos';
                        else {
                            item = trainings.find(i => i.id === id);
                            if (item) finalTab = 'treinamentos';
                        }
                    }
                }
            }
        }

        if (!item || !Array.isArray(item.historico) || item.historico.length === 0) return;

        if (historyIndex < 0 || historyIndex >= item.historico.length) return;

        // SOFT DELETE: Marcar entrada de histórico como deletada
        const historyEntry = item.historico[historyIndex];
        if (historyEntry) {
            historyEntry.deleted = true;
            historyEntry.deletedAt = new Date().toISOString();
            historyEntry.deletedBy = currentuser.email || currentuser.name || 'admin';
        }
        
        saveAll();
        renderViewContent(id, tab);
    }

    function editCurrentViewItem() {
        if (!userCanEditCards()) {
            alert('Você não tem permissão para editar cards. Seu acesso está configurado como somente leitura.');
            return;
        }
        if (!currentViewItemId || !currentViewTab) return;

        closeModal('viewModal');
        editItem(currentViewItemId, currentViewTab);
    }
    
    // List Manager & Color Selection
    function openListManager(genericKey) {
        let isStatus = false;
        let listname;
        
        if (genericKey === 'setores') { 
            currentListKey = 'setores';
            listname = 'SETORES';
        } else if (genericKey === 'categorias') {
            if(currentTab === 'auditoria') currentListKey = 'auditCategorias';
            else if(currentTab === 'treinamentos') currentListKey = 'trainCategorias';
            else if(currentTab === 'atividades') currentListKey = 'ativCategorias';
            else if(currentTab === 'manutencao') currentListKey = 'mantCategorias';
            else currentListKey = 'docCategorias'; 
            listname = 'CATEGORIA';
        } else if (genericKey === 'subcategorias' || genericKey === 'itens') { 
            
            const prefix = getTabPrefix(currentTab); 
            const catSelect = document.getElementById(`${prefix}Categoria`);
            
            if (!catSelect) { 
                 alert(`Elemento de Categoria (${prefix}Categoria) não encontrado. Verifique se você abriu o modal correspondente à aba ativa.`); 
                 return; 
            }
    
            const cat = catSelect.value;
            
            if (!cat) { alert("Selecione uma Categoria antes de gerenciar Subcategorias/Itens."); return; }
            
            let subcatMapKey;
            if(currentTab === 'auditoria') subcatMapKey = 'auditSubcats';
            else if(currentTab === 'treinamentos') subcatMapKey = 'trainSubcats';
            else if(currentTab === 'atividades') subcatMapKey = 'ativSubcats';
            else if(currentTab === 'manutencao') subcatMapKey = 'mantItens';
            else subcatMapKey = 'docSubcats';
            
            currentListKey = `${subcatMapKey}_${cat}`; 
            listname = `SUBCATEGORIAS / ITENS DE: ${cat}`;
            
        } else if (genericKey === 'status') {
            if(currentTab === 'auditoria') currentListKey = 'auditStatus';
            else if(currentTab === 'treinamentos') currentListKey = 'trainStatus';
            else if(currentTab === 'atividades') currentListKey = 'ativStatus';
            else if(currentTab === 'manutencao') currentListKey = 'mantStatus';
            else currentListKey = 'docStatus';
            isStatus = true;
            listname = 'STATUS';
        } else if (genericKey === 'marcadores') {
            if(currentTab === 'auditoria') currentListKey = 'auditMarcadores';
            else if(currentTab === 'treinamentos') currentListKey = 'trainMarcadores';
            else if(currentTab === 'atividades') currentListKey = 'ativMarcadores';
            else if(currentTab === 'manutencao') currentListKey = 'mantMarcadores';
            else currentListKey = 'docMarcadores';
            isStatus = true; // usa a mesma lógica de objetos com cor
            listname = 'MARCADORES';
        } else if (genericKey === 'tipos') {
            if(currentTab === 'manutencao') {
                currentListKey = 'mantTipos';
                listname = 'TIPOS';
            } else {
                alert('Tipos disponíveis apenas para Manutenção.');
                return;
            }
        } else if (genericKey === 'responsaveis') {
            currentListKey = 'responsaveis';
            listname = 'RESPONSÁVEIS';
        } else {
            currentListKey = genericKey; 
            listname = genericKey.toUpperCase();
        }
        
        document.getElementById('listTitle').textContent = `Gerenciar: ${listname}`;
        const body = document.getElementById('listBody');
        body.innerHTML = '';
    
        if(isStatus) {
            document.getElementById('colorPickerContainer').style.display = 'block';
            selectColor('default', document.querySelector('.bg-default')); 
        } else {
            document.getElementById('colorPickerContainer').style.display = 'none';
        }
    
        let listToRender;
        let baseKey = currentListKey.split('_')[0]; 
    
        if (currentListKey.includes('_')) { 
            const cat = currentListKey.split('_')[1];
            masterLists[baseKey] = masterLists[baseKey] || {}; 
            listToRender = masterLists[baseKey][cat] || [];
        } else {
            listToRender = masterLists[currentListKey] || [];
        }
        
        // SOFT DELETE: Filtrar itens deletados da lista
        listToRender = listToRender.filter(item => {
            if (typeof item === 'object') {
                return !item.deleted;
            }
            // Para strings simples (não-objeto)
            return !item.deleted;
        });
        
        // Para responsáveis, verifica quais são usuários cadastrados
        const userNames = new Set();
        if (currentListKey === 'responsaveis' && typeof users !== 'undefined') {
            users.forEach(user => {
                if (user.name) userNames.add(user.name);
            });
        }
        
        listToRender.forEach(val => {
            let displayHtml = '', itemVal = '';
            if (typeof val === 'object') {
                // Verifica se é um objeto com propriedade 'name' (status/marcador) ou 'value' (soft delete)
                if (val.name !== undefined) {
                    // É um status/marcador com nome e cor
                    const colorVar = colorMap[val.color] || colorMap['default'];
                    displayHtml = `<span class="color-dot" style="background-color:${colorVar}"></span>${val.name}`;
                    itemVal = val.name;
                } else if (val.value !== undefined) {
                    // É um item marcado para soft delete (conversão de string para objeto)
                    displayHtml = val.value;
                    itemVal = val.value;
                } else {
                    // Objeto malformado - pular
                    return;
                }
            } else {
                // Deve ser uma string simples
                displayHtml = val;
                itemVal = val;
            }
            
            // Para responsáveis, verifica se é um usuário cadastrado
            const isUser = currentListKey === 'responsaveis' && userNames.has(itemVal);
            const canEdit = !isUser;
            const canDelete = !isUser;
    
            body.innerHTML += `<tr>
                <td>${displayHtml}${isUser ? ' <span style="color: #666; font-size: 11px;">(Usuário cadastrado)</span>' : ''}</td>
                <td>
                    <div class="list-actions">
                        ${canEdit ? `<i class="fas fa-pen edit-icon" onclick="editListItem('${currentListKey}','${itemVal.replace(/'/g, "\\'")}')" title="Editar nome"></i>` : ''}
                        ${canDelete ? `<i class="fas fa-trash remove-icon" onclick="removeFromList('${currentListKey}','${itemVal.replace(/'/g, "\\'")}')" title="Excluir"></i>` : ''}
                    </div>
                </td>
            </tr>`;
        });
        
        const input = document.getElementById('newListItem');
        input.value = '';
        input.onkeydown = (e) => { 
            if(e.key === 'Enter') addToList(); 
        };
        
        // Para responsáveis, adiciona evento de input para validar em tempo real
        if (currentListKey === 'responsaveis') {
            input.oninput = () => {
                const addBtn = document.querySelector('button[onclick="addToList()"]');
                
                if (typeof users !== 'undefined') {
                    const userNames = new Set();
                    users.forEach(user => {
                        if (user.name) userNames.add(user.name);
                    });
                    
                    const isValidUser = userNames.has(input.value.trim());
                    addBtn.disabled = !isValidUser && input.value.trim() !== '';
                    addBtn.style.opacity = (!isValidUser && input.value.trim() !== '') ? '0.5' : '1';
                    addBtn.style.cursor = (!isValidUser && input.value.trim() !== '') ? 'not-allowed' : 'pointer';
                    
                    if (!isValidUser && input.value.trim() !== '') {
                        addBtn.title = 'Apenas usuários cadastrados podem ser adicionados como responsáveis';
                    } else {
                        addBtn.title = '';
                    }
                }
            };
        }
        
        
        document.getElementById('modalListManager').style.display = 'flex';
    }
    
    function selectColor(color, el) {
        selectedColorTemp = color;
        document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    }
    
    function addToList() {
        const val = document.getElementById('newListItem').value.trim();
        if (!val) return;
        
        const isStatus = currentListKey.toLowerCase().includes('status');
        const isMarcadorList = currentListKey.toLowerCase().includes('marcadores');
        const isSubcat = currentListKey.includes('_'); 

        // Guarda a categoria e a subcategoria/ item atualmente selecionados no modal da aba ativa
        const prefix = getTabPrefix(currentTab);
        const currentCatSelect = document.getElementById(`${prefix}Categoria`);
        const selectedCategoryBefore = currentCatSelect ? currentCatSelect.value : null;
        let currentSubSelect = null;
        if (prefix === 'mant') {
            currentSubSelect = document.getElementById(`${prefix}Item`);
        } else {
            currentSubSelect = document.getElementById(`${prefix}Sub`);
        }
        const selectedSubBefore = currentSubSelect ? currentSubSelect.value : null;

        let list;
        if (isSubcat) {
            const [baseKey, cat] = currentListKey.split('_');
            masterLists[baseKey][cat] = masterLists[baseKey][cat] || []; 
            list = masterLists[baseKey][cat];
        } else {
            list = masterLists[currentListKey];
        }
    
        if (isStatus || isMarcadorList) {
            if(list.some(s => s.name === val)) return;
            list.push({ name: val, color: selectedColorTemp });
        } else {
            if(list.includes(val)) return;
            list.push(val);
        }
    
        // Ordenação - Função robusta para comparar valores que podem ser strings ou objetos
        list.sort((a, b) => {
            const aVal = String(typeof a === 'object' ? a.name : a) || '';
            const bVal = String(typeof b === 'object' ? b.name : b) || '';
            return aVal.localeCompare(bVal);
        });
        
        saveAll(); populateSelects();

        // Restaura categoria e subcategoria/item após recriar os selects
        if (selectedCategoryBefore) {
            const restoredCat = document.getElementById(`${prefix}Categoria`);
            if (restoredCat) {
                restoredCat.value = selectedCategoryBefore;
                // Recarrega a lista de subcategorias/itens para a categoria correta
                onCategoryChange(prefix);

                if (selectedSubBefore) {
                    const restoredSub = prefix === 'mant'
                        ? document.getElementById(`${prefix}Item`)
                        : document.getElementById(`${prefix}Sub`);
                    if (restoredSub) restoredSub.value = selectedSubBefore;
                }
            }
        }
        
        // Reabre o mesmo tipo de lista que estava sendo editada
        if (isSubcat) {
            openListManager('subcategorias');
        } else if (isStatus) {
            openListManager('status');
        } else if (isMarcadorList) {
            openListManager('marcadores');
        } else if (currentListKey === 'setores') {
            openListManager('setores');
        } else if (currentListKey === 'mantTipos') {
            openListManager('tipos');
        } else {
            openListManager('categorias');
        }
    }
    
    function editListItem(key, val) {
        const isStatus = key.toLowerCase().includes('status');
        const isMarcadorList = key.toLowerCase().includes('marcadores');
        const isObjectList = isStatus || isMarcadorList;
        const isSubcat = key.includes('_');
        
        const newName = prompt(`Editar nome de "${val}":`, val);
        if (!newName || newName.trim() === '' || newName.trim() === val) return;
        
        const trimmedNewName = newName.trim();
        
        // Atualiza na lista mestra
        let list;
        if (isSubcat) {
            const [baseKey, cat] = key.split('_');
            masterLists[baseKey] = masterLists[baseKey] || {};
            masterLists[baseKey][cat] = masterLists[baseKey][cat] || [];
            list = masterLists[baseKey][cat];
        } else {
            list = masterLists[key];
        }
        
        // Verifica se o novo nome já existe
        if (isObjectList) {
            if (list.some(item => item.name === trimmedNewName)) {
                alert('Já existe um item com este nome.');
                return;
            }
            const itemIndex = list.findIndex(item => item.name === val);
            if (itemIndex !== -1) {
                list[itemIndex].name = trimmedNewName;
            }
        } else {
            if (list.includes(trimmedNewName)) {
                alert('Já existe um item com este nome.');
                return;
            }
            const itemIndex = list.indexOf(val);
            if (itemIndex !== -1) {
                list[itemIndex] = trimmedNewName;
            }
        }
        
        // Atualiza todos os cards que usam este item
        const updateCards = (cards, fieldName) => {
            cards.forEach(card => {
                if (card[fieldName] === val) {
                    card[fieldName] = trimmedNewName;
                }
            });
        };
        
        // Identifica qual campo atualizar baseado na chave da lista
        if (key === 'setores') {
            updateCards(audits, 'setor');
            updateCards(trainings, 'setor');
            updateCards(activities, 'setor');
            updateCards(maintenances, 'setor');
            updateCards(documents, 'setor');
        } else if (key === 'auditCategorias') {
            updateCards(audits, 'categoria');
        } else if (key === 'ativCategorias') {
            updateCards(activities, 'categoria');
        } else if (key === 'mantCategorias') {
            updateCards(maintenances, 'categoria');
        } else if (key === 'docCategorias') {
            updateCards(documents, 'categoria');
        } else if (key.startsWith('auditSubcats_')) {
            updateCards(audits, 'subcategoria');
        } else if (key.startsWith('ativSubcats_')) {
            updateCards(activities, 'subcategoria');
        } else if (key.startsWith('docSubcats_')) {
            updateCards(documents, 'subcategoria');
        } else if (key.startsWith('mantItens_')) {
            updateCards(maintenances, 'item');
        } else if (key === 'mantTipos') {
            updateCards(maintenances, 'tipo');
        } else if (isStatus) {
            // Identifica qual tipo de status baseado na chave exata
            if (key === 'auditStatus') {
                audits.forEach(card => {
                    if (card.status === val) card.status = trimmedNewName;
                });
            } else if (key === 'ativStatus') {
                activities.forEach(card => {
                    if (card.status === val) card.status = trimmedNewName;
                });
            } else if (key === 'mantStatus') {
                maintenances.forEach(card => {
                    if (card.status === val) card.status = trimmedNewName;
                });
            } else if (key === 'docStatus') {
                documents.forEach(card => {
                    if (card.status === val) card.status = trimmedNewName;
                });
            }
        } else if (isMarcadorList) {
            // Identifica qual tipo de marcador baseado na chave exata
            if (key === 'auditMarcadores') {
                audits.forEach(card => {
                    if (card.marcador === val) card.marcador = trimmedNewName;
                });
            } else if (key === 'ativMarcadores') {
                activities.forEach(card => {
                    if (card.marcador === val) card.marcador = trimmedNewName;
                });
            } else if (key === 'mantMarcadores') {
                maintenances.forEach(card => {
                    if (card.marcador === val) card.marcador = trimmedNewName;
                });
            } else if (key === 'docMarcadores') {
                documents.forEach(card => {
                    if (card.marcador === val) card.marcador = trimmedNewName;
                });
            }
        }
        
        // Ordena a lista - Função robusta para comparar valores que podem ser strings ou objetos
        list.sort((a, b) => {
            const aVal = String(typeof a === 'object' ? a.name : a) || '';
            const bVal = String(typeof b === 'object' ? b.name : b) || '';
            return aVal.localeCompare(bVal);
        });
        
        // Guarda seleções antes de recarregar
        const prefix = getTabPrefix(currentTab);
        const currentCatSelect = document.getElementById(`${prefix}Categoria`);
        const selectedCategoryBefore = currentCatSelect ? currentCatSelect.value : null;
        let currentSubSelect = null;
        if (prefix === 'mant') {
            currentSubSelect = document.getElementById(`${prefix}Item`);
        } else {
            currentSubSelect = document.getElementById(`${prefix}Sub`);
        }
        const selectedSubBefore = currentSubSelect ? currentSubSelect.value : null;
        
        saveAll(); populateSelects();
        
        // Atualiza os cards se estiver em uma aba de cards
        if (currentTab !== 'dashboard' && currentTab !== 'backup' && currentTab !== 'configuracoes') {
            renderCards();
        } else if (currentTab === 'dashboard') {
            renderDashboard();
        }
        
        // Restaura seleções após recarregar
        if (selectedCategoryBefore) {
            const restoredCat = document.getElementById(`${prefix}Categoria`);
            if (restoredCat) {
                restoredCat.value = selectedCategoryBefore;
                onCategoryChange(prefix);
                if (selectedSubBefore) {
                    const restoredSub = prefix === 'mant'
                        ? document.getElementById(`${prefix}Item`)
                        : document.getElementById(`${prefix}Sub`);
                    if (restoredSub) restoredSub.value = selectedSubBefore;
                }
            }
        }
        
        // Reabre o mesmo tipo de lista
        if (isSubcat) {
            openListManager('subcategorias');
        } else if (isStatus) {
            openListManager('status');
        } else if (isMarcadorList) {
            openListManager('marcadores');
        } else if (key === 'setores') {
            openListManager('setores');
        } else if (key === 'mantTipos') {
            openListManager('tipos');
        } else {
            openListManager('categorias');
        }
    }
    
    function removeFromList(key, val) {
        const isStatus = key.toLowerCase().includes('status');
        const isMarcadorList = key.toLowerCase().includes('marcadores');
        const isObjectList = isStatus || isMarcadorList;
        const isSubcat = key.includes('_');

        // Bloqueia exclusão de categorias que possuem subcategorias/itens vinculados
        if (!isObjectList && !isSubcat) {
            const categoryToSubcatMap = {
                auditCategorias: 'auditSubcats',
                ativCategorias: 'ativSubcats',
                docCategorias: 'docSubcats',
                mantCategorias: 'mantItens'
            };
            const subcatKey = categoryToSubcatMap[key];
            if (subcatKey) {
                const map = masterLists[subcatKey] || {};
                const children = map[val] || [];
                if (Array.isArray(children) && children.length > 0) {
                    alert('Não é possível excluir esta categoria pois existem subcategorias/itens vinculados. Exclua primeiro as subcategorias/itens.');
                    return;
                }
            }
        }

        // Guarda a categoria e a subcategoria/ item atualmente selecionados no modal da aba ativa
        const prefix = getTabPrefix(currentTab);
        const currentCatSelect = document.getElementById(`${prefix}Categoria`);
        const selectedCategoryBefore = currentCatSelect ? currentCatSelect.value : null;
        let currentSubSelect = null;
        if (prefix === 'mant') {
            currentSubSelect = document.getElementById(`${prefix}Item`);
        } else {
            currentSubSelect = document.getElementById(`${prefix}Sub`);
        }
        const selectedSubBefore = currentSubSelect ? currentSubSelect.value : null;

        let list;
        if (isSubcat) {
            const [baseKey, cat] = key.split('_');
            list = masterLists[baseKey][cat];
            if (isObjectList) {
                // SOFT DELETE para objetos de status/marcadores: marcar como deletado
                const itemToDelete = list.find(s => s.name === val);
                if (itemToDelete) {
                    itemToDelete.deleted = true;
                    itemToDelete.deletedAt = new Date().toISOString();
                    itemToDelete.deletedBy = currentuser.email || currentuser.name || 'unknown';
                }
            } else {
                // Para strings simples, fazer soft delete também
                const index = list.indexOf(val);
                if (index > -1) {
                    // Converter para objeto e marcar como deletado
                    list[index] = { value: val, deleted: true, deletedAt: new Date().toISOString() };
                }
            }
            masterLists[baseKey][cat] = list; 
        } else {
            list = masterLists[key];
            if (isObjectList) {
                // SOFT DELETE para objetos de status/marcadores
                const itemToDelete = list.find(s => s.name === val);
                if (itemToDelete) {
                    itemToDelete.deleted = true;
                    itemToDelete.deletedAt = new Date().toISOString();
                    itemToDelete.deletedBy = currentuser.email || currentuser.name || 'unknown';
                }
            } else {
                // Para strings simples
                const index = list.indexOf(val);
                if (index > -1) {
                    // Converter para objeto e marcar como deletado
                    list[index] = { value: val, deleted: true, deletedAt: new Date().toISOString() };
                }
            }
        }
    
        saveAll(); populateSelects();

        // Restaura categoria e subcategoria/item após recriar os selects
        if (selectedCategoryBefore) {
            const restoredCat = document.getElementById(`${prefix}Categoria`);
            if (restoredCat) {
                restoredCat.value = selectedCategoryBefore;
                // Recarrega a lista de subcategorias/itens para a categoria correta
                onCategoryChange(prefix);

                if (selectedSubBefore) {
                    const restoredSub = prefix === 'mant'
                        ? document.getElementById(`${prefix}Item`)
                        : document.getElementById(`${prefix}Sub`);
                    if (restoredSub) restoredSub.value = selectedSubBefore;
                }
            }
        }
        
        // Reabre o mesmo tipo de lista que estava sendo editada
        if (isSubcat) {
            openListManager('subcategorias');
        } else if (isStatus) {
            openListManager('status');
        } else if (isMarcadorList) {
            openListManager('marcadores');
        } else if (key === 'setores') {
            openListManager('setores');
        } else if (key === 'mantTipos') {
            openListManager('tipos');
        } else {
            openListManager('categorias');
        }
    }
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }
    
    // --- SISTEMA DE NOTIFICAÇÕES ---
    
    function getNotificationsForTab() {
        let data = [];
        let tabType = '';
        
        if (currentTab === 'auditoria') {
            data = audits;
            tabType = 'audit';
        } else if (currentTab === 'atividades') {
            data = activities;
            tabType = 'ativ';
        } else if (currentTab === 'manutencao') {
            data = maintenances;
            tabType = 'mant';
        } else if (currentTab === 'documentos') {
            data = documents;
            tabType = 'doc';
        } else if (currentTab === 'dashboard') {
            // Dashboard mostra notificações de todos, respeitando filtros
            const dashboardFilters = getDashboardFilters();
            const allowedTabs = userAllowedTabs(); // Abas que o usuário tem permissão de acessar
            
            let allData = [
                { items: audits, type: 'audit', tabName: 'auditoria' },
                { items: activities, type: 'ativ', tabName: 'atividades' },
                { items: maintenances, type: 'mant', tabName: 'manutencao' },
                { items: documents, type: 'doc', tabName: 'documentos' }
            ];
            
            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                allData.forEach(d => {
                    d.items = d.items.filter(item => allowedSetores.includes(item.setor));
                });
            }
            
            // Filtra apenas as abas que o usuário tem permissão de acessar
            if (allowedTabs && allowedTabs.length > 0) {
                allData = allData.filter(d => allowedTabs.includes(d.tabName));
            }
            
            // Filtra por área se selecionada
            if (dashboardFilters.area) {
                allData = allData.filter(d => d.type === dashboardFilters.area);
            }
            
            // SOFT DELETE: remover itens deletados das notificações do dashboard
            allData.forEach(d => {
                d.items = d.items.filter(item => !item.deleted);
            });

            // Aplica todos os filtros e coleta notificações
            const allNotifications = [];
            allData.forEach(({ items, type }) => {
                const filtered = applyDashboardFiltersToData(items, type, dashboardFilters);
                allNotifications.push(...getFilteredNotifications(filtered, type));
            });
            
            // Ordena: atrasados primeiro, depois alertas
            return allNotifications.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return new Date(a.dateField) - new Date(b.dateField);
            });
        }
        
        // SOFT DELETE: remover itens deletados das notificações
        data = data.filter(item => !item.deleted);

        // Aplicar filtro de permissões de setores para abas específicas
        const allowedSetores = getAllowedSetores();
        if (allowedSetores !== null) {
            data = data.filter(item => allowedSetores.includes(item.setor));
        }
        
        // Para abas específicas, aplica filtros
        const filteredData = applyCurrentTabFilters(data, tabType);
        return getFilteredNotifications(filteredData, tabType).sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return new Date(a.dateField) - new Date(b.dateField);
        });
    }
    
    function getDashboardFilters() {
        return {
            area: document.getElementById('fDashArea')?.value || '',
            setor: document.getElementById('fDashSetor')?.value || '',
            categoria: document.getElementById('fDashCat')?.value || '',
            status: document.getElementById('fDashStatus')?.value || '',
            responsavel: document.getElementById('fDashResponsavel')?.value || '',
            revisor: document.getElementById('fDashRevisor')?.value || '',
            dateType: document.getElementById('fDashDateType')?.value || 'all',
            month: parseInt(document.getElementById('fDashMonth')?.value || currentMonth),
            yearForMonth: parseInt(document.getElementById('fDashYearForMonth')?.value || currentYear),
            yearOnly: parseInt(document.getElementById('fDashYearOnly')?.value || currentYear),
            dataIni: document.getElementById('fDashDataIni')?.value || '',
            dataFim: document.getElementById('fDashDataFim')?.value || ''
        };
    }
    
    function applyDashboardFiltersToData(data, type, filters) {
        return data.filter(item => {
            // Filtro por Setor
            if (filters.setor) {
                const itemSetor = item.setor || 'Setor Não Definido';
                if (itemSetor !== filters.setor) return false;
            }
            
            // Filtro por Categoria
            if (filters.categoria && item.categoria !== filters.categoria) return false;
            
            // Filtro por Status
            if (filters.status && item.status !== filters.status) return false;
            
            // Filtro por Responsável
            if (filters.responsavel) {
                let itemResponsavel = '';
                if (type === 'mant') {
                    itemResponsavel = item.responsavelTecnico || item.responsavelManutencao || '';
                } else {
                    itemResponsavel = item.responsavel || '';
                }
                if (!itemResponsavel || !itemResponsavel.includes(filters.responsavel)) return false;
            }
            
            // Filtro por Revisor
            if (filters.revisor) {
                const itemRevisor = item.revisor || '';
                if (!itemRevisor || !itemRevisor.includes(filters.revisor)) return false;
            }
            
            // Filtro por Período
            if (filters.dateType !== 'all') {
                const dateField = type === 'audit' ? item.dataPublicacao :
                                 type === 'ativ' ? item.dataInicio :
                                 type === 'mant' ? item.ultima :
                                 item.dataCriacao;
                if (!dateField) return false;
                
                const itemDate = new Date(dateField);
                const year = (filters.dateType === 'year') ? filters.yearOnly : filters.yearForMonth;
                
                if (filters.dateType === 'month') {
                    if (itemDate.getMonth() !== filters.month || itemDate.getFullYear() !== year) return false;
                } else if (filters.dateType === 'year') {
                    if (itemDate.getFullYear() !== year) return false;
                } else if (filters.dateType === 'custom') {
                    if (filters.dataIni && dateField < filters.dataIni) return false;
                    if (filters.dataFim && dateField > filters.dataFim) return false;
                }
            }
            
            return true;
        });
    }
    
    function applyCurrentTabFilters(data, tabType) {
        if (currentTab === 'dashboard') return data;
        
        let filtered = data;
        const prefix = getFilterPrefixForTab(currentTab);
        
        // Setor
        const sectorFilter = document.getElementById(`f${prefix}Setor`)?.value || '';
        if (sectorFilter) {
            filtered = filtered.filter(item => item.setor === sectorFilter);
        }
        
        // Categoria
        const catFilter = document.getElementById(`f${prefix}Cat`)?.value || '';
        if (catFilter) {
            filtered = filtered.filter(item => item.categoria === catFilter);
        }
        
        // Subcategoria/Item
        const subId = tabType === 'mant' ? `f${prefix}Item` : `f${prefix}Sub`;
        const subFilter = document.getElementById(subId)?.value || '';
        if (subFilter) {
            const subField = tabType === 'mant' ? 'item' : 'subcategoria';
            filtered = filtered.filter(item => item[subField] === subFilter);
        }
        
        // Status
        const statusFilter = document.getElementById(`f${prefix}Status`)?.value || '';
        if (statusFilter) {
            filtered = filtered.filter(item => item.status === statusFilter);
        }
        
        return filtered;
    }
    
    function getFilterPrefixForTab(tab) {
        if (tab === 'auditoria') return 'Audit';
        if (tab === 'atividades') return 'Ativ';
        if (tab === 'manutencao') return 'Mant';
        if (tab === 'documentos') return 'Doc';
        return '';
    }
    
    function getFilteredNotifications(data, tabType) {
        const notifications = [];
    
    // CAPTURA OS FILTROS ATIVOS NA ABA ATUAL
    var prefix = getFilterPrefixForTab(currentTab);
    var filterResponsavel = document.getElementById(`f${prefix}Responsavel`)?.value || '';
    var filterRevisor = document.getElementById(`f${prefix}Revisor`)?.value || '';
        
        data.forEach(item => {
        // 1. Excluir itens finalizados (Concluído ou Cancelado)
            if (item.status === 'Concluído' || item.status === 'Cancelado') {
                return;
            }

        // 2. FILTRO DE RESPONSÁVEL (Respeita a seleção da tela)
        if (filterResponsavel) {
            const itemRespRaw = tabType === 'mant' ? (item.responsavelTecnico || '') : (item.responsavel || '');
            const normalizedItemResp = normalizeResponsavel(itemRespRaw); // Usa sua função de limpeza de JSON/String
            if (!normalizedItemResp.includes(filterResponsavel.toLowerCase())) {
                return;
            }
        }

        // 3. FILTRO DE REVISOR (Respeita a seleção da tela - Ignora se for Manutenção pois não possui o campo)
        if (filterRevisor && tabType !== 'mant') {
            const itemRev = normalizeText(item.revisor || '');
            if (!itemRev.includes(normalizeText(filterRevisor))) {
                return;
            }
            }
            
            const deadlineField = getDeadlineFieldForTab(tabType, item);
            if (!deadlineField) return;
            
            const flagDays = item.flagDias || (tabType === 'ativ' ? 3 : 7);
            const d = daysDiff(deadlineField);
            
            // Somente atrasados e alertas
            if (d < 0) {
                // ATRASADO
                notifications.push({
                    id: item.id,
                    type: tabType,
                    title: item.titulo,
                    status: item.status,
                    statusColor: getStatusColor(item.status, tabType),
                    setor: item.setor,
                    categoria: item.categoria,
                    subcatOrItem: tabType === 'mant' ? item.item : item.subcategoria,
                responsavel: tabType === 'mant' ? (item.responsavelTecnico || item.responsavelManutencao || '') : (item.responsavel || ''),
                    marcador: item.marcador || '',
                    marcadorCor: item.marcadorCor || 'default',
                    dateField: deadlineField,
                    priority: 0, // 0 = atrasado (maior prioridade)
                    indicatorType: 'overdue',
                    daysInfo: `${Math.abs(d)} dia${Math.abs(d) > 1 ? 's' : ''} atrasado`
                });
            } else if (d <= flagDays) {
                // ALERTA
                notifications.push({
                    id: item.id,
                    type: tabType,
                    title: item.titulo,
                    status: item.status,
                    statusColor: getStatusColor(item.status, tabType),
                    setor: item.setor,
                    categoria: item.categoria,
                    subcatOrItem: tabType === 'mant' ? item.item : item.subcategoria,
                responsavel: tabType === 'mant' ? (item.responsavelTecnico || item.responsavelManutencao || '') : (item.responsavel || ''),
                    marcador: item.marcador || '',
                    marcadorCor: item.marcadorCor || 'default',
                    dateField: deadlineField,
                    priority: 1, // 1 = alerta
                    indicatorType: 'alert',
                    daysInfo: `${d} dia${d > 1 ? 's' : ''} para vencer`
                });
            }
        });
        
        return notifications;
    }
    
    function getDeadlineFieldForTab(tabType, item) {
        if (tabType === 'audit') return item.dataPrevisao;
        if (tabType === 'ativ') return item.dataConclusao;
        if (tabType === 'mant') return isBlankPeriodicity(item.intervalo) ? null : item.proxima;
        if (tabType === 'doc') return isBlankPeriodicity(item.docIntervalo) ? null : item.dataProximaRevisao;
        return null;
    }
    
    function updateNotificationCount() {
        const notifications = getNotificationsForTab();
        const badge = document.getElementById('notificationBadge');
        const count = notifications.length;
        
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    function toggleNotificationModal() {
        const modal = document.getElementById('notificationModal');
        modal.classList.toggle('active');
        
        if (modal.classList.contains('active')) {
            renderNotificationModal();
        }
    }
    
    function closeNotificationModal() {
        document.getElementById('notificationModal').classList.remove('active');
    }
    
    function renderNotificationModal() {
        const notifications = getNotificationsForTab();
        const content = document.getElementById('notificationModalContent');
        
        if (notifications.length === 0) {
            content.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>Nenhuma notificação</p>
                </div>
            `;
            return;
        }
        
        content.innerHTML = notifications.map(notif => {
            const statusColorVar = colorMap[notif.statusColor] || colorMap['default'];
            const indicatorClass = notif.indicatorType === 'overdue' ? 'overdue' : 'alert';
            const subcatDisplay = notif.subcatOrItem ? ` (${notif.subcatOrItem})` : '';
            const marcadorColorVar = colorMap[notif.marcadorCor] || colorMap['default'];
            const marcadorHtml = notif.marcador ? `<div style="background: ${marcadorColorVar}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; width: fit-content; display: flex; align-items: center; gap: 4px;"><i class="fas fa-bookmark" style="color: white; font-size: 10px;"></i>${notif.marcador}</div>` : '';
            
            return `
                <div class="notification-item ${indicatorClass}" onclick="closeNotificationModal(); currentHistoryPage = 1; openView(${notif.id}, '${notif.type}')">
                    <div class="notification-item-header">
                        <span class="notification-item-title" title="${notif.title}">${truncateText(notif.title, 40)}</span>
                        <span class="notification-item-status" style="background-color: ${statusColorVar}">${notif.status}</span>
                    </div>
                    <div class="notification-item-details">
                        <div class="notification-item-details-row">
                            <i class="fas fa-building"></i>
                            <span>${notif.setor || 'ND'}</span>
                        </div>
                        <div class="notification-item-details-row">
                            <i class="fas fa-folder"></i>
                            <span>${notif.categoria || '-'} ${subcatDisplay}</span>
                        </div>
                        ${notif.responsavel ? `
                        <div class="notification-item-details-row">
                            <i class="fas fa-user"></i>
                            <span>${notif.responsavel}</span>
                        </div>
                        ` : ''}
                        <div class="notification-item-details-row">
                            <i class="${notif.indicatorType === 'overdue' ? 'fas fa-exclamation-circle' : 'fas fa-exclamation-triangle'}"></i>
                            <span style="color: ${notif.indicatorType === 'overdue' ? 'var(--c-red)' : 'var(--c-yellow)'}; font-weight: 600;">${notif.daysInfo}</span>
                        </div>
                        ${marcadorHtml}
                    </div>
                    <div class="notification-item-actions" onclick="event.stopPropagation()">
                        <button title="Visualizar" onclick="closeNotificationModal(); currentHistoryPage = 1; openView(${notif.id}, '${notif.type}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button title="Editar" onclick="closeNotificationModal(); editItem(${notif.id}, '${notif.type}')">
                            <i class="fas fa-pen"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Inicialização (garante que os selects sejam preenchidos ao carregar a página)
    document.addEventListener('DOMContentLoaded', () => {
        // PROTEÇÃO: Limpa localStorage ao iniciar para forçar sincronização com Firebase
        // A preferência sempre será do banco de dados real-time, não do localStorage
        console.log('Proteção ativada: Limpando cache local para forçar sincronização com Firebase...');
        try {
            // Limpa apenas os dados cacheados, preservando filtros do usuário
            Object.keys(CACHE_KEYS).forEach(key => {
                if (key !== 'filters' && key !== 'lastSync') {
                    localStorage.removeItem(CACHE_KEYS[key]);
                }
            });
            console.log('Cache de dados limpo. Forçando sincronização com Firebase na inicialização.');
        } catch (error) {
            console.error('Erro ao limpar cache de dados:', error);
        }
        
        populateYearSelects();
        populateSelects();
        // Restaura os filtros salvos do localStorage (preserva filtros do usuário)
        setTimeout(() => {
            restoreFiltersFromLocalStorage();
        }, 500); // Pequeno delay para garantir que todos os elementos estejam prontos
    });
    
    function toggleSidebar() {
        document.body.classList.toggle('sidebar-open');
    }
    
    // Opcional: Fechar o menu ao clicar em um item no Mobile
    document.querySelectorAll('.sidebar button').forEach(button => {
        button.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });
    });

    // ========== MULTI-SELECT FUNCTIONS ==========
    var multiSelectStates = {
        audit: { selected: [], allUsers: [] },
        ativ: { selected: [], allUsers: [] },
        doc: { selected: [], allUsers: [] }
    };

    function initMultiSelectUsers() {
        // Coleta todos os usuários únicos de todos os registros
        const allResponsaveis = new Set();
        
        audits.forEach(item => {
            if (item.responsavel) {
                try {
                    const parsed = JSON.parse(item.responsavel);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(r => allResponsaveis.add(String(r)));
                    } else {
                        allResponsaveis.add(String(item.responsavel));
                    }
                } catch {
                    allResponsaveis.add(String(item.responsavel));
                }
            }
        });
        activities.forEach(item => {
            if (item.responsavel) {
                try {
                    const parsed = JSON.parse(item.responsavel);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(r => allResponsaveis.add(String(r)));
                    } else {
                        allResponsaveis.add(String(item.responsavel));
                    }
                } catch {
                    allResponsaveis.add(String(item.responsavel));
                }
            }
        });
        maintenances.forEach(item => {
            if (item.responsavelTecnico) {
                try {
                    const parsed = JSON.parse(item.responsavelTecnico);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(r => allResponsaveis.add(String(r)));
                    } else {
                        allResponsaveis.add(String(item.responsavelTecnico));
                    }
                } catch {
                    allResponsaveis.add(String(item.responsavelTecnico));
                }
            }
            // Não inclui responsavelManutenção na lista de usuários do multi-select
        });
        documents.forEach(item => {
            if (item.responsavel) {
                try {
                    const parsed = JSON.parse(item.responsavel);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(r => allResponsaveis.add(String(r)));
                    } else {
                        allResponsaveis.add(String(item.responsavel));
                    }
                } catch {
                    allResponsaveis.add(String(item.responsavel));
                }
            }
        });
        
        // Adiciona responsáveis da lista mestre
        if (masterLists.responsaveis) {
            masterLists.responsaveis.forEach(r => allResponsaveis.add(String(r)));
        }
        
        // Também adiciona nomes de usuários cadastrados
        if (typeof users !== 'undefined') {
        users.forEach(user => {
                if (user.name) allResponsaveis.add(String(user.name));
        });
        }

        const sortedUsers = Array.from(allResponsaveis).filter(r => r).sort();
        
        multiSelectStates.audit.allUsers = sortedUsers;
        multiSelectStates.ativ.allUsers = sortedUsers;
        multiSelectStates.doc.allUsers = sortedUsers;
    }

    function toggleMultiSelectDropdown(event, type) {
        event.stopPropagation();
        const dropdown = document.getElementById(`${getMultiSelectBaseId(type)}Dropdown`);
        const container = document.getElementById(`${getMultiSelectBaseId(type)}Container`);
        
        if (!dropdown || !container) {
            console.warn(`Multi-select elements not found for type: ${type}`);
            return;
        }
        
        if (dropdown.classList.contains('visible')) {
            dropdown.classList.remove('visible');
            container.classList.remove('focused');
        } else {
            // Fecha outros dropdowns
            document.querySelectorAll('.multi-select-dropdown.visible').forEach(d => {
                d.classList.remove('visible');
            });
            document.querySelectorAll('.multi-select.focused').forEach(c => {
                c.classList.remove('focused');
            });
            
            dropdown.classList.add('visible');
            container.classList.add('focused');
            renderMultiSelectDropdown(type);
            document.getElementById(`${getMultiSelectBaseId(type)}Input`).focus();
        }
    }

    function getMultiSelectBaseId(type) {
        if (type === 'audit') return 'auditResponsavel';
        if (type === 'ativ') return 'ativResponsavel';
        if (type === 'doc') return 'docResponsavel';
    }

    function renderMultiSelectDropdown(type) {
        const baseId = getMultiSelectBaseId(type);
        const dropdown = document.getElementById(`${baseId}Dropdown`);
        const state = multiSelectStates[type];
        const filterText = document.getElementById(`${baseId}Input`).value.toLowerCase();
        
        const filtered = state.allUsers.filter(user => {
            const userStr = String(user || '').toLowerCase();
            return userStr.includes(filterText);
        });
        
        dropdown.innerHTML = filtered.map(user => {
            const userStr = String(user || '');
            return `
            <div class="multi-select-option ${state.selected.includes(userStr) ? 'selected' : ''}" 
                 onclick="toggleMultiSelectOption('${type}', '${userStr.replace(/'/g, "\\'")}')">
                ${userStr}
            </div>
        `;
        }).join('');
    }

    function filterMultiSelectOptions(type) {
        const baseId = getMultiSelectBaseId(type);
        const dropdown = document.getElementById(`${baseId}Dropdown`);
        const input = document.getElementById(`${baseId}Input`);
        
        // Se há texto no input, garante que o dropdown permaneça aberto
        if (input.value.trim() !== '') {
            dropdown.classList.add('visible');
            document.getElementById(`${baseId}Container`).classList.add('focused');
        }
        
            renderMultiSelectDropdown(type);
    }

    function toggleMultiSelectOption(type, user) {
        const state = multiSelectStates[type];
        const idx = state.selected.indexOf(user);
        
        if (idx > -1) {
            state.selected.splice(idx, 1);
        } else {
            state.selected.push(user);
        }
        
        updateMultiSelectDisplay(type);
        renderMultiSelectDropdown(type);
        
        // Mantém o foco no input para continuar adicionando responsáveis
        const baseId = getMultiSelectBaseId(type);
        const inputElement = document.getElementById(`${baseId}Input`);
        if (inputElement) {
            inputElement.focus();
        }
    }

    function updateMultiSelectDisplay(type) {
        const baseId = getMultiSelectBaseId(type);
        const container = document.getElementById(`${baseId}Container`);
        const hiddenInput = document.getElementById(baseId);
        const state = multiSelectStates[type];
        
        // Limpa os tags anteriores
        const tags = container.querySelectorAll('.multi-select-tag');
        tags.forEach(tag => tag.remove());
        
        // Adiciona os novos tags
        const inputElement = container.querySelector('input[type="text"]');
        state.selected.forEach(user => {
            const tag = document.createElement('div');
            tag.className = 'multi-select-tag';
            tag.innerHTML = `
                ${user}
                <button type="button" onclick="event.stopPropagation(); removeMultiSelectOption('${type}', '${user.replace(/'/g, "\\'")}')" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.insertBefore(tag, inputElement);
        });
        
        // Salva no hidden input como JSON
        hiddenInput.value = JSON.stringify(state.selected);
    }

    function removeMultiSelectOption(type, user) {
        const state = multiSelectStates[type];
        const idx = state.selected.indexOf(user);
        if (idx > -1) {
            state.selected.splice(idx, 1);
        }
        updateMultiSelectDisplay(type);
        renderMultiSelectDropdown(type);
    }

    function loadMultiSelectData(type, dataArray) {
        const baseId = getMultiSelectBaseId(type);
        const hiddenInput = document.getElementById(baseId);
        const state = multiSelectStates[type];
        
        try {
            state.selected = JSON.parse(hiddenInput.value || '[]');
        } catch (e) {
            state.selected = [];
        }
        
        updateMultiSelectDisplay(type);
    }

    // Fecha dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.multi-select')) {
            // Fecha todos os dropdowns
            document.querySelectorAll('.multi-select-dropdown').forEach(dropdown => {
                dropdown.classList.remove('visible');
            });
        }
    });

    // Impede que o dropdown feche ao clicar dentro do multi-select
    document.addEventListener('click', (e) => {
        if (e.target.closest('.multi-select')) {
            e.stopPropagation();
        }
    });

    // Adiciona evento de teclado para os inputs de multi-select
    document.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('multi-select-input')) {
            const container = e.target.closest('.multi-select');
            const baseId = container.id.replace('Container', '');
            const dropdown = document.getElementById(`${baseId}Dropdown`);
            
            if (e.key === 'Escape') {
                // Limpa o campo e fecha o dropdown
                e.target.value = '';
                dropdown.classList.remove('visible');
                container.classList.remove('focused');
            } else if (e.key === 'Enter') {
                // Impede o submit do formulário
                e.preventDefault();
            } else if (e.key !== 'Tab') {
                // Para qualquer outra tecla, garante que o dropdown permaneça aberto
                if (e.target.value.trim() !== '') {
                    dropdown.classList.add('visible');
                    container.classList.add('focused');
                }
            }
        }
    });
    
