// === INICIALIZAÇÃO E SIDEBAR ===

    // Inicialização (garante que os selects sejam preenchidos ao carregar a página)
    document.addEventListener('DOMContentLoaded', () => {
        populateYearSelects();
        populateSelects();
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
