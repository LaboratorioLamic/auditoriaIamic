    function saveAtividade() {
        originalItem = null;

        const isNew = !editingAtivId;
        let item = isNew ? { id: Date.now(), historico: [], type: 'ativ' } : activities.find(a => a.id === editingAtivId);

        const selectedAtivMarkerName = document.getElementById('ativMarcador').value;
        const ativMarkerObj = (masterLists.ativMarcadores || []).find(m => m.name === selectedAtivMarkerName);

        let responsavel = document.getElementById('ativResponsavel').value || '';
        let revisor = document.getElementById('ativRevisor').value || '';

        if (!isNew && !userIsAdmin()) {
            if (!responsavel) responsavel = item.responsavel || '';
            if (!revisor) revisor = item.revisor || '';
        }

        const newItem = {
            ...item,
            titulo: document.getElementById('ativTitulo').value,
            descricao: document.getElementById('ativDescricao').value,
            setor: document.getElementById('ativSetor').value,
            categoria: document.getElementById('ativCategoria').value,
            subcategoria: document.getElementById('ativSub').value,
            status: document.getElementById('ativStatus').value,
            dataInicio: document.getElementById('ativDataInicio').value,
            dataConclusao: document.getElementById('ativDataConclusao').value,
            responsavel: responsavel,
            revisor: revisor,
            flagDias: +document.getElementById('ativFlagDias').value,
            marcador: ativMarkerObj ? ativMarkerObj.name : '',
            marcadorCor: ativMarkerObj ? ativMarkerObj.color : 'default',
            anexos: getAnexos('ativ'),
            historico: item && Array.isArray(item.historico) ? [...item.historico] : []
        };

        if (isNew) {
            const snap = JSON.parse(JSON.stringify(newItem));
            snap.historico = [];
            newItem.historico.push({ timestamp: new Date().toISOString(), acao: 'Criação do Registro', usuario: currentuser ? (currentuser.name || currentuser.user) : 'Sistema', snapshot: snap });
            activities.push(newItem);
        } else {
            if (!originalItem) {
                originalItem = JSON.parse(JSON.stringify(item));
            }
            if (!newItem.historico || !Array.isArray(newItem.historico)) {
                newItem.historico = originalItem.historico ? [...originalItem.historico] : [];
            }

            const changes = calculateChanges(originalItem, newItem);
            if (changes.length > 0) {
                newItem.historico.push({
                    timestamp: new Date().toISOString(),
                    acao: 'Edição de Dados',
                    usuario: currentuser ? (currentuser.name || currentuser.user) : 'Sistema',
                    detalhes: changes,
                    snapshot: JSON.parse(JSON.stringify(originalItem))
                });
            } else if (!changes.silentChanged) {
                activities = activities.map(a => a.id === editingAtivId ? item : a);
                closeModal('modalAtividades');
                return;
            }
            activities = activities.map(a => a.id === editingAtivId ? newItem : a);
        }

        saveAll(); closeModal('modalAtividades'); renderCards();
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
            subcategoria: document.getElementById('ativSub').value,
            status: document.getElementById('ativStatus').value,
            dataInicio: document.getElementById('ativDataInicio').value,
            dataConclusao: document.getElementById('ativDataConclusao').value,
            responsavel: document.getElementById('ativResponsavel').value,
            revisor: document.getElementById('ativRevisor').value,
            flagDias: document.getElementById('ativFlagDias').value,
            marcador: document.getElementById('ativMarcador').value,
            anexos: []
        };

        const anexosContainer = document.getElementById('ativAnexos');
        const anexoInputs = anexosContainer.querySelectorAll('input[type="text"]');
        anexoInputs.forEach(input => {
            if (input.value.trim()) {
                formData.anexos.push(input.value.trim());
            }
        });

        const modal = document.getElementById('modalAtividades');
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';

        setTimeout(() => {
            closeModal('modalAtividades');

            editingAtivId = null;
            resetModal('ativ');

            document.getElementById('ativTitulo').value = formData.titulo;
            document.getElementById('ativDescricao').value = formData.descricao;
            document.getElementById('ativSetor').value = formData.setor;
            document.getElementById('ativCategoria').value = formData.categoria;
            document.getElementById('ativSub').value = formData.subcategoria;
            document.getElementById('ativStatus').value = formData.status;
            document.getElementById('ativDataInicio').value = formData.dataInicio;
            document.getElementById('ativDataConclusao').value = formData.dataConclusao;
            document.getElementById('ativResponsavel').value = formData.responsavel;
            document.getElementById('ativRevisor').value = formData.revisor;
            document.getElementById('ativFlagDias').value = formData.flagDias;
            document.getElementById('ativMarcador').value = formData.marcador;

            formData.anexos.forEach(anexo => {
                addAnexo('ativ', anexo);
            });

            onCategoryChange('ativ');

            modal.style.display = 'flex';
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';

            setTimeout(() => {
                modal.style.transition = 'all 0.3s ease';
                modal.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            }, 50);
        }, 200);
    }
