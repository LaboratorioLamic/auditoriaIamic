// === SISTEMA DE NOTIFICAÇÕES ===

    // --- SISTEMA DE NOTIFICAÇÕES ---

    function getNotificationsForTab() {
        let data = [];
        let tabType = '';

        if (currentTab === 'auditoria') {
            data = audits;
            tabType = 'audit';
        } else if (currentTab === 'atividades') {
            data = activities;
            tabType = 'ativ';
        } else if (currentTab === 'manutencao') {
            data = maintenances;
            tabType = 'mant';
        } else if (currentTab === 'documentos') {
            data = documents;
            tabType = 'doc';
        } else if (currentTab === 'dashboard') {
            // Dashboard mostra notificações de todos, respeitando filtros
            const dashboardFilters = getDashboardFilters();
            const allowedTabs = userAllowedTabs(); // Abas que o usuário tem permissão de acessar

            let allData = [
                { items: audits, type: 'audit', tabName: 'auditoria' },
                { items: activities, type: 'ativ', tabName: 'atividades' },
                { items: maintenances, type: 'mant', tabName: 'manutencao' },
                { items: documents, type: 'doc', tabName: 'documentos' }
            ];

            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                allData.forEach(d => {
                    d.items = d.items.filter(item => allowedSetores.includes(item.setor));
                });
            }

            // Filtra apenas as abas que o usuário tem permissão de acessar
            if (allowedTabs && allowedTabs.length > 0) {
                allData = allData.filter(d => allowedTabs.includes(d.tabName));
            }

            // Filtra por área se selecionada
            if (dashboardFilters.area) {
                allData = allData.filter(d => d.type === dashboardFilters.area);
            }

            // SOFT DELETE: remover itens deletados das notificações do dashboard
            allData.forEach(d => {
                d.items = d.items.filter(item => !item.deleted);
            });

            // Aplica todos os filtros e coleta notificações
            const allNotifications = [];
            allData.forEach(({ items, type }) => {
                const filtered = applyDashboardFiltersToData(items, type, dashboardFilters);
                allNotifications.push(...getFilteredNotifications(filtered, type));
            });

            // Ordena: atrasados primeiro, depois alertas
            return allNotifications.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return new Date(a.dateField) - new Date(b.dateField);
            });
        }

        // SOFT DELETE: remover itens deletados das notificações
        data = data.filter(item => !item.deleted);

        // Aplicar filtro de permissões de setores para abas específicas
        const allowedSetores = getAllowedSetores();
        if (allowedSetores !== null) {
            data = data.filter(item => allowedSetores.includes(item.setor));
        }

        // Para abas específicas, aplica filtros
        const filteredData = applyCurrentTabFilters(data, tabType);
        return getFilteredNotifications(filteredData, tabType).sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return new Date(a.dateField) - new Date(b.dateField);
        });
    }

    function getDashboardFilters() {
        return {
            area: document.getElementById('fDashArea')?.value || '',
            setor: document.getElementById('fDashSetor')?.value || '',
            categoria: document.getElementById('fDashCat')?.value || '',
            status: document.getElementById('fDashStatus')?.value || '',
            responsavel: document.getElementById('fDashResponsavel')?.value || '',
            revisor: document.getElementById('fDashRevisor')?.value || '',
            dateType: document.getElementById('fDashDateType')?.value || 'all',
            month: parseInt(document.getElementById('fDashMonth')?.value || currentMonth),
            yearForMonth: parseInt(document.getElementById('fDashYearForMonth')?.value || currentYear),
            yearOnly: parseInt(document.getElementById('fDashYearOnly')?.value || currentYear),
            dataIni: document.getElementById('fDashDataIni')?.value || '',
            dataFim: document.getElementById('fDashDataFim')?.value || ''
        };
    }

    function applyDashboardFiltersToData(data, type, filters) {
        return data.filter(item => {
            // Filtro por Setor
            if (filters.setor) {
                const itemSetor = item.setor || 'Setor Não Definido';
                if (itemSetor !== filters.setor) return false;
            }

            // Filtro por Categoria
            if (filters.categoria && item.categoria !== filters.categoria) return false;

            // Filtro por Status
            if (filters.status && item.status !== filters.status) return false;

            // Filtro por Responsável
            if (filters.responsavel) {
                let itemResponsavel = '';
                if (type === 'mant') {
                    itemResponsavel = item.responsavelTecnico || item.responsavelManutencao || '';
                } else {
                    itemResponsavel = item.responsavel || '';
                }
                if (!itemResponsavel || !itemResponsavel.includes(filters.responsavel)) return false;
            }

            // Filtro por Revisor
            if (filters.revisor) {
                const itemRevisor = item.revisor || '';
                if (!itemRevisor || !itemRevisor.includes(filters.revisor)) return false;
            }

            // Filtro por Período
            if (filters.dateType !== 'all') {
                const dateField = type === 'audit' ? item.dataPublicacao :
                                 type === 'ativ' ? item.dataInicio :
                                 type === 'mant' ? item.ultima :
                                 item.dataCriacao;
                if (!dateField) return false;

                const itemDate = new Date(dateField);
                const year = (filters.dateType === 'year') ? filters.yearOnly : filters.yearForMonth;

                if (filters.dateType === 'month') {
                    if (itemDate.getMonth() !== filters.month || itemDate.getFullYear() !== year) return false;
                } else if (filters.dateType === 'year') {
                    if (itemDate.getFullYear() !== year) return false;
                } else if (filters.dateType === 'custom') {
                    if (filters.dataIni && dateField < filters.dataIni) return false;
                    if (filters.dataFim && dateField > filters.dataFim) return false;
                }
            }

            return true;
        });
    }

    function applyCurrentTabFilters(data, tabType) {
        if (currentTab === 'dashboard') return data;

        let filtered = data;
        const prefix = getFilterPrefixForTab(currentTab);

        // Setor
        const sectorFilter = document.getElementById(`f${prefix}Setor`)?.value || '';
        if (sectorFilter) {
            filtered = filtered.filter(item => item.setor === sectorFilter);
        }

        // Categoria
        const catFilter = document.getElementById(`f${prefix}Cat`)?.value || '';
        if (catFilter) {
            filtered = filtered.filter(item => item.categoria === catFilter);
        }

        // Subcategoria/Item
        const subId = tabType === 'mant' ? `f${prefix}Item` : `f${prefix}Sub`;
        const subFilter = document.getElementById(subId)?.value || '';
        if (subFilter) {
            const subField = tabType === 'mant' ? 'item' : 'subcategoria';
            filtered = filtered.filter(item => item[subField] === subFilter);
        }

        // Status
        const statusFilter = document.getElementById(`f${prefix}Status`)?.value || '';
        if (statusFilter) {
            filtered = filtered.filter(item => item.status === statusFilter);
        }

        return filtered;
    }

    function getFilterPrefixForTab(tab) {
        if (tab === 'auditoria') return 'Audit';
        if (tab === 'atividades') return 'Ativ';
        if (tab === 'manutencao') return 'Mant';
        if (tab === 'documentos') return 'Doc';
        return '';
    }

    function getFilteredNotifications(data, tabType) {
        const notifications = [];

    // CAPTURA OS FILTROS ATIVOS NA ABA ATUAL
    var prefix = getFilterPrefixForTab(currentTab);
    var filterResponsavel = document.getElementById(`f${prefix}Responsavel`)?.value || '';
    var filterRevisor = document.getElementById(`f${prefix}Revisor`)?.value || '';

        data.forEach(item => {
        // 1. Excluir itens finalizados (Concluído ou Cancelado)
            if (item.status === 'Concluído' || item.status === 'Cancelado') {
                return;
            }

        // 2. FILTRO DE RESPONSÁVEL (Respeita a seleção da tela)
        if (filterResponsavel) {
            const itemRespRaw = tabType === 'mant' ? (item.responsavelTecnico || '') : (item.responsavel || '');
            const normalizedItemResp = normalizeResponsavel(itemRespRaw); // Usa sua função de limpeza de JSON/String
            if (!normalizedItemResp.includes(filterResponsavel.toLowerCase())) {
                return;
            }
        }

        // 3. FILTRO DE REVISOR (Respeita a seleção da tela - Ignora se for Manutenção pois não possui o campo)
        if (filterRevisor && tabType !== 'mant') {
            const itemRev = normalizeText(item.revisor || '');
            if (!itemRev.includes(normalizeText(filterRevisor))) {
                return;
            }
            }

            const deadlineField = getDeadlineFieldForTab(tabType, item);
            if (!deadlineField) return;

            const flagDays = item.flagDias || (tabType === 'ativ' ? 3 : 7);
            const d = daysDiff(deadlineField);

            // Somente atrasados e alertas
            if (d < 0) {
                // ATRASADO
                notifications.push({
                    id: item.id,
                    type: tabType,
                    title: item.titulo,
                    status: item.status,
                    statusColor: getStatusColor(item.status, tabType),
                    setor: item.setor,
                    categoria: item.categoria,
                    subcatOrItem: tabType === 'mant' ? item.item : item.subcategoria,
                responsavel: tabType === 'mant' ? (item.responsavelTecnico || item.responsavelManutencao || '') : (item.responsavel || ''),
                    marcador: item.marcador || '',
                    marcadorCor: item.marcadorCor || 'default',
                    dateField: deadlineField,
                    priority: 0, // 0 = atrasado (maior prioridade)
                    indicatorType: 'overdue',
                    daysInfo: `${Math.abs(d)} dia${Math.abs(d) > 1 ? 's' : ''} atrasado`
                });
            } else if (d <= flagDays) {
                // ALERTA
                notifications.push({
                    id: item.id,
                    type: tabType,
                    title: item.titulo,
                    status: item.status,
                    statusColor: getStatusColor(item.status, tabType),
                    setor: item.setor,
                    categoria: item.categoria,
                    subcatOrItem: tabType === 'mant' ? item.item : item.subcategoria,
                responsavel: tabType === 'mant' ? (item.responsavelTecnico || item.responsavelManutencao || '') : (item.responsavel || ''),
                    marcador: item.marcador || '',
                    marcadorCor: item.marcadorCor || 'default',
                    dateField: deadlineField,
                    priority: 1, // 1 = alerta
                    indicatorType: 'alert',
                    daysInfo: `${d} dia${d > 1 ? 's' : ''} para vencer`
                });
            }
        });

        return notifications;
    }

    function getDeadlineFieldForTab(tabType, item) {
        if (tabType === 'audit') return item.dataPrevisao;
        if (tabType === 'ativ') return item.dataConclusao;
        if (tabType === 'mant') return isBlankPeriodicity(item.intervalo) ? null : item.proxima;
        if (tabType === 'doc') return isBlankPeriodicity(item.docIntervalo) ? null : item.dataProximaRevisao;
        return null;
    }

    function updateNotificationCount() {
        const notifications = getNotificationsForTab();
        const badge = document.getElementById('notificationBadge');
        const count = notifications.length;

        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    function toggleNotificationModal() {
        const modal = document.getElementById('notificationModal');
        modal.classList.toggle('active');

        if (modal.classList.contains('active')) {
            renderNotificationModal();
        }
    }

    function closeNotificationModal() {
        document.getElementById('notificationModal').classList.remove('active');
    }

    function renderNotificationModal() {
        const notifications = getNotificationsForTab();
        const content = document.getElementById('notificationModalContent');

        if (notifications.length === 0) {
            content.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>Nenhuma notificação</p>
                </div>
            `;
            return;
        }

        content.innerHTML = notifications.map(notif => {
            const statusColorVar = colorMap[notif.statusColor] || colorMap['default'];
            const indicatorClass = notif.indicatorType === 'overdue' ? 'overdue' : 'alert';
            const subcatDisplay = notif.subcatOrItem ? ` (${notif.subcatOrItem})` : '';
            const marcadorColorVar = colorMap[notif.marcadorCor] || colorMap['default'];
            const marcadorHtml = notif.marcador ? `<div style="background: ${marcadorColorVar}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; width: fit-content; display: flex; align-items: center; gap: 4px;"><i class="fas fa-bookmark" style="color: white; font-size: 10px;"></i>${notif.marcador}</div>` : '';

            return `
                <div class="notification-item ${indicatorClass}" onclick="closeNotificationModal(); currentHistoryPage = 1; openView(${notif.id}, '${notif.type}')">
                    <div class="notification-item-header">
                        <span class="notification-item-title" title="${notif.title}">${truncateText(notif.title, 40)}</span>
                        <span class="notification-item-status" style="background-color: ${statusColorVar}">${notif.status}</span>
                    </div>
                    <div class="notification-item-details">
                        <div class="notification-item-details-row">
                            <i class="fas fa-building"></i>
                            <span>${notif.setor || 'ND'}</span>
                        </div>
                        <div class="notification-item-details-row">
                            <i class="fas fa-folder"></i>
                            <span>${notif.categoria || '-'} ${subcatDisplay}</span>
                        </div>
                        ${notif.responsavel ? `
                        <div class="notification-item-details-row">
                            <i class="fas fa-user"></i>
                            <span>${notif.responsavel}</span>
                        </div>
                        ` : ''}
                        <div class="notification-item-details-row">
                            <i class="${notif.indicatorType === 'overdue' ? 'fas fa-exclamation-circle' : 'fas fa-exclamation-triangle'}"></i>
                            <span style="color: ${notif.indicatorType === 'overdue' ? 'var(--c-red)' : 'var(--c-yellow)'}; font-weight: 600;">${notif.daysInfo}</span>
                        </div>
                        ${marcadorHtml}
                    </div>
                    <div class="notification-item-actions" onclick="event.stopPropagation()">
                        <button title="Visualizar" onclick="closeNotificationModal(); currentHistoryPage = 1; openView(${notif.id}, '${notif.type}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button title="Editar" onclick="closeNotificationModal(); editItem(${notif.id}, '${notif.type}')">
                            <i class="fas fa-pen"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
