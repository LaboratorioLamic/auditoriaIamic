// === MODAL & FORM LOGIC (CRUD, LIXEIRA, HISTÓRICO, LIST MANAGER) ===

// --- MODAL & FORM LOGIC (CORRIGIDA) ---

function resetModal(prefix) {
    // 1. Resetar campos comuns
    document.getElementById(`${prefix}Titulo`).value = '';
    document.getElementById(`${prefix}Descricao`).value = '';
    document.getElementById(`${prefix}Anexos`).innerHTML = '';

    // Lida com Responsáveis
    var respEl = document.getElementById(`${prefix}Responsavel`);
    if (respEl) respEl.value = '';

    // Lida com Revisores (exceto em manutenção)
    if (prefix !== 'mant') {
        const revEl = document.getElementById(`${prefix}Revisor`);
        if (revEl) revEl.value = '';
    }

        // Marcador (select)
        const markEl = document.getElementById(`${prefix}Marcador`);
        if (markEl && markEl.options.length > 0) markEl.selectedIndex = 0;

    // Define o Setor
    var defaultSetor = masterLists.setores[0] || '';
    document.getElementById(`${prefix}Setor`).value = defaultSetor;

    // Define o Status (seleciona o primeiro, se houver)
    if (document.getElementById(`${prefix}Status`).options.length > 0) {
        document.getElementById(`${prefix}Status`).selectedIndex = 0;
    }

    // 2. Resetar campos específicos e cálculos

    if (prefix === 'audit') {
        document.getElementById('auditDataPublicacao').value = today();
        document.getElementById('auditDataPrevisao').value = today();
        document.getElementById('auditFlagDias').value = 7;
        document.getElementById('auditAuditor').value = '';
        const defaultAuditCat = masterLists.auditCategorias[0] || '';
        document.getElementById('auditCategoria').value = defaultAuditCat;
    } else if (prefix === 'train') {
        document.getElementById('trainDataPublicacao').value = today();
        document.getElementById('trainPeriodicidade').value = 0;
        document.getElementById('trainDataPrevisao').textContent = '--/--/----';
        document.getElementById('trainDataPrevisaoValue').value = '';
        document.getElementById('trainFlagDias').value = 7;
        document.getElementById('trainInstrutor').value = '';
        document.getElementById('trainParticipantes').value = '';
        document.getElementById('trainLocalEvento').value = '';
        document.getElementById('trainCargaHorariaHoras').value = '';
        document.getElementById('trainCargaHorariaMinutos').value = '';
        const defaultTrainCat = masterLists.trainCategorias[0] || '';
        document.getElementById('trainCategoria').value = defaultTrainCat;
    } else if (prefix === 'ativ') {
        document.getElementById('ativDataInicio').value = today();
        document.getElementById('ativDataConclusao').value = today();
        document.getElementById('ativFlagDias').value = 3;
        const defaultAtivCat = masterLists.ativCategorias[0] || '';
        document.getElementById('ativCategoria').value = defaultAtivCat;
    } else if (prefix === 'mant') {
        document.getElementById('mantUltima').value = today();
        document.getElementById('mantIntervalo').value = 30;
        document.getElementById('mantEmpresaResponsavel').value = '';
        document.getElementById('mantResponsavelTecnico').value = '';
        document.getElementById('mantResponsavelManutencao').value = '';
        document.getElementById('mantFlagDias').value = 7;
        const defaultMantCat = masterLists.mantCategorias[0] || '';
        document.getElementById('mantCategoria').value = defaultMantCat;
        document.getElementById('mantTipo').value = '';
        calculateNextDate('mant');
    } else if (prefix === 'doc') {
        document.getElementById('docDataCriacao').value = today();
        document.getElementById('docIntervalo').value = 365;
        document.getElementById('docRevisor').value = '';
        document.getElementById('docFlagDias').value = 30;
        const defaultDocCat = masterLists.docCategorias[0] || '';
        document.getElementById('docCategoria').value = defaultDocCat;
        calculateNextDate('doc');
    }

    // 3. Chamar onCategoryChange após definir a categoria (se a categoria existir)
    var catEl = document.getElementById(`${prefix}Categoria`);
    if (catEl) onCategoryChange(prefix);
}


    document.getElementById('addBtn').onclick = () => {
        originalItem = null;

        if (currentTab === 'auditoria') {
            editingAuditId = null;
            resetModal('audit');
            document.getElementById('modalAuditoria').style.display = 'flex';
        } else if (currentTab === 'treinamentos') {
            editingTrainId = null;
            resetModal('train');
            document.getElementById('modalTreinamentos').style.display = 'flex';
        } else if (currentTab === 'atividades') {
            editingAtivId = null;
            resetModal('ativ');
            document.getElementById('modalAtividades').style.display = 'flex';
        } else if (currentTab === 'manutencao') {
            editingMantId = null;
            resetModal('mant');
            document.getElementById('modalManutencao').style.display = 'flex';
        } else if (currentTab === 'documentos') {
            editingDocId = null;
            resetModal('doc');
            document.getElementById('modalDocumentos').style.display = 'flex';
        }
    };


    // Função para sincronizar referências em todos os cards quando um item de lista é alterado
    function syncReferenceAcrossCards(cardType, fieldName, oldValue, newValue) {
        if (!oldValue || oldValue === newValue) return; // Não atualiza se não mudou

        // Função auxiliar para atualizar cards de um tipo
        const updateCardArray = (cardArray) => {
            cardArray.forEach(card => {
                if (card[fieldName] === oldValue) {
                    card[fieldName] = newValue;
                }
            });
        };

        // Atualiza o tipo de card correto
        if (cardType === 'audit' || cardType === 'auditoria') {
            updateCardArray(audits);
        } else if (cardType === 'ativ' || cardType === 'atividades') {
            updateCardArray(activities);
        } else if (cardType === 'mant' || cardType === 'manutencao') {
            updateCardArray(maintenances);
        } else if (cardType === 'doc' || cardType === 'documentos') {
            updateCardArray(documents);
        }
    }

    function editItem(id, tab) {
        if (!userCanEditCards()) {
            alert('Você não tem permissão para editar cards. Seu acesso está configurado como somente leitura.');
            return;
        }

        // Busca o item em todos os arrays se não encontrar no tab especificado
        let item = null;
        let finalTab = tab;

        if (tab === 'audit' || tab === 'auditoria') {
            item = audits.find(a => a.id === id);
            finalTab = 'auditoria';
        } else if (tab === 'train' || tab === 'treinamentos') {
            item = trainings.find(t => t.id === id);
            finalTab = 'treinamentos';
        } else if (tab === 'ativ' || tab === 'atividades') {
            item = activities.find(a => a.id === id);
            finalTab = 'atividades';
        } else if (tab === 'mant' || tab === 'manutencao') {
            item = maintenances.find(m => m.id === id);
            finalTab = 'manutencao';
        } else if (tab === 'doc' || tab === 'documentos') {
            item = documents.find(d => d.id === id);
            finalTab = 'documentos';
        }

        // Se não encontrou, tenta procurar em todos os arrays
        if (!item) {
            item = audits.find(a => a.id === id);
            if (item) finalTab = 'auditoria';
            else {
                item = trainings.find(t => t.id === id);
                if (item) finalTab = 'treinamentos';
            else {
                item = activities.find(a => a.id === id);
                if (item) finalTab = 'atividades';
                else {
                    item = maintenances.find(m => m.id === id);
                    if (item) finalTab = 'manutencao';
                    else {
                        item = documents.find(d => d.id === id);
                        if (item) finalTab = 'documentos';
                        }
                    }
                }
            }
        }

        if (!item) {
            alert('Item não encontrado.');
            return;
        }

        if (finalTab === 'auditoria') {
            editingAuditId = id;
            document.getElementById('auditTitulo').value = item.titulo;
            document.getElementById('auditDescricao').value = item.descricao;
            document.getElementById('auditSetor').value = item.setor || '';
            document.getElementById('auditCategoria').value = item.categoria;
            onCategoryChange('audit');
            var auditSubEl = document.getElementById('auditSub');
            if (auditSubEl) auditSubEl.value = item.subcategoria || '';
            document.getElementById('auditStatus').value = item.status;
            document.getElementById('auditDataPublicacao').value = item.dataPublicacao;
            document.getElementById('auditDataPrevisao').value = item.dataPrevisao;
            let auditResp = item.responsavel;
            if (Array.isArray(auditResp)) auditResp = auditResp[0];
            else if (typeof auditResp === 'string' && auditResp.startsWith('[')) {
                try { auditResp = JSON.parse(auditResp)[0]; } catch {}
            }
            document.getElementById('auditResponsavel').value = auditResp || '';
            let auditRev = item.revisor;
            if (Array.isArray(auditRev)) auditRev = auditRev[0];
            else if (typeof auditRev === 'string' && auditRev.startsWith('[')) {
                try { auditRev = JSON.parse(auditRev)[0]; } catch {}
            }
            document.getElementById('auditRevisor').value = auditRev || '';
            let auditAud = item.auditor;
            if (Array.isArray(auditAud)) auditAud = auditAud[0];
            else if (typeof auditAud === 'string' && auditAud.startsWith('[')) {
                try { auditAud = JSON.parse(auditAud)[0]; } catch {}
            }
            document.getElementById('auditAuditor').value = auditAud || '';
            document.getElementById('auditFlagDias').value = item.flagDias; // Corrigido
            document.getElementById('auditMarcador').value = item.marcador || '';
            restoreAnexos('audit', item.anexos);
            document.getElementById('modalAuditoria').style.display = 'flex';
        } else if (finalTab === 'atividades') {
            editingAtivId = id;
            document.getElementById('ativTitulo').value = item.titulo;
            document.getElementById('ativDescricao').value = item.descricao;
            document.getElementById('ativSetor').value = item.setor || '';
            document.getElementById('ativCategoria').value = item.categoria;
            onCategoryChange('ativ');
            var ativSubEl = document.getElementById('ativSub');
            if (ativSubEl) ativSubEl.value = item.subcategoria || '';
            document.getElementById('ativStatus').value = item.status;
            document.getElementById('ativDataInicio').value = item.dataInicio;
            document.getElementById('ativDataConclusao').value = item.dataConclusao;
            let ativResp = item.responsavel;
            if (Array.isArray(ativResp)) ativResp = ativResp[0];
            else if (typeof ativResp === 'string' && ativResp.startsWith('[')) {
                try { ativResp = JSON.parse(ativResp)[0]; } catch {}
            }
            document.getElementById('ativResponsavel').value = ativResp || '';
            let ativRev = item.revisor;
            if (Array.isArray(ativRev)) ativRev = ativRev[0];
            else if (typeof ativRev === 'string' && ativRev.startsWith('[')) {
                try { ativRev = JSON.parse(ativRev)[0]; } catch {}
            }
            document.getElementById('ativRevisor').value = ativRev || '';
            document.getElementById('ativFlagDias').value = item.flagDias; // Corrigido
            document.getElementById('ativMarcador').value = item.marcador || '';
            restoreAnexos('ativ', item.anexos);
            document.getElementById('modalAtividades').style.display = 'flex';
        } else if (finalTab === 'treinamentos') {
            editingTrainId = id;
            document.getElementById('trainTitulo').value = item.titulo;
            document.getElementById('trainDescricao').value = item.descricao;
            document.getElementById('trainSetor').value = item.setor || '';
            document.getElementById('trainCategoria').value = item.categoria;
            onCategoryChange('train');
            var trainSubEl = document.getElementById('trainSub');
            if (trainSubEl) trainSubEl.value = item.subcategoria || '';
            document.getElementById('trainStatus').value = item.status;
            document.getElementById('trainDataPublicacao').value = item.dataPublicacao;
            document.getElementById('trainPeriodicidade').value = item.periodicidade || 0;
            document.getElementById('trainDataPrevisaoValue').value = item.dataPrevisao || '';
            // Atualiza o display da data de previsão
            const prevDiv = document.getElementById('trainDataPrevisao');
            if (item.dataPrevisao && item.periodicidade > 0) {
                prevDiv.textContent = formatBR(item.dataPrevisao);
            } else {
                prevDiv.textContent = '--/--/----';
            }
            let trainResp = item.responsavel;
            if (Array.isArray(trainResp)) trainResp = trainResp[0];
            else if (typeof trainResp === 'string' && trainResp.startsWith('[')) {
                try { trainResp = JSON.parse(trainResp)[0]; } catch {}
            }
            document.getElementById('trainResponsavel').value = trainResp || '';
            document.getElementById('trainInstrutor').value = item.instrutor || '';
            document.getElementById('trainParticipantes').value = item.participantes || '';
            document.getElementById('trainLocalEvento').value = item.localEvento || '';
            // Separar carga horária em horas e minutos numéricos
            if (item.cargaHoraria && item.cargaHoraria.includes(':')) {
                const [horas, minutos] = item.cargaHoraria.split(':');
                document.getElementById('trainCargaHorariaHoras').value = parseInt(horas) || 0;
                document.getElementById('trainCargaHorariaMinutos').value = parseInt(minutos) || 0;
            } else {
                document.getElementById('trainCargaHorariaHoras').value = '';
                document.getElementById('trainCargaHorariaMinutos').value = '';
            }
            document.getElementById('trainFlagDias').value = item.flagDias;
            document.getElementById('trainMarcador').value = item.marcador || '';
            restoreAnexos('train', item.anexos);
            document.getElementById('modalTreinamentos').style.display = 'flex';

            // Armazena o item original no estado atual para calcular as diferenças ao salvar
            originalItem = JSON.parse(JSON.stringify(item));
        } else if (finalTab === 'manutencao') {
            editingMantId = id;
            document.getElementById('mantTitulo').value = item.titulo;
            document.getElementById('mantDescricao').value = item.descricao;
            document.getElementById('mantSetor').value = item.setor || '';
            document.getElementById('mantCategoria').value = item.categoria;
            onCategoryChange('mant');
            document.getElementById('mantItem').value = item.item;
            document.getElementById('mantTipo').value = item.tipo || '';
            document.getElementById('mantUltima').value = item.ultima;
            document.getElementById('mantIntervalo').value = (item.intervalo ?? ''); // permite vazio
            let mantResp = item.responsavelTecnico;
            if (Array.isArray(mantResp)) mantResp = mantResp[0];
            else if (typeof mantResp === 'string' && mantResp.startsWith('[')) {
                try { mantResp = JSON.parse(mantResp)[0]; } catch {}
            }
            document.getElementById('mantResponsavelTecnico').value = mantResp || '';
            document.getElementById('mantResponsavelManutencao').value = item.responsavelManutencao || '';
            document.getElementById('mantEmpresaResponsavel').value = item.empresaResponsavel || '';
            document.getElementById('mantStatus').value = item.status;
            document.getElementById('mantFlagDias').value = item.flagDias; // Corrigido
            calculateNextDate('mant');
            restoreAnexos('mant', item.anexos);
            document.getElementById('mantMarcador').value = item.marcador || '';
            document.getElementById('modalManutencao').style.display = 'flex';
        } else if (finalTab === 'documentos') {
            editingDocId = id;
            document.getElementById('docTitulo').value = item.titulo;
            document.getElementById('docDescricao').value = item.descricao;
            document.getElementById('docSetor').value = item.setor || '';
            document.getElementById('docCategoria').value = item.categoria;
            onCategoryChange('doc');
            var docSubEl = document.getElementById('docSub');
            if (docSubEl) docSubEl.value = item.subcategoria || '';
            document.getElementById('docStatus').value = item.status;
            document.getElementById('docDataCriacao').value = item.dataCriacao;
            document.getElementById('docIntervalo').value = (item.docIntervalo ?? ''); // permite vazio
            let docResp = item.responsavel;
            if (Array.isArray(docResp)) docResp = docResp[0];
            else if (typeof docResp === 'string' && docResp.startsWith('[')) {
                try { docResp = JSON.parse(docResp)[0]; } catch {}
            }
            document.getElementById('docResponsavel').value = docResp || '';
            let docRev = item.revisor;
            if (Array.isArray(docRev)) docRev = docRev[0];
            else if (typeof docRev === 'string' && docRev.startsWith('[')) {
                try { docRev = JSON.parse(docRev)[0]; } catch {}
            }
            document.getElementById('docRevisor').value = docRev || '';
            document.getElementById('docFlagDias').value = item.flagDias; // Corrigido
            calculateNextDate('doc');
            restoreAnexos('doc', item.anexos);
            document.getElementById('docMarcador').value = item.marcador || '';
            document.getElementById('modalDocumentos').style.display = 'flex';
        }

    }

    function deleteItem(id, tab) {
        if (!currentuser) {
            alert('Você precisa estar logado para excluir registros.');
            return;
        }
        if (!userCanDeleteCards()) {
            alert('Você não tem permissão para fazer isso');
            return;
        }
        if (!confirm('Deseja mover este item para a lixeira? Os dados serão preservados e podem ser restaurados por um administrador.')) {
            return;
        }

        // SOFT DELETE: Marcar item como deleted ao invés de remover do array
        const now = new Date().toISOString();
        const deletedBy = currentuser.email || currentuser.name || 'unknown';

        let item = null;
        if (tab === 'auditoria' || tab === 'audit') {
            item = audits.find(a => String(a.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }
        else if (tab === 'treinamentos' || tab === 'train') {
            item = trainings.find(t => String(t.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }
        else if (tab === 'atividades' || tab === 'ativ') {
            item = activities.find(a => String(a.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }
        else if (tab === 'manutencao' || tab === 'mant') {
            item = maintenances.find(m => String(m.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }
        else if (tab === 'documentos' || tab === 'doc') {
            item = documents.find(d => String(d.id) === String(id));
            if (item) {
                item.deleted = true;
                item.deletedAt = now;
                item.deletedBy = deletedBy;
            }
        }

        if (item) {
            alert('Item ocultado com sucesso. Os dados foram preservados no banco de dados.');
            saveAll();
            renderCards();
            updateTrashBadge();
        }
    }

    // SOFT DELETE: Função para restaurar itens deletados (apenas admin)
    function restoreDeletedItem(id, tab) {
        if (!userIsAdmin()) {
            alert('Apenas administradores podem restaurar itens deletados.');
            return;
        }

        if (!confirm('Deseja restaurar este item da lixeira?')) {
            return;
        }

        let item = null;
        if (tab === 'auditoria' || tab === 'audit') {
            item = audits.find(a => String(a.id) === String(id));
        }
        else if (tab === 'treinamentos' || tab === 'train') {
            item = trainings.find(t => String(t.id) === String(id));
        }
        else if (tab === 'atividades' || tab === 'ativ') {
            item = activities.find(a => String(a.id) === String(id));
        }
        else if (tab === 'manutencao' || tab === 'mant') {
            item = maintenances.find(m => String(m.id) === String(id));
        }
        else if (tab === 'documentos' || tab === 'doc') {
            item = documents.find(d => String(d.id) === String(id));
        }

        if (item && item.deleted) {
            item.deleted = false;
            item.restoredAt = new Date().toISOString();
            item.restoredBy = currentuser.email || currentuser.name || 'admin';

            // Adicionar ao histórico a ação de restauração
            if (!item.historico) item.historico = [];
            item.historico.push({
                timestamp: new Date().toISOString(),
                usuario: item.restoredBy,
                acao: 'Restaurado',
                detalhes: [`Item restaurado pelo usuário ${item.restoredBy}`]
            });

            alert('Item restaurado com sucesso!');
            saveAll();
            renderCards();

            // Atualizar a lixeira se estiver aberta
            if (document.getElementById('modalTrashBin').style.display === 'flex') {
                openTrashBin();
            }
            updateTrashBadge();
        }
    }

    function getTrashCount() {
        if (currentTab === 'auditoria') {
            return audits.filter(item => item && item.deleted).length;
        }
        if (currentTab === 'treinamentos') {
            return trainings.filter(item => item && item.deleted).length;
        }
        if (currentTab === 'atividades') {
            return activities.filter(item => item && item.deleted).length;
        }
        if (currentTab === 'manutencao') {
            return maintenances.filter(item => item && item.deleted).length;
        }
        if (currentTab === 'documentos') {
            return documents.filter(item => item && item.deleted).length;
        }
        return 0;
    }

    function updateTrashBadge() {
        const badge = document.getElementById('trashBadge');
        if (!badge) return;
        const count = getTrashCount();
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.textContent = '';
            badge.classList.add('hidden');
        }
    }

    // SOFT DELETE: Função para abrir e exibir lixeira (apenas itens da aba atual)
    function openTrashBin() {
        const trashContent = document.getElementById('trashContent');
        trashContent.innerHTML = '';

        // Coletar apenas os itens deletados da aba atual
        let deletedItems = [];

        if (currentTab === 'auditoria') {
            audits.forEach(a => {
                if (a.deleted) {
                    deletedItems.push({
                        id: a.id,
                        tab: 'auditoria',
                        titulo: a.titulo,
                        tipo: 'Auditoria',
                        setor: a.setor,
                        deletedAt: a.deletedAt,
                        deletedBy: a.deletedBy
                    });
                }
            });
        } else if (currentTab === 'treinamentos') {
            trainings.forEach(t => {
                if (t.deleted) {
                    deletedItems.push({
                        id: t.id,
                        tab: 'treinamentos',
                        titulo: t.titulo,
                        tipo: 'Treinamento',
                        setor: t.setor,
                        deletedAt: t.deletedAt,
                        deletedBy: t.deletedBy
                    });
                }
            });
        } else if (currentTab === 'atividades') {
            activities.forEach(a => {
                if (a.deleted) {
                    deletedItems.push({
                        id: a.id,
                        tab: 'atividades',
                        titulo: a.titulo,
                        tipo: 'Atividade',
                        setor: a.setor,
                        deletedAt: a.deletedAt,
                        deletedBy: a.deletedBy
                    });
                }
            });
        } else if (currentTab === 'manutencao') {
            maintenances.forEach(m => {
                if (m.deleted) {
                    deletedItems.push({
                        id: m.id,
                        tab: 'manutencao',
                        titulo: m.titulo || m.categoria,
                        tipo: 'Manutenção',
                        setor: m.setor,
                        deletedAt: m.deletedAt,
                        deletedBy: m.deletedBy
                    });
                }
            });
        } else if (currentTab === 'documentos') {
            documents.forEach(d => {
                if (d.deleted) {
                    deletedItems.push({
                        id: d.id,
                        tab: 'documentos',
                        titulo: d.titulo,
                        tipo: 'Documento',
                        setor: d.setor,
                        deletedAt: d.deletedAt,
                        deletedBy: d.deletedBy
                    });
                }
            });
        }

        if (deletedItems.length === 0) {
            trashContent.innerHTML = '<div style="text-align:center; padding:40px; color:#6b7280;"><i class="fas fa-check-circle" style="font-size:48px; margin-bottom:16px; display:block;"></i>Nenhum item na lixeira</div>';
        } else {
            // Ordenar por data de deletação (mais recente primeiro)
            deletedItems.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

            let html = '<table style="width:100%; border-collapse:collapse; font-size:14px;">';
            html += '<thead><tr style="border-bottom:2px solid var(--border); background:var(--bg);">';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Título</th>';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Tipo</th>';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Setor</th>';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Deletado por</th>';
            html += '<th style="padding:12px; text-align:left; font-weight:600;">Data</th>';
            html += '<th style="padding:12px; text-align:center; font-weight:600;">Ações</th>';
            html += '</tr></thead><tbody>';

            deletedItems.forEach(item => {
                const deletedDate = new Date(item.deletedAt).toLocaleDateString('pt-BR') + ' ' + new Date(item.deletedAt).toLocaleTimeString('pt-BR');
                const isAdmin = userIsAdmin();

                html += `<tr style="border-bottom:1px solid var(--border); transition:background 0.2s;" onmouseover="this.style.background='rgba(37,99,235,0.05)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:12px; font-weight:500;">${item.titulo}</td>
                    <td style="padding:12px;"><span style="background:var(--accent); color:white; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:500;">${item.tipo}</span></td>
                    <td style="padding:12px;">${item.setor || 'ND'}</td>
                    <td style="padding:12px;">${item.deletedBy || 'desconhecido'}</td>
                    <td style="padding:12px; font-size:12px; color:#6b7280;">${deletedDate}</td>
                    <td style="padding:12px; text-align:center; white-space:nowrap;">
                        <button onclick="closeModal('modalTrashBin'); openView(${item.id}, '${item.tab}')" title="Visualizar" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:500; margin-right:4px; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${isAdmin ? `<button onclick="restoreDeletedItem(${item.id}, '${item.tab}')" title="Restaurar" style="background:#22c55e; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:500; margin-right:4px; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-undo"></i>
                        </button>` : ''}
                        ${isAdmin ? `<button onclick="permanentlyDeleteItem(${item.id}, '${item.tab}')" title="Deletar permanentemente" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:500; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-times"></i>
                        </button>` : ''}
                    </td>
                </tr>`;
            });

            html += '</tbody></table>';
            trashContent.innerHTML = html;
        }

        document.getElementById('modalTrashBin').style.display = 'flex';
    }

    // SOFT DELETE: Função para deletar permanentemente (apenas admin)
    function permanentlyDeleteItem(id, tab) {
        if (!userIsAdmin()) {
            alert('Apenas administradores podem deletar permanentemente itens.');
            return;
        }

        const confirmation = prompt('⚠️ DELEÇÃO PERMANENTE IRREVERSÍVEL ⚠️\n\nDigite "SIM" (em maiúsculo) para confirmar a exclusão permanente do item:');
        if (confirmation !== 'SIM') {
            alert('Operação cancelada. A exclusão permanente não foi realizada.');
            return;
        }

        // Encontrar e remover o item de forma permanente
        if (tab === 'auditoria' || tab === 'audit') {
            const index = audits.findIndex(a => String(a.id) === String(id));
            if (index > -1) {
                audits.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        else if (tab === 'treinamentos' || tab === 'train') {
            const index = trainings.findIndex(t => String(t.id) === String(id));
            if (index > -1) {
                trainings.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        else if (tab === 'atividades' || tab === 'ativ') {
            const index = activities.findIndex(a => String(a.id) === String(id));
            if (index > -1) {
                activities.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        else if (tab === 'manutencao' || tab === 'mant') {
            const index = maintenances.findIndex(m => String(m.id) === String(id));
            if (index > -1) {
                maintenances.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }
        else if (tab === 'documentos' || tab === 'doc') {
            const index = documents.findIndex(d => String(d.id) === String(id));
            if (index > -1) {
                documents.splice(index, 1);
                alert('Item deletado permanentemente!');
            }
        }

        saveAll();
        openTrashBin(); // Atualiza a lixeira
        updateTrashBadge();
    }

    // Anexos Logic
    function addAnexo(prefix) {
        const container = document.getElementById(prefix + 'Anexos');
        const div = document.createElement('div');
        div.className = 'anexo-item';
        div.innerHTML = `
            <i class="fas fa-link"></i>
            <input placeholder="Título do arquivo" class="anexo-title">
            <input placeholder="Cole a URL aqui..." class="anexo-url">
            <i class="fas fa-times" style="cursor:pointer; color:var(--ind-red)" onclick="this.parentElement.remove()"></i>
        `;
        container.appendChild(div);
    }
    function getAnexos(prefix) {
    // Seleciona as linhas de anexo específicas do container do modal aberto
    var container = document.getElementById(prefix + 'Anexos');
    if (!container) return [];

    return [...container.querySelectorAll('.anexo-item')].map(row => {
        const titleInput = row.querySelector('.anexo-title');
        const urlInput = row.querySelector('.anexo-url');
        return {
            titulo: titleInput ? titleInput.value : '',
            url: urlInput ? urlInput.value : ''
        };
    }).filter(a => a.url.trim() !== ''); // Só persiste se a URL não estiver vazia
}

    function restoreAnexos(prefix, list) {
        const container = document.getElementById(prefix + 'Anexos');
        container.innerHTML = '';
        (list || []).forEach(a => {
            addAnexo(prefix);
            const row = container.lastChild;
            row.querySelector('.anexo-title').value = a.titulo;
            row.querySelector('.anexo-url').value = a.url;
        });
    }

    // View Modal e Histórico com Paginação
    function openView(id, tab) {
        currentHistoryPage = 1; // Garante que a primeira página seja carregada
        currentViewItemId = id;
        currentViewTab = tab;
        renderViewContent(id, tab);
    }

    function changeHistoryPage(id, tab, direction) {
        currentHistoryPage += direction;

        // Normaliza o tab para garantir consistência
        let normalizedTab = tab;
        if (tab === 'audit') normalizedTab = 'auditoria';
        else if (tab === 'train') normalizedTab = 'treinamentos';
        else if (tab === 'ativ') normalizedTab = 'atividades';
        else if (tab === 'mant' || tab === 'manutencao') normalizedTab = 'manutencao';
        else if (tab === 'doc' || tab === 'documentos') normalizedTab = 'documentos';

        renderViewContent(id, normalizedTab);
    }

function renderViewContent(id, tab) {
    var item, statusList, finalTab = tab;

    // Normaliza o tab para os valores esperados
    if (tab === 'audit') finalTab = 'auditoria';
    else if (tab === 'train') finalTab = 'treinamentos';
    else if (tab === 'ativ') finalTab = 'atividades';
    else if (tab === 'mant' || tab === 'manutencao') finalTab = 'manutencao';
    else if (tab === 'doc' || tab === 'documentos') finalTab = 'documentos';

    // Tenta encontrar o item no array correto
    if (finalTab === 'auditoria') {
        item = audits.find(i => i.id === id);
        statusList = masterLists.auditStatus;
    } else if (finalTab === 'treinamentos') {
        item = trainings.find(i => i.id === id);
        statusList = masterLists.trainStatus;
    } else if (finalTab === 'atividades') {
        item = activities.find(i => i.id === id);
        statusList = masterLists.ativStatus;
    } else if (finalTab === 'manutencao') {
        item = maintenances.find(i => i.id === id);
        statusList = masterLists.mantStatus;
    } else if (finalTab === 'documentos') {
        item = documents.find(i => i.id === id);
        statusList = masterLists.docStatus;
    }

    // Se não encontrou, procura em todos os arrays
    if (!item) {
        item = audits.find(i => i.id === id);
        if (item) {
            finalTab = 'auditoria';
            statusList = masterLists.auditStatus;
        } else {
            item = activities.find(i => i.id === id);
            if (item) {
                finalTab = 'atividades';
                statusList = masterLists.ativStatus;
            } else {
                item = maintenances.find(i => i.id === id);
                if (item) {
                    finalTab = 'manutencao';
                    statusList = masterLists.mantStatus;
                } else {
                    item = documents.find(i => i.id === id);
                    if (item) {
                        finalTab = 'documentos';
                        statusList = masterLists.docStatus;
                    } else {
                        item = trainings.find(i => i.id === id);
                        if (item) {
                            finalTab = 'treinamentos';
                            statusList = masterLists.trainStatus;
                        }
                    }
                }
            }
        }
    }

    if (!item) return;

    var statusObj = (statusList || []).find(s => s.name === item.status) || { color: 'default' };
    var statusColorVar = colorMap[statusObj.color] || colorMap['default'];

    // Montagem do Grid de Detalhes
    var detailsGrid = '';
    if (finalTab === 'auditoria') {
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria}</div></div>
            <div class="view-item"><label>Responsável</label><div>${item.responsavel || 'ND'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${item.revisor || 'ND'}</div></div>
            <div class="view-item"><label>Auditor</label><div>${item.auditor || 'ND'}</div></div>
            <div class="view-item"><label>Publicação</label><div>${formatBR(item.dataPublicacao)}</div></div>
            <div class="view-item"><label>Previsão</label><div>${formatBR(item.dataPrevisao)}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    } else if (finalTab === 'atividades') {
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria}</div></div>
            <div class="view-item"><label>Responsável</label><div>${item.responsavel || 'ND'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${item.revisor || 'ND'}</div></div>
            <div class="view-item"><label>Data Início</label><div>${formatBR(item.dataInicio)}</div></div>
            <div class="view-item"><label>Data Conclusão</label><div>${formatBR(item.dataConclusao)}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    } else if (finalTab === 'manutencao') {
        const isNA = isBlankPeriodicity(item.intervalo);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Tipo</label><div>${item.tipo || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria}</div></div>
            <div class="view-item"><label>Equipamento</label><div>${item.item}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${item.intervalo} dias`}</div></div>
            <div class="view-item"><label>Última Manutenção</label><div>${formatBR(item.ultima)}</div></div>
            <div class="view-item"><label>Próxima Manutenção</label><div>${isNA ? 'N/A' : formatBR(item.proxima)}</div></div>
            <div class="view-item"><label>Responsável Técnico</label><div>${item.responsavelTecnico || 'ND'}</div></div>
            <div class="view-item"><label>Responsável pela Manutenção</label><div>${item.responsavelManutencao || 'ND'}</div></div>
            <div class="view-item"><label>Empresa Responsável</label><div>${item.empresaResponsavel || 'ND'}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    } else if (finalTab === 'treinamentos') {
        const isNA = isBlankPeriodicity(item.periodicidade);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria || '-'}</div></div>
            <div class="view-item"><label>Responsável</label><div>${item.responsavel || 'ND'}</div></div>
            <div class="view-item"><label>Instrutor</label><div>${item.instrutor || 'ND'}</div></div>
            <div class="view-item"><label>Local do Evento</label><div>${item.localEvento || 'ND'}</div></div>
            <div class="view-item"><label>Carga Horária</label><div>${item.cargaHoraria || 'ND'}</div></div>
            <div class="view-item"><label>Participantes</label><div>${item.participantes || 'ND'}</div></div>
            <div class="view-item"><label>Data Publicação</label><div>${formatBR(item.dataPublicacao)}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${item.periodicidade} dias`}</div></div>
            <div class="view-item"><label>Data Previsão</label><div>${isNA ? 'N/A' : formatBR(item.dataPrevisao)}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    } else if (finalTab === 'documentos') {
        const isNA = isBlankPeriodicity(item.docIntervalo);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${item.setor || 'ND'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${item.categoria}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${item.docIntervalo} dias`}</div></div>
            <div class="view-item"><label>Responsável</label><div>${item.responsavel || 'ND'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${item.revisor || 'ND'}</div></div>
            <div class="view-item"><label>Data do Documento</label><div>${formatBR(item.dataCriacao)}</div></div>
            <div class="view-item"><label>Próx. Revisão</label><div>${isNA ? 'N/A' : formatBR(item.dataProximaRevisao)}</div></div>
            <div class="view-item"><label>Alerta</label><div>${item.flagDias === 0 ? 'N/A' : item.flagDias + ' dias antes'}</div></div>
        `;
    }

    var anexosHtml = (item.anexos || []).map(a =>
        `<a href="${a.url}" target="_blank" class="file-chip"><i class="fas fa-external-link-alt"></i> ${a.titulo || 'Anexo'}</a>`
    ).join('');

    // --- LÓGICA DE PAGINAÇÃO E PROCESSAMENTO DE HISTÓRICO ---
    var allHistory = (item.historico || []).slice().reverse().map((entry, revIndex) => ({
        entry,
        originalIndex: item.historico.length - 1 - revIndex
    }));

    // SOFT DELETE: Filtrar entradas de histórico deletadas
    var filteredHistory = allHistory.filter(h => !h.entry.deleted);

    var itemsPerPage = 10;
    var totalItems = filteredHistory.length;
    var totalPages = Math.ceil(totalItems / itemsPerPage);
    var maxPages = 100;
    var finalPages = Math.min(totalPages, maxPages);

    currentHistoryPage = Math.min(Math.max(1, currentHistoryPage), finalPages || 1);

    var start = (currentHistoryPage - 1) * itemsPerPage;
    var end = start + itemsPerPage;
    var paginatedHistory = filteredHistory.slice(start, end);

    var isAdmin = userIsAdmin();

    var historyHtml = paginatedHistory.map((h, idx) => {
        h.filteredIndex = start + idx;
        const date = new Date(h.entry.timestamp);
        const dateStr = date.toLocaleDateString('pt-BR');
        const timeStr = date.toLocaleTimeString('pt-BR');

        let details = '';

        // TRATAMENTO PARA INCOMPATIBILIDADE DE FORMATO (ARRAY VS OBJETO INDEXADO)
        if (h.entry.detalhes) {
            let detailsArray = [];
            if (Array.isArray(h.entry.detalhes)) {
                detailsArray = h.entry.detalhes;
            } else if (typeof h.entry.detalhes === 'object') {
                // Converte chaves numéricas do Firebase para Array
                detailsArray = Object.keys(h.entry.detalhes)
                    .filter(k => k !== 'silentChanged')
                    .map(k => h.entry.detalhes[k]);
            }

            if (detailsArray.length > 0) {
                details = detailsArray.map(d =>
                    `<small style="display:block; margin-left:10px; color:var(--text-light); line-height:1.4;">${d}</small>`
                ).join('');
            }
        }

        // Fallback para mensagens de sistema
        if (!details && (h.entry.acao.includes('Edição') || h.entry.acao.includes('Atualização'))) {
            details = '<small style="display:block; margin-left:10px; color:var(--ind-yellow); font-style:italic;">Detalhamento indisponível para este registro antigo.</small>';
        }

        const usuario = h.entry.usuario ? ` - ${h.entry.usuario}` : '';

        const deleteBtn = isAdmin
            ? `<button class="history-delete" title="Excluir" onclick="event.stopPropagation(); deleteHistoryEntry(${id}, '${finalTab}', ${h.originalIndex})" style="border:none; background:transparent; color:var(--ind-red); cursor:pointer; font-size:13px; padding:2px;">
                    <i class="fas fa-trash"></i>
               </button>`
            : '';

        // Cada item possui um toggle à esquerda; clicar na linha agora alterna os detalhes (olho abre a visualização)
        return `
            <div class="history-item" onclick="toggleHistoryDetails(this)" style="cursor:pointer; padding: 10px 0; border-bottom: 1px dotted #e5e7eb; position:relative;">
                <div style="display:flex; gap:8px; align-items:flex-start;">
                    <span class="history-toggle" onclick="event.stopPropagation(); toggleHistoryDetails(this);" title="Mostrar/ocultar">&#8250;</span>
                    <div style="flex:1;">
                        <strong style="display:block; color:var(--primary); font-size:13px;">${h.entry.acao}${usuario}</strong>
                        <small style="color:var(--text-light); font-size:11px;">${dateStr} às ${timeStr}</small>
                        <div class="history-details">${details}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px; margin-left:8px;">
                        <i class="fas fa-eye" style="color:var(--text-light); cursor:pointer; font-size:14px;" onclick="event.stopPropagation(); viewHistoryItem(${id}, '${finalTab}', ${h.filteredIndex})" title="Visualizar registro"></i>
                        ${deleteBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Função utilitária para alternar a exibição dos detalhes do histórico (não abre a visualização do registro)
    window.toggleHistoryDetails = function(el) {
        const item = el.closest('.history-item');
        if (!item) return;
        item.classList.toggle('expanded');
    };

    var paginationHtml = finalPages > 1 ? `
        <div class="history-pagination">
            <button ${currentHistoryPage === 1 ? 'disabled' : ''} onclick="changeHistoryPage(${id}, '${finalTab}', -1)">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
            <span>Página ${currentHistoryPage} de ${finalPages}</span>
            <button ${currentHistoryPage === finalPages ? 'disabled' : ''} onclick="changeHistoryPage(${id}, '${finalTab}', 1)">
                Próxima <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    ` : '';

    // Guarda referência para o drawer de histórico
    window._currentViewId = id;
    window._currentViewTab = finalTab;

    var html = `
        <div class="view-header">
            <h2 style="margin:0; color:var(--primary); font-size:20px;">${item.titulo}${item.deleted ? ' <span style="color:#ef4444; font-size:14px; font-weight:500;">[DELETADO]</span>' : ''}</h2>
            <span class="view-status" style="background-color:${statusColorVar}">${item.status}</span>
        </div>
        <div class="view-grid">
            ${detailsGrid}
        </div>
        <div>
            <h4 style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Descrição</h4>
            <div class="view-desc">${(item.descricao || 'Sem descrição.').replace(/\n/g, '<br>')}</div>
        </div>
        ${anexosHtml ? `<div class="view-files" style="margin-top:10px;"><h4>Anexos</h4>${anexosHtml}</div>` : ''}
    `;

    document.getElementById('viewContent').innerHTML = html;
    document.getElementById('viewModal').style.display = 'flex';

    var btnEdit = document.getElementById('btnViewEdit');
    if (btnEdit) {
        btnEdit.style.display = (userCanEditCards() && !item.deleted) ? 'inline-flex' : 'none';
    }
}

// --- DRAWER DE HISTÓRICO ---
window._historyDrawerPage = 1;

window.openHistoryDrawer = function() {
    var drawer = document.getElementById('historyDrawer');
    var backdrop = document.getElementById('historyDrawerBackdrop');
    if (!drawer) return;
    window._historyDrawerPage = 1;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    renderHistoryDrawer();
};

window.closeHistoryDrawer = function() {
    var drawer = document.getElementById('historyDrawer');
    var backdrop = document.getElementById('historyDrawerBackdrop');
    if (!drawer) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
};

window.toggleHistoryDateFilter = function() {
    var el = document.getElementById('historyDateFilter');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
};

window.renderHistoryDrawer = function() {
    var id = window._currentViewId;
    var finalTab = window._currentViewTab;
    if (id === undefined || !finalTab) return;

    var item;
    if (finalTab === 'auditoria') item = audits.find(i => i.id === id);
    else if (finalTab === 'atividades') item = activities.find(i => i.id === id);
    else if (finalTab === 'manutencao') item = maintenances.find(i => i.id === id);
    else if (finalTab === 'documentos') item = documents.find(i => i.id === id);
    else if (finalTab === 'treinamentos') item = trainings.find(i => i.id === id);
    if (!item) return;

    var dateIni = document.getElementById('histFilterDateIni') ? document.getElementById('histFilterDateIni').value : '';
    var dateFim = document.getElementById('histFilterDateFim') ? document.getElementById('histFilterDateFim').value : '';

    var allHistory = (item.historico || []).slice().reverse().map((entry, revIndex) => ({
        entry,
        originalIndex: (item.historico.length - 1) - revIndex
    })).filter(h => !h.entry.deleted);

    if (dateIni) allHistory = allHistory.filter(h => new Date(h.entry.timestamp) >= new Date(dateIni));
    if (dateFim) allHistory = allHistory.filter(h => new Date(h.entry.timestamp) <= new Date(dateFim + 'T23:59:59'));

    var itemsPerPage = 10;
    var totalItems = allHistory.length;
    var totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    window._historyDrawerPage = Math.min(Math.max(1, window._historyDrawerPage), totalPages);
    var start = (window._historyDrawerPage - 1) * itemsPerPage;
    var paginated = allHistory.slice(start, start + itemsPerPage);

    var isAdmin = userIsAdmin();

    var typeColors = {
        'Criação': '#22c55e',
        'Criado': '#22c55e',
        'Edição': '#3b82f6',
        'Editado': '#3b82f6',
        'Atualização': '#3b82f6',
        'Restauração': '#f59e0b',
    };

    function getTypeColor(acao) {
        for (var k in typeColors) { if (acao && acao.toLowerCase().includes(k.toLowerCase())) return typeColors[k]; }
        return '#6b7280';
    }
    function getTypeLabel(acao) {
        if (!acao) return 'AÇÃO';
        if (acao.toLowerCase().includes('cria')) return 'CRIADO';
        if (acao.toLowerCase().includes('edit') || acao.toLowerCase().includes('atualiz')) return 'EDITADO';
        if (acao.toLowerCase().includes('restaur')) return 'RESTAURADO';
        return 'AÇÃO';
    }

    var bodyHtml = paginated.length === 0
        ? '<div class="history-drawer-empty"><i class="fas fa-inbox"></i><p>Nenhuma alteração registrada.</p></div>'
        : paginated.map((h, idx) => {
            var date = new Date(h.entry.timestamp);
            var dateStr = date.toLocaleDateString('pt-BR');
            var timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            var color = getTypeColor(h.entry.acao);
            var label = getTypeLabel(h.entry.acao);
            var usuario = h.entry.usuario || '';

            var detailsArray = [];
            if (h.entry.detalhes) {
                if (Array.isArray(h.entry.detalhes)) detailsArray = h.entry.detalhes;
                else if (typeof h.entry.detalhes === 'object') {
                    detailsArray = Object.keys(h.entry.detalhes).filter(k => k !== 'silentChanged').map(k => h.entry.detalhes[k]);
                }
            }

            var changesHtml = detailsArray.length > 0
                ? detailsArray.map(d => {
                    var parts = String(d).match(/^(.+?):\s*(.+?)\s*→\s*(.+)$/);
                    if (parts) {
                        return `<div class="hd-change-row">
                            <span class="hd-change-field">${parts[1]}</span>
                            <span class="hd-change-from">${parts[2]}</span>
                            <i class="fas fa-arrow-right hd-change-arrow"></i>
                            <span class="hd-change-to">${parts[3]}</span>
                        </div>`;
                    }
                    return `<div class="hd-change-row"><span class="hd-change-field" style="color:#6b7280;">${d}</span></div>`;
                }).join('')
                : '';

            var deleteBtn = isAdmin
                ? `<button class="hd-delete-btn" title="Excluir" onclick="event.stopPropagation(); deleteHistoryEntry(${id}, '${finalTab}', ${h.originalIndex})"><i class="fas fa-trash"></i> Excluir Registro</button>`
                : '';

            var filteredIndex = start + idx;
            return `
            <div class="hd-item" onclick="toggleHdItem(this)">
                <div class="hd-item-top">
                    <div class="hd-item-dot" style="background:${color}"></div>
                    <div class="hd-item-content">
                        <div class="hd-item-meta">
                            ${usuario ? `<span class="hd-user"><i class="fas fa-user"></i> ${usuario}</span>` : ''}
                            <span class="hd-badge" style="background:${color}20; color:${color}; border-color:${color}40;">${label}</span>
                            <span class="hd-date">${dateStr} às ${timeStr}</span>
                        </div>
                        <div class="hd-item-title">${h.entry.acao}</div>
                    </div>
                    <div class="hd-item-actions">
                        <button class="hd-view-btn" title="Ver snapshot" onclick="event.stopPropagation(); viewHistoryItem(${id}, '${finalTab}', ${filteredIndex})"><i class="fas fa-eye"></i></button>
                        <span class="hd-toggle-icon"><i class="fas fa-chevron-down"></i></span>
                    </div>
                </div>
                <div class="hd-item-body">
                    ${changesHtml || '<span style="color:#94a3b8; font-size:12px; font-style:italic;">Sem detalhes adicionais.</span>'}
                    ${deleteBtn}
                </div>
            </div>`;
        }).join('');

    document.getElementById('historyDrawerBody').innerHTML = bodyHtml;

    var paginationHtml = totalPages > 1 ? `
        <span style="color:#94a3b8; font-size:12px;">${start + 1}–${Math.min(start + itemsPerPage, totalItems)} de ${totalItems}</span>
        <div style="display:flex; gap:6px;">
            <button ${window._historyDrawerPage === 1 ? 'disabled' : ''} onclick="window._historyDrawerPage--; renderHistoryDrawer()"><i class="fas fa-chevron-left"></i> Anterior</button>
            <button ${window._historyDrawerPage === totalPages ? 'disabled' : ''} onclick="window._historyDrawerPage++; renderHistoryDrawer()">Próximo <i class="fas fa-chevron-right"></i></button>
        </div>
    ` : `<span style="color:#94a3b8; font-size:12px;">${totalItems} registro${totalItems !== 1 ? 's' : ''}</span>`;

    document.getElementById('historyDrawerPagination').innerHTML = paginationHtml;
};

window.toggleHdItem = function(el) {
    el.classList.toggle('open');
};

function viewHistoryItem(id, tab, historyIndex) {
    var item;
    var finalTab = tab;

    // Normaliza o tab
    if (tab === 'audit') finalTab = 'auditoria';
    else if (tab === 'train') finalTab = 'treinamentos';
    else if (tab === 'ativ') finalTab = 'atividades';
    else if (tab === 'mant' || tab === 'manutencao') finalTab = 'manutencao';
    else if (tab === 'doc' || tab === 'documentos') finalTab = 'documentos';

    if (finalTab === 'auditoria') { item = audits.find(i => i.id === id); }
    else if (finalTab === 'atividades') { item = activities.find(i => i.id === id); }
    else if (finalTab === 'manutencao') { item = maintenances.find(i => i.id === id); }
    else if (finalTab === 'documentos') { item = documents.find(i => i.id === id); }
    else if (finalTab === 'treinamentos') { item = trainings.find(i => i.id === id); }

    if (!item) return;

    var history = item.historico || [];
    var allHistory = history.slice().reverse().map((entry, revIndex) => ({
        entry,
        originalIndex: history.length - 1 - revIndex
    }));
    var filteredHistory = allHistory.filter(h => h.entry.acao !== 'Restauração de Backup');

    if (historyIndex < 0 || historyIndex >= filteredHistory.length) return;

    var h = filteredHistory[historyIndex];
    var date = new Date(h.entry.timestamp);
    var dateStr = date.toLocaleDateString('pt-BR');

    document.getElementById('historyViewTitle').textContent = `[Registro de ${dateStr}]`;

    var historicalItem;
    if (h.entry.snapshot) {
        historicalItem = JSON.parse(JSON.stringify(h.entry.snapshot));
    } else {
        historicalItem = JSON.parse(JSON.stringify(item));
    }

    // Copiar a lógica de renderização do view
    var statusList = finalTab === 'auditoria' ? masterLists.auditStatus :
                      finalTab === 'treinamentos' ? masterLists.trainStatus :
                      finalTab === 'atividades' ? masterLists.ativStatus :
                      finalTab === 'manutencao' ? masterLists.mantStatus :
                      finalTab === 'documentos' ? masterLists.docStatus : [];

    var statusObj = statusList.find(s => s.name === historicalItem.status) || { color: 'default' };
    var statusColorVar = colorMap[statusObj.color] || colorMap['default'];

    var detailsGrid = '';
    if (finalTab === 'auditoria') {
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Responsável</label><div>${historicalItem.responsavel || 'N/A'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${historicalItem.revisor || 'N/A'}</div></div>
            <div class="view-item"><label>Auditor</label><div>${historicalItem.auditor || 'N/A'}</div></div>
            <div class="view-item"><label>Data Publicação</label><div>${historicalItem.dataPublicacao ? formatBR(historicalItem.dataPublicacao) : 'N/A'}</div></div>
            <div class="view-item"><label>Previsão</label><div>${historicalItem.dataPrevisao ? formatBR(historicalItem.dataPrevisao) : 'N/A'}</div></div>
        `;
    } else if (finalTab === 'atividades') {
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Responsável</label><div>${historicalItem.responsavel || 'N/A'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${historicalItem.revisor || 'N/A'}</div></div>
            <div class="view-item"><label>Data Início</label><div>${historicalItem.dataInicio ? formatBR(historicalItem.dataInicio) : 'N/A'}</div></div>
            <div class="view-item"><label>Data Conclusão</label><div>${historicalItem.dataConclusao ? formatBR(historicalItem.dataConclusao) : 'N/A'}</div></div>
        `;
    } else if (finalTab === 'manutencao') {
        const isNA = isBlankPeriodicity(historicalItem.intervalo);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Tipo</label><div>${historicalItem.tipo || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Equipamento</label><div>${historicalItem.item || 'N/A'}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${historicalItem.intervalo} dias`}</div></div>
            <div class="view-item"><label>Última Manutenção</label><div>${historicalItem.ultima ? formatBR(historicalItem.ultima) : 'N/A'}</div></div>
            <div class="view-item"><label>Próxima Manutenção</label><div>${isNA ? 'N/A' : formatBR(historicalItem.proxima)}</div></div>
            <div class="view-item"><label>Responsável Técnico</label><div>${historicalItem.responsavelTecnico || 'N/A'}</div></div>
            <div class="view-item"><label>Responsável pela Manutenção</label><div>${historicalItem.responsavelManutencao || 'N/A'}</div></div>
            <div class="view-item"><label>Empresa Responsável</label><div>${historicalItem.empresaResponsavel || 'N/A'}</div></div>
        `;
    } else if (finalTab === 'treinamentos') {
        const isNA = isBlankPeriodicity(historicalItem.periodicidade);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Responsável</label><div>${historicalItem.responsavel || 'N/A'}</div></div>
            <div class="view-item"><label>Instrutor</label><div>${historicalItem.instrutor || 'N/A'}</div></div>
            <div class="view-item"><label>Local do Evento</label><div>${historicalItem.localEvento || 'N/A'}</div></div>
            <div class="view-item"><label>Carga Horária</label><div>${historicalItem.cargaHoraria || 'N/A'}</div></div>
            <div class="view-item"><label>Participantes</label><div>${historicalItem.participantes || 'N/A'}</div></div>
            <div class="view-item"><label>Data Publicação</label><div>${historicalItem.dataPublicacao ? formatBR(historicalItem.dataPublicacao) : 'N/A'}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${historicalItem.periodicidade} dias`}</div></div>
        `;
    } else if (finalTab === 'documentos') {
        const isNA = isBlankPeriodicity(historicalItem.docIntervalo);
        detailsGrid = `
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Periodicidade</label><div>${isNA ? 'N/A' : `${historicalItem.docIntervalo} dias`}</div></div>
            <div class="view-item"><label>Responsável</label><div>${historicalItem.responsavel || 'N/A'}</div></div>
            <div class="view-item"><label>Revisor</label><div>${historicalItem.revisor || 'N/A'}</div></div>
            <div class="view-item"><label>Data do Documento</label><div>${historicalItem.dataCriacao ? formatBR(historicalItem.dataCriacao) : 'N/A'}</div></div>
            <div class="view-item"><label>Próx. Revisão</label><div>${isNA ? 'N/A' : formatBR(historicalItem.dataProximaRevisao)}</div></div>
        `;
    } else {
        detailsGrid = `
            <div class="view-item"><label>Título</label><div>${historicalItem.titulo || 'N/A'}</div></div>
            <div class="view-item"><label>Setor</label><div>${historicalItem.setor || 'N/A'}</div></div>
            <div class="view-item"><label>Categoria</label><div>${historicalItem.categoria || 'N/A'}</div></div>
            <div class="view-item"><label>Status</label><div>${historicalItem.status || 'N/A'}</div></div>
        `;
    }

    var anexos = h.entry.snapshot ? (historicalItem.anexos || []) : [];
    var anexosHtml = anexos.length > 0
        ? `<div style="margin-top:16px;"><div class="view-files" style="margin-top:0;"><h4>Anexos</h4>${anexos.map(a =>
            `<a href="${a.url}" target="_blank" class="file-chip"><i class="fas fa-external-link-alt"></i> ${a.titulo || 'Anexo'}</a>`
        ).join('')}</div></div>`
        : '';

    var versionDescription = historicalItem.descricao || 'Sem descrição.';
    var modificationEntries = [];
    if (h.entry.detalhes) {
        if (Array.isArray(h.entry.detalhes)) {
            modificationEntries = h.entry.detalhes;
        } else if (typeof h.entry.detalhes === 'object') {
            modificationEntries = Object.keys(h.entry.detalhes)
                .filter(k => k !== 'silentChanged')
                .map(k => h.entry.detalhes[k]);
        }
    }

    var modificationsHtml = modificationEntries.length > 0
        ? `<div style="margin-top:16px;"><h4 style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Modificações</h4><div class="view-desc">${modificationEntries.map(d => String(d).replace(/\n/g, '<br>')).join('<br>')}</div></div>`
        : '';

    var html = `
        <div class="view-header">
            <h2 style="margin:0; color:var(--primary); font-size:20px;">${historicalItem.titulo}</h2>
            <span class="view-status" style="background-color:${statusColorVar}">${historicalItem.status}</span>
        </div>
        <div class="view-grid">
            ${detailsGrid}
        </div>
        <div>
            <h4 style="margin:0 0 8px; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Descrição</h4>
            <div class="view-desc">${versionDescription.replace(/\n/g, '<br>')}</div>
        </div>
        ${anexosHtml}
        ${modificationsHtml}
    `;

    document.getElementById('historyViewContent').innerHTML = html;
    document.getElementById('historyViewModal').style.display = 'flex';
}

    function deleteHistoryEntry(id, tab, historyIndex) {
        // Somente admin pode apagar histórico
        if (!(typeof userIsAdmin === 'function') || !userIsAdmin()) return;
        if (!confirm('Deseja realmente excluir este registro do histórico?')) return;

        let item;
        let finalTab = tab;

        // Normaliza o tab
        if (tab === 'audit') finalTab = 'auditoria';
        else if (tab === 'train') finalTab = 'treinamentos';
        else if (tab === 'ativ') finalTab = 'atividades';
        else if (tab === 'mant' || tab === 'manutencao') finalTab = 'manutencao';
        else if (tab === 'doc' || tab === 'documentos') finalTab = 'documentos';

        if (finalTab === 'auditoria') { item = audits.find(i => i.id === id); }
        else if (finalTab === 'atividades') { item = activities.find(i => i.id === id); }
        else if (finalTab === 'manutencao') { item = maintenances.find(i => i.id === id); }
        else if (finalTab === 'documentos') { item = documents.find(i => i.id === id); }
        else if (finalTab === 'treinamentos') { item = trainings.find(i => i.id === id); }

        // Se não encontrou, tenta procurar em todos os arrays
        if (!item) {
            item = audits.find(i => i.id === id);
            if (item) finalTab = 'auditoria';
            else {
                item = activities.find(i => i.id === id);
                if (item) finalTab = 'atividades';
                else {
                    item = maintenances.find(i => i.id === id);
                    if (item) finalTab = 'manutencao';
                    else {
                        item = documents.find(i => i.id === id);
                        if (item) finalTab = 'documentos';
                        else {
                            item = trainings.find(i => i.id === id);
                            if (item) finalTab = 'treinamentos';
                        }
                    }
                }
            }
        }

        if (!item || !Array.isArray(item.historico) || item.historico.length === 0) return;

        if (historyIndex < 0 || historyIndex >= item.historico.length) return;

        // SOFT DELETE: Marcar entrada de histórico como deletada
        const historyEntry = item.historico[historyIndex];
        if (historyEntry) {
            historyEntry.deleted = true;
            historyEntry.deletedAt = new Date().toISOString();
            historyEntry.deletedBy = currentuser.email || currentuser.name || 'admin';
        }

        saveAll();
        renderViewContent(id, tab);
    }

    function editCurrentViewItem() {
        if (!userCanEditCards()) {
            alert('Você não tem permissão para editar cards. Seu acesso está configurado como somente leitura.');
            return;
        }
        if (!currentViewItemId || !currentViewTab) return;

        closeModal('viewModal');
        editItem(currentViewItemId, currentViewTab);
    }

    // List Manager & Color Selection
    function openListManager(genericKey) {
        let isStatus = false;
        let listname;

        if (genericKey === 'setores') {
            currentListKey = 'setores';
            listname = 'SETORES';
        } else if (genericKey === 'categorias') {
            if(currentTab === 'auditoria') currentListKey = 'auditCategorias';
            else if(currentTab === 'treinamentos') currentListKey = 'trainCategorias';
            else if(currentTab === 'atividades') currentListKey = 'ativCategorias';
            else if(currentTab === 'manutencao') currentListKey = 'mantCategorias';
            else currentListKey = 'docCategorias';
            listname = 'CATEGORIA';
        } else if (genericKey === 'subcategorias' || genericKey === 'itens') {

            const prefix = getTabPrefix(currentTab);
            const catSelect = document.getElementById(`${prefix}Categoria`);

            if (!catSelect) {
                 alert(`Elemento de Categoria (${prefix}Categoria) não encontrado. Verifique se você abriu o modal correspondente à aba ativa.`);
                 return;
            }

            const cat = catSelect.value;

            if (!cat) { alert("Selecione uma Categoria antes de gerenciar Subcategorias/Itens."); return; }

            let subcatMapKey;
            if(currentTab === 'auditoria') subcatMapKey = 'auditSubcats';
            else if(currentTab === 'treinamentos') subcatMapKey = 'trainSubcats';
            else if(currentTab === 'atividades') subcatMapKey = 'ativSubcats';
            else if(currentTab === 'manutencao') subcatMapKey = 'mantItens';
            else subcatMapKey = 'docSubcats';

            currentListKey = `${subcatMapKey}_${cat}`;
            listname = `SUBCATEGORIAS / ITENS DE: ${cat}`;

        } else if (genericKey === 'status') {
            if(currentTab === 'auditoria') currentListKey = 'auditStatus';
            else if(currentTab === 'treinamentos') currentListKey = 'trainStatus';
            else if(currentTab === 'atividades') currentListKey = 'ativStatus';
            else if(currentTab === 'manutencao') currentListKey = 'mantStatus';
            else currentListKey = 'docStatus';
            isStatus = true;
            listname = 'STATUS';
        } else if (genericKey === 'marcadores') {
            if(currentTab === 'auditoria') currentListKey = 'auditMarcadores';
            else if(currentTab === 'treinamentos') currentListKey = 'trainMarcadores';
            else if(currentTab === 'atividades') currentListKey = 'ativMarcadores';
            else if(currentTab === 'manutencao') currentListKey = 'mantMarcadores';
            else currentListKey = 'docMarcadores';
            isStatus = true; // usa a mesma lógica de objetos com cor
            listname = 'MARCADORES';
        } else if (genericKey === 'tipos') {
            if(currentTab === 'manutencao') {
                currentListKey = 'mantTipos';
                listname = 'TIPOS';
            } else {
                alert('Tipos disponíveis apenas para Manutenção.');
                return;
            }
        } else if (genericKey === 'responsaveis') {
            currentListKey = 'responsaveis';
            listname = 'RESPONSÁVEIS';
        } else {
            currentListKey = genericKey;
            listname = genericKey.toUpperCase();
        }

        document.getElementById('listTitle').textContent = `Gerenciar: ${listname}`;
        const body = document.getElementById('listBody');
        body.innerHTML = '';

        if(isStatus) {
            document.getElementById('colorPickerContainer').style.display = 'block';
            selectColor('default', document.querySelector('.bg-default'));
        } else {
            document.getElementById('colorPickerContainer').style.display = 'none';
        }

        let listToRender;
        let baseKey = currentListKey.split('_')[0];

        if (currentListKey.includes('_')) {
            const cat = currentListKey.split('_')[1];
            masterLists[baseKey] = masterLists[baseKey] || {};
            listToRender = masterLists[baseKey][cat] || [];
        } else {
            listToRender = masterLists[currentListKey] || [];
        }

        // SOFT DELETE: Filtrar itens deletados da lista
        listToRender = listToRender.filter(item => {
            if (typeof item === 'object') {
                return !item.deleted;
            }
            // Para strings simples (não-objeto)
            return !item.deleted;
        });

        // Para responsáveis, verifica quais são usuários cadastrados
        const userNames = new Set();
        if (currentListKey === 'responsaveis' && typeof users !== 'undefined') {
            users.forEach(user => {
                if (user.name) userNames.add(user.name);
            });
        }

        listToRender.forEach(val => {
            let displayHtml = '', itemVal = '';
            if (typeof val === 'object') {
                // Verifica se é um objeto com propriedade 'name' (status/marcador) ou 'value' (soft delete)
                if (val.name !== undefined) {
                    // É um status/marcador com nome e cor
                    const colorVar = colorMap[val.color] || colorMap['default'];
                    displayHtml = `<span class="color-dot" style="background-color:${colorVar}"></span>${val.name}`;
                    itemVal = val.name;
                } else if (val.value !== undefined) {
                    // É um item marcado para soft delete (conversão de string para objeto)
                    displayHtml = val.value;
                    itemVal = val.value;
                } else {
                    // Objeto malformado - pular
                    return;
                }
            } else {
                // Deve ser uma string simples
                displayHtml = val;
                itemVal = val;
            }

            // Para responsáveis, verifica se é um usuário cadastrado
            const isUser = currentListKey === 'responsaveis' && userNames.has(itemVal);
            const canEdit = !isUser;
            const canDelete = !isUser;

            body.innerHTML += `<tr>
                <td>${displayHtml}${isUser ? ' <span style="color: #666; font-size: 11px;">(Usuário cadastrado)</span>' : ''}</td>
                <td>
                    <div class="list-actions">
                        ${canEdit ? `<i class="fas fa-pen edit-icon" onclick="editListItem('${currentListKey}','${itemVal.replace(/'/g, "\\'")}')" title="Editar nome"></i>` : ''}
                        ${canDelete ? `<i class="fas fa-trash remove-icon" onclick="removeFromList('${currentListKey}','${itemVal.replace(/'/g, "\\'")}')" title="Excluir"></i>` : ''}
                    </div>
                </td>
            </tr>`;
        });

        const input = document.getElementById('newListItem');
        input.value = '';
        input.onkeydown = (e) => {
            if(e.key === 'Enter') addToList();
        };

        // Para responsáveis, adiciona evento de input para validar em tempo real
        if (currentListKey === 'responsaveis') {
            input.oninput = () => {
                const addBtn = document.querySelector('button[onclick="addToList()"]');

                if (typeof users !== 'undefined') {
                    const userNames = new Set();
                    users.forEach(user => {
                        if (user.name) userNames.add(user.name);
                    });

                    const isValidUser = userNames.has(input.value.trim());
                    addBtn.disabled = !isValidUser && input.value.trim() !== '';
                    addBtn.style.opacity = (!isValidUser && input.value.trim() !== '') ? '0.5' : '1';
                    addBtn.style.cursor = (!isValidUser && input.value.trim() !== '') ? 'not-allowed' : 'pointer';

                    if (!isValidUser && input.value.trim() !== '') {
                        addBtn.title = 'Apenas usuários cadastrados podem ser adicionados como responsáveis';
                    } else {
                        addBtn.title = '';
                    }
                }
            };
        }


        document.getElementById('modalListManager').style.display = 'flex';
    }

    function selectColor(color, el) {
        selectedColorTemp = color;
        document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    }

    function addToList() {
        const val = document.getElementById('newListItem').value.trim();
        if (!val) return;

        const isStatus = currentListKey.toLowerCase().includes('status');
        const isMarcadorList = currentListKey.toLowerCase().includes('marcadores');
        const isSubcat = currentListKey.includes('_');

        // Guarda a categoria e a subcategoria/ item atualmente selecionados no modal da aba ativa
        const prefix = getTabPrefix(currentTab);
        const currentCatSelect = document.getElementById(`${prefix}Categoria`);
        const selectedCategoryBefore = currentCatSelect ? currentCatSelect.value : null;
        let currentSubSelect = null;
        if (prefix === 'mant') {
            currentSubSelect = document.getElementById(`${prefix}Item`);
        } else {
            currentSubSelect = document.getElementById(`${prefix}Sub`);
        }
        const selectedSubBefore = currentSubSelect ? currentSubSelect.value : null;

        let list;
        if (isSubcat) {
            const [baseKey, cat] = currentListKey.split('_');
            masterLists[baseKey][cat] = masterLists[baseKey][cat] || [];
            list = masterLists[baseKey][cat];
        } else {
            list = masterLists[currentListKey];
        }

        if (isStatus || isMarcadorList) {
            if(list.some(s => s.name === val)) return;
            list.push({ name: val, color: selectedColorTemp });
        } else {
            if(list.includes(val)) return;
            list.push(val);
        }

        // Ordenação - Função robusta para comparar valores que podem ser strings ou objetos
        list.sort((a, b) => {
            const aVal = String(typeof a === 'object' ? a.name : a) || '';
            const bVal = String(typeof b === 'object' ? b.name : b) || '';
            return aVal.localeCompare(bVal);
        });

        saveAll(); populateSelects();

        // Restaura categoria e subcategoria/item após recriar os selects
        if (selectedCategoryBefore) {
            const restoredCat = document.getElementById(`${prefix}Categoria`);
            if (restoredCat) {
                restoredCat.value = selectedCategoryBefore;
                // Recarrega a lista de subcategorias/itens para a categoria correta
                onCategoryChange(prefix);

                if (selectedSubBefore) {
                    const restoredSub = prefix === 'mant'
                        ? document.getElementById(`${prefix}Item`)
                        : document.getElementById(`${prefix}Sub`);
                    if (restoredSub) restoredSub.value = selectedSubBefore;
                }
            }
        }

        // Reabre o mesmo tipo de lista que estava sendo editada
        if (isSubcat) {
            openListManager('subcategorias');
        } else if (isStatus) {
            openListManager('status');
        } else if (isMarcadorList) {
            openListManager('marcadores');
        } else if (currentListKey === 'setores') {
            openListManager('setores');
        } else if (currentListKey === 'mantTipos') {
            openListManager('tipos');
        } else {
            openListManager('categorias');
        }
    }

    function editListItem(key, val) {
        const isStatus = key.toLowerCase().includes('status');
        const isMarcadorList = key.toLowerCase().includes('marcadores');
        const isObjectList = isStatus || isMarcadorList;
        const isSubcat = key.includes('_');

        const newName = prompt(`Editar nome de "${val}":`, val);
        if (!newName || newName.trim() === '' || newName.trim() === val) return;

        const trimmedNewName = newName.trim();

        // Atualiza na lista mestra
        let list;
        if (isSubcat) {
            const [baseKey, cat] = key.split('_');
            masterLists[baseKey] = masterLists[baseKey] || {};
            masterLists[baseKey][cat] = masterLists[baseKey][cat] || [];
            list = masterLists[baseKey][cat];
        } else {
            list = masterLists[key];
        }

        // Verifica se o novo nome já existe
        if (isObjectList) {
            if (list.some(item => item.name === trimmedNewName)) {
                alert('Já existe um item com este nome.');
                return;
            }
            const itemIndex = list.findIndex(item => item.name === val);
            if (itemIndex !== -1) {
                list[itemIndex].name = trimmedNewName;
            }
        } else {
            if (list.includes(trimmedNewName)) {
                alert('Já existe um item com este nome.');
                return;
            }
            const itemIndex = list.indexOf(val);
            if (itemIndex !== -1) {
                list[itemIndex] = trimmedNewName;
            }
        }

        // Atualiza todos os cards que usam este item
        const updateCards = (cards, fieldName) => {
            cards.forEach(card => {
                if (card[fieldName] === val) {
                    card[fieldName] = trimmedNewName;
                }
            });
        };

        // Identifica qual campo atualizar baseado na chave da lista
        if (key === 'setores') {
            updateCards(audits, 'setor');
            updateCards(trainings, 'setor');
            updateCards(activities, 'setor');
            updateCards(maintenances, 'setor');
            updateCards(documents, 'setor');
        } else if (key === 'auditCategorias') {
            updateCards(audits, 'categoria');
        } else if (key === 'ativCategorias') {
            updateCards(activities, 'categoria');
        } else if (key === 'mantCategorias') {
            updateCards(maintenances, 'categoria');
        } else if (key === 'docCategorias') {
            updateCards(documents, 'categoria');
        } else if (key.startsWith('auditSubcats_')) {
            updateCards(audits, 'subcategoria');
        } else if (key.startsWith('ativSubcats_')) {
            updateCards(activities, 'subcategoria');
        } else if (key.startsWith('docSubcats_')) {
            updateCards(documents, 'subcategoria');
        } else if (key.startsWith('mantItens_')) {
            updateCards(maintenances, 'item');
        } else if (key === 'mantTipos') {
            updateCards(maintenances, 'tipo');
        } else if (isStatus) {
            // Identifica qual tipo de status baseado na chave exata
            if (key === 'auditStatus') {
                audits.forEach(card => {
                    if (card.status === val) card.status = trimmedNewName;
                });
            } else if (key === 'ativStatus') {
                activities.forEach(card => {
                    if (card.status === val) card.status = trimmedNewName;
                });
            } else if (key === 'mantStatus') {
                maintenances.forEach(card => {
                    if (card.status === val) card.status = trimmedNewName;
                });
            } else if (key === 'docStatus') {
                documents.forEach(card => {
                    if (card.status === val) card.status = trimmedNewName;
                });
            }
        } else if (isMarcadorList) {
            // Identifica qual tipo de marcador baseado na chave exata
            if (key === 'auditMarcadores') {
                audits.forEach(card => {
                    if (card.marcador === val) card.marcador = trimmedNewName;
                });
            } else if (key === 'ativMarcadores') {
                activities.forEach(card => {
                    if (card.marcador === val) card.marcador = trimmedNewName;
                });
            } else if (key === 'mantMarcadores') {
                maintenances.forEach(card => {
                    if (card.marcador === val) card.marcador = trimmedNewName;
                });
            } else if (key === 'docMarcadores') {
                documents.forEach(card => {
                    if (card.marcador === val) card.marcador = trimmedNewName;
                });
            }
        }

        // Ordena a lista - Função robusta para comparar valores que podem ser strings ou objetos
        list.sort((a, b) => {
            const aVal = String(typeof a === 'object' ? a.name : a) || '';
            const bVal = String(typeof b === 'object' ? b.name : b) || '';
            return aVal.localeCompare(bVal);
        });

        // Guarda seleções antes de recarregar
        const prefix = getTabPrefix(currentTab);
        const currentCatSelect = document.getElementById(`${prefix}Categoria`);
        const selectedCategoryBefore = currentCatSelect ? currentCatSelect.value : null;
        let currentSubSelect = null;
        if (prefix === 'mant') {
            currentSubSelect = document.getElementById(`${prefix}Item`);
        } else {
            currentSubSelect = document.getElementById(`${prefix}Sub`);
        }
        const selectedSubBefore = currentSubSelect ? currentSubSelect.value : null;

        saveAll(); populateSelects();

        // Atualiza os cards se estiver em uma aba de cards
        if (currentTab !== 'dashboard' && currentTab !== 'backup' && currentTab !== 'configuracoes') {
            renderCards();
        } else if (currentTab === 'dashboard') {
            renderDashboard();
        }

        // Restaura seleções após recarregar
        if (selectedCategoryBefore) {
            const restoredCat = document.getElementById(`${prefix}Categoria`);
            if (restoredCat) {
                restoredCat.value = selectedCategoryBefore;
                onCategoryChange(prefix);
                if (selectedSubBefore) {
                    const restoredSub = prefix === 'mant'
                        ? document.getElementById(`${prefix}Item`)
                        : document.getElementById(`${prefix}Sub`);
                    if (restoredSub) restoredSub.value = selectedSubBefore;
                }
            }
        }

        // Reabre o mesmo tipo de lista
        if (isSubcat) {
            openListManager('subcategorias');
        } else if (isStatus) {
            openListManager('status');
        } else if (isMarcadorList) {
            openListManager('marcadores');
        } else if (key === 'setores') {
            openListManager('setores');
        } else if (key === 'mantTipos') {
            openListManager('tipos');
        } else {
            openListManager('categorias');
        }
    }

    function removeFromList(key, val) {
        const isStatus = key.toLowerCase().includes('status');
        const isMarcadorList = key.toLowerCase().includes('marcadores');
        const isObjectList = isStatus || isMarcadorList;
        const isSubcat = key.includes('_');

        // Bloqueia exclusão de categorias que possuem subcategorias/itens vinculados
        if (!isObjectList && !isSubcat) {
            const categoryToSubcatMap = {
                auditCategorias: 'auditSubcats',
                ativCategorias: 'ativSubcats',
                docCategorias: 'docSubcats',
                mantCategorias: 'mantItens'
            };
            const subcatKey = categoryToSubcatMap[key];
            if (subcatKey) {
                const map = masterLists[subcatKey] || {};
                const children = map[val] || [];
                if (Array.isArray(children) && children.length > 0) {
                    alert('Não é possível excluir esta categoria pois existem subcategorias/itens vinculados. Exclua primeiro as subcategorias/itens.');
                    return;
                }
            }
        }

        // Guarda a categoria e a subcategoria/ item atualmente selecionados no modal da aba ativa
        const prefix = getTabPrefix(currentTab);
        const currentCatSelect = document.getElementById(`${prefix}Categoria`);
        const selectedCategoryBefore = currentCatSelect ? currentCatSelect.value : null;
        let currentSubSelect = null;
        if (prefix === 'mant') {
            currentSubSelect = document.getElementById(`${prefix}Item`);
        } else {
            currentSubSelect = document.getElementById(`${prefix}Sub`);
        }
        const selectedSubBefore = currentSubSelect ? currentSubSelect.value : null;

        let list;
        if (isSubcat) {
            const [baseKey, cat] = key.split('_');
            list = masterLists[baseKey][cat];
            if (isObjectList) {
                // SOFT DELETE para objetos de status/marcadores: marcar como deletado
                const itemToDelete = list.find(s => s.name === val);
                if (itemToDelete) {
                    itemToDelete.deleted = true;
                    itemToDelete.deletedAt = new Date().toISOString();
                    itemToDelete.deletedBy = currentuser.email || currentuser.name || 'unknown';
                }
            } else {
                // Para strings simples, fazer soft delete também
                const index = list.indexOf(val);
                if (index > -1) {
                    // Converter para objeto e marcar como deletado
                    list[index] = { value: val, deleted: true, deletedAt: new Date().toISOString() };
                }
            }
            masterLists[baseKey][cat] = list;
        } else {
            list = masterLists[key];
            if (isObjectList) {
                // SOFT DELETE para objetos de status/marcadores
                const itemToDelete = list.find(s => s.name === val);
                if (itemToDelete) {
                    itemToDelete.deleted = true;
                    itemToDelete.deletedAt = new Date().toISOString();
                    itemToDelete.deletedBy = currentuser.email || currentuser.name || 'unknown';
                }
            } else {
                // Para strings simples
                const index = list.indexOf(val);
                if (index > -1) {
                    // Converter para objeto e marcar como deletado
                    list[index] = { value: val, deleted: true, deletedAt: new Date().toISOString() };
                }
            }
        }

        saveAll(); populateSelects();

        // Restaura categoria e subcategoria/item após recriar os selects
        if (selectedCategoryBefore) {
            const restoredCat = document.getElementById(`${prefix}Categoria`);
            if (restoredCat) {
                restoredCat.value = selectedCategoryBefore;
                // Recarrega a lista de subcategorias/itens para a categoria correta
                onCategoryChange(prefix);

                if (selectedSubBefore) {
                    const restoredSub = prefix === 'mant'
                        ? document.getElementById(`${prefix}Item`)
                        : document.getElementById(`${prefix}Sub`);
                    if (restoredSub) restoredSub.value = selectedSubBefore;
                }
            }
        }

        // Reabre o mesmo tipo de lista que estava sendo editada
        if (isSubcat) {
            openListManager('subcategorias');
        } else if (isStatus) {
            openListManager('status');
        } else if (isMarcadorList) {
            openListManager('marcadores');
        } else if (key === 'setores') {
            openListManager('setores');
        } else if (key === 'mantTipos') {
            openListManager('tipos');
        } else {
            openListManager('categorias');
        }
    }
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }
