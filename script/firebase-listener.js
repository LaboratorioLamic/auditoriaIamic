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
            // (#5) Pinta a UI imediatamente a partir do cache local, se houver,
            // enquanto a rede responde. O cache é apenas visual: NUNCA alimenta o
            // baseline do merge nem é gravado de volta sem confirmação da rede.
            _paintFromLocalCache();

            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbGet = getFirebaseGet();

            // (#1/#3) Lê SOMENTE as coleções de dados — não baixa /imgBlobs (imagens
            // Base64) nem /passwords, que são os nós mais pesados e desnecessários aqui.
            const _snaps = await Promise.all(_DATA_LISTEN_PATHS.map(p => dbGet(dbRef(database, p))));
            const record = {};
            _DATA_LISTEN_PATHS.forEach((p, i) => { record[p] = _snaps[i].exists() ? _snaps[i].val() : undefined; });

            {
                audits = _toArray(record.audits);
                trainings = _toArray(record.trainings);
                activities = _toArray(record.activities);
                maintenances = _toArray(record.maintenances);
                documents = _toArray(record.documents);
                ocorrencias = _toArray(record.ocorrencias);
                rncItems = _toArray(record.rncItems);
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

            if (typeof window.renderDashboard === 'function') window.renderDashboard();
            if (typeof window.updateRncNotificationBell === 'function') window.updateRncNotificationBell();

            startFirebaseListener();
            _saveLocalCache();

        } catch (err) {
            console.error("Erro ao carregar dados do Firebase:", err);

            cleanInvalidResponsaveis();
            populateYearSelects();
            populateSelects();
            restoreFiltersFromFirebase();
            if (typeof window.renderDashboard === 'function') window.renderDashboard();
        }
        switchTab('dashboard');
    }

    function isEditingCardOpen() {
        const drawerIds = ['modalAuditoria', 'modalTreinamentos', 'modalAtividades', 'modalManutencao', 'modalDocumentos', 'modalOcorrencia', 'modalRnc'];
        return drawerIds.some(id => {
            const el = document.getElementById(id);
            return el && el.classList.contains('open');
        });
    }

    // === CACHE LOCAL (#5) — pintura instantânea da UI a partir do localStorage ===
    // Puramente visual: acelera o primeiro render enquanto a rede responde. Nunca
    // alimenta o baseline do merge nem é gravado de volta sem confirmação da rede.
    var _LOCAL_CACHE_KEY = 'auditoriaIamic:cacheV1';

    function _saveLocalCache() {
        try {
            localStorage.setItem(_LOCAL_CACHE_KEY, JSON.stringify({
                audits, trainings, activities, maintenances, documents,
                ocorrencias, rncItems, masterLists, kanbanOrder, ts: Date.now()
            }));
        } catch (_) { /* quota cheia ou indisponível — cache é opcional */ }
    }

    function _paintFromLocalCache() {
        try {
            // Só pinta se ainda não há dados em memória (evita sobrepor sessão viva).
            const empty = !audits.length && !trainings.length && !activities.length &&
                          !maintenances.length && !documents.length && !ocorrencias.length && !rncItems.length;
            if (!empty) return false;
            const raw = localStorage.getItem(_LOCAL_CACHE_KEY);
            if (!raw) return false;
            const c = JSON.parse(raw);
            if (!c) return false;
            audits       = _toArray(c.audits);
            trainings    = _toArray(c.trainings);
            activities   = _toArray(c.activities);
            maintenances = _toArray(c.maintenances);
            documents    = _toArray(c.documents);
            ocorrencias  = _toArray(c.ocorrencias);
            rncItems     = _toArray(c.rncItems);
            if (typeof window.rncItems !== 'undefined') window.rncItems = rncItems;
            if (c.masterLists) masterLists = { ...defaultMasterLists, ...c.masterLists };
            kanbanOrder = c.kanbanOrder || {};
            try {
                populateSelects();
                if (typeof window.renderDashboard === 'function') window.renderDashboard();
            } catch (_) {}
            return true;
        } catch (_) { return false; }
    }

    // === LISTENER ESCOPADO POR COLEÇÃO (#1) ===
    // Caminhos de dados lidos/ouvidos. NUNCA inclui imgBlobs (imagens Base64) nem
    // passwords — assim o Firebase jamais reenvia esses nós pesados nas sincronizações.
    var _DATA_LISTEN_PATHS = ['audits','trainings','activities','maintenances','documents','ocorrencias','rncItems','masterLists','kanbanOrder'];

    var dataListeners = [];          // um listener por coleção (substitui o único em "/")
    var _remoteCache = {};           // último valor remoto de cada caminho ouvido
    var _remoteApplyScheduled = false;

    // Coalesce as rajadas de eventos das várias coleções num único re-render.
    function _scheduleRemoteApply() {
        if (_remoteApplyScheduled) return;
        _remoteApplyScheduled = true;
        setTimeout(() => { _remoteApplyScheduled = false; _applyRemoteSnapshot(); }, 50);
    }

    function startFirebaseListener() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbOnValue = getFirebaseOnValue();

            if (!currentuser) return;

            // Um listener por coleção em vez de um único em "/": o Firebase nunca
            // reenvia /imgBlobs nem /passwords nas sincronizações. (#1)
            if (dataListeners.length === 0) {
                _DATA_LISTEN_PATHS.forEach(path => {
                    const handler = dbOnValue(dbRef(database, path), (snapshot) => {
                        _remoteCache[path] = snapshot.exists() ? snapshot.val() : null;
                        _scheduleRemoteApply();
                    });
                    dataListeners.push({ path, handler });
                });
            }

            startUsersListener();
        } catch (error) {
            console.error('Erro no listener Firebase:', error);
        }
    }

    // Reaproveita exatamente a lógica de adoção/guarda do listener original,
    // montando um "record" a partir do cache das coleções ouvidas.
    function _applyRemoteSnapshot() {
        try {
            const record = {
                audits:       _remoteCache.audits,
                trainings:    _remoteCache.trainings,
                activities:   _remoteCache.activities,
                maintenances: _remoteCache.maintenances,
                documents:    _remoteCache.documents,
                ocorrencias:  _remoteCache.ocorrencias,
                rncItems:     _remoteCache.rncItems,
                masterLists:  _remoteCache.masterLists,
                kanbanOrder:  _remoteCache.kanbanOrder
            };
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
                else if (currentTab === 'dashboard') {
                    var _ocDashEl = document.getElementById('dashboardOcContent');
                    if (_ocDashEl && _ocDashEl.style.display !== 'none') {
                        if (typeof window.renderOcDashboard === 'function') window.renderOcDashboard();
                    } else {
                        if (typeof window.renderDashboard === 'function') window.renderDashboard();
                    }
                } else {
                    if (typeof window.renderCards === 'function') window.renderCards();
                }
                if (typeof window.updateRncNotificationBell === 'function') window.updateRncNotificationBell();
        } catch (err) {
            console.error('Erro ao aplicar dados remotos:', err);
        }
    }

    function startUsersListener() {
        const database = getFirebaseDatabase();
        const dbRef = getFirebaseRef();
        const dbOnValue = getFirebaseOnValue();
        if (usersListener) return;
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

    function stopFirebaseListener() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbOff = getFirebaseOff();
            if (dataListeners.length) {
                dataListeners.forEach(({ path, handler }) => {
                    try { dbOff(dbRef(database, path), handler); } catch (_) {}
                });
                dataListeners = [];
                _remoteCache = {};
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

    // Normaliza valores do Firebase RTDB para array JS.
    // O RTDB serializa arrays como objetos {0:x,1:y,...} — Object.values() recupera.
    function _toArray(val) {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return Object.values(val);
        return [];
    }

    // Reconcilia uma coleção: parte do estado REMOTO e reaplica somente as
    // alterações locais reais (detectadas contra o baseline) por id de item.
    function _mergeCollection(localArr, remoteArr, baseArr) {
        localArr  = Array.isArray(localArr)  ? localArr  : [];
        remoteArr = _toArray(remoteArr);
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
    //
    // COALESCING: o save lê o estado LOCAL (não congelado) no instante em que roda,
    // então N chamadas disparadas em rajada não precisam de N gravações do banco
    // inteiro — basta UMA regravação após o save atual para capturar todas as
    // mutações acumuladas. Enquanto há um save em andamento/agendado, chamadas
    // extras apenas marcam `_saveCoalesced` em vez de empilhar ciclos redundantes.
    // Exceção: `showAlert` (sincronização manual) sempre força um ciclo próprio,
    // pois precisa reportar sucesso/erro daquela ação específica ao usuário.
    var _saveCoalesced = false;
    function saveAll(showAlert = false) {
        if (!showAlert && _pendingSaves > 0) {
            // Já há um save no ar; ele (ou seu follow-up) relerá o estado local
            // atualizado. Evita gravações redundantes do banco inteiro em rajada.
            _saveCoalesced = true;
            return _saveAllQueue;
        }
        _pendingSaves++;
        _saveAllQueue = _saveAllQueue
            .catch(() => {})
            .then(() => _saveAllInternal(showAlert))
            .finally(() => { _pendingSaves = Math.max(0, _pendingSaves - 1); });
        // Follow-up único: se chegaram mutações durante este save, regrava uma vez.
        _saveAllQueue = _saveAllQueue.then(() => {
            if (_saveCoalesced && _pendingSaves === 0) {
                _saveCoalesced = false;
                return saveAll();
            }
            _saveCoalesced = false;
        });
        return _saveAllQueue;
    }

    async function _saveAllInternal(showAlert = false) {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const update = getFirebaseUpdate();
            const dbGet = getFirebaseGet();

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

            // Baseline ausente: trata como vazio para que todo item local vire
            // "novo" (upsert) sem excluir nada — evita apagar dados com estado parcial.
            const base = _syncBaseline || {
                audits: [], trainings: [], activities: [], maintenances: [], documents: [], ocorrencias: [], rncItems: []
            };

            // Snapshots locais estáveis capturados antes da leitura remota.
            const local = {
                audits: _deepClone(audits),
                trainings: _deepClone(trainings),
                activities: _deepClone(activities),
                maintenances: _deepClone(maintenances),
                documents: _deepClone(documents),
                ocorrencias: _deepClone(ocorrencias),
                rncItems: _deepClone(rncItems)
            };
            const mlSnapshot = JSON.parse(JSON.stringify(masterLists));
            const koSnapshot = JSON.parse(JSON.stringify(kanbanOrder));

            // (#3) Lê SOMENTE as coleções de dados para o merge 3-vias — não baixa
            // /imgBlobs (imagens Base64) nem /passwords. Esta é a leitura mais frequente
            // do sistema (roda a cada gravação), então excluir as imagens daqui é o maior
            // corte de banda. Usa update() em caminhos específicos em vez de
            // runTransaction(/), que falha com internal_error em bancos grandes.
            const _mergePaths = ['audits','trainings','activities','maintenances','documents','ocorrencias','rncItems','masterLists','kanbanOrder'];
            const _remoteSnaps = await Promise.all(_mergePaths.map(p => dbGet(dbRef(database, p))));
            const remoteState = {};
            _mergePaths.forEach((p, i) => { remoteState[p] = _remoteSnaps[i].exists() ? _remoteSnaps[i].val() : undefined; });

            const mergedAudits       = _mergeCollection(local.audits,       remoteState.audits,       base.audits);
            const mergedTrainings    = _mergeCollection(local.trainings,    remoteState.trainings,    base.trainings);
            const mergedActivities   = _mergeCollection(local.activities,   remoteState.activities,   base.activities);
            const mergedMaintenances = _mergeCollection(local.maintenances, remoteState.maintenances, base.maintenances);
            const mergedDocuments    = _mergeCollection(local.documents,    remoteState.documents,    base.documents);
            const mergedOcorrencias  = _mergeCollection(local.ocorrencias,  remoteState.ocorrencias,  base.ocorrencias);
            const mergedRncItems     = _mergeCollection(local.rncItems,     remoteState.rncItems,     base.rncItems);

            // (#2) Grava SOMENTE as coleções que realmente mudaram em relação ao remoto.
            // Coleções inalteradas não são reescritas — evita reenviá-las (e o reenvio
            // do listener) aos demais clientes conectados.
            const _changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
            const writePayload = {};
            if (_changed(mergedAudits,       _toArray(remoteState.audits)))       writePayload.audits       = mergedAudits;
            if (_changed(mergedTrainings,    _toArray(remoteState.trainings)))    writePayload.trainings    = mergedTrainings;
            if (_changed(mergedActivities,   _toArray(remoteState.activities)))   writePayload.activities   = mergedActivities;
            if (_changed(mergedMaintenances, _toArray(remoteState.maintenances))) writePayload.maintenances = mergedMaintenances;
            if (_changed(mergedDocuments,    _toArray(remoteState.documents)))    writePayload.documents    = mergedDocuments;
            if (_changed(mergedOcorrencias,  _toArray(remoteState.ocorrencias)))  writePayload.ocorrencias  = mergedOcorrencias;
            if (_changed(mergedRncItems,     _toArray(remoteState.rncItems)))     writePayload.rncItems     = mergedRncItems;
            if (_changed(mlSnapshot, remoteState.masterLists || {})) writePayload.masterLists = mlSnapshot;
            if (_changed(koSnapshot, remoteState.kanbanOrder || {})) writePayload.kanbanOrder = koSnapshot;

            if (Object.keys(writePayload).length > 0) {
                writePayload.lastUpdate = new Date().toISOString();
                await update(dbRef(database, "/"), writePayload);
            }

            // O merge incorporou novidades de outras sessões? (para re-render)
            const pulledRemoteChanges =
                JSON.stringify(mergedAudits)       !== JSON.stringify(audits) ||
                JSON.stringify(mergedTrainings)    !== JSON.stringify(trainings) ||
                JSON.stringify(mergedActivities)   !== JSON.stringify(activities) ||
                JSON.stringify(mergedMaintenances) !== JSON.stringify(maintenances) ||
                JSON.stringify(mergedDocuments)    !== JSON.stringify(documents) ||
                JSON.stringify(mergedOcorrencias)  !== JSON.stringify(ocorrencias) ||
                JSON.stringify(mergedRncItems)     !== JSON.stringify(rncItems);

            // SÓ AGORA (gravação CONFIRMADA pelo servidor) adota o resultado
            // reconciliado como novo estado local + baseline. Se a gravação
            // tivesse falhado, a edição permaneceria em memória para nova tentativa
            // — e o baseline não seria "envenenado" com algo que não foi salvo.
            audits = mergedAudits;
            trainings = mergedTrainings;
            activities = mergedActivities;
            maintenances = mergedMaintenances;
            documents = mergedDocuments;
            ocorrencias = mergedOcorrencias;
            rncItems = mergedRncItems;
            if (typeof window.rncItems !== 'undefined') window.rncItems = rncItems;
            captureSyncBaseline();
            _saveLocalCache(); // (#5) atualiza o cache visual após gravação confirmada

            // Se incorporamos mudanças de outras sessões, atualiza a UI.
            if (pulledRemoteChanges && !isEditingCardOpen()) {
                populateSelects();
                if (currentTab === 'ocorrencias') { if (typeof window.ocRenderTable === 'function') window.ocRenderTable(); }
                else if (currentTab === 'rnc') { if (typeof window.rncRenderTable === 'function') window.rncRenderTable(); }
                else if (currentTab === 'dashboard') {
                    var _ocDashEl2 = document.getElementById('dashboardOcContent');
                    if (_ocDashEl2 && _ocDashEl2.style.display !== 'none') {
                        if (typeof window.renderOcDashboard === 'function') window.renderOcDashboard();
                    } else {
                        renderDashboard();
                    }
                } else {
                    renderCards();
                }
                if (typeof window.updateRncNotificationBell === 'function') window.updateRncNotificationBell();
            }

            if (showAlert) alert("Dados sincronizados com sucesso!");

        } catch (err) {
            console.error("Erro ao sincronizar com Firebase:", err);
            // Falha de gravação: NÃO adota o resultado mesclado. As edições locais e
            // o baseline são preservados, então a alteração do usuário não é perdida
            // nem revertida pelo listener — bastará uma nova tentativa de salvar.
            if (showAlert) {
                if (typeof showToast === 'function') showToast('Erro ao salvar. Verifique a conexão — suas alterações não foram perdidas.', 'error');
                else alert("Erro ao sincronizar dados. Verifique a conexão.");
            }
        }
    }

    function getStatusType(statusname, category) {
        // Busca o objeto de status na lista correta para checar flags isConcluido/isCancelado
        let list;
        if (category === 'audit') list = masterLists.auditStatus;
        else if (category === 'ativ') list = masterLists.ativStatus;
        else if (category === 'mant') list = masterLists.mantStatus;
        else if (category === 'doc') list = masterLists.docStatus;
        else if (category === 'tren') list = masterLists.trainStatus;
        const statusObj = (list || []).find(s => s.name === statusname);
        if (statusObj) {
            if (statusObj.isConcluido) return 'finalizado';
            if (statusObj.isCancelado) return 'inativo';
        }
        // Fallback por nome para compatibilidade
        const finalizadoKeywords = ['concluído', 'finalizado', 'publicado'];
        const inativoKeywords = ['cancelado', 'obsoleto'];
        const nameLower = (statusname || '').toLowerCase();
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
