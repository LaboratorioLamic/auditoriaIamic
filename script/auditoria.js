    function saveAudit() {
    try {
        originalItem = null;

        const isNew = !editingAuditId;
        let item = isNew ? {
            id: (typeof generateId === 'function' ? generateId() : Date.now() + Math.floor(Math.random() * 1000)),
            historico: [],
            type: 'audit'
        } : audits.find(a => a.id === editingAuditId);

        if (!item) {
            console.error('Item de auditoria não encontrado');
            return;
        }

        const selectedAuditMarkerName = document.getElementById('auditMarcador').value;
        const auditMarkerObj = (masterLists.auditMarcadores || []).find(m => m.name === selectedAuditMarkerName);

        let responsavel = (typeof msGetValue === 'function') ? msGetValue('audit-resp') : [];
        let revisor     = (typeof msGetValue === 'function') ? msGetValue('audit-rev')  : [];
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

        // Salva como JSON string para manter compatibilidade com o código existente de leitura
        responsavel = JSON.stringify(responsavel);
        revisor     = JSON.stringify(revisor);

        const rotinaVal = document.getElementById('auditRotina').value;
        const freqVal = Number(document.getElementById('auditFrequencia').value) || 1;
        const selectedDays = Array.from(document.querySelectorAll('#auditWeekdays .wd-btn.active')).map(b => Number(b.dataset.day));
        const dataPrevisaoVal = document.getElementById('auditDataPrevisao').value;

        if (typeof _validateRequiredFields === 'function') {
            if (!_validateRequiredFields([
                { id: 'auditTitulo',    label: 'Título' },
                { id: 'auditSetor',     label: 'Setor' },
                { id: 'auditCategoria', label: 'Categoria' },
            ])) return;
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
            dataPrevisao: dataPrevisaoVal,
            responsavel: responsavel,
            revisor: revisor,
            rotina: rotinaVal,
            frequencia: freqVal,
            diasSemana: rotinaVal === 'diasemana' ? selectedDays : [],
            flagDias: document.getElementById('auditFlagDias').value === '' ? 0 : Number(document.getElementById('auditFlagDias').value),
            marcador: auditMarkerObj ? auditMarkerObj.name : '',
            marcadorCor: auditMarkerObj ? auditMarkerObj.color : 'default',
            overdueStatus: document.getElementById('auditOverdueStatus').value || '',
            alertStatus: document.getElementById('auditAlertStatus')?.value || '',
            anexos: getAnexos('audit'),
            checklist: (typeof getChecklist === 'function') ? getChecklist('audit') : (item.checklist || []),
            checklistPublicacao: (typeof getChecklistPub === 'function') ? getChecklistPub('audit') : (item.checklistPublicacao || [])
        };

        const _respArr = JSON.parse(responsavel || '[]');
        if (!_respArr.length) {
            if (typeof showToast === 'function') showToast('É necessário ao menos um Responsável para salvar o registro.', 'error');
            document.getElementById('ms-audit-resp-input')?.focus();
            return;
        }

        if ((typeof _kbStatusIsConcluido === 'function' ? _kbStatusIsConcluido(newItem.status) : /conclu/i.test(newItem.status)) && !canSetConcluido(newItem.checklist)) {
            if (typeof showToast === 'function') showToast('Conclua todos os itens do checklist antes de marcar como Concluído.', 'error');
            return;
        }
        if ((typeof _kbStatusIsConcluido === 'function' ? _kbStatusIsConcluido(newItem.status) : /conclu/i.test(newItem.status)) && typeof checkSchedWarnBeforeConcluido === 'function' && !window._schedWarnPassed_audit) {
            checkSchedWarnBeforeConcluido(newItem, 'auditoria').then(ok => {
                if (!ok) return;
                window._schedWarnPassed_audit = true;
                saveAudit();
                window._schedWarnPassed_audit = false;
            });
            return;
        }
        window._schedWarnPassed_audit = false;

        const _isConcluindoAudit = !isNew
            && (typeof _kbStatusIsConcluido === 'function' ? _kbStatusIsConcluido(newItem.status) : /conclu/i.test(newItem.status))
            && !(typeof _kbStatusIsConcluido === 'function' ? _kbStatusIsConcluido(originalItem ? originalItem.status : '') : /conclu/i.test(originalItem ? originalItem.status : ''));

        const _commitAudit = function(newItemFinal) {
            const _changes = calculateChanges(originalItem || {}, newItemFinal);
            if (isNew) {
                newItemFinal.createdAt = new Date().toISOString();
                newItemFinal.historico.push({
                    timestamp: new Date().toISOString(),
                    acao: 'Criação do Registro',
                    usuario: currentuser?.name || 'Sistema',
                    snapshot: _safeSnapshot(newItemFinal)
                });
                audits.push(newItemFinal);
            } else {
                if (_changes.length > 0) {
                    newItemFinal.historico.push({
                        timestamp: new Date().toISOString(),
                        acao: 'Edição de Dados',
                        usuario: currentuser?.name || 'Sistema',
                        detalhes: _changes,
                        snapshot: originalItem ? _safeSnapshot(originalItem) : {}
                    });
                }
                audits = audits.map(a => a.id === editingAuditId ? newItemFinal : a);
            }
            saveAll();
            closeFormDrawer();
            renderCards();
            if (typeof isCalendarActive === 'function' && isCalendarActive()) renderCalendar();
        };

        if (_isConcluindoAudit && typeof window.showConclusaoDateModal === 'function') {
            window.showConclusaoDateModal(
                newItem.dataPublicacao || '',
                function(dateStr) {
                    newItem.dataPublicacao = dateStr;
                    _commitAudit(newItem);
                },
                null
            );
            return;
        }

        _commitAudit(newItem);
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
            responsavel: (typeof msGetValue === 'function') ? JSON.stringify(msGetValue('audit-resp')) : document.getElementById('auditResponsavel').value,
            revisor:     (typeof msGetValue === 'function') ? JSON.stringify(msGetValue('audit-rev'))  : document.getElementById('auditRevisor').value,
            rotina: document.getElementById('auditRotina').value,
            frequencia: document.getElementById('auditFrequencia').value,
            diasSemana: Array.from(document.querySelectorAll('#auditWeekdays .wd-btn.active')).map(b => Number(b.dataset.day)),
            flagDias: document.getElementById('auditFlagDias').value,
            marcador: document.getElementById('auditMarcador').value,
            marcadorCor: (() => { const n = document.getElementById('auditMarcador').value; const mk = (masterLists.auditMarcadores || []).find(m => m.name === n); return mk ? mk.color : 'default'; })(),
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
            if (typeof msSetValue === 'function') { msSetValue('audit-resp', formData.responsavel || ''); msSetValue('audit-rev', formData.revisor || ''); }
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

// Recalcular quando data de publicação mudar (change + input para capturar navegação no calendário)
(function() {
    const dpPub = document.getElementById('auditDataPublicacao');
    const handler = () => {
        if (document.getElementById('auditRotina').value !== 'pontual') calcAuditDataPrevisao();
    };
    if (dpPub) {
        dpPub.addEventListener('change', handler);
        dpPub.addEventListener('input', handler);
    }
})();
