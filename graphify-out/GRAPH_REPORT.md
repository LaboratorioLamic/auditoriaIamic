# Graph Report - .  (2026-07-07)

## Corpus Check
- 32 files · ~129,958 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 953 nodes · 1916 edges · 59 communities (42 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.61)
- Token cost: 100,701 input · 0 output

## Community Hubs (Navigation)
- Kanban Board Module
- Calendar Module
- Ocorrencias Core Logic
- Permissions & Login
- File Upload/Anexos
- Publicacoes/Rotinas Logic
- RNC Core Logic
- Modal/Drawer Framework
- Filter Bar (Fbar)
- Ocorrencias Dashboard
- App Entry & Asset Loading
- Dashboard Rendering
- RNC Rendering Helpers
- Firebase Realtime Listener
- RNC Data Helpers
- Generic Filters
- RNC Kanban Drag/Touch
- Notifications
- RNC Calendar Drag/Touch
- RNC Form Handling
- Setor Filter Modal Logic
- Core Utilities
- Filters Dropdown Widget
- RNC List Management
- Ocorrencias/RNC UI Elements
- RNC Calendar Rendering
- Multi-Select Widget
- Offline Mode Handling
- Overdue Status Widget
- RNC Modals Group
- User Prefs Cache
- Backup/Export Section
- Dashboard Charts
- Dark Mode / Sidebar Init
- User Admin Config
- Autocomplete Widget
- App Shell/Navigation
- Login Flow
- Firebase Config Init
- Form Drawers (Atividades/Documentos)
- Form Drawers (Auditoria/Treinamentos)
- Trash/History Modals
- Publicacao Modals
- Offline Overlay
- Ocorrencias Dashboard Section
- Tabs Permissions Modal
- Generic List Manager Modal
- People Filter Modal
- RNC Setor Filter Modal
- Setor Permissions Modal
- Setor Filter Modal
- Occurrence Types Permissions Modal

## God Nodes (most connected - your core abstractions)
1. `index.html (Dashboard Auditoria LAMIC)` - 36 edges
2. `esc()` - 32 edges
3. `_kbGetConfig()` - 19 edges
4. `renderRncKanban()` - 19 edges
5. `_renderRncView()` - 19 edges
6. `_renderRncTrashView()` - 18 edges
7. `renderKanban()` - 17 edges
8. `rncBuildCard()` - 14 edges
9. `_renderRncTable()` - 14 edges
10. `_tabPrefix()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `rncContent (RNC / Non-Conformance Report module)` --references--> `modalRnc (RNC form drawer)`  [INFERRED]
  index.html → index.html  _Bridges community 30 → community 24_
- `_renderRncTrashView()` --calls--> `getMarker()`  [EXTRACTED]
  script/rnc.js → script/rnc.js  _Bridges community 14 → community 12_
- `_updateMarkerDisplay()` --calls--> `getMarker()`  [EXTRACTED]
  script/rnc.js → script/rnc.js  _Bridges community 14 → community 19_
- `_updateMarkerDisplay()` --calls--> `esc()`  [EXTRACTED]
  script/rnc.js → script/rnc.js  _Bridges community 19 → community 12_
- `_rncMkRenderExisting()` --calls--> `esc()`  [EXTRACTED]
  script/rnc.js → script/rnc.js  _Bridges community 6 → community 12_

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Form drawers for the five main task/content modules (Auditoria, Treinamentos, Atividades, Documentos, Ocorrencia) share the same form-drawer UI pattern** — index_html_modalauditoria, index_html_modaltreinamentos, index_html_modalatividades, index_html_modaldocumentos, index_html_modalocorrencia [INFERRED 0.85]
- **RNC list-management modals (origens, detalhamentos, status/kanban, marker editor) form the RNC configuration subsystem** — index_html_rncmanagermodal, index_html_rncmarkereditormodal, index_html_rnctrashmodal, index_html_rnctrashviewmodal [INFERRED 0.85]
- **Ordered script includes at end of body implementing the dashboard's JS module load sequence** — script_offline_js, script_firebase_js, script_state_js, script_render_js, script_filters_js, script_init_js [EXTRACTED 1.00]

## Communities (59 total, 17 thin omitted)

### Community 0 - "Kanban Board Module"
Cohesion: 0.07
Nodes (66): confirmKanbanAddCol(), confirmKanbanDeleteCol(), confirmKanbanEditCol(), initKanbanMobileSwipe(), isKanbanActive(), _kbActivateDrag(), _kbApplyDrop(), _kbBuildDots() (+58 more)

### Community 1 - "Calendar Module"
Cohesion: 0.08
Nodes (58): _calActivateDrag(), _calAdvanceByRotina(), _calAttachEdgeDrag(), _calBuildDayDots(), _calBuildDayMap(), _calBuildHeader(), _calBuildModeToggle(), _calBuildViewFilter() (+50 more)

### Community 2 - "Ocorrencias Core Logic"
Cohesion: 0.07
Nodes (45): afterListChange(), canEdit(), catById(), catByName(), commit(), dateMatches(), doRemove(), ensureLists() (+37 more)

### Community 3 - "Permissions & Login"
Cohesion: 0.08
Nodes (46): ALL_TABS, applyListManagerPermissions(), applyOcorrenciasPermissions(), applyTaskViewPermission(), applyuserPermissionsToTabs(), checkLogin(), _checkPartialPermOnSave(), _checkTriPerm() (+38 more)

### Community 4 - "File Upload/Anexos"
Cohesion: 0.08
Nodes (47): _activeUploadTasks, _ANEXO_ICON_SVG, _cancelRenameAnexo(), clearAnexosUpload(), _clearUploadFile(), _commitRenameAnexo(), _compressImageToJpeg(), _ctxHasImageOption() (+39 more)

### Community 5 - "Publicacoes/Rotinas Logic"
Cohesion: 0.06
Nodes (26): _calcAuditNextDate(), _calcRotinaNextDate(), _computePubQualityScore(), _getChecklistData(), _PUB_NC_OPTS, _pubNcBadgeHtml(), _pubNcBtnHtml(), _pubNcOpt() (+18 more)

### Community 6 - "RNC Core Logic"
Cohesion: 0.07
Nodes (29): applyRncManagePermission(), canManage(), getAllMarkers(), initRncCalWeekMobileSwipe(), _renderRncColEditColors(), _rncCalActivateDrag(), _rncCalBuildDayDots(), _rncCalCancelCardDrag() (+21 more)

### Community 7 - "Modal/Drawer Framework"
Cohesion: 0.08
Nodes (36): addToList(), _applyRespFieldLock(), changeHistoryPage(), closeFormDrawer(), closeMarkerPopover(), closeStatusPopover(), deleteItem(), _doDeleteHistoryEntry() (+28 more)

### Community 8 - "Filter Bar (Fbar)"
Cohesion: 0.10
Nodes (36): _buildFbarDateDropdown(), closeFilters(), _escHtmlF(), _escPeople(), fbarOnTabSwitch(), _fieldHasCurrentUser(), _hasRevisor(), onFbarAdvChange() (+28 more)

### Community 9 - "Ocorrencias Dashboard"
Cohesion: 0.10
Nodes (35): applyCommonFilters(), catObjByName(), computeKPIs(), dateMatchesDash(), destroyAllCharts(), destroyChart(), esc(), formatMonthKey() (+27 more)

### Community 10 - "App Entry & Asset Loading"
Cohesion: 0.06
Nodes (34): css/calendar.css, css/rnc.css, index.html (Dashboard Auditoria LAMIC), script/auditoria.js, script/autocomplete.js, script/cache.js, script/calendar.js, script/documentos.js (+26 more)

### Community 11 - "Dashboard Rendering"
Cohesion: 0.13
Nodes (30): _buildDashPubPagination(), calculateDashboardData(), _clDonutHtml(), _collectAllPublicacoes(), _drawActivityBase(), _escHtml(), _formatResponsavelShort(), _getFilteredData() (+22 more)

### Community 12 - "RNC Rendering Helpers"
Cohesion: 0.12
Nodes (30): buildRncAcFull(), esc(), _field(), fmtDate(), fmtDateTime(), _fmtTrashDate(), _renderRncFilterChecklist(), _renderRncTrashView() (+22 more)

### Community 13 - "Firebase Realtime Listener"
Cohesion: 0.17
Nodes (24): _applyRemoteSnapshot(), captureSyncBaseline(), _deepClone(), forceFirebaseSync(), isEditingCardOpen(), _isPlainObject(), isStatusCancelled(), isStatusStandby() (+16 more)

### Community 14 - "RNC Data Helpers"
Cohesion: 0.15
Nodes (28): attrStr(), canDeleteRnc(), canEdit(), dateMatches(), getCI(), getFiltered(), getMarker(), getRncStatusList() (+20 more)

### Community 15 - "Generic Filters"
Cohesion: 0.17
Nodes (23): clearDashboardFilters(), clearFilters(), closeFilters(), getAllowedSetores(), getDateStrForFilterPrefix(), getItemsForFilterPrefix(), getMasterCategorias(), getMasterMarcadores() (+15 more)

### Community 16 - "RNC Kanban Drag/Touch"
Cohesion: 0.14
Nodes (20): initRncKanbanMobileSwipe(), _rncKbActivateDrag(), _rncKbBuildDots(), _rncKbCancelCardDrag(), _rncKbCardTouchCancel(), _rncKbCardTouchEnd(), _rncKbCardTouchMove(), _rncKbCardTouchStart() (+12 more)

### Community 17 - "Notifications"
Cohesion: 0.22
Nodes (14): applyCurrentTabFilters(), applyDashboardFiltersToData(), getDashboardFilters(), getDeadlineFieldForTab(), getFilteredNotifications(), getFilterPrefixForTab(), _getNewCardsForMe(), getNotificationsForTab() (+6 more)

### Community 18 - "RNC Calendar Drag/Touch"
Cohesion: 0.18
Nodes (17): _rncCalBuildDayMap(), _rncCalHandleDrop(), _rncCalMonthActivateDrag(), _rncCalMonthCancelDrag(), _rncCalMonthChipTouchCancel(), _rncCalMonthChipTouchEnd(), _rncCalMonthChipTouchMove(), _rncCalMonthChipTouchStart() (+9 more)

### Community 19 - "RNC Form Handling"
Cohesion: 0.16
Nodes (15): clearRncForm(), fillRncForm(), _getDeletedRncs(), getRncNotifications(), meName(), persist(), renderMarkerChips(), _rncDeleteMotivo() (+7 more)

### Community 20 - "Setor Filter Modal Logic"
Cohesion: 0.32
Nodes (13): closeSetorFilterModal(), confirmSetorFilter(), _escHtml(), _getVisibleSetores(), openSetorFilterModal(), _renderSetorFilterGrid(), setorFilterDeselectAll(), setorFilterSelectAll() (+5 more)

### Community 21 - "Core Utilities"
Cohesion: 0.16
Nodes (4): normalizeText(), onTitleSearchInput(), setTitleSearchEnabled(), toggleTitleSearch()

### Community 22 - "Filters Dropdown Widget"
Cohesion: 0.29
Nodes (6): onDropdownFilterChange(), onDropdownFilterChangeDashboard(), populateFiltersDropdown(), populateFiltersDropdownDashboard(), toggleFiltersDropdown(), toggleFiltersDropdownDashboard()

### Community 23 - "RNC List Management"
Cohesion: 0.24
Nodes (10): ensureLists(), getDetalhamentos(), _getManagerList(), getOrigens(), getSetores(), _renderRncManagerList(), _renderRncSetorFilterGrid(), rncOpenSetorModal() (+2 more)

### Community 24 - "Ocorrencias/RNC UI Elements"
Cohesion: 0.22
Nodes (9): modalOcorrencia (Ocorrencia form drawer), modalRnc (RNC form drawer), ocManagerBackdrop (Ocorrencias list manager modal: tipos/setores/categorias/motivos), ocorrenciasContent (Ocorrencias/N-C management module), ocSaveForm() (onclick handler, Salvar ocorrencia), ocXlsxBackdrop (Ocorrencias XLSX export/import modal), ocXlsxExport() (onclick handler, Baixar XLSX), rncSaveForm() (onclick handler, Salvar RNC) (+1 more)

### Community 25 - "RNC Calendar Rendering"
Cohesion: 0.31
Nodes (9): renderRncCalendar(), _rncCalGoToday(), _rncCalHeader(), _rncCalModeToggle(), _rncCalNavigate(), _rncCalNavTitle(), _rncCalViewFilter(), _rncPositionDropdownMobile() (+1 more)

### Community 27 - "Multi-Select Widget"
Cohesion: 0.50
Nodes (7): _closeDrop(), _escHtml(), _initField(), _initials(), _renderDrop(), _renderTags(), _resolveName()

### Community 28 - "Offline Mode Handling"
Cohesion: 0.57
Nodes (6): hideOfflineOverlay(), initialCheck(), setButtonLoading(), setStatus(), setupFirebaseListener(), showOfflineOverlay()

### Community 30 - "RNC Modals Group"
Cohesion: 0.29
Nodes (7): rncContent (RNC / Non-Conformance Report module), rncManagerModal (RNC lists manager: origens/detalhamentos/status), rncMarkerEditorModal (RNC marker/tag editor), rncPubViewModal (RNC publication view modal), rncTrashModal (RNC trash bin modal), rncTrashViewModal (RNC deleted item view modal), rncViewModal (RNC view modal: Dados/Checklist/Publicacoes/Anexos tabs)

### Community 31 - "User Prefs Cache"
Cohesion: 0.53
Nodes (4): _getUserPrefsPath(), loadUserPrefsFromFirebase(), _persistUserPrefs(), saveFiltersToFirebase()

### Community 32 - "Backup/Export Section"
Cohesion: 0.40
Nodes (5): backupContent (Backup/export/import section), exportLocalData() (onclick handler, Baixar Dados button), importLocalData(this) (onchange handler, fileInput), runImgBlobsPurge() (onclick handler, orphan image cleanup), runOrphanLogsPurge() (onclick handler, orphan logs cleanup)

### Community 33 - "Dashboard Charts"
Cohesion: 0.50
Nodes (5): chartAtividadeMensal (canvas, Chart.js line chart), chartDonutModulo (canvas, Chart.js donut chart), Chart.js (CDN, v4.4.0), dashboardContent (Dashboard KPI cards, charts, pies section), statusFunnelChart (Status por Area funnel widget)

### Community 34 - "Dark Mode / Sidebar Init"
Cohesion: 0.60
Nodes (3): initDarkMode(), toggleDarkMode(), _updateDarkModeIcon()

### Community 35 - "User Admin Config"
Cohesion: 0.50
Nodes (4): configContent (Usuarios/admin settings section), modalUsuario (User create/edit modal), openUserModal(null) (onclick handler, Novo Usuario button), saveAllowSignupSetting(checked) (onchange handler, cfgAllowSignup toggle)

### Community 38 - "App Shell/Navigation"
Cohesion: 0.67
Nodes (3): darkMode localStorage pre-load script (adds dark-mode-pre class before paint), sidebar navigation (module tabs: Dashboard, Atividades, Auditoria/Rotinas, Treinamentos, Documentos, Ocorrencias, RNC, Backup, Configuracoes), toggleDarkMode() (onclick handler, dark mode toggle)

## Knowledge Gaps
- **81 isolated node(s):** `tempSelectedSetores`, `tempSelectedTabs`, `PERM_INFO`, `logoutBtn`, `_PUB_NC_OPTS` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `index.html (Dashboard Auditoria LAMIC)` connect `App Entry & Asset Loading` to `Ocorrencias/RNC UI Elements`, `Dashboard Charts`, `Firebase Config Init`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `xlsx.js (CDN, SheetJS 0.18.5)` connect `Ocorrencias/RNC UI Elements` to `App Entry & Asset Loading`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `NOTE: não limpar filtros aqui — toggleMyTasks controla quando setar/limpar`, `tempSelectedSetores`, `tempSelectedTabs` to the rest of the system?**
  _82 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Kanban Board Module` be split into smaller, more focused modules?**
  _Cohesion score 0.07433489827856025 - nodes in this community are weakly interconnected._
- **Should `Calendar Module` be split into smaller, more focused modules?**
  _Cohesion score 0.0814207650273224 - nodes in this community are weakly interconnected._
- **Should `Ocorrencias Core Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.07175141242937853 - nodes in this community are weakly interconnected._
- **Should `Permissions & Login` be split into smaller, more focused modules?**
  _Cohesion score 0.07896575821104122 - nodes in this community are weakly interconnected._