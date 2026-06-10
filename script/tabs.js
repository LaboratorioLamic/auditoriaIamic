// === CONTROLE DE ABAS + EVENT LISTENERS INICIAIS ===

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

    if (addBtn)    addBtn.style.display    = showActions ? 'flex' : 'none';
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

    // Botão filtro de setores
    if (typeof _syncSetorFilterBtn === 'function') _syncSetorFilterBtn();

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
