// --- LÓGICA DE LOGIN (USUÁRIO + SENHA VIA BIN DE USUÁRIOS) ---
    document.getElementById('passwordInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkLogin();
    });
    document.getElementById('userInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkLogin();
    });

    async function loadusers() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbGet = getFirebaseGet();
            
            // O seu JSON indica que tudo está no nó 'passwords' como uma lista
            const usersRef = dbRef(database, 'passwords');
            const snapshot = await dbGet(usersRef);
            
            let rawUsers = [];
            if (snapshot.exists()) {
                rawUsers = snapshot.val();
                if (!Array.isArray(rawUsers)) rawUsers = [];
            }
            
            // Mapeia os dados garantindo a consistência das flags
            users = rawUsers.map(u => {
                const normalizedUser = String(u.user || u.User || '').trim().toLowerCase();
                return {
                    ...u,
                    name: u.name || u.Name || u.user || '',
                    user: u.user || u.User || '',
                    password: String(u.password || ''),
                    active: u.active !== false,
                    canDeleteCards: !!u.canDeleteCards,
                    canEditCards: u.canEditCards !== false,
                    canManageLists: !!u.canManageLists,
                    isAdmin: !!u.isAdmin || normalizedUser === 'admin'
                };
            });
            
            // Inicializa os usuários no multi-select após carregar
            initMultiSelectUsers();
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            throw new Error('Erro ao carregar usuários: ' + error.message);
        }
    }

    async function saveusers() {
        try {
            const database = getFirebaseDatabase();
            const dbRef = getFirebaseRef();
            const dbSet = getFirebaseSet();
            
            // Salva a lista completa de volta no nó 'passwords'
            const usersRef = dbRef(database, 'passwords');
            await dbSet(usersRef, users);
        } catch (error) {
            console.error('Erro ao salvar usuários:', error);
            throw new Error('Erro ao salvar usuários: ' + error.message);
        }
    }
    function updateCurrentuserUI() {
        const box = document.getElementById('currentuserBox');
        const label = document.getElementById('currentuserLabel');
        if (currentuser) {
            label.textContent = currentuser.name || currentuser.user || '-';
            box.style.display = 'flex';
        } else {
            box.style.display = 'none';
        }
        applyListManagerPermissions();
    }

    function applyListManagerPermissions() {
        const canManage = userCanManageLists();
        document.querySelectorAll('button[onclick*="openListManager"]').forEach(btn => {
            btn.style.display = canManage ? 'block' : 'none';
        });
    }

    function userIsAdmin() {
        if (!currentuser) return false;
        const normalizedUser = String(currentuser.user || '').trim().toLowerCase();
        return normalizedUser === 'admin' || currentuser.isAdmin === true;
    }

    function userCanDeleteCards() {
        if (!currentuser) return false;
        if (userIsAdmin()) return true;
        return currentuser.canDeleteCards === true;
    }

    function userCanEditCards() {
        if (!currentuser) return false;
        if (userIsAdmin()) return true;
        return currentuser.canEditCards === true;
    }

    function userCanManageLists() {
        if (!currentuser) return false;
        if (userIsAdmin()) return true;
        return currentuser.canManageLists === true;
    }

    function userAllowedTabs() {
        if (!currentuser) return null;
        // Admin tem acesso a todas as abas
        if (userIsAdmin()) {
            return ['dashboard', 'auditoria', 'treinamentos', 'documentos', 'atividades', 'manutencao', 'backup', 'configuracoes'];
        }
        // Se não houver configuração de abas, por segurança libera apenas Dashboard e Auditoria
        if (!Array.isArray(currentuser.tabs) || currentuser.tabs.length === 0) {
            return ['dashboard', 'auditoria'];
        }
        return currentuser.tabs;
    }

    function applyuserPermissionsToTabs() {
        const allowed = userAllowedTabs();
        const tabMap = {
            dashboard: 'tabDashboard',
            auditoria: 'tabAuditoria',
            treinamentos: 'tabTreinamentos',
            documentos: 'tabDocumentos',
            atividades: 'tabAtividades',
            manutencao: 'tabManutencao',
            backup: 'tabBackup',
            configuracoes: 'tabConfiguracoes'
        };
        Object.entries(tabMap).forEach(([key, btnId]) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            if (key === 'configuracoes') {
                // Aba Configurações só aparece se permitida
                btn.style.display = allowed && allowed.includes(key) ? 'block' : 'none';
            } else if (!allowed || allowed.includes(key)) {
                btn.disabled = false;
                btn.style.opacity = '1';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.4';
            }
        });
    }

    function logout() {
        // Para o listener do Firebase
        stopFirebaseListener();
        
        // Limpa usuário atual e volta para tela de login
        currentuser = null;
        updateCurrentuserUI();
        // Reseta aba para dashboard padrão sem dados sensíveis
        currentTab = 'dashboard';
        switchTab('dashboard');
        // Limpa campos de login
        const userInput = document.getElementById('userInput');
        const passInput = document.getElementById('passwordInput');
        const loginBtn = document.getElementById('btnLogin');
        const loading = document.getElementById('loadingText');
        const timerDisplay = document.getElementById('timerDisplay');
        if (userInput) userInput.value = '';
        if (passInput) passInput.value = '';
        if (userInput) {
            userInput.disabled = false;
            userInput.focus();
        }
        if (passInput) passInput.disabled = false;
        if (loginBtn) loginBtn.disabled = false;
        if (loading) loading.style.display = 'none';
        if (timerDisplay) timerDisplay.textContent = '';
        failedAttempts = 0;
        // Mostra novamente o overlay de login
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'flex';
    }

    async function checkLogin() {
        const userInput = document.getElementById('userInput');
        const passInput = document.getElementById('passwordInput');
        const btn = document.getElementById('btnLogin');
        const loading = document.getElementById('loadingText');
        const loginBox = document.getElementById('loginBox');

        if (btn.disabled) return;

        const login = (userInput.value || '').trim();
        const senha = passInput.value;
        if (!login || !senha) return;

        btn.disabled = true;
        userInput.disabled = true;
        passInput.disabled = true;
        loading.style.display = 'block';

        try {
            await loadusers();
            const found = users.find(u => String(u.user).trim().toLowerCase() === login.toLowerCase() && String(u.password) === String(senha));
            if (found) {
                if (found.active === false) {
                    alert('Usuário inativo. Entre em contato com o administrador para reativar o acesso.');
                    handleLoginError(passInput, btn, loginBox);
                    userInput.disabled = false;
                    passInput.disabled = false;
                    userInput.focus();
                } else {
                    currentuser = found;
                    updateCurrentuserUI();
                    applyuserPermissionsToTabs();
                    applyListManagerPermissions();
                    loading.innerHTML = '<i class="fas fa-check"></i> Login realizado. Sincronizando dados...';
                    // PROTEÇÃO: Força sincronização completa com Firebase após login
                    forceFirebaseSync();
                    document.getElementById('loginOverlay').style.display = 'none';
                    // Atualiza tabela de usuários para garantir que todos pré-cadastrados apareçam na aba Configurações
                    renderusersConfigTable();
                }
            } else {
                handleLoginError(passInput, btn, loginBox);
                userInput.disabled = false;
                userInput.focus();
            }
        } catch (err) {
            alert("Erro de conexão: " + err.message);
            btn.disabled = false;
            userInput.disabled = false;
            passInput.disabled = false;
            userInput.focus();
        } finally {
            loading.style.display = 'none';
        }
    }
    
    function handleLoginError(input, btn, box) {
        failedAttempts++;
        input.classList.add('error');
        box.classList.add('shake');
        
        setTimeout(() => {
            box.classList.remove('shake');
            input.classList.remove('error');
        }, 500);
    
        if (failedAttempts >= 5) {
            let seconds = 10;
            const timerDisplay = document.getElementById('timerDisplay');
            timerDisplay.textContent = `Muitas tentativas. Aguarde ${seconds}s`;
            
            const interval = setInterval(() => {
                seconds--;
                timerDisplay.textContent = `Muitas tentativas. Aguarde ${seconds}s`;
                if (seconds <= 0) {
                    clearInterval(interval);
                    timerDisplay.textContent = "";
                    failedAttempts = 0;
                    input.disabled = false;
                    btn.disabled = false;
                    input.value = "";
                    input.focus();
                }
            }, 1000);
        } else {
            input.disabled = false;
            btn.disabled = false;
            input.value = "";
            input.focus();
        }
    }

    // --- FUNÇÕES DE BACKUP LOCAL (ARQUIVO) ---
    
    function exportLocalData() {
        const data = {
            audits,
            activities,
            maintenances,
            documents, 
            masterLists,
            exportDate: new Date().toISOString(),
            source: "local_export"
        };
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "Auditoria_Lamic_" + today() + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
    
    function importLocalData(input) {
        const file = input.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validação básica
                if (data.audits && data.masterLists) {
                    if(confirm("ATENÇÃO: Isso substituirá os dados atuais e atualizará a nuvem. Deseja continuar?")) {
                        
                        audits = data.audits || [];
                        activities = data.activities || [];
                        maintenances = data.maintenances || [];
                        documents = data.documents || []; 
                        
                        masterLists = { ...defaultMasterLists, ...data.masterLists };
                        if (Array.isArray(masterLists.mantItens)) {
                            masterLists.mantItens = defaultMasterLists.mantItens; 
                        }
                        
                        // Garante que os itens importados tenham o campo historico (vazio se não vier)
                        audits.forEach(a => a.historico = a.historico || []);
                        activities.forEach(a => a.historico = a.historico || []);
                        maintenances.forEach(m => m.historico = m.historico || []);
                        documents.forEach(d => d.historico = d.historico || []);
    
                        await saveAll(false); 
                        
                        alert("Backup local restaurado e sincronizado com a nuvem com sucesso!");
                        
                        populateSelects();
                        switchTab(currentTab); 
                        input.value = ''; 
                    }
                } else {
                    alert("O arquivo selecionado não é um backup válido deste sistema.");
                }
            } catch (err) {
                alert("Erro ao ler o arquivo: " + err.message);
            }
        };
        reader.readAsText(file);
    }
    

    // --- CONFIGURAÇÕES: GESTÃO DE USUÁRIOS ---
    let editinguserIndex = null; // índice em users (exceto admin) para edição

    // Variável para armazenar setores selecionados temporariamente no modal
    let tempSelectedSetores = [];

    function resetConfigForm() {
        document.getElementById('cfgname').value = '';
        document.getElementById('cfguser').value = '';
        document.getElementById('cfgPassword').value = '';
        document.getElementById('cfgCanEdit').value = 'true';
        document.getElementById('cfgCanDelete').value = 'false';
        document.getElementById('cfgCanManageLists').value = 'false';
        document.getElementById('cfgStatus').value = 'true';
        document.getElementById('cfgIsAdmin').value = 'false';
        document.querySelectorAll('.cfg-tab').forEach(chk => {
            chk.checked = (chk.value === 'dashboard' || chk.value === 'auditoria');
            chk.disabled = false;
        });
        tempSelectedSetores = [];
        updateSetoresButtonText();
        editinguserIndex = null;
        
        // Adiciona listener para canManageLists
        const canManageInput = document.getElementById('cfgCanManageLists');
        if (canManageInput) {
            canManageInput.onchange = function() {
                updateSetoresButtonText();
            };
        }
    }

    function openSetoresModal() {
        const canManageLists = document.getElementById('cfgCanManageLists')?.value === 'true';
        const setores = masterLists.setores || [];
        
        // Se canManageLists está marcado, todos os setores são permitidos
        if (canManageLists) {
            tempSelectedSetores = setores.slice();
        } else if (tempSelectedSetores.length === 0) {
            // Se não há setores temporários, tenta carregar do usuário sendo editado
            if (editinguserIndex !== null && users[editinguserIndex] && Array.isArray(users[editinguserIndex].allowedSetores)) {
                tempSelectedSetores = users[editinguserIndex].allowedSetores.slice();
            }
        }
        
        renderModalSetores();
        document.getElementById('modalSetoresPermissoes').style.display = 'flex';
    }

    function renderModalSetores() {
        const container = document.getElementById('modalSetoresList');
        if (!container) return;
        
        const setores = masterLists.setores || [];
        const canManageLists = document.getElementById('cfgCanManageLists')?.value === 'true';
        
        container.innerHTML = '';
        
        if (setores.length === 0) {
            container.innerHTML = '<p style="color:#9ca3af; font-size:13px; text-align:center; padding:20px;">Nenhum setor cadastrado. Adicione setores primeiro.</p>';
            return;
        }
        
        setores.forEach(setor => {
            const isChecked = tempSelectedSetores.includes(setor);
            const checkbox = document.createElement('label');
            checkbox.style.cssText = 'display:flex; align-items:center; padding:10px 12px; margin-bottom:6px; background:white; border:1px solid #e5e7eb; border-radius:6px; cursor:pointer; transition:all 0.2s ease;';
            checkbox.onmouseover = function() { if (!canManageLists) this.style.background = '#f9fafb'; };
            checkbox.onmouseout = function() { this.style.background = 'white'; };
            checkbox.innerHTML = `
                <input type="checkbox" class="modal-setor-checkbox" value="${setor}" ${isChecked ? 'checked' : ''} ${canManageLists ? 'disabled' : ''} style="margin-right:10px; width:18px; height:18px; cursor:pointer;">
                <span style="flex:1; font-size:14px; color:#1f2937;">${setor}</span>
            `;
            if (!canManageLists) {
                checkbox.onclick = function(e) {
                    if (e.target.type !== 'checkbox') {
                        const checkbox = this.querySelector('input[type="checkbox"]');
                        checkbox.checked = !checkbox.checked;
                        updateTempSelectedSetores();
                    } else {
                        updateTempSelectedSetores();
                    }
                };
            }
            container.appendChild(checkbox);
        });
    }

    function updateTempSelectedSetores() {
        tempSelectedSetores = Array.from(document.querySelectorAll('.modal-setor-checkbox'))
            .filter(chk => chk.checked && !chk.disabled)
            .map(chk => chk.value);
    }

    function selectAllSetores() {
        const canManageLists = document.getElementById('cfgCanManageLists')?.value === 'true';
        if (canManageLists) return; // Não faz nada se canManageLists está marcado
        
        document.querySelectorAll('.modal-setor-checkbox').forEach(chk => {
            if (!chk.disabled) chk.checked = true;
        });
        updateTempSelectedSetores();
    }

    function deselectAllSetores() {
        const canManageLists = document.getElementById('cfgCanManageLists')?.value === 'true';
        if (canManageLists) return; // Não faz nada se canManageLists está marcado
        
        document.querySelectorAll('.modal-setor-checkbox').forEach(chk => {
            if (!chk.disabled) chk.checked = false;
        });
        updateTempSelectedSetores();
    }

    function saveSetoresPermissoes() {
        const canManageLists = document.getElementById('cfgCanManageLists')?.value === 'true';
        if (canManageLists) {
            // Se canManageLists está marcado, todos os setores são permitidos
            tempSelectedSetores = (masterLists.setores || []).slice();
        } else {
            updateTempSelectedSetores();
        }
        updateSetoresButtonText();
        closeModal('modalSetoresPermissoes');
    }

    function updateSetoresButtonText() {
        const buttonText = document.getElementById('setoresButtonText');
        if (!buttonText) return;
        
        const canManageLists = document.getElementById('cfgCanManageLists')?.value === 'true';
        const count = tempSelectedSetores.length;
        const total = (masterLists.setores || []).length;
        
        if (canManageLists) {
            buttonText.textContent = `Todos os Setores (${total})`;
        } else if (count === 0) {
            buttonText.textContent = 'Selecionar Setores';
        } else if (count === total) {
            buttonText.textContent = `Todos os Setores (${total})`;
        } else {
            buttonText.textContent = `${count} de ${total} Setores Selecionados`;
        }
    }

    function renderusersConfigTable() {
        const tbody = document.getElementById('cfgusersTable');
        if (!tbody) return;
        tbody.innerHTML = '';
        users
            .map((u, idx) => ({ u, idx }))
            .filter(wrapper => String(wrapper.u.user).trim().toLowerCase() !== 'admin') // admin não aparece
            .forEach(wrapper => {
                const u = wrapper.u;
                const idx = wrapper.idx;
                const tabs = Array.isArray(u.tabs) && u.tabs.length > 0 ? u.tabs.join(', ') : 'Dashboard, Auditoria';
                const editLabel = u.canEditCards === false ? 'Somente leitura' : 'Editar';
                const statusLabel = u.active === false ? 'Inativo' : 'Ativo';
                const isAdmin = (u.isAdmin === true || u.user === 'admin') ? 'Sim' : 'Não';
                const canDel = u.canDeleteCards ? 'Sim' : 'Não';
                const canManage = u.canManageLists ? 'Sim' : 'Não';
                tbody.innerHTML += `
                    <tr>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${u.name || '-'}</td>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${u.user || '-'}</td>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${tabs}</td>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${editLabel}</td>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${statusLabel}</td>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9; text-align:center; font-weight:${isAdmin === 'Sim' ? 'bold' : 'normal'}; color:${isAdmin === 'Sim' ? 'var(--ind-green)' : 'inherit'};">${isAdmin}</td>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9; text-align:center;">${canDel}</td>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9; text-align:center;">${canManage}</td>
                        <td style="padding:8px; border-bottom:1px solid #f1f5f9; text-align:right;">
                            <button class="btn-clear" style="padding:4px 8px; font-size:12px;" onclick="edituserConfig(${idx})"><i class="fas fa-pen"></i></button>
                            <button class="btn-clear" style="padding:4px 8px; font-size:12px; color:var(--ind-red);" onclick="deleteuserConfig(${idx})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
    }

    async function saveuserConfig() {
        const name = document.getElementById('cfgname').value.trim();
        const user = document.getElementById('cfguser').value.trim();
        const password = document.getElementById('cfgPassword').value;
        const canEdit = document.getElementById('cfgCanEdit').value === 'true';
        const canDelete = document.getElementById('cfgCanDelete').value === 'true';
        const canManageLists = document.getElementById('cfgCanManageLists').value === 'true';
        const isActive = document.getElementById('cfgStatus').value !== 'false';
        const isAdmin = document.getElementById('cfgIsAdmin').value === 'true';
        // Coleta abas selecionadas (canManageLists não afeta mais as abas)
        const tabs = Array.from(document.querySelectorAll('.cfg-tab'))
            .filter(chk => chk.checked)
            .map(chk => chk.value);
        
        // Coleta setores permitidos
        let allowedSetores = [];
        if (canManageLists) {
            // Se tem permissão de gerenciar listas, permite todos os setores
            allowedSetores = (masterLists.setores || []).slice();
        } else {
            // Usa os setores selecionados no modal
            allowedSetores = tempSelectedSetores.slice();
        }

        if (!name || !user || (!password && editinguserIndex === null)) {
            alert('Preencha ao menos Nome, Login e Senha (para novos usuários).');
            return;
        }
        if (user.toLowerCase() === 'admin') {
            alert('O usuário "admin" é reservado e não pode ser criado/alterado por aqui.');
            return;
        }

        // Evita logins duplicados em novos usuários
        if (editinguserIndex === null && users.some(u => String(u.user).trim().toLowerCase() === user.toLowerCase())) {
            alert('Já existe um usuário com esse login.');
            return;
        }

        if (editinguserIndex === null) {
            users.push({
                name: name,
                user: user,
                password: password,
                tabs,
                canEditCards: canEdit,
                canDeleteCards: canDelete,
                canManageLists: canManageLists,
                allowedSetores: allowedSetores,
                active: isActive,
                isAdmin: isAdmin
            });
        } else {
            const u = users[editinguserIndex];
            u.name = name;
            u.user = user;
            if (password) u.password = password;
            u.tabs = tabs;
            u.canEditCards = canEdit;
            u.canDeleteCards = canDelete;
            u.canManageLists = canManageLists;
            u.allowedSetores = allowedSetores;
            u.active = isActive;
            u.isAdmin = isAdmin;
        }

        try {
            await saveusers();
            renderusersConfigTable();
            if (currentuser && currentuser.user && currentuser.user.toLowerCase() === user.toLowerCase()) {
                currentuser = users[editinguserIndex === null ? users.length - 1 : editinguserIndex];
                updateCurrentuserUI();
                applyuserPermissionsToTabs();
                applyListManagerPermissions();
            }
            resetConfigForm();
            alert('Usuário salvo com sucesso.');
        } catch (e) {
            alert('Erro ao salvar usuários: ' + e.message);
        }
    }

    function edituserConfig(idx) {
        const u = users[idx];
        editinguserIndex = idx;
        document.getElementById('cfgname').value = u.name || '';
        document.getElementById('cfguser').value = u.user || '';
        document.getElementById('cfgPassword').value = '';
        document.getElementById('cfgCanEdit').value = (u.canEditCards === false ? 'false' : 'true');
        document.getElementById('cfgCanDelete').value = u.canDeleteCards ? 'true' : 'false';
        document.getElementById('cfgCanManageLists').value = u.canManageLists ? 'true' : 'false';
        document.getElementById('cfgStatus').value = (u.active === false ? 'false' : 'true');
        document.getElementById('cfgIsAdmin').value = (u.isAdmin === true) ? 'true' : 'false';
        const tabs = Array.isArray(u.tabs) && u.tabs.length > 0 ? u.tabs : ['dashboard', 'auditoria'];
        document.querySelectorAll('.cfg-tab').forEach(chk => {
            chk.checked = tabs.includes(chk.value);
            chk.disabled = false; // canManageLists não afeta mais as abas
        });
        // Carrega setores permitidos
        const allowedSetores = Array.isArray(u.allowedSetores) ? u.allowedSetores : [];
        tempSelectedSetores = allowedSetores.slice();
        updateSetoresButtonText();
        
        // Adiciona listener para canManageLists (apenas para atualizar o botão de setores)
        const canManageInput = document.getElementById('cfgCanManageLists');
        if (canManageInput) {
            canManageInput.onchange = function() {
                updateSetoresButtonText();
            };
        }
    }

    async function deleteuserConfig(idx) {
        const u = users[idx];
        if (!confirm(`Deseja realmente excluir o usuário "${u.name || u.user}"?`)) return;
        users.splice(idx, 1);
        try {
            await saveusers();
            renderusersConfigTable();
            alert('Usuário excluído com sucesso.');
        } catch (e) {
            alert('Erro ao excluir usuário: ' + e.message);
        }
    }

    // Botão de logout ao lado do nome do usuário
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Deseja realmente sair do sistema?')) {
                logout();
            }
        });
    }

    // FUNÇÕES PARA AUTOCOMPLETE DE RESPONSÁVEIS
    function updateResponsavelList(tab) {
        const inputId = tab === 'audit' ? 'auditResponsavel' : tab === 'ativ' ? 'ativResponsavel' : tab === 'mant' ? 'mantResponsavelTecnico' : 'docResponsavel';
        const listId = tab === 'audit' ? 'auditResponsavelList' : tab === 'ativ' ? 'ativResponsavelList' : tab === 'mant' ? 'mantResponsavelTecnicoList' : 'docResponsavelList';
        
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        
        if (!input || !list) return;
        
        const query = input.value.toLowerCase().trim();
        
        // Obtém lista de usuários cadastrados
        const userNames = users.map(u => u.name).filter(Boolean);
        
        // Filtra usuários que correspondem ao texto digitado
        const filtered = userNames.filter(name => 
            name.toLowerCase().includes(query)
        );
        
        // Mostra a lista apenas se há texto e há resultados
        if (query.length > 0 && filtered.length > 0) {
            list.style.display = 'block';
            list.innerHTML = filtered.map(name => `
                <div class="autocomplete-item" onclick="selectResponsavel('${inputId}', '${name.replace(/'/g, "\\'")}')">${name}</div>
            `).join('');
        } else {
            list.style.display = 'none';
        }
    }
    
    function selectResponsavel(inputId, name) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = name;
        }
        // Esconde a lista
        const listId = inputId.replace('Responsavel', 'ResponsavelList');
        const list = document.getElementById(listId);
        if (list) {
            list.style.display = 'none';
        }
    }
    
    // Esconde a lista ao clicar fora
    document.addEventListener('click', function(e) {
        document.querySelectorAll('.autocomplete-list').forEach(list => {
            if (!list.contains(e.target) && !list.previousElementSibling.contains(e.target)) {
                list.style.display = 'none';
            }
        });
    });
    
    // FUNÇÕES PARA MOSTRAR/ESCONDER SUBCATEGORIA E RESPONSÁVEL COM BASE NA CATEGORIA
    function onFilterCategoryChange(prefix) {
        // Mostra/esconde subcategoria
        const subId = prefix === 'Mant' ? 'fMantItem' : `f${prefix}Sub`;
        const subEl = document.getElementById(subId);
        const responsavelId = `f${prefix}Responsavel`;
        const responsavelEl = document.getElementById(responsavelId);
        const catEl = document.getElementById(`f${prefix}Cat`);
        
        if (catEl && catEl.value === '') {
            // Categoria vazia ("todas") - esconde apenas subcategoria, responsável sempre visível
            if (subEl) subEl.style.display = 'none';
            // Responsável sempre visível
            if (responsavelEl) responsavelEl.style.display = 'block';
        } else {
            // Categoria selecionada - mostra subcategoria e responsável
            if (subEl) subEl.style.display = 'block';
            if (responsavelEl) responsavelEl.style.display = 'block';
            updateFilterFacetOptions(prefix);
        }
        renderCards();
    }

    document.onkeydown = function(event) {
        if (
            event.keyCode === 123 ||  // F12
            (event.ctrlKey && event.shiftKey && event.keyCode === 'I'.charCodeAt(0)) ||  // Ctrl + Shift + I
            (event.ctrlKey && event.shiftKey && event.keyCode === 'J'.charCodeAt(0)) ||  // Ctrl + Shift + J
            (event.ctrlKey && event.shiftKey && event.keyCode === 'C'.charCodeAt(0)) ||  // Ctrl + Shift + C
            (event.ctrlKey && event.keyCode === 'U'.charCodeAt(0)) ||  // Ctrl + U
            (event.ctrlKey && event.keyCode === 'S'.charCodeAt(0))  // Ctrl + S
        ) {
            event.preventDefault();
            return false;
        }
    };
            document.addEventListener('contextmenu', function(evento) {
                    evento.preventDefault();
                });

