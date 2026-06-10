// === MULTI-SELECT DE RESPONSÁVEIS ===

    // ========== MULTI-SELECT FUNCTIONS ==========
    var multiSelectStates = {
        audit: { selected: [], allUsers: [] },
        ativ: { selected: [], allUsers: [] },
        doc: { selected: [], allUsers: [] }
    };

    function initMultiSelectUsers() {
        // Coleta todos os usuários únicos de todos os registros
        const allResponsaveis = new Set();

        audits.forEach(item => {
            if (item.responsavel) {
                try {
                    const parsed = JSON.parse(item.responsavel);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(r => allResponsaveis.add(String(r)));
                    } else {
                        allResponsaveis.add(String(item.responsavel));
                    }
                } catch {
                    allResponsaveis.add(String(item.responsavel));
                }
            }
        });
        activities.forEach(item => {
            if (item.responsavel) {
                try {
                    const parsed = JSON.parse(item.responsavel);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(r => allResponsaveis.add(String(r)));
                    } else {
                        allResponsaveis.add(String(item.responsavel));
                    }
                } catch {
                    allResponsaveis.add(String(item.responsavel));
                }
            }
        });
        maintenances.forEach(item => {
            if (item.responsavelTecnico) {
                try {
                    const parsed = JSON.parse(item.responsavelTecnico);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(r => allResponsaveis.add(String(r)));
                    } else {
                        allResponsaveis.add(String(item.responsavelTecnico));
                    }
                } catch {
                    allResponsaveis.add(String(item.responsavelTecnico));
                }
            }
            // Não inclui responsavelManutenção na lista de usuários do multi-select
        });
        documents.forEach(item => {
            if (item.responsavel) {
                try {
                    const parsed = JSON.parse(item.responsavel);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(r => allResponsaveis.add(String(r)));
                    } else {
                        allResponsaveis.add(String(item.responsavel));
                    }
                } catch {
                    allResponsaveis.add(String(item.responsavel));
                }
            }
        });

        // Adiciona responsáveis da lista mestre
        if (masterLists.responsaveis) {
            masterLists.responsaveis.forEach(r => allResponsaveis.add(String(r)));
        }

        // Também adiciona nomes de usuários cadastrados
        if (typeof users !== 'undefined') {
        users.forEach(user => {
                if (user.name) allResponsaveis.add(String(user.name));
        });
        }

        const sortedUsers = Array.from(allResponsaveis).filter(r => r).sort();

        multiSelectStates.audit.allUsers = sortedUsers;
        multiSelectStates.ativ.allUsers = sortedUsers;
        multiSelectStates.doc.allUsers = sortedUsers;
    }

    function toggleMultiSelectDropdown(event, type) {
        event.stopPropagation();
        const dropdown = document.getElementById(`${getMultiSelectBaseId(type)}Dropdown`);
        const container = document.getElementById(`${getMultiSelectBaseId(type)}Container`);

        if (!dropdown || !container) {
            console.warn(`Multi-select elements not found for type: ${type}`);
            return;
        }

        if (dropdown.classList.contains('visible')) {
            dropdown.classList.remove('visible');
            container.classList.remove('focused');
        } else {
            // Fecha outros dropdowns
            document.querySelectorAll('.multi-select-dropdown.visible').forEach(d => {
                d.classList.remove('visible');
            });
            document.querySelectorAll('.multi-select.focused').forEach(c => {
                c.classList.remove('focused');
            });

            dropdown.classList.add('visible');
            container.classList.add('focused');
            renderMultiSelectDropdown(type);
            document.getElementById(`${getMultiSelectBaseId(type)}Input`).focus();
        }
    }

    function getMultiSelectBaseId(type) {
        if (type === 'audit') return 'auditResponsavel';
        if (type === 'ativ') return 'ativResponsavel';
        if (type === 'doc') return 'docResponsavel';
    }

    function renderMultiSelectDropdown(type) {
        const baseId = getMultiSelectBaseId(type);
        const dropdown = document.getElementById(`${baseId}Dropdown`);
        const state = multiSelectStates[type];
        const filterText = document.getElementById(`${baseId}Input`).value.toLowerCase();

        const filtered = state.allUsers.filter(user => {
            const userStr = String(user || '').toLowerCase();
            return userStr.includes(filterText);
        });

        dropdown.innerHTML = filtered.map(user => {
            const userStr = String(user || '');
            return `
            <div class="multi-select-option ${state.selected.includes(userStr) ? 'selected' : ''}"
                 onclick="toggleMultiSelectOption('${type}', '${userStr.replace(/'/g, "\\'")}')">
                ${userStr}
            </div>
        `;
        }).join('');
    }

    function filterMultiSelectOptions(type) {
        const baseId = getMultiSelectBaseId(type);
        const dropdown = document.getElementById(`${baseId}Dropdown`);
        const input = document.getElementById(`${baseId}Input`);

        // Se há texto no input, garante que o dropdown permaneça aberto
        if (input.value.trim() !== '') {
            dropdown.classList.add('visible');
            document.getElementById(`${baseId}Container`).classList.add('focused');
        }

            renderMultiSelectDropdown(type);
    }

    function toggleMultiSelectOption(type, user) {
        const state = multiSelectStates[type];
        const idx = state.selected.indexOf(user);

        if (idx > -1) {
            state.selected.splice(idx, 1);
        } else {
            state.selected.push(user);
        }

        updateMultiSelectDisplay(type);
        renderMultiSelectDropdown(type);

        // Mantém o foco no input para continuar adicionando responsáveis
        const baseId = getMultiSelectBaseId(type);
        const inputElement = document.getElementById(`${baseId}Input`);
        if (inputElement) {
            inputElement.focus();
        }
    }

    function updateMultiSelectDisplay(type) {
        const baseId = getMultiSelectBaseId(type);
        const container = document.getElementById(`${baseId}Container`);
        const hiddenInput = document.getElementById(baseId);
        const state = multiSelectStates[type];

        // Limpa os tags anteriores
        const tags = container.querySelectorAll('.multi-select-tag');
        tags.forEach(tag => tag.remove());

        // Adiciona os novos tags
        const inputElement = container.querySelector('input[type="text"]');
        state.selected.forEach(user => {
            const tag = document.createElement('div');
            tag.className = 'multi-select-tag';
            tag.innerHTML = `
                ${user}
                <button type="button" onclick="event.stopPropagation(); removeMultiSelectOption('${type}', '${user.replace(/'/g, "\\'")}')" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.insertBefore(tag, inputElement);
        });

        // Salva no hidden input como JSON
        hiddenInput.value = JSON.stringify(state.selected);
    }

    function removeMultiSelectOption(type, user) {
        const state = multiSelectStates[type];
        const idx = state.selected.indexOf(user);
        if (idx > -1) {
            state.selected.splice(idx, 1);
        }
        updateMultiSelectDisplay(type);
        renderMultiSelectDropdown(type);
    }

    function loadMultiSelectData(type, dataArray) {
        const baseId = getMultiSelectBaseId(type);
        const hiddenInput = document.getElementById(baseId);
        const state = multiSelectStates[type];

        try {
            state.selected = JSON.parse(hiddenInput.value || '[]');
        } catch (e) {
            state.selected = [];
        }

        updateMultiSelectDisplay(type);
    }

    // Fecha dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.multi-select')) {
            // Fecha todos os dropdowns
            document.querySelectorAll('.multi-select-dropdown').forEach(dropdown => {
                dropdown.classList.remove('visible');
            });
        }
    });

    // Impede que o dropdown feche ao clicar dentro do multi-select
    document.addEventListener('click', (e) => {
        if (e.target.closest('.multi-select')) {
            e.stopPropagation();
        }
    });

    // Adiciona evento de teclado para os inputs de multi-select
    document.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('multi-select-input')) {
            const container = e.target.closest('.multi-select');
            const baseId = container.id.replace('Container', '');
            const dropdown = document.getElementById(`${baseId}Dropdown`);

            if (e.key === 'Escape') {
                // Limpa o campo e fecha o dropdown
                e.target.value = '';
                dropdown.classList.remove('visible');
                container.classList.remove('focused');
            } else if (e.key === 'Enter') {
                // Impede o submit do formulário
                e.preventDefault();
            } else if (e.key !== 'Tab') {
                // Para qualquer outra tecla, garante que o dropdown permaneça aberto
                if (e.target.value.trim() !== '') {
                    dropdown.classList.add('visible');
                    container.classList.add('focused');
                }
            }
        }
    });
