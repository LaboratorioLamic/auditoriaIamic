// === SINCRONIZAÇÃO FIREBASE EM TEMPO REAL ===

    function forceFirebaseSync() {
        try {
            audits = [];
            trainings = [];
            activities = [];
            maintenances = [];
            documents = [];
            ocorrencias = [];
            rncItems = [];
            users = [];
            masterLists = JSON.parse(JSON.stringify(defaultMasterLists));
            // Invalida o baseline: enquanto não recarregamos, o estado local
            // vazio não deve ser interpretado como "tudo excluído" num save.
            _syncBaseline = null;
            loadCloudData();
        } catch (error) {
            console.error('Erro na sincronização forçada:', error);
        }
    }

    async function loadCloudData() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbGet = getFirebaseGet();

            const snapshot = await dbGet(dbRef(database, "/"));

            if (snapshot.exists()) {
                const record = snapshot.val();

                audits = record.audits || [];
                trainings = record.trainings || [];
                activities = record.activities || [];
                maintenances = record.maintenances || [];
                documents = record.documents || [];
                ocorrencias = record.ocorrencias || [];
                rncItems = record.rncItems || [];
                if (typeof window.rncItems !== 'undefined') window.rncItems = rncItems;

                if (record.masterLists) {
                    masterLists = { ...defaultMasterLists, ...record.masterLists };
                    if (Array.isArray(masterLists.mantItens) && masterLists.mantItens.length === 0) {
                        masterLists.mantItens = defaultMasterLists.mantItens;
                    }
                }

                kanbanOrder = record.kanbanOrder || {};
            }

            [audits, trainings, activities, maintenances, documents].forEach(arr => {
                arr.forEach(item => item.historico = item.historico || []);
            });

            // Baseline para o merge 3-vias: estado remoto recém-adotado.
            captureSyncBaseline();

            await loadusers();
            // Atualiza referência do currentuser para o objeto recém-carregado (com id)
            if (typeof currentuser !== 'undefined' && currentuser && currentuser.user) {
                const _refreshed = users.find(u => String(u.user).toLowerCase() === String(currentuser.user).toLowerCase());
                if (_refreshed) currentuser = _refreshed;
            }
            await migrateResponsaveisToIds();
            await loadUserPrefsFromFirebase();

            cleanInvalidResponsaveis();
            populateYearSelects();
            populateSelects();
            restoreFiltersFromFirebase();

            currentTab === 'dashboard' ? renderDashboard() : renderCards();
            if (typeof window.updateRncNotificationBell === 'function') window.updateRncNotificationBell();

            startFirebaseListener();

        } catch (err) {
            console.error("Erro ao carregar dados do Firebase:", err);

            cleanInvalidResponsaveis();
            populateYearSelects();
            populateSelects();
            restoreFiltersFromFirebase();
            currentTab === 'dashboard' ? renderDashboard() : renderCards();
        }
        switchTab('dashboard');
    }

    function isEditingCardOpen() {
        const drawerIds = ['modalAuditoria', 'modalAtividades', 'modalManutencao', 'modalDocumentos', 'modalOcorrencia', 'modalRnc'];
        return drawerIds.some(id => {
            const el = document.getElementById(id);
            return el && el.classList.contains('open');
        });
    }

    function startFirebaseListener() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbOnValue = getFirebaseOnValue();

            if (!currentuser || dataListener) return;

            dataListener = dbOnValue(dbRef(database, "/"), (snapshot) => {
                if (!snapshot.exists()) return;

                const record = snapshot.val();
                const editingCard = isEditingCardOpen();

                // masterLists e kanbanOrder sempre sincronizam (inclusive durante edição de lista)
                const listsChanged =
                    JSON.stringify(record.masterLists) !== JSON.stringify(masterLists) ||
                    JSON.stringify(record.kanbanOrder) !== JSON.stringify(kanbanOrder);

                // Não adota o remoto enquanto há edição aberta OU gravação local
                // pendente: evita sobrescrever alterações locais ainda não salvas.
                const dataChanged = !editingCard && _pendingSaves === 0 && (
                    JSON.stringify(record.audits) !== JSON.stringify(audits) ||
                    JSON.stringify(record.trainings) !== JSON.stringify(trainings) ||
                    JSON.stringify(record.activities) !== JSON.stringify(activities) ||
                    JSON.stringify(record.maintenances) !== JSON.stringify(maintenances) ||
                    JSON.stringify(record.documents) !== JSON.stringify(documents) ||
                    JSON.stringify(record.ocorrencias) !== JSON.stringify(ocorrencias) ||
                    JSON.stringify(record.rncItems) !== JSON.stringify(rncItems)
                );

                if (!listsChanged && !dataChanged) return;

                if (listsChanged) {
                    if (record.masterLists) {
                        masterLists = { ...defaultMasterLists, ...record.masterLists };
                    }
                    kanbanOrder = record.kanbanOrder || {};
                }

                if (dataChanged) {
                    audits = record.audits || [];
                    trainings = record.trainings || [];
                    activities = record.activities || [];
                    maintenances = record.maintenances || [];
                    documents = record.documents || [];
                    ocorrencias = record.ocorrencias || [];
                    rncItems = record.rncItems || [];
                    if (typeof window.rncItems !== 'undefined') window.rncItems = rncItems;
                    // Adotamos o estado remoto: atualiza o baseline do merge.
                    captureSyncBaseline();
                }

                populateSelects();
                if (currentTab === 'ocorrencias') { if (typeof window.ocRenderTable === 'function') window.ocRenderTable(); }
                else if (currentTab === 'rnc') { if (typeof window.rncRenderTable === 'function') window.rncRenderTable(); }
                else currentTab === 'dashboard' ? renderDashboard() : renderCards();
                if (typeof window.updateRncNotificationBell === 'function') window.updateRncNotificationBell();
            });

            if (!usersListener) {
                usersListener = dbOnValue(dbRef(database, 'passwords'), (snapshot) => {
                    if (isEditingCardOpen()) return;

                    let rawUsers = snapshot.exists() ? snapshot.val() : [];
                    if (!Array.isArray(rawUsers)) rawUsers = [];

                    const newUsers = rawUsers.map(u => ({
                        ...u,
                        name: u.name || u.Name || u.user || '',
                        user: u.user || u.User || '',
                        password: String(u.password || ''),
                        active: u.active !== false,
                        canDeleteCards: _normTriPerm(u.canDeleteCards, 'nao'),
                        canEditCards:   _normTriPerm(u.canEditCards,   'total'),
                        canManageLists: !!u.canManageLists,
                        canManagePubs:  _normTriPerm(u.canManagePubs,  'total'),
                        canPublish: u.canPublish || 'total',
                        canChecklist: u.canChecklist || 'total',
                        isAdmin: !!u.isAdmin || u.user === 'admin'
                    }));

                    if (JSON.stringify(newUsers) !== JSON.stringify(users)) {
                        users = newUsers;
                        if (currentTab === 'configuracoes') renderusersConfigTable();
                        msRefreshUsers();
                        populateSelects();
                    }
                });
            }
        } catch (error) {
            console.error('Erro no listener Firebase:', error);
        }
    }

    function stopFirebaseListener() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbOff = getFirebaseOff();
            if (dataListener) {
                dbOff(dbRef(database, "/"), dataListener);
                dataListener = null;
            }
            if (usersListener) {
                dbOff(dbRef(database, 'passwords'), usersListener);
                usersListener = null;
            }
        } catch (error) {
            console.error('Erro ao parar listener Firebase:', error);
        }
    }

    // === MERGE 3-VIAS / BASELINE (previne perda de dados em edições concorrentes) ===
    // _syncBaseline guarda um snapshot das coleções no último estado remoto que
    // adotamos integralmente. Ao salvar, comparamos o estado local com esse
    // baseline para descobrir o que ESTE usuário realmente alterou (adições,
    // edições e exclusões) e aplicamos apenas esses deltas sobre o estado remoto
    // mais recente — sem sobrescrever alterações feitas por outras sessões.
    var _syncBaseline = null;
    var _saveAllQueue = Promise.resolve(); // serializa gravações concorrentes
    var _pendingSaves = 0;                 // nº de saves em andamento (guard do listener)

    function _deepClone(v) {
        try { return JSON.parse(JSON.stringify(v == null ? [] : v)); } catch (_) { return []; }
    }

    function captureSyncBaseline() {
        _syncBaseline = {
            audits: _deepClone(audits),
            trainings: _deepClone(trainings),
            activities: _deepClone(activities),
            maintenances: _deepClone(maintenances),
            documents: _deepClone(documents),
            ocorrencias: _deepClone(ocorrencias),
            rncItems: _deepClone(rncItems)
        };
    }

    // Reconcilia uma coleção: parte do estado REMOTO e reaplica somente as
    // alterações locais reais (detectadas contra o baseline) por id de item.
    function _mergeCollection(localArr, remoteArr, baseArr) {
        localArr  = Array.isArray(localArr)  ? localArr  : [];
        remoteArr = Array.isArray(remoteArr) ? remoteArr : [];
        baseArr   = Array.isArray(baseArr)   ? baseArr   : [];

        const hasId = (it) => it && it.id !== undefined && it.id !== null && it.id !== '';

        // Sem ids confiáveis não há como reconciliar com segurança: mantém a
        // visão local (fallback seguro; não deve ocorrer no fluxo normal).
        if (localArr.some(it => !hasId(it)) || remoteArr.some(it => !hasId(it))) {
            return _deepClone(localArr);
        }

        const baseById  = new Map(baseArr.map(it => [String(it.id), it]));
        const localById = new Map(localArr.map(it => [String(it.id), it]));

        // Começa do remoto para preservar alterações de outras sessões.
        const merged = new Map(remoteArr.map(it => [String(it.id), it]));

        // Exclusões locais: itens que existiam no baseline e sumiram do local.
        baseById.forEach((_v, id) => {
            if (!localById.has(id)) merged.delete(id);
        });

        // Adições/edições locais: o item local difere do baseline => local vence.
        localById.forEach((item, id) => {
            const base = baseById.get(id);
            if (!base || JSON.stringify(base) !== JSON.stringify(item)) {
                merged.set(id, item);
            }
        });

        const result = Array.from(merged.values());

        // Guarda de segurança: se o resultado ficou vazio mas o estado local
        // tem itens, o remoto provavelmente voltou null/vazio por inconsistência
        // transitória do Firebase (array vazio → null no RTDB) e NÃO por uma
        // exclusão real. Preserva o estado local para evitar apagar dados.
        // Não afeta exclusões legítimas: nesse caso localArr também seria [].
        if (result.length === 0 && localArr.length > 0) {
            return _deepClone(localArr);
        }

        return result;
    }

    // Wrapper público: enfileira as gravações para que duas chamadas de saveAll
    // não se intercalem (read-merge-write atômico por chamada).
    function saveAll(showAlert = false) {
        _pendingSaves++;
        _saveAllQueue = _saveAllQueue
            .catch(() => {})
            .then(() => _saveAllInternal(showAlert))
            .finally(() => { _pendingSaves = Math.max(0, _pendingSaves - 1); });
        return _saveAllQueue;
    }

    async function _saveAllInternal(showAlert = false) {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbGet = getFirebaseGet();
            const { update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

            cleanInvalidResponsaveis();
            cleanMalformedItems();

            const maxHistoryItems = 150;
            [audits, trainings, activities, maintenances, documents].forEach(arr => {
                arr.forEach(item => {
                    if (item.historico && item.historico.length > maxHistoryItems) {
                        item.historico = item.historico.slice(-maxHistoryItems);
                    }
                });
            });

            // Baseline ausente (ex.: carregamento ainda não concluído ou falhou):
            // trata como vazio. Assim todo item local vira "novo" (upsert) e
            // NADA é excluído — evita apagar o banco com um estado local parcial.
            const base = _syncBaseline || {
                audits: [], trainings: [], activities: [], maintenances: [], documents: [], ocorrencias: [], rncItems: []
            };

            // Relê o estado remoto atual para reconciliar (merge 3-vias).
            let remote = {};
            try {
                const snap = await dbGet(dbRef(database, "/"));
                remote = snap.exists() ? snap.val() : {};
            } catch (e) {
                // Sem leitura remota não é seguro fazer merge: aborta a gravação
                // para não arriscar sobrescrever dados de outras sessões.
                console.error('saveAll: falha ao ler estado remoto para merge. Gravação cancelada.', e);
                if (showAlert) alert("Erro ao sincronizar dados. Verifique a conexão.");
                return;
            }

            const mergedAudits       = _mergeCollection(audits,       remote.audits,       base.audits);
            const mergedTrainings    = _mergeCollection(trainings,    remote.trainings,    base.trainings);
            const mergedActivities   = _mergeCollection(activities,   remote.activities,   base.activities);
            const mergedMaintenances = _mergeCollection(maintenances, remote.maintenances, base.maintenances);
            const mergedDocuments    = _mergeCollection(documents,    remote.documents,    base.documents);
            const mergedOcorrencias  = _mergeCollection(ocorrencias,  remote.ocorrencias,  base.ocorrencias);
            const mergedRncItems     = _mergeCollection(rncItems,     remote.rncItems,     base.rncItems);

            // O merge trouxe novidades de outras sessões? (para re-render)
            const pulledRemoteChanges =
                JSON.stringify(mergedAudits)       !== JSON.stringify(audits) ||
                JSON.stringify(mergedTrainings)    !== JSON.stringify(trainings) ||
                JSON.stringify(mergedActivities)   !== JSON.stringify(activities) ||
                JSON.stringify(mergedMaintenances) !== JSON.stringify(maintenances) ||
                JSON.stringify(mergedDocuments)    !== JSON.stringify(documents) ||
                JSON.stringify(mergedOcorrencias)  !== JSON.stringify(ocorrencias) ||
                JSON.stringify(mergedRncItems)     !== JSON.stringify(rncItems);

            // Adota o resultado reconciliado como novo estado local + baseline.
            audits = mergedAudits;
            trainings = mergedTrainings;
            activities = mergedActivities;
            maintenances = mergedMaintenances;
            documents = mergedDocuments;
            ocorrencias = mergedOcorrencias;
            rncItems = mergedRncItems;
            if (typeof window.rncItems !== 'undefined') window.rncItems = rncItems;
            captureSyncBaseline();

            await update(dbRef(database, "/"), {
                '/audits': mergedAudits,
                '/trainings': mergedTrainings,
                '/activities': mergedActivities,
                '/maintenances': mergedMaintenances,
                '/documents': mergedDocuments,
                '/ocorrencias': mergedOcorrencias,
                '/rncItems': mergedRncItems,
                '/masterLists': masterLists,
                '/kanbanOrder': kanbanOrder,
                '/lastUpdate': new Date().toISOString()
            });

            // Se incorporamos mudanças de outras sessões, atualiza a UI.
            if (pulledRemoteChanges && !isEditingCardOpen()) {
                populateSelects();
                if (currentTab === 'ocorrencias') { if (typeof window.ocRenderTable === 'function') window.ocRenderTable(); }
                else if (currentTab === 'rnc') { if (typeof window.rncRenderTable === 'function') window.rncRenderTable(); }
                else currentTab === 'dashboard' ? renderDashboard() : renderCards();
                if (typeof window.updateRncNotificationBell === 'function') window.updateRncNotificationBell();
            }

            if (showAlert) alert("Dados sincronizados com sucesso!");

        } catch (err) {
            console.error("Erro ao sincronizar com Firebase:", err);
            if (showAlert) alert("Erro ao sincronizar dados. Verifique a conexão.");
        }
    }

    function getStatusType(statusname) {
        const finalizadoKeywords = ['concluído', 'finalizado', 'publicado'];
        const inativoKeywords = ['cancelado', 'obsoleto'];
        const nameLower = statusname.toLowerCase();
        if (finalizadoKeywords.includes(nameLower)) return 'finalizado';
        if (inativoKeywords.includes(nameLower)) return 'inativo';
        return 'ativo';
    }

    function normalizeStatusName(name) {
        return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function isStatusCancelled(name) {
        return normalizeStatusName(name) === 'cancelado';
    }

    function isStatusStandby(name) {
        const n = normalizeStatusName(name);
        return n === 'standby' || n === 'stand by';
    }

    function getStatusColor(statusname, category) {
        let list;
        if (category === 'audit') list = masterLists.auditStatus;
        else if (category === 'ativ') list = masterLists.ativStatus;
        else if (category === 'mant') list = masterLists.mantStatus;
        else if (category === 'doc') list = masterLists.docStatus;
        else if (category === 'train') list = masterLists.trainStatus;

        const statusObj = (list || []).find(s => s.name === statusname);
        return statusObj ? statusObj.color : 'default';
    }
