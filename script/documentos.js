    function saveDocumento() {
        originalItem = null;

        const dataCriacao = document.getElementById('docDataCriacao').value;
        const docIntervaloStr = (document.getElementById('docIntervalo').value || '').trim();
        const docIntervaloNum = docIntervaloStr === '' ? null : parseInt(docIntervaloStr);
        const hasPeriodicidade = Number.isFinite(docIntervaloNum) && docIntervaloNum > 0;
        const dataProximaRevisao = (hasPeriodicidade && dataCriacao)
            ? (() => {
                const nextRevisao = new Date(dataCriacao);
                nextRevisao.setDate(nextRevisao.getDate() + docIntervaloNum);
                return nextRevisao.toISOString().split('T')[0];
            })()
            : '';
        const docIntervalo = hasPeriodicidade ? docIntervaloNum : '';

        const isNew = !editingDocId;
        let item = isNew ? { id: Date.now(), historico: [], type: 'doc' } : documents.find(d => d.id === editingDocId);

        const selectedDocMarkerName = document.getElementById('docMarcador').value;
        const docMarkerObj = (masterLists.docMarcadores || []).find(m => m.name === selectedDocMarkerName);

        let responsavel = document.getElementById('docResponsavel').value || '';
        let revisor = document.getElementById('docRevisor').value || '';

        if (!isNew && !userIsAdmin()) {
            if (!responsavel) responsavel = item.responsavel || '';
            if (!revisor) revisor = item.revisor || '';
        }

        const newItem = {
            ...item,
            titulo: document.getElementById('docTitulo').value,
            descricao: document.getElementById('docDescricao').value,
            setor: document.getElementById('docSetor').value,
            categoria: document.getElementById('docCategoria').value,
            subcategoria: '',
            status: document.getElementById('docStatus').value,
            dataCriacao,
            docIntervalo,
            dataProximaRevisao,
            responsavel: responsavel,
            revisor: revisor,
            flagDias: +document.getElementById('docFlagDias').value,
            marcador: docMarkerObj ? docMarkerObj.name : '',
            marcadorCor: docMarkerObj ? docMarkerObj.color : 'default',
            anexos: getAnexos('doc'),
            checklist: (typeof getChecklist === 'function') ? getChecklist('doc') : (item.checklist || []),
            historico: item && Array.isArray(item.historico) ? [...item.historico] : []
        };

        if (isNew) {
            const snap = JSON.parse(JSON.stringify(newItem));
            snap.historico = [];
            newItem.historico.push({ timestamp: new Date().toISOString(), acao: 'Criação do Registro', usuario: currentuser ? (currentuser.name || currentuser.user) : 'Sistema', snapshot: snap });
            documents.push(newItem);
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
                documents = documents.map(d => d.id === editingDocId ? item : d);
                closeFormDrawer();
                return;
            }
            documents = documents.map(d => d.id === editingDocId ? newItem : d);
        }

        saveAll(); closeFormDrawer(); renderCards();
    }

    function duplicateDocumento() {
        if (!userCanEditCards()) {
            alert('Você não tem permissão para duplicar cards. Seu acesso está configurado como somente leitura.');
            return;
        }

        const formData = {
            title: document.getElementById('docTitulo').value,
            categoria: document.getElementById('docCategoria').value,
            setor: document.getElementById('docSetor').value,
            status: document.getElementById('docStatus').value,
            dataCriacao: document.getElementById('docDataCriacao').value,
            intervalo: document.getElementById('docIntervalo').value,
            responsavel: document.getElementById('docResponsavel').value,
            revisor: document.getElementById('docRevisor').value,
            flagDias: document.getElementById('docFlagDias').value,
            marcador: document.getElementById('docMarcador').value,
            descricao: document.getElementById('docDescricao').value,
            anexos: typeof getAnexos === 'function' ? getAnexos('doc') : []
        };

        closeFormDrawer();

        setTimeout(() => {
            editingDocId = null;
            resetModal('doc');

            document.getElementById('docTitulo').value = formData.title;
            document.getElementById('docCategoria').value = formData.categoria;
            document.getElementById('docSetor').value = formData.setor;
            document.getElementById('docStatus').value = formData.status;
            document.getElementById('docDataCriacao').value = formData.dataCriacao;
            document.getElementById('docIntervalo').value = formData.intervalo;
            document.getElementById('docResponsavel').value = formData.responsavel;
            document.getElementById('docRevisor').value = formData.revisor;
            document.getElementById('docFlagDias').value = formData.flagDias;
            document.getElementById('docMarcador').value = formData.marcador;
            document.getElementById('docDescricao').value = formData.descricao;

            if (typeof restoreAnexos === 'function') restoreAnexos('doc', formData.anexos);

            onCategoryChange('doc');
            openFormDrawer('modalDocumentos');
        }, 200);
    }
