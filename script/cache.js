// === CACHE / LOCALSTORAGE + PERSISTÊNCIA DE FILTROS ===

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
