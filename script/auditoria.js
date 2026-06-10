    function saveAudit() {
    try {
        originalItem = null;

        const isNew = !editingAuditId;
        let item = isNew ? {
            id: Date.now() + Math.floor(Math.random() * 1000),
            historico: [],
            type: 'audit'
        } : audits.find(a => a.id === editingAuditId);

        if (!item) {
            console.error('Item de auditoria não encontrado');
            return;
        }

        const selectedAuditMarkerName = document.getElementById('auditMarcador').value;
        const auditMarkerObj = (masterLists.auditMarcadores || []).find(m => m.name === selectedAuditMarkerName);

        let responsavel = document.getElementById('auditResponsavel').value || '';
        let revisor = document.getElementById('auditRevisor').value || '';

        if (!isNew && !userIsAdmin()) {
            if (!responsavel) responsavel = item.responsavel || '';
            if (!revisor) revisor = item.revisor || '';
        }

        const newItem = {
            ...item,
            titulo: document.getElementById('auditTitulo').value,
            descricao: document.getElementById('auditDescricao').value,
            setor: document.getElementById('auditSetor').value,
            categoria: document.getElementById('auditCategoria').value,
            subcategoria: '',
            status: document.getElementById('auditStatus').value,
            dataPublicacao: document.getElementById('auditDataPublicacao').value,
            dataPrevisao: document.getElementById('auditDataPrevisao').value,
            responsavel: responsavel,
            revisor: revisor,
            auditor: document.getElementById('auditAuditor').value,
            flagDias: Number(document.getElementById('auditFlagDias').value) || 7,
            marcador: auditMarkerObj ? auditMarkerObj.name : '',
            marcadorCor: auditMarkerObj ? auditMarkerObj.color : 'default',
            anexos: getAnexos('audit')
        };

        const changes = calculateChanges(originalItem || {}, newItem);

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
            audits.push(newItem);
        } else if (changes.length > 0 || changes.silentChanged) {
            if (changes.length > 0) {
                newItem.historico.push({
                    timestamp: new Date().toISOString(),
                    acao: 'Edição de Dados',
                    usuario: currentuser?.name || 'Sistema',
                    detalhes: changes,
                    snapshot: JSON.parse(JSON.stringify(originalItem))
                });
            }
            audits = audits.map(a => a.id === editingAuditId ? newItem : a);
        }

        saveAll();
        closeFormDrawer();
        renderCards();
    } catch (error) {
        console.error('Erro ao salvar auditoria:', error);
        alert('Erro ao salvar auditoria. Dados foram salvos localmente.');
    }
}

    function duplicateAudit() {
        if (!userCanEditCards()) {
            alert('Você não tem permissão para duplicar cards. Seu acesso está configurado como somente leitura.');
            return;
        }

        const formData = {
            titulo: document.getElementById('auditTitulo').value,
            descricao: document.getElementById('auditDescricao').value,
            setor: document.getElementById('auditSetor').value,
            categoria: document.getElementById('auditCategoria').value,
            subcategoria: '',
            status: document.getElementById('auditStatus').value,
            dataPublicacao: document.getElementById('auditDataPublicacao').value,
            dataPrevisao: document.getElementById('auditDataPrevisao').value,
            responsavel: document.getElementById('auditResponsavel').value,
            revisor: document.getElementById('auditRevisor').value,
            auditor: document.getElementById('auditAuditor').value,
            flagDias: document.getElementById('auditFlagDias').value,
            marcador: document.getElementById('auditMarcador').value,
            anexos: []
        };

        const anexosContainer = document.getElementById('auditAnexos');
        const anexoInputs = anexosContainer.querySelectorAll('input[type="text"]');
        anexoInputs.forEach(input => {
            if (input.value.trim()) {
                formData.anexos.push(input.value.trim());
            }
        });

        closeFormDrawer();

        setTimeout(() => {
            editingAuditId = null;
            resetModal('audit');

            document.getElementById('auditTitulo').value = formData.titulo;
            document.getElementById('auditDescricao').value = formData.descricao;
            document.getElementById('auditSetor').value = formData.setor;
            document.getElementById('auditCategoria').value = formData.categoria;
            document.getElementById('auditStatus').value = formData.status;
            document.getElementById('auditDataPublicacao').value = formData.dataPublicacao;
            document.getElementById('auditDataPrevisao').value = formData.dataPrevisao;
            document.getElementById('auditResponsavel').value = formData.responsavel;
            document.getElementById('auditRevisor').value = formData.revisor;
            document.getElementById('auditAuditor').value = formData.auditor;
            document.getElementById('auditFlagDias').value = formData.flagDias;
            document.getElementById('auditMarcador').value = formData.marcador;

            formData.anexos.forEach(anexo => {
                addAnexo('audit', anexo);
            });

            onCategoryChange('audit');
            openFormDrawer('modalAuditoria');
        }, 200);
    }
