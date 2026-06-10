// === RENDERIZAÇÃO DE CARDS E DASHBOARD ===

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
        if(currentTab === 'atividades' && typeof kanbanActive !== 'undefined' && kanbanActive) {
            if(typeof renderKanban === 'function') renderKanban();
            return;
        }

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
        grid.innerHTML = '';

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
                // 1) Itens com status "Concluído" ou "Cancelado" vão para o final
                const isAClosed = a.status === 'Concluído' || a.status === 'Cancelado';
                const isBClosed = b.status === 'Concluído' || b.status === 'Cancelado';

                if (isAClosed !== isBClosed) {
                    // false (0) vem antes de true (1)
                    return isAClosed ? 1 : -1;
                }

                // 2) Entre itens "abertos", os que estão no prazo de alerta vêm primeiro
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

        const canEdit = userCanEditCards();
        const canDelete = userCanDeleteCards();

        data.forEach(item => {
            try {
            const div = document.createElement('div');
            const flagDays = item.flagDias || 7;
            let targetDate = (getDeadlineDate ? getDeadlineDate(item) : null);
            const fullTitle = item.titulo || '';
            const displayTitle = truncateText(fullTitle, 55);

            const d = daysDiff(targetDate);

            let indicatorClass = 'ind-green';
            // Cards com status "Concluído" permanecem verdes mesmo se atrasados
            if (item.status !== 'Concluído' && d !== Infinity) {
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
                const isNA = isBlankPeriodicity(item.docIntervalo);
                const responsaveis = formatResponsavel(item.responsavel);
                specificContent = `
                    <div class="card-info-row"><i class="fas fa-building"></i> <span>${item.setor || 'ND'}</span></div>
                    <div class="card-info-row"><i class="far fa-folder"></i> <span>${item.categoria || '-'}</span></div>
                    ${responsaveis ? `<div class="card-info-row"><i class="fas fa-user"></i> <span>${responsaveis}</span></div>` : ''}
                    <div class="card-info-row"><i class="far fa-calendar-check"></i> <span>Próx: <strong>${isNA ? 'N/A' : formatBR(item.dataProximaRevisao)}</strong></span></div>
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

    function calculateDashboardData() {

        // --- OBTENÇÃO DOS VALORES DE FILTRO ---
        const fArea = document.getElementById('fDashArea').value;
        const fSetor = document.getElementById('fDashSetor').value;
        const fCat = document.getElementById('fDashCat')?.value || '';
        const fStatus = document.getElementById('fDashStatus').value;
        const fResponsavel = document.getElementById('fDashResponsavel').value;
        const fRevisor = document.getElementById('fDashRevisor').value;
        const fDateType = document.getElementById('fDashDateType').value;
        const fMonth = parseInt(document.getElementById('fDashMonth').value);
        const fYearForMonth = parseInt(document.getElementById('fDashYearForMonth').value);
        const fYearOnly = parseInt(document.getElementById('fDashYearOnly').value);
        const fYear = (fDateType === 'year') ? fYearOnly : fYearForMonth;
        const fDataIni = document.getElementById('fDashDataIni').value;
        const fDataFim = document.getElementById('fDashDataFim').value;
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
                documents.map(d => ({ ...d, type: 'doc', statusType: getStatusType(d.status), dateField: d.dataCriacao, deadlineField: isBlankPeriodicity(d.docIntervalo) ? null : d.dataProximaRevisao, color: getStatusColor(d.status, 'doc') }))
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
