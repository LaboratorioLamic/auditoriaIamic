    function calculateTrainingPrevisao() {
        // kept for backward compatibility — rotina system handles this now
    }

    function saveTraining() {
    try {
        originalItem = null;

        const isNew = !editingTrainId;
        let item = isNew ? {
            id: (typeof generateId === 'function' ? generateId() : Date.now() + Math.floor(Math.random() * 1000)),
            historico: [],
            type: 'train'
        } : trainings.find(t => t.id === editingTrainId);

        if (!item) {
            console.error('Item de treinamento não encontrado');
            return;
        }

        const selectedTrainMarkerName = document.getElementById('trainMarcador').value;
        const trainMarkerObj = (masterLists.trainMarcadores || []).find(m => m.name === selectedTrainMarkerName);

        let responsavel = (typeof msGetValue === 'function') ? msGetValue('tren-resp') : [];
        let revisor     = (typeof msGetValue === 'function') ? msGetValue('tren-rev')  : [];
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
                { id: 'trainTitulo',    label: 'Título' },
                { id: 'trainSetor',     label: 'Setor' },
                { id: 'trainCategoria', label: 'Categoria' },
            ])) return;
        }

        const _respArrTren = JSON.parse(responsavel || '[]');
        if (!_respArrTren.length) {
            if (typeof showToast === 'function') showToast('É necessário ao menos um Responsável para salvar o registro.', 'error');
            document.getElementById('ms-tren-resp-input')?.focus();
            return;
        }

        const rotinaVal = document.getElementById('trainRotina').value;
        const freqVal = Number(document.getElementById('trainFrequencia').value) || 1;
        const selectedDays = Array.from(document.querySelectorAll('#trainWeekdays .wd-btn.active')).map(b => Number(b.dataset.day));
        const dataPrevisaoVal = document.getElementById('trainDataPrevisao').value;

        const _newChecklistPubTrain = (typeof getChecklistPub === 'function') ? getChecklistPub('train') : (item.checklistPublicacao || []);
        if (!isNew && typeof syncChecklistPublicacaoHistory === 'function') syncChecklistPublicacaoHistory(item, _newChecklistPubTrain);

        const newItem = {
            ...item,
            titulo: document.getElementById('trainTitulo').value,
            descricao: document.getElementById('trainDescricao').value,
            setor: document.getElementById('trainSetor').value,
            categoria: document.getElementById('trainCategoria').value,
            subcategoria: '',
            status: document.getElementById('trainStatus').value,
            dataPublicacao: document.getElementById('trainDataPublicacao').value,
            dataPrevisao: dataPrevisaoVal,
            rotina: rotinaVal,
            frequencia: freqVal,
            diasSemana: rotinaVal === 'diasemana' ? selectedDays : [],
            responsavel: responsavel,
            revisor: revisor,
            flagDias: document.getElementById('trainFlagDias').value === '' ? 0 : Number(document.getElementById('trainFlagDias').value),
            marcador: trainMarkerObj ? trainMarkerObj.name : '',
            marcadorCor: trainMarkerObj ? trainMarkerObj.color : 'default',
            overdueStatus: document.getElementById('trainOverdueStatus').value || '',
            alertStatus: document.getElementById('trainAlertStatus')?.value || '',
            resetChecklistOnAutoStatus: (typeof getSchedResetChecklist === 'function') ? getSchedResetChecklist('train') : false,
            anexos: getAnexos('train'),
            checklist: (typeof getChecklist === 'function') ? getChecklist('train') : (item.checklist || []),
            checklistPublicacao: _newChecklistPubTrain
        };

        if (!isNew && originalItem) {
        }

        if (isNew) {
            newItem.createdAt = new Date().toISOString();
            newItem.historico.push({
                timestamp: new Date().toISOString(),
                acao: 'Criação do Registro',
                usuario: currentuser?.name || 'Sistema',
                snapshot: _safeSnapshot(newItem)
            });
            trainings.push(newItem);
        } else {
            if (!originalItem) {
                originalItem = JSON.parse(JSON.stringify(item));
            }
            if (!newItem.historico || !Array.isArray(newItem.historico)) {
                newItem.historico = originalItem.historico ? [...originalItem.historico] : [];
            }

            const _trainIsConcluido = typeof _kbStatusIsConcluido === 'function' ? _kbStatusIsConcluido(newItem.status) : /conclu/i.test(newItem.status);
            const _trainWasConcluido = typeof _kbStatusIsConcluido === 'function' ? _kbStatusIsConcluido(originalItem.status) : /conclu/i.test(originalItem.status);
            if (_trainIsConcluido && typeof isItemOverdue === 'function' && isItemOverdue(newItem, 'train')) {
                showOverdueConcluiModal();
                return;
            }
            // Só bloqueia se está ALTERANDO para concluído, não se já era concluído
            const _trainIsConcluindo = _trainIsConcluido && !_trainWasConcluido;
            if (_trainIsConcluindo && !canSetConcluido(newItem.checklist, newItem)) {
                if (typeof showToast === 'function') showToast('Conclua todos os itens do checklist de publicação antes de marcar como Concluído.', 'error');
                return;
            }
            if (_trainIsConcluido && typeof checkSchedWarnBeforeConcluido === 'function' && !window._schedWarnPassed_train) {
                checkSchedWarnBeforeConcluido(newItem, 'treinamentos').then(ok => {
                    if (!ok) return;
                    window._schedWarnPassed_train = true;
                    saveTraining();
                    window._schedWarnPassed_train = false;
                });
                return;
            }
            window._schedWarnPassed_train = false;

            // Saindo de Concluído → incrementa ciclo de publicação
            const _prevWasConcluidoTrain = typeof _kbStatusIsConcluido === 'function' ? _kbStatusIsConcluido(originalItem.status) : /conclu/i.test(originalItem.status);
            const _newNotConcluidoTrain = !_trainIsConcluido;
            if (_prevWasConcluidoTrain && _newNotConcluidoTrain) {
                newItem.pubCycleId = (newItem.pubCycleId || 1) + 1;
            }

            const changes = calculateChanges(originalItem, newItem);
            if (changes.length > 0) {
                newItem.historico.push({
                    timestamp: new Date().toISOString(),
                    acao: 'Edição de Dados',
                    usuario: currentuser?.name || 'Sistema',
                    detalhes: changes,
                    snapshot: _safeSnapshot(originalItem)
                });
            }
            trainings = trainings.map(t => t.id === editingTrainId ? newItem : t);
        }

        saveAll();
        closeFormDrawer();
        renderCards();
        if (typeof isCalendarActive === 'function' && isCalendarActive()) renderCalendar();
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

        const originalTrainDup = editingTrainId ? trainings.find(t => t.id === editingTrainId) : null;
        const dupChecklistTrain = originalTrainDup ? JSON.parse(JSON.stringify({ checklist: originalTrainDup.checklist || [], checklistPublicacao: originalTrainDup.checklistPublicacao || [] })) : null;
        if (dupChecklistTrain && typeof resetChecklistItems === 'function') resetChecklistItems(dupChecklistTrain);
        const rotinaValDup = document.getElementById('trainRotina').value;
        const formData = {
            titulo: document.getElementById('trainTitulo').value,
            descricao: document.getElementById('trainDescricao').value,
            setor: document.getElementById('trainSetor').value,
            categoria: document.getElementById('trainCategoria').value,
            subcategoria: '',
            status: document.getElementById('trainStatus').value,
            dataPublicacao: document.getElementById('trainDataPublicacao').value,
            dataPrevisao: document.getElementById('trainDataPrevisao').value,
            rotina: rotinaValDup,
            frequencia: Number(document.getElementById('trainFrequencia').value) || 1,
            diasSemana: Array.from(document.querySelectorAll('#trainWeekdays .wd-btn.active')).map(b => Number(b.dataset.day)),
            responsavel: (typeof msGetValue === 'function') ? JSON.stringify(msGetValue('tren-resp')) : document.getElementById('trainResponsavel').value || '',
            revisor:     (typeof msGetValue === 'function') ? JSON.stringify(msGetValue('tren-rev'))  : document.getElementById('trainRevisor').value || '',
            flagDias: document.getElementById('trainFlagDias').value === '' ? 0 : Number(document.getElementById('trainFlagDias').value),
            marcador: document.getElementById('trainMarcador').value,
            marcadorCor: (() => { const n = document.getElementById('trainMarcador').value; const mk = (masterLists.trainMarcadores || []).find(m => m.name === n); return mk ? mk.color : 'default'; })(),
            overdueStatus: document.getElementById('trainOverdueStatus')?.value || '',
            alertStatus: document.getElementById('trainAlertStatus')?.value || '',
            resetChecklistOnAutoStatus: (typeof getSchedResetChecklist === 'function') ? getSchedResetChecklist('train') : false,
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
            document.getElementById('trainDataPrevisao').value = formData.dataPrevisao;
            document.getElementById('trainRotina').value = formData.rotina;
            document.getElementById('trainFrequencia').value = formData.frequencia;
            document.querySelectorAll('#trainWeekdays .wd-btn').forEach(b => b.classList.remove('active'));
            formData.diasSemana.forEach(d => {
                const btn = document.querySelector(`#trainWeekdays .wd-btn[data-day="${d}"]`);
                if (btn) btn.classList.add('active');
            });
            if (typeof msSetValue === 'function') { msSetValue('tren-resp', formData.responsavel || ''); msSetValue('tren-rev', formData.revisor || ''); }
            document.getElementById('trainFlagDias').value = formData.flagDias;
            document.getElementById('trainMarcador').value = formData.marcador;

            if (typeof restoreAnexos === 'function') restoreAnexos('train', formData.anexos);

            // Duplica a Programação de Status Concluído (se houver)
            if (typeof setSchedStatusValues === 'function') {
                setSchedStatusValues('train', formData.overdueStatus, formData.alertStatus, formData.resetChecklistOnAutoStatus);
            }

            if (typeof restoreChecklist === 'function') restoreChecklist('train', dupChecklistTrain?.checklist, dupChecklistTrain?.checklistPublicacao);

            onCategoryChange('train');
            if (typeof onTrainRotinaChange === 'function') onTrainRotinaChange(true);
            openFormDrawer('modalTreinamentos');
        }, 200);
    }

// ─── ROTINA DE TREINAMENTOS ───────────────────────────────────────────────────

window.onTrainRotinaChange = function(skipCalc) {
    const rotina = document.getElementById('trainRotina').value;
    const freqWrap = document.getElementById('trainFrequenciaWrap');
    const wdWrap = document.getElementById('trainDiaSemanaWrap');
    const dpInput = document.getElementById('trainDataPrevisao');

    const isPontual = rotina === 'pontual';
    const isDiaSemana = rotina === 'diasemana';

    freqWrap.style.display = (!isPontual && !isDiaSemana) ? '' : 'none';
    wdWrap.style.display = isDiaSemana ? '' : 'none';

    dpInput.readOnly = isDiaSemana;
    dpInput.style.background = isDiaSemana ? '#f1f5f9' : '';
    dpInput.style.cursor = isDiaSemana ? 'not-allowed' : '';

    if (!skipCalc && !isPontual) calcTrainDataPrevisao();
};

window.toggleTrainWeekday = function(btn) {
    btn.classList.toggle('active');
    calcTrainDataPrevisao();
};

window.calcTrainDataPrevisao = function() {
    const rotina = document.getElementById('trainRotina').value;
    const freq = Number(document.getElementById('trainFrequencia').value) || 1;
    const dpInput = document.getElementById('trainDataPrevisao');
    const pubDate = document.getElementById('trainDataPublicacao').value;

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
        const activeDays = Array.from(document.querySelectorAll('#trainWeekdays .wd-btn.active')).map(b => Number(b.dataset.day));
        if (activeDays.length === 0) { dpInput.value = ''; return; }
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

(function() {
    const dpPub = document.getElementById('trainDataPublicacao');
    const handler = () => {
        if (document.getElementById('trainRotina').value !== 'pontual') calcTrainDataPrevisao();
    };
    if (dpPub) {
        dpPub.addEventListener('change', handler);
        dpPub.addEventListener('input', handler);
    }
})();
