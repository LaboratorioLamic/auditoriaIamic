// === INICIALIZAÇÃO E SIDEBAR ===

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
