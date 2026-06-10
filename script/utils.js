// === UTILITÁRIOS GERAIS ===

    // --- UTILITÁRIOS ---
    var today = () => new Date().toISOString().split('T')[0];
    var currentYear = new Date().getFullYear();
    var currentMonth = new Date().getMonth();
    var formatBR = dateStr => {
        if (!dateStr) return 'ND';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };
    var truncateText = (text, max = 55) => {
        const s = String(text || '');
        if (s.length <= max) return s;
        if (max <= 3) return '.'.repeat(max);
        return s.slice(0, max - 3).trimEnd() + '...';
    };
    var daysDiff = dateStr => {
        if (!dateStr) return Infinity;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return Infinity;
        return Math.ceil((d - new Date()) / (1000*60*60*24));
    };

    // Função para limpar responsáveis que não são usuários cadastrados
    function cleanInvalidResponsaveis() {
        // Coleta todos os nomes de usuários cadastrados
        const validUserNames = new Set();
        if (typeof users !== 'undefined') {
            users.forEach(user => {
                if (user.name) validUserNames.add(String(user.name));
            });
        }
        if (masterLists.responsaveis) {
            masterLists.responsaveis.forEach(r => validUserNames.add(String(r)));
        }

        const cleanResponsavel = (responsavel) => {
            if (!responsavel) return '';
            try {
                // Se for JSON array, pega o primeiro responsável
                const parsed = JSON.parse(responsavel);
                if (Array.isArray(parsed)) {
                    const firstValid = parsed.find(r => validUserNames.has(String(r)));
                    return firstValid ? String(firstValid) : '';
                }
                return validUserNames.has(String(parsed)) ? String(parsed) : '';
            } catch {
                return validUserNames.has(String(responsavel)) ? String(responsavel) : '';
            }
        };

        // Limpa responsáveis em cada tipo de item
        [audits, trainings, activities, documents].forEach(arr => {
            arr.forEach(item => {
                if (item.responsavel) {
                    item.responsavel = cleanResponsavel(item.responsavel);
                }
            });
        });

        maintenances.forEach(item => {
            if (item.responsavelTecnico) {
                item.responsavelTecnico = cleanResponsavel(item.responsavelTecnico);
            }
            // responsavelManutencao é campo de texto, não precisa limpar (pode ser qualquer valor)
        });

        documents.forEach(item => {
            if (item.responsavel) {
                item.responsavel = cleanResponsavel(item.responsavel);
            }
        });

        // Limpa a lista mestre de responsáveis, mantendo apenas usuários válidos
        // COMENTADO: Não filtra responsáveis para garantir que TODOS os usuários apareçam nos modais de edição
        // if (masterLists.responsaveis) {
        //     masterLists.responsaveis = masterLists.responsaveis.filter(r => validUserNames.has(String(r)));
        // }
    }

    function cleanMalformedItems() {
        // Remove itens [object Object] e objetos malformados de todas as listas do masterLists
        const cleanList = (list) => {
            if (!Array.isArray(list)) return list;

            return list.filter(item => {
                // Rejeita itens que são [object Object] (strings que resultariam nisso)
                if (item === '[object Object]') return false;

                // Rejeita objetos sem propriedades de valor úteis
                if (typeof item === 'object' && item !== null) {
                    // Se é um objeto de status/marcador, verifica se tem 'name'
                    if (item.name !== undefined) return true;
                    // Se é um objeto de soft delete, verifica se tem 'value' e ainda não foi marcado deleted permanentemente
                    if (item.value !== undefined && !item.deleted) return true;
                    // Se tem propriedades úteis (não é totalmente vazio), mantém
                    if (Object.keys(item).length > 0 && !item.deleted) return true;
                    // Se é vazio ou só tem 'deleted', rejeita
                    return false;
                }

                // Strings vazias são rejeitadas
                if (typeof item === 'string' && item.trim() === '') return false;

                // Mantém itens válidos (strings com conteúdo)
                return true;
            });
        };

        // Limpa todas as listas no masterLists
        Object.keys(masterLists).forEach(key => {
            const list = masterLists[key];

            if (Array.isArray(list)) {
                // Listas simples
                masterLists[key] = cleanList(list);
            } else if (typeof list === 'object' && list !== null) {
                // Listas aninhadas (como mantItens, auditSubcats, etc)
                Object.keys(list).forEach(subKey => {
                    if (Array.isArray(list[subKey])) {
                        list[subKey] = cleanList(list[subKey]);
                    }
                });
            }
        });
    }
    var isBlankPeriodicity = val => {
        if (val === null || val === undefined) return true;
        const s = String(val).trim();
        if (s === '') return true;
        const n = Number(s);
        return !Number.isFinite(n) || n <= 0;
    };

    // Cards (Manutenção/Documentos):
    // - "Data" = publicação/criação (sempre)
    // - "Próx" = próxima (ou N/A quando periodicidade estiver vazia)
    var getMaintenanceCardDate = item => item?.ultima; // publicação (última manutenção)
    var getMaintenanceDeadlineDate = item => (isBlankPeriodicity(item?.intervalo) ? null : item?.proxima);
    var getDocumentCardDate = item => item?.dataCriacao; // publicação (criação)
    var getDocumentDeadlineDate = item => (isBlankPeriodicity(item?.docIntervalo) ? null : item?.dataProximaRevisao);

    // Normalização de texto (corrige mismatch no mobile por Unicode/acentos)
    // Função auxiliar para normalizar responsável (pode ser string, JSON array, ou null)
    function normalizeResponsavel(responsavel) {
        if (!responsavel) return '';
        try {
            // Tenta fazer parse se for JSON array
            const parsed = JSON.parse(responsavel);
            if (Array.isArray(parsed)) {
                // Pega apenas o primeiro responsável para compatibilidade
                return String(parsed[0] || '').trim().toLowerCase();
            }
            return String(parsed || '').trim().toLowerCase();
        } catch {
            // Se não for JSON, trata como string simples
            return String(responsavel || '').trim().toLowerCase();
        }
    }

    function normalizeText(input) {
        let s = (input ?? '').toString();
        // remove zero-width chars comuns em teclado mobile
        s = s.replace(/[​-‍﻿]/g, '');
        s = s.trim().toLowerCase();
        // normaliza acentos para comparação mais robusta
        try {
            s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
        } catch (_) {
            // ignore - navegadores antigos
        }
        // colapsa espaços
        s = s.replace(/\s+/g, ' ');
        return s;
    }

    // Busca por título (lupa)
    var titleSearchCardsEnabled = false;
    var titleSearchCardsQuery = '';
    var titleSearchDashEnabled = false;
    var titleSearchDashQuery = '';

    function setTitleSearchEnabled(context, enabled) {
        if (context === 'dash') {
            titleSearchDashEnabled = enabled;
            if (!enabled) {
                titleSearchDashQuery = '';
                const inEl = document.getElementById('dashTitleSearchInput');
                if (inEl) inEl.value = '';
                const dd = document.getElementById('dashTitleSearchDropdown');
                if (dd) dd.style.display = 'none';
            }
            renderDashboard();
        } else {
            titleSearchCardsEnabled = enabled;
            if (!enabled) {
                titleSearchCardsQuery = '';
                const inEl = document.getElementById('titleSearchInput');
                if (inEl) inEl.value = '';
                const dd = document.getElementById('titleSearchDropdown');
                if (dd) dd.style.display = 'none';
            }
            renderCards();
        }
    }

    function toggleTitleSearch(context) {
        const dropdownId = context === 'dash' ? 'dashTitleSearchDropdown' : 'titleSearchDropdown';
        const inputId = context === 'dash' ? 'dashTitleSearchInput' : 'titleSearchInput';
        const dd = document.getElementById(dropdownId);
        if (!dd) return;
        const isOpen = dd.style.display !== 'none';
        if (isOpen) {
            dd.style.display = 'none';
            setTitleSearchEnabled(context, false);
        } else {
            dd.style.display = 'block';
            setTitleSearchEnabled(context, true);
            const inEl = document.getElementById(inputId);
            if (inEl) inEl.focus();
        }
    }

    function onTitleSearchInput(context) {
        const inputId = context === 'dash' ? 'dashTitleSearchInput' : 'titleSearchInput';
        const inEl = document.getElementById(inputId);
        const q = normalizeText(inEl?.value || '');
        if (context === 'dash') {
            titleSearchDashQuery = q;
            if (titleSearchDashEnabled) renderDashboard();
        } else {
            titleSearchCardsQuery = q;
            const searchOpen = document.getElementById('fbarSearchWrap')?.classList.contains('open');
            if (searchOpen) titleSearchCardsEnabled = true;
            if (titleSearchCardsEnabled) renderCards();
        }
    }

    // NOVO: Dicionário para mapear chaves de objeto para nomes de exibição
    var fieldnames = {
        // Auditoria
        auditTitulo: 'Título', auditDescricao: 'Descrição', auditSetor: 'Setor', auditCategoria: 'Categoria',
        auditSub: 'Subcategoria', auditStatus: 'Status', auditDataPublicacao: 'Data Publicação',
        auditDataPrevisao: 'Data Previsão', auditResponsavel: 'Responsável', auditAuditor: 'Auditor', auditFlagDias: 'Alerta (Dias)',
        auditMarcador: 'Marcador',

        // Atividades
        ativTitulo: 'Título', ativDescricao: 'Descrição', ativSetor: 'Setor', ativCategoria: 'Categoria',
        ativSub: 'Subcategoria', ativStatus: 'Status', ativDataInicio: 'Data Início',
        ativDataConclusao: 'Data Conclusão', ativResponsavel: 'Responsável', ativFlagDias: 'Alerta (Dias)',
        ativMarcador: 'Marcador',

        // Manutenção
        mantTitulo: 'Título', mantDescricao: 'Descrição', mantSetor: 'Setor', mantCategoria: 'Categoria',
        mantItem: 'Item/Equipamento', mantTipo: 'Tipo', mantUltima: 'Última Manutenção', mantIntervalo: 'Periodicidade (Dias)',
        mantResponsavelTecnico: 'Responsável Técnico', mantResponsavelManutencao: 'Responsável Manutenção',
        mantStatus: 'Status', mantFlagDias: 'Alerta (Dias)', mantProxima: 'Próxima Manutenção',
        mantMarcador: 'Marcador',

        // Documentos
        docTitulo: 'Título', docDescricao: 'Descrição', docSetor: 'Setor', docCategoria: 'Categoria',
        docSub: 'Subcategoria', docStatus: 'Status', docDataCriacao: 'Data do Documento',
        docIntervalo: 'Periodicidade (Dias)', docResponsavel: 'Responsável', docRevisor: 'Revisor',
        docFlagDias: 'Alerta (Dias)', docProximaRevisao: 'Próxima Revisão',
        docMarcador: 'Marcador',

        // Anexos (Não é uma propriedade direta, mas ajuda a exibir a mudança)
        anexos: 'Anexos'
    };

    // NOVO: Função para calcular e formatar as mudanças
    function calculateChanges(original, current) {
    var changes = [];
    var silentChanged = false;

    // Lista de chaves técnicas que não devem gerar log de texto, mas disparam o salvamento
    var ignoreKeys = ['id', 'historico', 'type', 'proxima', 'dataProximaRevisao', 'anexos', 'marcadorCor'];

    var fieldOrder = [
        'titulo', 'descricao', 'setor', 'categoria', 'subcategoria',
        'item', 'tipo', 'status', 'dataPublicacao', 'dataPrevisao',
        'dataInicio', 'dataConclusao', 'ultima', 'intervalo',
        'dataCriacao', 'docIntervalo', 'responsavel', 'auditor',
        'responsavelTecnico', 'responsavelManutencao', 'revisor',
        'flagDias', 'marcador'
    ];

    // Mapeamento de chaves do objeto para nomes legíveis
    var displayNames = {
        titulo: 'Título',
        descricao: 'Descrição',
        setor: 'Setor',
        categoria: 'Categoria',
        subcategoria: 'Subcategoria',
        item: 'Equipamento',
        status: 'Status',
        dataPublicacao: 'Data Publicação',
        dataPrevisao: 'Data Previsão',
        responsavel: 'Responsável',
        auditor: 'Auditor',
        flagDias: 'Alerta (Dias)',
        dataInicio: 'Data Início',
        dataConclusao: 'Data Conclusão',
        ultima: 'Última Manutenção',
        intervalo: 'Periodicidade',
        tipo: 'Tipo',
        responsavelTecnico: 'Resp. Técnico',
        responsavelManutencao: 'Resp. Manutenção',
        dataCriacao: 'Data do Documento',
        docIntervalo: 'Periodicidade',
        revisor: 'Revisor',
        marcador: 'Marcador'
    };

    // Itera sobre todas as chaves do objeto atual
    for (const key in current) {
        if (ignoreKeys.includes(key)) continue;

        // Normalização para comparação (trata null/undefined/'' como string vazia)
        let valOriginal = original && original[key] !== undefined && original[key] !== null && original[key] !== '' ? String(original[key]).trim() : '';
        let valCurrent = current[key] !== undefined && current[key] !== null && current[key] !== '' ? String(current[key]).trim() : '';

        if (valOriginal !== valCurrent) {
            // Se mudou status ou marcador, consideramos "mudança silenciosa" (salva mas não detalha se for só isso)
            if (key === 'status' || key === 'marcador') {
                silentChanged = true;
            }

            const label = displayNames[key] || key;

            // Formatação de datas para o histórico ficar legível
            let displayOrig = valOriginal;
            let displayCurr = valCurrent;

            if (key.toLowerCase().includes('data') || key === 'ultima' || key === 'proxima') {
                displayOrig = (original[key] !== undefined && original[key] !== null && original[key] !== '') ? formatBR(original[key]) : 'vazio';
                displayCurr = (current[key] !== undefined && current[key] !== null && current[key] !== '') ? formatBR(current[key]) : 'vazio';
            }

            if (key === 'descricao') {
                const descHtml = `
                    <div style="margin-top:4px;">
                        <strong>Descrição antiga:</strong><br>
                        <div style="margin-left:10px; margin-top:2px; color:#ff6868;">${valOriginal.replace(/\n/g, '<br>') || '(vazio)'}</div>
                    </div>
                    <div style="margin-top:4px;">
                        <strong>Descrição nova:</strong><br>
                        <div style="margin-left:10px; margin-top:2px; color:#059669;">${valCurrent.replace(/\n/g, '<br>') || '(vazio)'}</div>
                    </div>
                `.trim();
                changes.push(descHtml);
            } else {
                // Outros campos (Título, Setor, etc)
                const label = displayNames[key] || key;
                let displayOrig = valOriginal;
                let displayCurr = valCurrent;

                if (key.toLowerCase().includes('data') || key === 'ultima') {
                    displayOrig = original[key] ? formatBR(original[key]) : 'vazio';
                    displayCurr = current[key] ? formatBR(current[key]) : 'vazio';
                }

                changes.push(`${label}: <strong>${displayOrig || 'vazio'}</strong> &rarr; <strong>${displayCurr || 'vazio'}</strong>`);
            }
        }
    }

    // Verificação de anexos
    var origAnexos = original.anexos || [];
    var currAnexos = current.anexos || [];
    if (JSON.stringify(origAnexos) !== JSON.stringify(currAnexos)) {
        const added = currAnexos.filter(a => !origAnexos.some(o => (o.titulo || o.name || '') === (a.titulo || a.name || '') && (o.url || '') === (a.url || '')));
        const removed = origAnexos.filter(o => !currAnexos.some(a => (a.titulo || a.name || '') === (o.titulo || o.name || '') && (a.url || '') === (o.url || '')));
        if (added.length > 0 || removed.length > 0) {
            let anexoDetails = [];
            if (added.length > 0) {
                anexoDetails.push(`<strong>Anexos adicionados:</strong><br>${added.map(a => `<a href="${a.url || '#'}" target="_blank">${a.titulo || a.name || 'Anexo'}</a>`).join('<br>')}`);
            }
            if (removed.length > 0) {
                anexoDetails.push(`<strong>Anexos removidos:</strong><br>${removed.map(a => `${a.titulo || a.name || 'Anexo'}`).join('<br>')}`);
            }
            changes.push(anexoDetails.join('<br>'));
        } else {
            silentChanged = true; // if only order changed or other differences
        }
    }

    // Adiciona propriedade auxiliar para controle do fluxo de salvamento
    changes.silentChanged = silentChanged;
    return changes;
}


    var colorMap = {
        'blue': 'var(--c-blue)',
        'green': 'var(--c-green)',
        'red': 'var(--c-red)',
        'orange': 'var(--c-orange)',
        'yellow': 'var(--c-yellow)',
        'purple': 'var(--c-purple)',
        'default': 'var(--c-default)'
    };
