// === SINCRONIZAÇÃO FORÇADA + FIREBASE LISTENER ===

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
        const drawerIds = ['modalAuditoria', 'modalAtividades', 'modalManutencao', 'modalDocumentos'];
        const modalIds = ['modalListManager'];
        const drawerOpen = drawerIds.some(id => {
            const el = document.getElementById(id);
            return el && el.classList.contains('open');
        });
        const modalOpen = modalIds.some(id => {
            const el = document.getElementById(id);
            return el && getComputedStyle(el).display !== 'none';
        });
        return drawerOpen || modalOpen;
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
        else if (category === 'train') list = masterLists.trainStatus;

        const statusObj = (list || []).find(s => s.name === statusname);
        return statusObj ? statusObj.color : 'default';
    }
