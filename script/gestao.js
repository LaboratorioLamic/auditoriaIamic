    function saveAtividade() {
        originalItem = null;

        const isNew = !editingAtivId;
        let item = isNew ? { id: Date.now(), historico: [], type: 'ativ' } : activities.find(a => a.id === editingAtivId);

        const selectedAtivMarkerName = document.getElementById('ativMarcador').value;
        const ativMarkerObj = (masterLists.ativMarcadores || []).find(m => m.name === selectedAtivMarkerName);

        let responsavel = (typeof msGetValue === 'function') ? msGetValue('ativ-resp') : [];
        let revisor     = (typeof msGetValue === 'function') ? msGetValue('ativ-rev')  : [];
        if (!Array.isArray(responsavel)) responsavel = responsavel ? [responsavel] : [];
        if (!Array.isArray(revisor))     revisor     = revisor     ? [revisor]     : [];

        if (typeof _checkPartialPermOnSave === 'function' && !_checkPartialPermOnSave(isNew, responsavel, revisor)) return;

        if (!isNew && !userIsAdmin()) {
            if (!responsavel.length) {
                const prev = item.responsavel;
                try { responsavel = Array.isArray(prev) ? prev : (prev ? JSON.parse(prev) : []); } catch { responsavel = prev ? [prev] : []; }
            }
            if (!revisor.length) {
                const prev = item.revisor;
                try { revisor = Array.isArray(prev) ? prev : (prev ? JSON.parse(prev) : []); } catch { revisor = prev ? [prev] : []; }
            }
        }

        responsavel = JSON.stringify(responsavel);
        revisor     = JSON.stringify(revisor);

        if (typeof _validateRequiredFields === 'function') {
            if (!_validateRequiredFields([
                { id: 'ativTitulo',    label: 'Título' },
                { id: 'ativSetor',     label: 'Setor' },
                { id: 'ativCategoria', label: 'Categoria' },
            ])) return;
        }

        const _respArrAtiv = JSON.parse(responsavel || '[]');
        if (!_respArrAtiv.length) {
            if (typeof showToast === 'function') showToast('É necessário ao menos um Responsável para salvar o registro.', 'error');
            document.getElementById('ms-ativ-resp-input')?.focus();
            return;
        }

        const newItem = {
            ...item,
            titulo: document.getElementById('ativTitulo').value,
            descricao: document.getElementById('ativDescricao').value,
            setor: document.getElementById('ativSetor').value,
            categoria: document.getElementById('ativCategoria').value,
            subcategoria: '',
            status: document.getElementById('ativStatus').value,
            dataInicio: document.getElementById('ativDataInicio').value,
            dataConclusao: document.getElementById('ativDataConclusao').value,
            responsavel: responsavel,
            revisor: revisor,
            flagDias: +document.getElementById('ativFlagDias').value,
            marcador: ativMarkerObj ? ativMarkerObj.name : '',
            marcadorCor: ativMarkerObj ? ativMarkerObj.color : 'default',
            anexos: getAnexos('ativ'),
            checklist: (typeof getChecklist === 'function') ? getChecklist('ativ') : (item.checklist || []),
            checklistPublicacao: (typeof getChecklistPub === 'function') ? getChecklistPub('ativ') : (item.checklistPublicacao || []),
            historico: item && Array.isArray(item.historico) ? [...item.historico] : []
        };

        if (isNew) {
            newItem.historico.push({ timestamp: new Date().toISOString(), acao: 'Criação do Registro', usuario: currentuser ? (currentuser.name || currentuser.user) : 'Sistema', snapshot: _safeSnapshot(newItem) });
            activities.push(newItem);
        } else {
            if (!originalItem) {
                originalItem = JSON.parse(JSON.stringify(item));
            }
            if (!newItem.historico || !Array.isArray(newItem.historico)) {
                newItem.historico = originalItem.historico ? [...originalItem.historico] : [];
            }

            if (/conclu/i.test(newItem.status) && !canSetConcluido(newItem.checklist)) {
                if (typeof showToast === 'function') showToast('Conclua todos os itens do checklist antes de marcar como Concluído.', 'error');
                return;
            }

            const changes = calculateChanges(originalItem, newItem);
            if (changes.length > 0) {
                newItem.historico.push({
                    timestamp: new Date().toISOString(),
                    acao: 'Edição de Dados',
                    usuario: currentuser ? (currentuser.name || currentuser.user) : 'Sistema',
                    detalhes: changes,
                    snapshot: _safeSnapshot(originalItem)
                });
            } else if (!changes.silentChanged) {
                activities = activities.map(a => a.id === editingAtivId ? item : a);
                closeFormDrawer();
                return;
            }
            activities = activities.map(a => a.id === editingAtivId ? newItem : a);
        }

        saveAll(); closeFormDrawer(); renderCards();
        if (typeof isCalendarActive === 'function' && isCalendarActive()) renderCalendar();
    }

    function duplicateAtividade() {
        if (!userCanEditCards()) {
            alert('Você não tem permissão para duplicar cards. Seu acesso está configurado como somente leitura.');
            return;
        }

        const formData = {
            titulo: document.getElementById('ativTitulo').value,
            descricao: document.getElementById('ativDescricao').value,
            setor: document.getElementById('ativSetor').value,
            categoria: document.getElementById('ativCategoria').value,
            subcategoria: '',
            status: document.getElementById('ativStatus').value,
            dataInicio: document.getElementById('ativDataInicio').value,
            dataConclusao: document.getElementById('ativDataConclusao').value,
            responsavel: (typeof msGetValue === 'function') ? JSON.stringify(msGetValue('ativ-resp')) : document.getElementById('ativResponsavel').value,
            revisor:     (typeof msGetValue === 'function') ? JSON.stringify(msGetValue('ativ-rev'))  : document.getElementById('ativRevisor').value,
            flagDias: document.getElementById('ativFlagDias').value,
            marcador: document.getElementById('ativMarcador').value,
            anexos: typeof getAnexos === 'function' ? getAnexos('ativ') : []
        };

        closeFormDrawer();

        setTimeout(() => {
            editingAtivId = null;
            resetModal('ativ');

            document.getElementById('ativTitulo').value = formData.titulo;
            document.getElementById('ativDescricao').value = formData.descricao;
            document.getElementById('ativSetor').value = formData.setor;
            document.getElementById('ativCategoria').value = formData.categoria;
            document.getElementById('ativStatus').value = formData.status;
            document.getElementById('ativDataInicio').value = formData.dataInicio;
            document.getElementById('ativDataConclusao').value = formData.dataConclusao;
            if (typeof msSetValue === 'function') { msSetValue('ativ-resp', formData.responsavel || ''); msSetValue('ativ-rev', formData.revisor || ''); }
            document.getElementById('ativFlagDias').value = formData.flagDias;
            document.getElementById('ativMarcador').value = formData.marcador;

            if (typeof restoreAnexos === 'function') restoreAnexos('ativ', formData.anexos);

            onCategoryChange('ativ');
            openFormDrawer('modalAtividades');
        }, 200);
    }
