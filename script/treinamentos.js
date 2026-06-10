    function calculateTrainingPrevisao() {
        const dataPublicacao = document.getElementById('trainDataPublicacao').value;
        const periodicidade = parseInt(document.getElementById('trainPeriodicidade').value) || 0;
        const fieldPrevisaoDiv = document.getElementById('trainDataPrevisao');
        const fieldPrevisaoValue = document.getElementById('trainDataPrevisaoValue');

        if (!dataPublicacao || periodicidade === 0) {
            fieldPrevisaoDiv.textContent = '--/--/----';
            fieldPrevisaoValue.value = '';
            return;
        }

        const pubDate = new Date(dataPublicacao);
        pubDate.setDate(pubDate.getDate() + periodicidade);

        const year = pubDate.getFullYear();
        const month = String(pubDate.getMonth() + 1).padStart(2, '0');
        const day = String(pubDate.getDate()).padStart(2, '0');
        const dataFormatada = `${year}-${month}-${day}`;

        const dayDisplay = String(pubDate.getDate()).padStart(2, '0');
        const monthDisplay = String(pubDate.getMonth() + 1).padStart(2, '0');
        const yearDisplay = pubDate.getFullYear();

        fieldPrevisaoDiv.textContent = `${dayDisplay}/${monthDisplay}/${yearDisplay}`;
        fieldPrevisaoValue.value = dataFormatada;
    }

    function saveTraining() {
    try {
        originalItem = null;

        const isNew = !editingTrainId;
        let item = isNew ? {
            id: Date.now() + Math.floor(Math.random() * 1000),
            historico: [],
            type: 'train'
        } : trainings.find(t => t.id === editingTrainId);

        if (!item) {
            console.error('Item de treinamento não encontrado');
            return;
        }

        const selectedTrainMarkerName = document.getElementById('trainMarcador').value;
        const trainMarkerObj = (masterLists.trainMarcadores || []).find(m => m.name === selectedTrainMarkerName);

        let responsavel = document.getElementById('trainResponsavel').value || '';

        if (!isNew && !userIsAdmin()) {
            if (!responsavel) responsavel = item.responsavel || '';
        }

        const newItem = {
            ...item,
            titulo: document.getElementById('trainTitulo').value,
            descricao: document.getElementById('trainDescricao').value,
            setor: document.getElementById('trainSetor').value,
            categoria: document.getElementById('trainCategoria').value,
            subcategoria: '',
            status: document.getElementById('trainStatus').value,
            dataPublicacao: document.getElementById('trainDataPublicacao').value,
            periodicidade: parseInt(document.getElementById('trainPeriodicidade').value) || 0,
            dataPrevisao: document.getElementById('trainDataPrevisaoValue').value,
            responsavel: responsavel,
            flagDias: Number(document.getElementById('trainFlagDias').value) ?? 7,
            marcador: trainMarkerObj ? trainMarkerObj.name : '',
            marcadorCor: trainMarkerObj ? trainMarkerObj.color : 'default',
            anexos: getAnexos('train'),
            checklist: (typeof getChecklist === 'function') ? getChecklist('train') : (item.checklist || [])
        };

        if (!isNew && originalItem) {
        }

        if (isNew) {
            const snap = JSON.parse(JSON.stringify(newItem));
            snap.historico = [];
            newItem.historico.push({
                timestamp: new Date().toISOString(),
                acao: 'Criação do Registro',
                usuario: currentuser?.name || 'Sistema',
                snapshot: snap
            });
            trainings.push(newItem);
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
            if (changes.length > 0 || changes.silentChanged) {
                if (changes.length > 0) {
                    newItem.historico.push({
                        timestamp: new Date().toISOString(),
                        acao: 'Edição de Dados',
                        usuario: currentuser?.name || 'Sistema',
                        detalhes: changes,
                        snapshot: JSON.parse(JSON.stringify(originalItem))
                    });
                }
                trainings = trainings.map(t => t.id === editingTrainId ? newItem : t);
            }
        }

        saveAll();
        closeFormDrawer();
        renderCards();
    } catch (error) {
        console.error('Erro ao salvar treinamento:', error);
        alert('Erro ao salvar treinamento. Dados foram salvos localmente.');
    }
}

    function duplicateTraining() {
        if (!userCanEditCards()) {
            alert('Você não tem permissão para duplicar cards. Seu acesso está configurado como somente leitura.');
            return;
        }

        const formData = {
            titulo: document.getElementById('trainTitulo').value,
            descricao: document.getElementById('trainDescricao').value,
            setor: document.getElementById('trainSetor').value,
            categoria: document.getElementById('trainCategoria').value,
            subcategoria: '',
            status: document.getElementById('trainStatus').value,
            dataPublicacao: document.getElementById('trainDataPublicacao').value,
            periodicidade: parseInt(document.getElementById('trainPeriodicidade').value) || 0,
            dataPrevisao: document.getElementById('trainDataPrevisaoValue').value,
            responsavel: document.getElementById('trainResponsavel').value || '',
            flagDias: Number(document.getElementById('trainFlagDias').value) ?? 7,
            marcador: document.getElementById('trainMarcador').value,
            anexos: typeof getAnexos === 'function' ? getAnexos('train') : []
        };

        closeFormDrawer();

        setTimeout(() => {
            editingTrainId = null;
            resetModal('train');

            document.getElementById('trainTitulo').value = formData.titulo;
            document.getElementById('trainDescricao').value = formData.descricao;
            document.getElementById('trainSetor').value = formData.setor;
            document.getElementById('trainCategoria').value = formData.categoria;
            document.getElementById('trainStatus').value = formData.status;
            document.getElementById('trainDataPublicacao').value = formData.dataPublicacao;
            document.getElementById('trainPeriodicidade').value = formData.periodicidade;
            document.getElementById('trainDataPrevisaoValue').value = formData.dataPrevisao;
            document.getElementById('trainResponsavel').value = formData.responsavel;
            document.getElementById('trainFlagDias').value = formData.flagDias;
            document.getElementById('trainMarcador').value = formData.marcador;

            if (typeof restoreAnexos === 'function') restoreAnexos('train', formData.anexos);

            onCategoryChange('train');
            calculateTrainingPrevisao();
            openFormDrawer('modalTreinamentos');
        }, 200);
    }
