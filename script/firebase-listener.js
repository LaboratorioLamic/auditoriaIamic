// === SINCRONIZAÇÃO FIREBASE EM TEMPO REAL ===

    function forceFirebaseSync() {
        try {
            audits = [];
            trainings = [];
            activities = [];
            maintenances = [];
            documents = [];
            users = [];
            masterLists = JSON.parse(JSON.stringify(defaultMasterLists));
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
        const drawerIds = ['modalAuditoria', 'modalAtividades', 'modalManutencao', 'modalDocumentos'];
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

                const dataChanged = !editingCard && (
                    JSON.stringify(record.audits) !== JSON.stringify(audits) ||
                    JSON.stringify(record.trainings) !== JSON.stringify(trainings) ||
                    JSON.stringify(record.activities) !== JSON.stringify(activities) ||
                    JSON.stringify(record.maintenances) !== JSON.stringify(maintenances) ||
                    JSON.stringify(record.documents) !== JSON.stringify(documents)
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
                }

                populateSelects();
                currentTab === 'dashboard' ? renderDashboard() : renderCards();
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

    async function saveAll(showAlert = false) {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
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

            await update(dbRef(database, "/"), {
                '/audits': audits,
                '/trainings': trainings,
                '/activities': activities,
                '/maintenances': maintenances,
                '/documents': documents,
                '/masterLists': masterLists,
                '/kanbanOrder': kanbanOrder,
                '/lastUpdate': new Date().toISOString()
            });

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
