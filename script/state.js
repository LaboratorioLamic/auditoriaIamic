// === ESTADO GLOBAL / VARIÁVEIS ===

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
