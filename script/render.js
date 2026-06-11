// === RENDERIZAÇÃO DE CARDS E DASHBOARD ===

function _clDonutHtml(done, total, pct, size, absolute) {
    size = size || 40;
    const sw = size <= 32 ? 3 : 4;
    const r = (size / 2) - sw - 1;
    const cx = size / 2;
    const circ = 2 * Math.PI * r;
    const filled = circ * (pct / 100);
    const gap = circ - filled;
    // Inicia no topo (12h): offset = -25% da circunferência
    const offset = circ * 0.25;
    // 100% = todo verde; >=50% = azul; <50% = âmbar
    const trackColor = pct === 100 ? '#86efac' : '#e5e7eb';
    const fillColor  = pct === 100 ? '#22c55e' : pct >= 50 ? '#2563eb' : '#f59e0b';
    const textColor  = pct === 100 ? '#15803d' : fillColor;
    const fs = size <= 32 ? 7 : 9;
    const ty = cx + fs * 0.38;
    const wrapClass = absolute ? 'card-cl-donut-abs' : 'card-cl-donut-wrap';
    return `
        <div class="${wrapClass}">
            <svg class="card-cl-donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="${sw}"/>
                <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${fillColor}" stroke-width="${sw}"
                    stroke-dasharray="${filled.toFixed(2)} ${gap.toFixed(2)}"
                    stroke-dashoffset="${offset.toFixed(2)}"
                    stroke-linecap="round"
                    transform="rotate(-90 ${cx} ${cx})"/>
                <text x="${cx}" y="${ty}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${textColor}">${pct}%</text>
            </svg>
            <span class="card-cl-donut-label">${done}/${total}</span>
        </div>`;
}

    // --- CONFIGURAÇÃO DE DATAS ---
    function populateYearSelects() {
        const years = [];
        for(let i = currentYear - 4; i <= currentYear + 1; i++) {
            years.push(i);
        }
        const options = years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('');

        ['fAuditYearForMonth', 'fAuditYearOnly', 'fAtivYearForMonth', 'fAtivYearOnly', 'fMantYearForMonth', 'fMantYearOnly', 'fDocYearForMonth', 'fDocYearOnly', 'fTrainYearForMonth', 'fTrainYearOnly', 'fDashYearForMonth', 'fDashYearOnly'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = options;
        });

        ['fAuditMonth', 'fAtivMonth', 'fMantMonth', 'fDocMonth', 'fTrainMonth', 'fDashMonth'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = currentMonth;
        });
    }

    function updateDateInputs(prefix) {
        const type = document.getElementById(`f${prefix}DateType`).value;
        document.getElementById(`f${prefix}GroupMonth`).style.display = type === 'month' ? 'flex' : 'none';
        document.getElementById(`f${prefix}YearOnly`).style.display = type === 'year' ? 'block' : 'none';
        document.getElementById(`f${prefix}GroupCustom`).style.display = type === 'custom' ? 'flex' : 'none';

        if (prefix === 'Dash') {
            renderDashboard();
        } else {
            renderCards();
        }
    }

    // --- RENDERIZAÇÃO DE CARDS E FILTROS ---
    function renderCards() {
        if(currentTab === 'backup' || currentTab === 'dashboard') return;
        if (typeof KANBAN_TABS !== 'undefined' && KANBAN_TABS.includes(currentTab) &&
            typeof isKanbanActive === 'function' && isKanbanActive()) {
            if (typeof renderKanban === 'function') renderKanban();
            updateNotificationCount();
            return;
        }
        if (typeof isCalendarActive === 'function' && isCalendarActive()) {
            if (typeof renderCalendar === 'function') renderCalendar();
            return;
        }

        // Sub-aba lista: desviar para tabela ou grupos se necessário
        if (currentListSubtab === 'table') { _renderListTable(); return; }
        if (currentListSubtab === 'groups') { _renderListGroups(); return; }

        // Atualiza dinamicamente os filtros (selects) para mostrar apenas opções
        // que possuem ao menos 1 card possível com os filtros atuais
        const tabToFilterPrefix = (tab) => {
            if (tab === 'auditoria') return 'Audit';
            if (tab === 'treinamentos') return 'Train';
            if (tab === 'atividades') return 'Ativ';
            if (tab === 'manutencao') return 'Mant';
            if (tab === 'documentos') return 'Doc';
            return '';
        };
        const currentFilterPrefix = tabToFilterPrefix(currentTab);
        if (currentFilterPrefix) updateFilterFacetOptions(currentFilterPrefix);

        const grid = document.getElementById('cardsGrid');
        grid.style.display = 'grid';
        grid.innerHTML = '';
        const _tv = document.getElementById('tableView'); if (_tv) _tv.style.display = 'none';
        const _gv = document.getElementById('groupsView'); if (_gv) _gv.style.display = 'none';

        let data = [];
        let statusList = [];
        let dateField = '';
        let getSortDate = null;     // data usada para ordenar e para filtro de data (especial em mant/doc)
        let getDeadlineDate = null; // data usada para indicador/prazo (N/A => null)
        let filterCatId = '';
        let filterSubcatId = '';

        if (currentTab === 'auditoria') {
            statusList = masterLists.auditStatus || [];
            dateField = 'dataPrevisao';
            getSortDate = (it) => it.dataPrevisao;
            getDeadlineDate = (it) => it.dataPrevisao;
            filterSetorId = 'fAuditSetor';
            filterCatId = 'fAuditCat';

            const setor = document.getElementById(filterSetorId)?.value || '';
            const cat = document.getElementById(filterCatId)?.value || '';
            const sub = '';
            const stat = document.getElementById('fAuditStatus')?.value || '';
            const marcador = document.getElementById('fAuditMarcador')?.value || '';
            const responsavel = document.getElementById('fAuditResponsavel')?.value || '';
            const revisor = document.getElementById('fAuditRevisor')?.value || '';
            const dateType = document.getElementById('fAuditDateType')?.value || 'all';

            data = audits;

            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);

            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }

            data = data.filter(item => {
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (sub && item.subcategoria !== sub) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;
                if (revisor && item.revisor !== revisor) return false; // CORREÇÃO: Filtro Revisor

                if (responsavel) {
                    const itemResponsavel = normalizeResponsavel(item.responsavel);
                    const filterLower = responsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }

                if (dateType !== 'all') {
                    const itemDate = new Date(item[dateField]);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fAuditMonth').value) ||
                            itemDate.getFullYear() !== parseInt(document.getElementById('fAuditYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fAuditYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fAuditDataIni').value;
                        const fim = document.getElementById('fAuditDataFim').value;
                        if (ini && item[dateField] < ini) return false;
                        if (fim && item[dateField] > fim) return false;
                    }
                }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });

        } else if (currentTab === 'treinamentos') {
            statusList = masterLists.trainStatus || [];
            dateField = 'dataPrevisao';
            getSortDate = (it) => it.dataPrevisao;
            getDeadlineDate = (it) => it.dataPrevisao;
            filterSetorId = 'fTrainSetor';
            filterCatId = 'fTrainCat';

            const setor = document.getElementById(filterSetorId)?.value || '';
            const cat = document.getElementById(filterCatId)?.value || '';
            const stat = document.getElementById('fTrainStatus')?.value || '';
            const marcador = document.getElementById('fTrainMarcador')?.value || '';
            const responsavel = document.getElementById('fTrainResponsavel')?.value || '';
            const dateType = document.getElementById('fTrainDateType')?.value || 'all';

            data = trainings;

            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);

            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }

            data = data.filter(item => {
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;

                if (responsavel) {
                    const itemResponsavel = normalizeResponsavel(item.responsavel || '');
                    const filterLower = responsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }

                if (dateType !== 'all') {
                    const itemDate = new Date(item[dateField]);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fTrainMonth').value) ||
                            itemDate.getFullYear() !== parseInt(document.getElementById('fTrainYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fTrainYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fTrainDataIni').value;
                        const fim = document.getElementById('fTrainDataFim').value;
                        if (ini && item[dateField] < ini) return false;
                        if (fim && item[dateField] > fim) return false;
                    }
                }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });

        } else if (currentTab === 'atividades') {
            statusList = masterLists.ativStatus || [];
            dateField = 'dataConclusao';
            getSortDate = (it) => it.dataConclusao;
            getDeadlineDate = (it) => it.dataConclusao;
            filterSetorId = 'fAtivSetor';
            filterCatId = 'fAtivCat';

            const setor = document.getElementById(filterSetorId)?.value || '';
            const cat = document.getElementById(filterCatId)?.value || '';
            const stat = document.getElementById('fAtivStatus')?.value || '';
            const marcador = document.getElementById('fAtivMarcador')?.value || '';
            const responsavel = document.getElementById('fAtivResponsavel')?.value || '';
            const revisor = document.getElementById('fAtivRevisor')?.value || '';
            const dateType = document.getElementById('fAtivDateType')?.value || 'all';

            data = activities;

            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);

            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }

            data = data.filter(item => {
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;
                if (revisor && item.revisor !== revisor) return false;

                if (responsavel) {
                    const itemResponsavel = normalizeResponsavel(item.responsavel);
                    const filterLower = responsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }

                if (dateType !== 'all') {
                    const itemDate = new Date(item[dateField]);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fAtivMonth').value) ||
                            itemDate.getFullYear() !== parseInt(document.getElementById('fAtivYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fAtivYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fAtivDataIni').value;
                        const fim = document.getElementById('fAtivDataFim').value;
                        if (ini && item[dateField] < ini) return false;
                        if (fim && item[dateField] > fim) return false;
                    }
                }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });

        } else if (currentTab === 'manutencao') {
            statusList = masterLists.mantStatus || [];
            dateField = 'proxima';
            // ordenar sempre pela "próxima" manutenção (mais próxima primeiro)
            getSortDate = (it) => getMaintenanceDeadlineDate(it) || ''; // Data de próxima manutenção
            getDeadlineDate = (it) => getMaintenanceDeadlineDate(it);
            filterSetorId = 'fMantSetor';
            filterCatId = 'fMantCat';
            filterSubcatId = 'fMantItem';

            const setor = document.getElementById(filterSetorId).value;
            const cat = document.getElementById(filterCatId).value;
            const itemVal = document.getElementById(filterSubcatId).value;
            const tipo = document.getElementById('fMantTipo').value;
            const stat = document.getElementById('fMantStatus').value;
            const marcador = document.getElementById('fMantMarcador')?.value || '';
            const responsavel = document.getElementById('fMantResponsavel')?.value || '';
            const dateType = document.getElementById('fMantDateType').value;

            data = maintenances;

            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);

            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }

            data = data.filter(item => {
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (itemVal && item.item !== itemVal) return false;
                if (tipo && item.tipo !== tipo) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;

                if (responsavel) {
                    const responsavelTec = normalizeResponsavel(item.responsavelTecnico);
                    const filterLower = responsavel.toLowerCase();
                    if (!responsavelTec.includes(filterLower)) return false;
                }

                if (dateType !== 'all') {
                    const dateForFilter = getMaintenanceCardDate(item); // Data (publicação)
                    const itemDate = new Date(dateForFilter);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fMantMonth').value) ||
                            itemDate.getFullYear() !== parseInt(document.getElementById('fMantYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fMantYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fMantDataIni').value;
                        const fim = document.getElementById('fMantDataFim').value;
                        if (ini && dateForFilter < ini) return false;
                        if (fim && dateForFilter > fim) return false;
                    }
                }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });
        } else if (currentTab === 'documentos') {
            statusList = masterLists.docStatus || [];
            dateField = 'dataProximaRevisao';
            getSortDate = (it) => getDocumentCardDate(it); // Data (publicação)
            getDeadlineDate = (it) => getDocumentDeadlineDate(it);
            filterSetorId = 'fDocSetor';
            filterCatId = 'fDocCat';

            const setor = document.getElementById(filterSetorId)?.value || '';
            const cat = document.getElementById(filterCatId)?.value || '';
            const stat = document.getElementById('fDocStatus')?.value || '';
            const marcador = document.getElementById('fDocMarcador')?.value || '';
            const responsavel = document.getElementById('fDocResponsavel')?.value || '';
            const revisor = document.getElementById('fDocRevisor')?.value || '';
            const dateType = document.getElementById('fDocDateType')?.value || 'all';

            data = documents;

            // SOFT DELETE: Filtrar itens deletados
            data = data.filter(item => !item.deleted);

            // Aplicar filtro de permissões de setores
            const allowedSetores = getAllowedSetores();
            if (allowedSetores !== null) {
                data = data.filter(item => allowedSetores.includes(item.setor));
            }

            data = data.filter(item => {
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;
                if (revisor && item.revisor !== revisor) return false;

                if (responsavel) {
                    const itemResponsavel = normalizeResponsavel(item.responsavel);
                    const filterLower = responsavel.toLowerCase();
                    if (!itemResponsavel || !itemResponsavel.includes(filterLower)) return false;
                }

                if (dateType !== 'all') {
                    const dateForFilter = getDocumentCardDate(item);
                    const itemDate = new Date(dateForFilter);
                    if (dateType === 'month') {
                        if (itemDate.getMonth() !== parseInt(document.getElementById('fDocMonth').value) ||
                            itemDate.getFullYear() !== parseInt(document.getElementById('fDocYearForMonth').value)) return false;
                    } else if (dateType === 'year') {
                        if (itemDate.getFullYear() !== parseInt(document.getElementById('fDocYearOnly').value)) return false;
                    } else if (dateType === 'custom') {
                        const ini = document.getElementById('fDocDataIni').value;
                        const fim = document.getElementById('fDocDataFim').value;
                        if (ini && dateForFilter < ini) return false;
                        if (fim && dateForFilter > fim) return false;
                    }
                }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });
        }

        // Busca por Título (lupa) - só quando o campo estiver ativo
        if (titleSearchCardsEnabled && titleSearchCardsQuery) {
            data = data.filter(item => normalizeText(item.titulo || '').includes(titleSearchCardsQuery));
        }

        // Filtro de finalizados (Concluído e Cancelado)
        const showFinalized = document.getElementById('showFinalizedCheckbox')?.checked !== false;
        if (!showFinalized) {
            data = data.filter(item => {
                const statusNormalized = normalizeStatusName(item.status || '');
                return statusNormalized !== 'concluído' && statusNormalized !== 'cancelado';
            });
        }

        // ORDENAÇÃO
        if (dateField) {
            data.sort((a, b) => {
                // 1) Concluído/Cancelado vão para o final — exceto recorrentes com prazo iminente
                const isAClosed = (a.status === 'Concluído' || a.status === 'Cancelado') && !isConcludedRecurring(a, currentTab);
                const isBClosed = (b.status === 'Concluído' || b.status === 'Cancelado') && !isConcludedRecurring(b, currentTab);

                if (isAClosed !== isBClosed) {
                    return isAClosed ? 1 : -1;
                }

                // 2) Entre itens "abertos" (e recorrentes), os que estão no prazo de alerta vêm primeiro
                if (!isAClosed && !isBClosed) {
                    const flagA = a.flagDias || 7;
                    const flagB = b.flagDias || 7;
                    const dA = daysDiff(getDeadlineDate ? getDeadlineDate(a) : a[dateField]);
                    const dB = daysDiff(getDeadlineDate ? getDeadlineDate(b) : b[dateField]);
                    const isAAlert = dA <= flagA;
                    const isBAlert = dB <= flagB;

                    if (isAAlert !== isBAlert) {
                        return isAAlert ? -1 : 1;
                    }
                }

                // 2.5) Entre itens "abertos" sem alerta, os com data válida vêm antes dos com "ND"
                const sortA = getSortDate ? (getSortDate(a) || '') : (a[dateField] || '');
                const sortB = getSortDate ? (getSortDate(b) || '') : (b[dateField] || '');
                const dateA = new Date(sortA);
                const dateB = new Date(sortB);
                const isAInvalid = isNaN(dateA.getTime());
                const isBInvalid = isNaN(dateB.getTime());

                if (isAInvalid !== isBInvalid) {
                    return isAInvalid ? 1 : -1;  // Datas inválidas ("ND") por último
                }

                // 3) Dentro do mesmo grupo, ordena por data (mais antiga primeiro)
                return dateA - dateB;
            });
        }

        if(data.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#9ca3af"><i class="fas fa-search fa-2x"></i><p>Nenhum registro encontrado.</p></div>';
            return;
        }

        data.forEach(item => {
        const canEdit = userCanEditCards(item);
        const canDelete = userCanDeleteCards(item);
            try {
            const div = document.createElement('div');
            const flagDays = item.flagDias || 7;
            let targetDate = (getDeadlineDate ? getDeadlineDate(item) : null);
            const fullTitle = item.titulo || '';
            const displayTitle = truncateText(fullTitle, 55);

            const d = daysDiff(targetDate);

            let indicatorClass = 'ind-green';
            // Concluído recorrente (train/doc com periodicidade) continua monitorando prazo
            const _skipFlag = item.status === 'Concluído' && !isConcludedRecurring(item, currentTab);
            if (!_skipFlag && d !== Infinity) {
                if (d < 0) indicatorClass = 'ind-red';
                else if (d <= flagDays) indicatorClass = 'ind-yellow';
            }

            const statusObj = statusList.find(s => s.name === item.status) || { color: 'default' };
            const statusColorVar = colorMap[statusObj.color] || colorMap['default'];

            // Marcador do card
            const marcadorText = item.marcador || '';
            const marcadorColorVar = colorMap[item.marcadorCor] || colorMap['default'];

            // layout interativo original dos cards
            div.className = `card ${indicatorClass}`;
            div.onclick = () => {
                currentHistoryPage = 1; // Reseta a página ao abrir a visualização
                openView(item.id, currentTab);
            };

            let specificContent = '';

                // Função para formatar responsável para exibição
                const formatResponsavel = (responsavel) => {
                    if (!responsavel) return '';
                    return String(responsavel).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                };

            if (currentTab === 'auditoria') {
                const responsaveis = formatResponsavel(item.responsavel);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar"></i> <span>Pub: <strong>${formatBR(item.dataPublicacao)}</strong></span></div>
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Prev: <strong>${formatBR(item.dataPrevisao)}</strong></span></div>
                `;
            } else if (currentTab === 'treinamentos') {
                const responsaveis = formatResponsavel(item.responsavel || '');
                const isNA = isBlankPeriodicity(item.periodicidade);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar"></i> <span>Pub: ${formatBR(item.dataPublicacao)}</span></div>
                    ${!isNA ? `<div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Prev: ${formatBR(item.dataPrevisao)}</span></div>` : ''}
                `;
            } else if (currentTab === 'atividades') {
                const responsaveis = formatResponsavel(item.responsavel);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar"></i> <span>Inicio: <strong>${formatBR(item.dataInicio)}</strong></span></div>
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Fim: <strong>${formatBR(item.dataConclusao)}</strong></span></div>
                `;
            } else if (currentTab === 'manutencao') {
                const isNA = isBlankPeriodicity(item.intervalo);
                const responsavelTec = formatResponsavel(item.responsavelTecnico);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    <div class="card-info-row"><i class="fas fa-tag"></i> <span>${item.tipo || 'ND'}</span></div>
                    ${responsavelTec ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsavelTec}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Próx: <strong>${isNA ? 'N/A' : formatBR(item.proxima)}</strong></span></div>
                `;
            } else { // Documentos
                const isPontualDoc = !item.rotina || item.rotina === 'pontual';
                const responsaveis = formatResponsavel(item.responsavel);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Próx: <strong>${isPontualDoc && !item.dataProximaRevisao ? 'N/A' : formatBR(item.dataProximaRevisao)}</strong></span></div>
                `;
            }

            // Garante que specificContent seja sempre uma string válida
            if (!specificContent || typeof specificContent !== 'string') {
                specificContent = '';
            }

            const editIconHtml = canEdit
                ? `<i class="fas fa-pen" onclick="editItem(${item.id}, '${currentTab}')" title="Editar"></i>`
                : '';

            const deleteIconHtml = canDelete
                ? `<i class="fas fa-trash" onclick="deleteItem(${item.id}, '${currentTab}')" title="Excluir"></i>`
                : '';

            const checklist = item.checklist || [];
            const clTotal = checklist.length;
            const clDone = checklist.filter(c => c.checked).length;
            const clPct = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0;
            const donutHtml = clTotal > 0 ? _clDonutHtml(clDone, clTotal, clPct, 40, true) : '';

            div.innerHTML = `
                <div class="card-header">
                    <span class="tag" style="background-color:${statusColorVar}">${item.status || 'Novo'}</span>
                    <div class="card-actions" onclick="event.stopPropagation()">
                        ${editIconHtml}
                        ${deleteIconHtml}
                    </div>
                </div>
                <div class="card-title">
                    <h4 title="${fullTitle}">${displayTitle}</h4>
                </div>
                <div class="card-body">
                    ${specificContent}
                    ${marcadorText ? `<div class="card-marker" style="background:${marcadorColorVar}"><i class="fas fa-bookmark"></i> ${marcadorText}</div>` : ''}
                </div>
                ${donutHtml}
            `;
            grid.appendChild(div);
            } catch (error) {
                console.error('Erro ao renderizar card:', error, item);
                // Cria um card de fallback mesmo que ocorra erro
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'card ind-green';
                fallbackDiv.innerHTML = `
                    <div class="card-header">
                        <span class="tag" style="background-color:#6b7280">Erro</span>
                    </div>
                    <div class="card-title">
                        <h4>Erro ao exibir item</h4>
                    </div>
                    <div class="card-body">
                        <div class="card-info-row"><i class="fas fa-exclamation-triangle"></i> <span>Item ID: ${item.id}</span></div>
                    </div>
                `;
                grid.appendChild(fallbackDiv);
            }
        });

        // Atualiza contador de notificações após renderizar cards
        updateNotificationCount();
    }

    // ── SUB-ABAS DA LISTA ──────────────────────────────────────────────────

    function setListSubtab(mode) {
        currentListSubtab = mode;
        document.querySelectorAll('.list-subtab').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById('listSubtab' + mode.charAt(0).toUpperCase() + mode.slice(1));
        if (btn) btn.classList.add('active');
        renderCards();
    }

    // Retorna os dados filtrados da aba atual (reutiliza a lógica de renderCards)
    function _getFilteredData() {
        let data = [];
        let statusList = [];
        let getDeadlineDate = null;

        if (currentTab === 'auditoria') {
            statusList = masterLists.auditStatus || [];
            getDeadlineDate = it => it.dataPrevisao;
            const setor = document.getElementById('fAuditSetor')?.value || '';
            const cat = document.getElementById('fAuditCat')?.value || '';
            const stat = document.getElementById('fAuditStatus')?.value || '';
            const marcador = document.getElementById('fAuditMarcador')?.value || '';
            const responsavel = document.getElementById('fAuditResponsavel')?.value || '';
            const revisor = document.getElementById('fAuditRevisor')?.value || '';
            const dateType = document.getElementById('fAuditDateType')?.value || 'all';
            data = audits.filter(item => {
                if (item.deleted) return false;
                const allowedSetores = getAllowedSetores();
                if (allowedSetores !== null && !allowedSetores.includes(item.setor)) return false;
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (marcador && item.marcador !== marcador) return false;
                if (revisor && item.revisor !== revisor) return false;
                if (responsavel) { const r = normalizeResponsavel(item.responsavel); if (!r || !r.includes(responsavel.toLowerCase())) return false; }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });
        } else if (currentTab === 'treinamentos') {
            statusList = masterLists.trainStatus || [];
            getDeadlineDate = it => it.dataPrevisao;
            const setor = document.getElementById('fTrainSetor')?.value || '';
            const cat = document.getElementById('fTrainCat')?.value || '';
            const stat = document.getElementById('fTrainStatus')?.value || '';
            const responsavel = document.getElementById('fTrainResponsavel')?.value || '';
            data = trainings.filter(item => {
                if (item.deleted) return false;
                const allowedSetores = getAllowedSetores();
                if (allowedSetores !== null && !allowedSetores.includes(item.setor)) return false;
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (responsavel) { const r = normalizeResponsavel(item.responsavel || ''); if (!r || !r.includes(responsavel.toLowerCase())) return false; }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });
        } else if (currentTab === 'atividades') {
            statusList = masterLists.ativStatus || [];
            getDeadlineDate = it => it.dataConclusao;
            const setor = document.getElementById('fAtivSetor')?.value || '';
            const cat = document.getElementById('fAtivCat')?.value || '';
            const stat = document.getElementById('fAtivStatus')?.value || '';
            const responsavel = document.getElementById('fAtivResponsavel')?.value || '';
            const revisor = document.getElementById('fAtivRevisor')?.value || '';
            data = activities.filter(item => {
                if (item.deleted) return false;
                const allowedSetores = getAllowedSetores();
                if (allowedSetores !== null && !allowedSetores.includes(item.setor)) return false;
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (revisor && item.revisor !== revisor) return false;
                if (responsavel) { const r = normalizeResponsavel(item.responsavel); if (!r || !r.includes(responsavel.toLowerCase())) return false; }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });
        } else if (currentTab === 'documentos') {
            statusList = masterLists.docStatus || [];
            getDeadlineDate = it => it.dataProximaRevisao;
            const setor = document.getElementById('fDocSetor')?.value || '';
            const cat = document.getElementById('fDocCat')?.value || '';
            const stat = document.getElementById('fDocStatus')?.value || '';
            const responsavel = document.getElementById('fDocResponsavel')?.value || '';
            data = documents.filter(item => {
                if (item.deleted) return false;
                const allowedSetores = getAllowedSetores();
                if (allowedSetores !== null && !allowedSetores.includes(item.setor)) return false;
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (responsavel) { const r = normalizeResponsavel(item.responsavel); if (!r || !r.includes(responsavel.toLowerCase())) return false; }
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });
        } else if (currentTab === 'manutencao') {
            statusList = masterLists.mantStatus || [];
            getDeadlineDate = it => getMaintenanceDeadlineDate(it);
            const setor = document.getElementById('fMantSetor')?.value || '';
            const cat = document.getElementById('fMantCat')?.value || '';
            const stat = document.getElementById('fMantStatus')?.value || '';
            data = maintenances.filter(item => {
                if (item.deleted) return false;
                const allowedSetores = getAllowedSetores();
                if (allowedSetores !== null && !allowedSetores.includes(item.setor)) return false;
                if (setor && item.setor !== setor) return false;
                if (cat && item.categoria !== cat) return false;
                if (stat && item.status !== stat) return false;
                if (typeof passesFbarMyTasks === 'function' && !passesFbarMyTasks(item)) return false;
                return true;
            });
        }

        // Filtro de busca por título
        if (titleSearchCardsEnabled && titleSearchCardsQuery) {
            data = data.filter(item => normalizeText(item.titulo || '').includes(titleSearchCardsQuery));
        }
        // Filtro finalizados
        const showFinalized = document.getElementById('showFinalizedCheckbox')?.checked !== false;
        if (!showFinalized) {
            data = data.filter(item => {
                const s = normalizeStatusName(item.status || '');
                return s !== 'concluído' && s !== 'cancelado';
            });
        }

        return { data, statusList, getDeadlineDate };
    }

    function _getItemIndicatorClass(item, getDeadlineDate) {
        const d = daysDiff(getDeadlineDate ? getDeadlineDate(item) : null);
        const flagDays = item.flagDias || 7;
        const _skipFlag = item.status === 'Concluído' && !isConcludedRecurring(item, currentTab);
        if (_skipFlag || d === Infinity) return 'green';
        if (d < 0) return 'red';
        if (d <= flagDays) return 'yellow';
        return 'green';
    }

    function _getDateDisplay(item) {
        if (currentTab === 'auditoria') return formatBR(item.dataPrevisao);
        if (currentTab === 'treinamentos') return formatBR(item.dataPrevisao);
        if (currentTab === 'atividades') return formatBR(item.dataConclusao);
        if (currentTab === 'manutencao') {
            const isNA = isBlankPeriodicity(item.intervalo);
            return isNA ? 'N/A' : formatBR(item.proxima);
        }
        if (currentTab === 'documentos') {
            const isPontual = !item.rotina || item.rotina === 'pontual';
            return isPontual && !item.dataProximaRevisao ? 'N/A' : formatBR(item.dataProximaRevisao);
        }
        return '';
    }

    // Estado de ordenação da tabela: { col: string, dir: 'asc'|'desc' }
    var _tableSort = { col: null, dir: 'asc' };

    // Seta a coluna de ordenação padrão por módulo (coluna de data de conclusão/previsão)
    function _tableDefaultSortCol() {
        if (currentTab === 'auditoria')    return 'dataPrevisao';
        if (currentTab === 'treinamentos') return 'dataPrevisao';
        if (currentTab === 'atividades')   return 'dataConclusao';
        if (currentTab === 'manutencao')   return 'proxima';
        if (currentTab === 'documentos')   return 'dataProximaRevisao';
        return null;
    }

    // Retorna o valor de uma coluna de um item para fins de ordenação
    function _tableSortValue(item, col) {
        switch (col) {
            case 'titulo':       return (item.titulo || '').toLowerCase();
            case 'status':       return (item.status || '').toLowerCase();
            case 'setor':        return (item.setor || '').toLowerCase();
            case 'categoria':    return (item.categoria || '').toLowerCase();
            case 'responsavel':  return (item.responsavel || '').toLowerCase();
            case 'revisor':      return (item.revisor || '').toLowerCase();
            case 'tipo':         return (item.tipo || '').toLowerCase();
            case 'dataPublicacao':       return item.dataPublicacao || '';
            case 'dataPrevisao':         return item.dataPrevisao || '';
            case 'dataInicio':           return item.dataInicio || '';
            case 'dataConclusao':        return item.dataConclusao || '';
            case 'proxima': {
                const isNA = isBlankPeriodicity(item.intervalo);
                return isNA ? '' : (item.proxima || '');
            }
            case 'dataProximaRevisao': {
                const isPontual = !item.rotina || item.rotina === 'pontual';
                return (isPontual && !item.dataProximaRevisao) ? '' : (item.dataProximaRevisao || '');
            }
            case 'dataCriacao':          return item.dataCriacao || '';
            default: return '';
        }
    }

    function _tableSortData(data, col, dir) {
        if (!col) return data;
        const isDate = col.startsWith('data') || col === 'proxima';
        return data.slice().sort((a, b) => {
            const va = _tableSortValue(a, col);
            const vb = _tableSortValue(b, col);
            // ND (string vazia) sempre por último, independente de direção
            const aEmpty = va === '';
            const bEmpty = vb === '';
            if (aEmpty && bEmpty) return 0;
            if (aEmpty) return 1;
            if (bEmpty) return -1;
            let cmp;
            if (isDate) {
                cmp = new Date(va) - new Date(vb);
            } else {
                cmp = va < vb ? -1 : va > vb ? 1 : 0;
            }
            return dir === 'desc' ? -cmp : cmp;
        });
    }

    window._tableClickSort = function(col) {
        if (_tableSort.col === col) {
            _tableSort.dir = _tableSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            _tableSort.col = col;
            _tableSort.dir = 'asc';
        }
        _renderListTable();
    };

    function _renderListTable() {
        const grid = document.getElementById('cardsGrid');
        if (grid) grid.style.display = 'none';
        const gv = document.getElementById('groupsView');
        if (gv) gv.style.display = 'none';

        const tv = document.getElementById('tableView');
        if (!tv) return;
        tv.style.display = 'block';

        // Aplica ordenação padrão se ainda não definida para este módulo
        if (!_tableSort.col) {
            _tableSort.col = _tableDefaultSortCol();
            _tableSort.dir = 'asc';
        }

        const { data: rawData, statusList, getDeadlineDate } = _getFilteredData();
        const data = _tableSortData(rawData, _tableSort.col, _tableSort.dir);

        if (data.length === 0) {
            tv.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af"><i class="fas fa-search fa-2x"></i><p>Nenhum registro encontrado.</p></div>';
            updateNotificationCount();
            return;
        }

        // Monta cabeçalhos clicáveis
        function _th(label, col) {
            const active = _tableSort.col === col;
            const icon = active
                ? (_tableSort.dir === 'asc' ? '<i class="fas fa-sort-up lt-sort-icon active"></i>' : '<i class="fas fa-sort-down lt-sort-icon active"></i>')
                : '<i class="fas fa-sort lt-sort-icon"></i>';
            return `<th class="lt-sortable${active?' lt-sort-active':''}" onclick="_tableClickSort('${col}')">${label}${icon}</th>`;
        }

        let colHeaders = '';
        if (currentTab === 'auditoria') {
            colHeaders = _th('Setor','setor')+_th('Categoria','categoria')+_th('Responsável','responsavel')+_th('Pub.','dataPublicacao')+_th('Previsão','dataPrevisao');
        } else if (currentTab === 'treinamentos') {
            colHeaders = _th('Setor','setor')+_th('Categoria','categoria')+_th('Responsável','responsavel')+_th('Pub.','dataPublicacao')+_th('Previsão','dataPrevisao');
        } else if (currentTab === 'atividades') {
            colHeaders = _th('Setor','setor')+_th('Categoria','categoria')+_th('Responsável','responsavel')+_th('Início','dataInicio')+_th('Conclusão','dataConclusao');
        } else if (currentTab === 'manutencao') {
            colHeaders = _th('Setor','setor')+_th('Categoria','categoria')+_th('Tipo','tipo')+_th('Resp. Técnico','responsavel')+_th('Próxima','proxima');
        } else if (currentTab === 'documentos') {
            colHeaders = _th('Setor','setor')+_th('Categoria','categoria')+_th('Responsável','responsavel')+_th('Criação','dataCriacao')+_th('Próx. Revisão','dataProximaRevisao');
        }

        let rows = '';
        const indColors = { green: 'lt-ind-green', yellow: 'lt-ind-yellow', red: 'lt-ind-red' };
        data.forEach(item => {
            const canEdit = userCanEditCards(item);
            const canDelete = userCanDeleteCards(item);
            const statusObj = statusList.find(s => s.name === item.status) || { color: 'default' };
            const statusColorVar = colorMap[statusObj.color] || colorMap['default'];
            const ind = _getItemIndicatorClass(item, getDeadlineDate);

            let specificCols = '';
            if (currentTab === 'auditoria') {
                specificCols = `<td>${item.setor||'ND'}</td><td>${item.categoria||'-'}</td><td>${item.responsavel||'-'}</td><td>${formatBR(item.dataPublicacao)}</td><td>${formatBR(item.dataPrevisao)}</td>`;
            } else if (currentTab === 'treinamentos') {
                specificCols = `<td>${item.setor||'ND'}</td><td>${item.categoria||'-'}</td><td>${item.responsavel||'-'}</td><td>${formatBR(item.dataPublicacao)}</td><td>${formatBR(item.dataPrevisao)||'N/A'}</td>`;
            } else if (currentTab === 'atividades') {
                specificCols = `<td>${item.setor||'ND'}</td><td>${item.categoria||'-'}</td><td>${item.responsavel||'-'}</td><td>${formatBR(item.dataInicio)}</td><td>${formatBR(item.dataConclusao)}</td>`;
            } else if (currentTab === 'manutencao') {
                const isNA = isBlankPeriodicity(item.intervalo);
                specificCols = `<td>${item.setor||'ND'}</td><td>${item.categoria||'-'}</td><td>${item.tipo||'-'}</td><td>${item.responsavelTecnico||'-'}</td><td>${isNA?'N/A':formatBR(item.proxima)}</td>`;
            } else if (currentTab === 'documentos') {
                const isPontual = !item.rotina || item.rotina === 'pontual';
                specificCols = `<td>${item.setor||'ND'}</td><td>${item.categoria||'-'}</td><td>${item.responsavel||'-'}</td><td>${formatBR(item.dataCriacao)}</td><td>${isPontual&&!item.dataProximaRevisao?'N/A':formatBR(item.dataProximaRevisao)}</td>`;
            }

            rows += `<tr onclick="openView(${item.id},'${currentTab}')">
                <td><span class="lt-ind ${indColors[ind]||'lt-ind-green'}"></span>${(item.titulo||'').replace(/</g,'&lt;').substring(0,60)}</td>
                <td><span class="lt-status" style="background:${statusColorVar}">${item.status||'Novo'}</span></td>
                ${specificCols}
                <td><div class="lt-actions" onclick="event.stopPropagation()">
                    ${canEdit ? `<button onclick="editItem(${item.id},'${currentTab}')" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
                    ${canDelete ? `<button onclick="deleteItem(${item.id},'${currentTab}')" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                </div></td>
            </tr>`;
        });

        tv.innerHTML = `<table class="list-table">
            <thead><tr>${_th('Título','titulo')}${_th('Status','status')}${colHeaders}<th></th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
        updateNotificationCount();
    }

    function _renderListGroups() {
        const grid = document.getElementById('cardsGrid');
        if (grid) grid.style.display = 'none';
        const tv = document.getElementById('tableView');
        if (tv) tv.style.display = 'none';

        const gv = document.getElementById('groupsView');
        if (!gv) return;
        gv.style.display = 'flex';

        const { data, statusList, getDeadlineDate } = _getFilteredData();

        if (data.length === 0) {
            gv.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af"><i class="fas fa-search fa-2x"></i><p>Nenhum registro encontrado.</p></div>';
            updateNotificationCount();
            return;
        }

        // Agrupa por categoria
        const groups = {};
        data.forEach(item => {
            const cat = item.categoria || 'Sem Categoria';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        let html = '';
        Object.keys(groups).sort().forEach(cat => {
            const items = groups[cat];
            const folderId = 'gf_' + cat.replace(/\W/g,'_');
            let cardsHtml = '';
            items.forEach(item => {
                const canEdit = userCanEditCards(item);
                const canDelete = userCanDeleteCards(item);
                const statusObj = statusList.find(s => s.name === item.status) || { color: 'default' };
                const statusColorVar = colorMap[statusObj.color] || colorMap['default'];
                const ind = _getItemIndicatorClass(item, getDeadlineDate);
                const indClass = ind === 'red' ? 'ind-red' : ind === 'yellow' ? 'ind-yellow' : 'ind-green';
                const fullTitle = item.titulo || '';
                const displayTitle = truncateText(fullTitle, 55);
                const marcadorText = item.marcador || '';
                const marcadorColorVar = colorMap[item.marcadorCor] || colorMap['default'];

                const checklist = item.checklist || [];
                const clTotal = checklist.length;
                const clDone = checklist.filter(c => c.checked).length;
                const clPct = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0;
                const donutHtml = clTotal > 0 ? _clDonutHtml(clDone, clTotal, clPct, 40, true) : '';

                let specificContent = '';
                const formatR = r => r ? String(r).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
                if (currentTab === 'auditoria') {
                    specificContent = `<div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor||'ND'}</span></div>
                        ${item.responsavel?`<div class="card-info-row"><i class="fas fa-user"></i> <span>${formatR(item.responsavel)}</span></div>`:''}
                        <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Prev: <strong>${formatBR(item.dataPrevisao)}</strong></span></div>`;
                } else if (currentTab === 'treinamentos') {
                    specificContent = `<div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor||'ND'}</span></div>
                        ${item.responsavel?`<div class="card-info-row"><i class="fas fa-user"></i> <span>${formatR(item.responsavel)}</span></div>`:''}
                        <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Prev: ${formatBR(item.dataPrevisao)||'N/A'}</span></div>`;
                } else if (currentTab === 'atividades') {
                    specificContent = `<div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor||'ND'}</span></div>
                        ${item.responsavel?`<div class="card-info-row"><i class="fas fa-user"></i> <span>${formatR(item.responsavel)}</span></div>`:''}
                        <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Fim: <strong>${formatBR(item.dataConclusao)}</strong></span></div>`;
                } else if (currentTab === 'manutencao') {
                    const isNA = isBlankPeriodicity(item.intervalo);
                    specificContent = `<div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor||'ND'}</span></div>
                        <div class="card-info-row"><i class="fas fa-tag"></i> <span>${item.tipo||'ND'}</span></div>
                        <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Próx: <strong>${isNA?'N/A':formatBR(item.proxima)}</strong></span></div>`;
                } else {
                    const isPontual = !item.rotina || item.rotina === 'pontual';
                    specificContent = `<div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor||'ND'}</span></div>
                        ${item.responsavel?`<div class="card-info-row"><i class="fas fa-user"></i> <span>${formatR(item.responsavel)}</span></div>`:''}
                        <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Próx: <strong>${isPontual&&!item.dataProximaRevisao?'N/A':formatBR(item.dataProximaRevisao)}</strong></span></div>`;
                }

                cardsHtml += `<div class="card ${indClass}" onclick="openView(${item.id},'${currentTab}')">
                    <div class="card-header">
                        <span class="tag" style="background-color:${statusColorVar}">${item.status||'Novo'}</span>
                        <div class="card-actions" onclick="event.stopPropagation()">
                            ${canEdit?`<i class="fas fa-pen" onclick="editItem(${item.id},'${currentTab}')" title="Editar"></i>`:''}
                            ${canDelete?`<i class="fas fa-trash" onclick="deleteItem(${item.id},'${currentTab}')" title="Excluir"></i>`:''}
                        </div>
                    </div>
                    <div class="card-title"><h4 title="${fullTitle}">${displayTitle}</h4></div>
                    <div class="card-body">${specificContent}${marcadorText?`<div class="card-marker" style="background:${marcadorColorVar}"><i class="fas fa-bookmark"></i> ${marcadorText}</div>`:''}</div>
                    ${donutHtml}
                </div>`;
            });

            html += `<div class="groups-folder open" id="${folderId}">
                <div class="groups-folder-header" onclick="document.getElementById('${folderId}').classList.toggle('open')">
                    <i class="fas fa-chevron-right groups-folder-icon"></i>
                    <span class="groups-folder-name"><i class="fas fa-folder" style="margin-right:6px;color:#f59e0b;"></i>${cat}</span>
                    <span class="groups-folder-count">${items.length}</span>
                </div>
                <div class="groups-folder-body">${cardsHtml}</div>
            </div>`;
        });

        gv.innerHTML = html;
        updateNotificationCount();
    }

    function calculateDashboardData() {

        // --- OBTENÇÃO DOS VALORES DE FILTRO ---
        const fArea = document.getElementById('fDashArea').value;
        const fSetor = document.getElementById('fDashSetor').value;
        const fCat = document.getElementById('fDashCat')?.value || '';
        const fStatus = document.getElementById('fDashStatus').value;
        // Usa filtros de pessoas do dashboard (dashRespFilter/dashRevFilter/dashMyTasksActive)
        const fResponsavel = (typeof dashRespFilter !== 'undefined') ? dashRespFilter : document.getElementById('fDashResponsavel').value;
        const fRevisor = (typeof dashRevFilter !== 'undefined') ? dashRevFilter : document.getElementById('fDashRevisor').value;
        const fDashMy = (typeof dashMyTasksActive !== 'undefined') ? dashMyTasksActive : false;
        const fDashMyMode = (typeof dashMyTasksMode !== 'undefined') ? dashMyTasksMode : 'all';
        // Usa o filtro de data global do header (fbarDateMode/fbarDateYear/fbarDateMonth)
        const fDateType = (typeof fbarDateMode !== 'undefined') ? fbarDateMode : 'all';
        const fMonth = (typeof fbarDateMonth !== 'undefined') ? fbarDateMonth : new Date().getMonth();
        const fYear = (typeof fbarDateYear !== 'undefined') ? fbarDateYear : new Date().getFullYear();
        const fDataIni = '';
        const fDataFim = '';
        const fTitleQuery = titleSearchDashEnabled ? titleSearchDashQuery : '';

        // Obtém as abas que o usuário tem permissão
        const allowedTabs = userAllowedTabs();
        const areaMapping = {
            'audit': 'auditoria',
            'ativ': 'atividades',
            'mant': 'manutencao',
            'doc': 'documentos'
        };

        // Constrói uma lista completa de todos os itens com metadados unificados
        // Filtra apenas dados das abas que o usuário tem permissão
        let rawItems = [];

        if (!allowedTabs || allowedTabs.includes('auditoria')) {
            rawItems = rawItems.concat(
                audits.map(a => ({ ...a, type: 'audit', statusType: getStatusType(a.status), dateField: a.dataPublicacao, deadlineField: a.dataPrevisao, color: getStatusColor(a.status, 'audit') }))
            );
        }
        if (!allowedTabs || allowedTabs.includes('atividades')) {
            rawItems = rawItems.concat(
                activities.map(a => ({ ...a, type: 'ativ', statusType: getStatusType(a.status), dateField: a.dataInicio, deadlineField: a.dataConclusao, color: getStatusColor(a.status, 'ativ') }))
            );
        }
        if (!allowedTabs || allowedTabs.includes('manutencao')) {
            rawItems = rawItems.concat(
                maintenances.map(m => ({ ...m, type: 'mant', statusType: getStatusType(m.status), dateField: m.ultima, deadlineField: isBlankPeriodicity(m.intervalo) ? null : m.proxima, color: getStatusColor(m.status, 'mant') }))
            );
        }
        if (!allowedTabs || allowedTabs.includes('documentos')) {
            rawItems = rawItems.concat(
                documents.map(d => ({ ...d, type: 'doc', statusType: getStatusType(d.status), dateField: d.dataCriacao, deadlineField: d.dataProximaRevisao || null, color: getStatusColor(d.status, 'doc') }))
            );
        }

        // SOFT DELETE: Filtrar itens deletados do dashboard
        rawItems = rawItems.filter(item => !item.deleted);

        // Aplicar filtro de permissões de setores
        const allowedSetores = getAllowedSetores();
        if (allowedSetores !== null) {
            rawItems = rawItems.filter(item => allowedSetores.includes(item.setor));
        }

        // --- FILTRAGEM ---
        let filteredItems = rawItems.filter(item => {

            // 1. Filtro por Área/Aba
            if (fArea && item.type !== fArea) return false;

            // 2. Filtro por Setor
            const itemSetor = item.setor || 'Setor Não Definido';
            if (fSetor && itemSetor !== fSetor) return false;

            // 2.1. Filtro por Categoria
            if (fCat && item.categoria !== fCat) return false;

            // 3. Filtro por Status Consolidado
            if (fStatus && item.status !== fStatus) return false;

            // 3.2 Filtro por Responsável
            if (fResponsavel) {
                let itemResponsavel = '';
                if (item.type === 'mant') {
                    itemResponsavel = item.responsavelTecnico || item.responsavelManutencao || '';
                } else {
                    itemResponsavel = item.responsavel || '';
                }
                if (!itemResponsavel || !itemResponsavel.includes(fResponsavel)) return false;
            }

            // 3.3 Filtro por Revisor
            if (fRevisor) {
                const itemRevisor = item.revisor || '';
                if (!itemRevisor || !itemRevisor.includes(fRevisor)) return false;
            }

            // 3.4 Filtro "Minhas Tarefas" do dashboard
            if (fDashMy && currentuser) {
                const me = (currentuser.name || '').toLowerCase().trim();
                if (me) {
                    if (fDashMyMode === 'responsavel') {
                        const raw = item.responsavelTecnico || item.responsavel || '';
                        const names = (() => { try { const p = JSON.parse(raw); return Array.isArray(p) ? p.map(n=>String(n).toLowerCase().trim()) : [String(p).toLowerCase().trim()]; } catch { return [String(raw).toLowerCase().trim()]; } })().filter(Boolean);
                        if (!names.some(n => n === me)) return false;
                    } else if (fDashMyMode === 'revisor') {
                        if ((item.revisor || '').toLowerCase().trim() !== me) return false;
                    } else {
                        const raw = item.responsavelTecnico || item.responsavel || '';
                        const names = (() => { try { const p = JSON.parse(raw); return Array.isArray(p) ? p.map(n=>String(n).toLowerCase().trim()) : [String(p).toLowerCase().trim()]; } catch { return [String(raw).toLowerCase().trim()]; } })().filter(Boolean);
                        const isResp = names.some(n => n === me);
                        const isRev  = (item.revisor || '').toLowerCase().trim() === me;
                        if (!isResp && !isRev) return false;
                    }
                }
            }

            // 3.1 Filtro por Título (lupa)
            if (fTitleQuery) {
                const t = normalizeText(item.titulo || '');
                if (!t.includes(fTitleQuery)) return false;
            }

            // 4. Filtro por Período de Publicação/Criação (dateField)
            if (fDateType !== 'all') {
                const date = item.dateField;
                if (!date) return false;
                const itemDate = new Date(date);
                if (fDateType === 'month') {
                    if (itemDate.getMonth() !== fMonth || itemDate.getFullYear() !== fYear) return false;
                } else if (fDateType === 'year') {
                    if (itemDate.getFullYear() !== fYear) return false;
                } else if (fDateType === 'week') {
                    const now = new Date();
                    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
                    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
                    if (itemDate < startOfWeek || itemDate > endOfWeek) return false;
                } else if (fDateType === 'custom') {
                    if (fDataIni && date < fDataIni) return false;
                    if (fDataFim && date > fDataFim) return false;
                }
            }
            return true;
        });

        // --- CÁLCULOS E AGRUPAMENTOS ---
        const totalCount = filteredItems.length;

        const activeItems = filteredItems.filter(item => item.statusType === 'ativo');
        const activeCount = activeItems.length;

        const completedCount = filteredItems.filter(item => item.statusType === 'finalizado').length;
        const cancelledCount = filteredItems.filter(item => isStatusCancelled(item.status)).length;
        const standbyCount = filteredItems.filter(item => isStatusStandby(item.status)).length;

        const activeItemsWithDeadline = activeItems.filter(item => !!item.deadlineField);
        const activeDeadlineCount = activeItemsWithDeadline.length;

        const overdueCount = activeItemsWithDeadline.filter(item => {
            const d = daysDiff(item.deadlineField);
            return d < 0;
        }).length;

        // G1: Status Consolidado
        const statusCounts = {};
        activeItems.forEach(item => {
            const key = `${item.status} (${item.type.toUpperCase()})`;
            statusCounts[key] = {
                count: (statusCounts[key]?.count || 0) + 1,
                color: item.color,
                type: item.type.toUpperCase()
            };
        });

        // G2: Distribuição por Setor
        const setorCounts = {};
        activeItems.forEach(item => {
            const setor = item.setor || 'Setor Não Definido';
            setorCounts[setor] = (setorCounts[setor] || 0) + 1;
        });

        // G3: Alerta de Prazos
        const prazoCounts = {
            atrasados: { count: 0, color: 'var(--ind-red)', percent: 0 },
            criticos: { count: 0, color: 'var(--ind-yellow)', percent: 0 },
            curtoPrazo: { count: 0, color: 'var(--c-orange)', percent: 0 },
            medioPrazo: { count: 0, color: 'var(--c-blue)', percent: 0 },
            longoPrazo: { count: 0, color: 'var(--ind-green)', percent: 0 }
        };

        activeItemsWithDeadline.forEach(item => {
            const d = daysDiff(item.deadlineField);
            if (d < 0) prazoCounts.atrasados.count++;
            else if (d <= 7) prazoCounts.criticos.count++;
            else if (d <= 30) prazoCounts.curtoPrazo.count++;
            else if (d <= 90) prazoCounts.medioPrazo.count++;
            else prazoCounts.longoPrazo.count++;
        });

        // Calcula porcentagens para G3 (baseado apenas nos itens ativos)
        Object.keys(prazoCounts).forEach(key => {
            prazoCounts[key].percent = activeDeadlineCount > 0 ? (prazoCounts[key].count / activeDeadlineCount) * 100 : 0;
        });

        return { totalCount, activeCount, completedCount, cancelledCount, standbyCount, overdueCount, statusCounts, setorCounts, prazoCounts };
    }

    function renderDashboard() {
        // Atualiza os filtros para mostrar apenas opções com dados disponíveis
        updateDashboardFilterOptions();

        const { totalCount, activeCount, completedCount, cancelledCount, standbyCount, overdueCount, statusCounts, setorCounts, prazoCounts } = calculateDashboardData();

        // --- Cartões de Resumo ---
        document.getElementById('summaryTotalCount').textContent = totalCount;
        document.getElementById('summaryActiveCount').textContent = activeCount;
        document.getElementById('summaryCompletedCount').textContent = completedCount;
        document.getElementById('summaryCancelledCount').textContent = cancelledCount;
        document.getElementById('summaryOverdueCount').textContent = overdueCount;

        // --- G1: Status Consolidado ---
        const listStatusConsolidado = document.getElementById('chartStatusConsolidado');
        listStatusConsolidado.innerHTML = '';

        // Ordena os status ativos por contagem
        const sortedStatus = Object.entries(statusCounts).sort(([, a], [, b]) => b.count - a.count);

        sortedStatus.forEach(([statusKey, data]) => {
            const count = data.count;
            const percentage = activeCount > 0 ? ((count / activeCount) * 100) : 0;
            const percentageFixed = percentage.toFixed(1);
            const colorVar = colorMap[data.color] || colorMap['default'];

            listStatusConsolidado.innerHTML += `
                <li>
                    <div class="chart-list-header">
                        <span class="status-info">
                            <span class="color-dot" style="background-color:${colorVar}"></span>
                            ${statusKey}
                        </span>
                        <div>
                            <span class="value">${count}</span>
                            <span class="percent">(${percentageFixed}%)</span>
                        </div>
                    </div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width:${percentage}%; background-color:${colorVar}"></div>
                    </div>
                </li>
            `;
        });
        if (listStatusConsolidado.innerHTML === '') {
            listStatusConsolidado.innerHTML = '<li style="text-align:center; padding:20px; flex-direction:row; justify-content:center; border-bottom:none;">Nenhum item ativo encontrado com os filtros atuais.</li>';
        }

        // --- G2: Distribuição por Setor ---
        const listDistribuicaoSetor = document.getElementById('chartDistribuicaoSetor');
        listDistribuicaoSetor.innerHTML = '';

        const sortedSetores = Object.entries(setorCounts).sort(([, a], [, b]) => b - a);

        sortedSetores.forEach(([setor, count]) => {
            const percentage = activeCount > 0 ? ((count / activeCount) * 100) : 0;
            const percentageFixed = percentage.toFixed(1);
            const colorVar = colorMap['default'];

            listDistribuicaoSetor.innerHTML += `
                <li>
                    <div class="chart-list-header">
                        <span class="status-info"><i class="fas fa-building" style="margin-right:8px; color:${colorVar}"></i>${setor}</span>
                        <div>
                            <span class="value">${count}</span>
                            <span class="percent">(${percentageFixed}%)</span>
                        </div>
                    </div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width:${percentage}%; background-color:var(--accent)"></div>
                    </div>
                </li>
            `;
        });
        if (listDistribuicaoSetor.innerHTML === '') {
            listDistribuicaoSetor.innerHTML = '<li style="text-align:center; padding:20px; flex-direction:row; justify-content:center; border-bottom:none;">Nenhum item ativo encontrado com os filtros atuais.</li>';
        }


        // --- G3: Alerta de Prazos ---
        const listAlertaPrazos = document.getElementById('chartAlertaPrazos');

        const prazoData = [
            { label: 'Atrasados (Vencidos)', key: 'atrasados', icon: 'fas fa-exclamation-circle' },
            { label: 'Críticos (0 a 7 dias)', key: 'criticos', icon: 'fas fa-exclamation-triangle' },
            { label: 'Curto Prazo (8 a 30 dias)', key: 'curtoPrazo', icon: 'fas fa-hourglass-start' },
            { label: 'Médio Prazo (31 a 90 dias)', key: 'medioPrazo', icon: 'fas fa-clock' },
            { label: 'Longo Prazo (> 90 dias)', key: 'longoPrazo', icon: 'fas fa-check-circle' }
        ];

        listAlertaPrazos.innerHTML = prazoData.map(item => {
            const data = prazoCounts[item.key];
            const count = data.count;
            const percentage = data.percent;
            const percentageFixed = percentage.toFixed(1);
            const color = data.color;
            const barColor = item.key === 'atrasados' ? 'var(--ind-red)' : (item.key === 'criticos' ? 'var(--ind-yellow)' : 'var(--c-blue)');

            return `
                <li>
                    <div class="chart-list-header">
                        <span class="status-info"><i class="${item.icon}" style="margin-right:8px; color:${color}"></i> ${item.label}</span>
                        <div>
                            <span class="deadline-info" style="color:${color}">${count}</span>
                            <span class="percent">(${percentageFixed}%)</span>
                        </div>
                    </div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width:${percentage}%; background-color:${barColor}"></div>
                    </div>
                </li>
            `;
        }).join('');

        if (activeCount === 0) {
            listAlertaPrazos.innerHTML = '<li style="text-align:center; padding:20px; flex-direction:row; justify-content:center; border-bottom:none;">Nenhum item ativo para análise de prazos com os filtros atuais.</li>';
        }

        // Atualiza contador de notificações
        updateNotificationCount();
    }
