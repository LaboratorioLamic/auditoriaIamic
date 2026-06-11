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

        const rotinaVal = document.getElementById('auditRotina').value;
        const freqVal = Number(document.getElementById('auditFrequencia').value) || 1;
        const selectedDays = Array.from(document.querySelectorAll('#auditWeekdays .wd-btn.active')).map(b => Number(b.dataset.day));
        const dataPrevisaoVal = document.getElementById('auditDataPrevisao').value;

        const newItem = {
            ...item,
            titulo: document.getElementById('auditTitulo').value,
            descricao: document.getElementById('auditDescricao').value,
            setor: document.getElementById('auditSetor').value,
            categoria: document.getElementById('auditCategoria').value,
            subcategoria: '',
            status: document.getElementById('auditStatus').value,
            dataPublicacao: document.getElementById('auditDataPublicacao').value,
            dataPrevisao: dataPrevisaoVal,
            responsavel: responsavel,
            revisor: revisor,
            rotina: rotinaVal,
            frequencia: freqVal,
            diasSemana: rotinaVal === 'diasemana' ? selectedDays : [],
            flagDias: Number(document.getElementById('auditFlagDias').value) || 7,
            marcador: auditMarkerObj ? auditMarkerObj.name : '',
            marcadorCor: auditMarkerObj ? auditMarkerObj.color : 'default',
            anexos: getAnexos('audit'),
            checklist: (typeof getChecklist === 'function') ? getChecklist('audit') : (item.checklist || []),
            checklistPublicacao: (typeof getChecklistPub === 'function') ? getChecklistPub('audit') : (item.checklistPublicacao || [])
        };

        if (/conclu/i.test(newItem.status) && !canSetConcluido(newItem.checklist)) {
            if (typeof showToast === 'function') showToast('Conclua todos os itens do checklist antes de marcar como Concluído.', 'error');
            return;
        }

        const changes = calculateChanges(originalItem || {}, newItem);

        if (!isNew && originalItem) {
        }

        if (isNew) {
            newItem.historico.push({
                timestamp: new Date().toISOString(),
                acao: 'Criação do Registro',
                usuario: currentuser?.name || 'Sistema',
                snapshot: _safeSnapshot(newItem)
            });
            audits.push(newItem);
        } else if (changes.length > 0 || changes.silentChanged) {
            if (changes.length > 0) {
                newItem.historico.push({
                    timestamp: new Date().toISOString(),
                    acao: 'Edição de Dados',
                    usuario: currentuser?.name || 'Sistema',
                    detalhes: changes,
                    snapshot: originalItem ? _safeSnapshot(originalItem) : {}
                });
            }
            audits = audits.map(a => a.id === editingAuditId ? newItem : a);
        }

        saveAll();
        closeFormDrawer();
        renderCards();
        if (typeof isCalendarActive === 'function' && isCalendarActive()) renderCalendar();
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
            rotina: document.getElementById('auditRotina').value,
            frequencia: document.getElementById('auditFrequencia').value,
            diasSemana: Array.from(document.querySelectorAll('#auditWeekdays .wd-btn.active')).map(b => Number(b.dataset.day)),
            flagDias: document.getElementById('auditFlagDias').value,
            marcador: document.getElementById('auditMarcador').value,
            anexos: typeof getAnexos === 'function' ? getAnexos('audit') : []
        };

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
            document.getElementById('auditRotina').value = formData.rotina || 'pontual';
            document.getElementById('auditFrequencia').value = formData.frequencia || 1;
            document.querySelectorAll('#auditWeekdays .wd-btn').forEach(b => b.classList.remove('active'));
            if (formData.rotina === 'diasemana' && Array.isArray(formData.diasSemana)) {
                formData.diasSemana.forEach(d => {
                    const btn = document.querySelector(`#auditWeekdays .wd-btn[data-day="${d}"]`);
                    if (btn) btn.classList.add('active');
                });
            }
            if (typeof onAuditRotinaChange === 'function') onAuditRotinaChange(true);
            document.getElementById('auditFlagDias').value = formData.flagDias;
            document.getElementById('auditMarcador').value = formData.marcador;

            if (typeof restoreAnexos === 'function') restoreAnexos('audit', formData.anexos);

            onCategoryChange('audit');
            openFormDrawer('modalAuditoria');
        }, 200);
    }

// ─── ROTINA DE AUDITORIA ──────────────────────────────────────────────────────

window.onAuditRotinaChange = function(skipCalc) {
    const rotina = document.getElementById('auditRotina').value;
    const freqWrap = document.getElementById('auditFrequenciaWrap');
    const wdWrap = document.getElementById('auditDiaSemanaWrap');
    const dpInput = document.getElementById('auditDataPrevisao');

    const isPontual = rotina === 'pontual';
    const isDiaSemana = rotina === 'diasemana';

    freqWrap.style.display = (!isPontual && !isDiaSemana) ? '' : 'none';
    wdWrap.style.display = isDiaSemana ? '' : 'none';

    // Dia da semana: data calculada automaticamente (não editável)
    // Demais rotinas: permite edição manual mas também calcula ao mudar
    dpInput.readOnly = isDiaSemana;
    dpInput.style.background = isDiaSemana ? '#f1f5f9' : '';
    dpInput.style.cursor = isDiaSemana ? 'not-allowed' : '';

    if (!skipCalc && !isPontual) calcAuditDataPrevisao();
};

window.toggleAuditWeekday = function(btn) {
    btn.classList.toggle('active');
    calcAuditDataPrevisao();
};

window.calcAuditDataPrevisao = function() {
    const rotina = document.getElementById('auditRotina').value;
    const freq = Number(document.getElementById('auditFrequencia').value) || 1;
    const dpInput = document.getElementById('auditDataPrevisao');
    const pubDate = document.getElementById('auditDataPublicacao').value;

    const base = pubDate ? new Date(pubDate + 'T00:00:00') : new Date();

    if (rotina === 'pontual') return;

    let next = new Date(base);

    if (rotina === 'anual') {
        next.setFullYear(next.getFullYear() + freq);
    } else if (rotina === 'mensal') {
        next.setMonth(next.getMonth() + freq);
    } else if (rotina === 'semanal') {
        next.setDate(next.getDate() + freq * 7);
    } else if (rotina === 'diario') {
        next.setDate(next.getDate() + freq);
    } else if (rotina === 'diasemana') {
        const activeDays = Array.from(document.querySelectorAll('#auditWeekdays .wd-btn.active')).map(b => Number(b.dataset.day));
        if (activeDays.length === 0) { dpInput.value = ''; return; }
        // Próxima ocorrência a partir de amanhã
        const tomorrow = new Date(base);
        tomorrow.setDate(tomorrow.getDate() + 1);
        for (let i = 0; i < 14; i++) {
            const d = new Date(tomorrow);
            d.setDate(tomorrow.getDate() + i);
            if (activeDays.includes(d.getDay())) { next = d; break; }
        }
    }

    dpInput.value = next.toISOString().split('T')[0];
};

// Recalcular quando data de publicação mudar
(function() {
    const dpPub = document.getElementById('auditDataPublicacao');
    if (dpPub) dpPub.addEventListener('change', () => {
        if (document.getElementById('auditRotina').value !== 'pontual') calcAuditDataPrevisao();
    });
})();
