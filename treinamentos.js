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

        let horas = parseInt(document.getElementById('trainCargaHorariaHoras').value) || 0;
        let minutos = parseInt(document.getElementById('trainCargaHorariaMinutos').value) || 0;

        horas = Math.min(Math.max(0, horas), 23);
        minutos = Math.min(Math.max(0, minutos), 59);

        const cargaHoraria = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;

        let responsavel = document.getElementById('trainResponsavel').value || '';
        let instrutor = document.getElementById('trainInstrutor').value || '';

        if (!isNew && !userIsAdmin()) {
            if (!responsavel) responsavel = item.responsavel || '';
            if (!instrutor) instrutor = item.instrutor || '';
        }

        const newItem = {
            ...item,
            titulo: document.getElementById('trainTitulo').value,
            descricao: document.getElementById('trainDescricao').value,
            setor: document.getElementById('trainSetor').value,
            categoria: document.getElementById('trainCategoria').value,
            subcategoria: document.getElementById('trainSub').value,
            status: document.getElementById('trainStatus').value,
            dataPublicacao: document.getElementById('trainDataPublicacao').value,
            periodicidade: parseInt(document.getElementById('trainPeriodicidade').value) || 0,
            dataPrevisao: document.getElementById('trainDataPrevisaoValue').value,
            responsavel: responsavel,
            instrutor: instrutor,
            participantes: document.getElementById('trainParticipantes').value || '',
            localEvento: document.getElementById('trainLocalEvento').value || '',
            cargaHoraria: cargaHoraria,
            flagDias: Number(document.getElementById('trainFlagDias').value) ?? 7,
            marcador: trainMarkerObj ? trainMarkerObj.name : '',
            marcadorCor: trainMarkerObj ? trainMarkerObj.color : 'default',
            anexos: getAnexos('train')
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
        closeModal('modalTreinamentos');
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

        let horas = parseInt(document.getElementById('trainCargaHorariaHoras').value) || 0;
        let minutos = parseInt(document.getElementById('trainCargaHorariaMinutos').value) || 0;

        horas = Math.min(Math.max(0, horas), 23);
        minutos = Math.min(Math.max(0, minutos), 59);

        const cargaHoraria = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;

        const formData = {
            titulo: document.getElementById('trainTitulo').value,
            descricao: document.getElementById('trainDescricao').value,
            setor: document.getElementById('trainSetor').value,
            categoria: document.getElementById('trainCategoria').value,
            subcategoria: document.getElementById('trainSub').value,
            status: document.getElementById('trainStatus').value,
            dataPublicacao: document.getElementById('trainDataPublicacao').value,
            periodicidade: parseInt(document.getElementById('trainPeriodicidade').value) || 0,
            dataPrevisao: document.getElementById('trainDataPrevisaoValue').value,
            responsavel: document.getElementById('trainResponsavel').value || '',
            instrutor: document.getElementById('trainInstrutor').value || '',
            participantes: document.getElementById('trainParticipantes').value || '',
            localEvento: document.getElementById('trainLocalEvento').value || '',
            cargaHoraria: cargaHoraria,
            flagDias: Number(document.getElementById('trainFlagDias').value) ?? 7,
            marcador: document.getElementById('trainMarcador').value,
            anexos: []
        };

        const anexosContainer = document.getElementById('trainAnexos');
        const anexoInputs = anexosContainer.querySelectorAll('input[type="text"]');
        anexoInputs.forEach(input => {
            if (input.value.trim()) {
                formData.anexos.push(input.value.trim());
            }
        });

        const modal = document.getElementById('modalTreinamentos');
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';

        setTimeout(() => {
            closeModal('modalTreinamentos');

            editingTrainId = null;
            resetModal('train');

            document.getElementById('trainTitulo').value = formData.titulo;
            document.getElementById('trainDescricao').value = formData.descricao;
            document.getElementById('trainSetor').value = formData.setor;
            document.getElementById('trainCategoria').value = formData.categoria;
            document.getElementById('trainSub').value = formData.subcategoria;
            document.getElementById('trainStatus').value = formData.status;
            document.getElementById('trainDataPublicacao').value = formData.dataPublicacao;
            document.getElementById('trainPeriodicidade').value = formData.periodicidade;
            document.getElementById('trainDataPrevisaoValue').value = formData.dataPrevisao;
            document.getElementById('trainResponsavel').value = formData.responsavel;
            document.getElementById('trainInstrutor').value = formData.instrutor;
            document.getElementById('trainParticipantes').value = formData.participantes;
            document.getElementById('trainLocalEvento').value = formData.localEvento;

            const [horasStr, minutosStr] = formData.cargaHoraria.split(':');
            document.getElementById('trainCargaHorariaHoras').value = parseInt(horasStr) || 0;
            document.getElementById('trainCargaHorariaMinutos').value = parseInt(minutosStr) || 0;

            document.getElementById('trainFlagDias').value = formData.flagDias;
            document.getElementById('trainMarcador').value = formData.marcador;

            formData.anexos.forEach(anexo => {
                addAnexo('train', anexo);
            });

            onCategoryChange('train');
            calculateTrainingPrevisao();

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
