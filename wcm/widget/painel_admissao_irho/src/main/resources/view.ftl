<div id="WidgetAdmissao_${instanceId}" class="super-widget wcm-widget-class fluig-style-guide" data-params="WidgetAdmissao.instance()">

    <script type="text/javascript" src="/webdesk/vcXMLRPC.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/v/bs/dt-1.10.12/datatables.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>

    <div class="custom-page-header">
        <div class="header-title">
            <h2>
                <img src="/painel_admissao_irho/resources/images/logo1-netzero.png" onerror="this.src='img/logo1-netzero.png'" class="header-logo" alt="Logo"> 
                PAINEL ADMISSÃO DIGITAL
            </h2>
        </div>

        <div class="header-actions">
            <div class="filter-card dropdown-card header-glass-card" style="min-width: 130px; justify-content: space-between;">
                <span class="card-label">Exibir: <span id="lblPageLen_${instanceId}" style="color: #fff; font-weight: bold;">10</span></span>
                <i class="fluigicon fluigicon-chevron-down arrow"></i>
                
                <div class="filter-card-options" style="min-width: 100px;">
                    <div class="opt-page-len" data-val="10">10 registos</div>
                    <div class="opt-page-len" data-val="25">25 registos</div>
                    <div class="opt-page-len" data-val="50">50 registos</div>
                    <div class="opt-page-len" data-val="100">100 registos</div>
                </div>
            </div>
        </div>
    </div>

    <div class="filter-cards-row full-width" style="align-items: center; margin-bottom: 24px;">
        
        <div class="filter-card search-card expand" onclick="$('#buscaGeral_${instanceId}').focus()">
            <div style="display: flex; align-items: center; width: 100%;">
                <i class="fluigicon fluigicon-search"></i>
                <input type="text" id="buscaGeral_${instanceId}" placeholder="Pesquisar globalmente...">
            </div>
        </div>

        <div class="filter-divider"></div>

        <div class="filter-card">
            <span style="color: var(--gray-500); font-size: 12px; margin-right: 8px;">De:</span>
            <input type="date" id="filtroDataDe_${instanceId}" style="border: none; outline: none; background: transparent; font-size: 13px; color: var(--gray-800); cursor: pointer;">
        </div>
        
        <div class="filter-card">
            <span style="color: var(--gray-500); font-size: 12px; margin-right: 8px;">Até:</span>
            <input type="date" id="filtroDataAte_${instanceId}" style="border: none; outline: none; background: transparent; font-size: 13px; color: var(--gray-800); cursor: pointer;">
        </div>

        <button class="btn btn-success btn-rounded" id="btnAtualizarDatas_${instanceId}" style="padding: 8px 20px; display: flex; align-items: center; gap: 8px;">
            <i class="fluigicon fluigicon-calendar"></i> Aplicar Datas
        </button>
    </div>

    <div class="filter-cards-row full-width" style="align-items: center; margin-bottom: 24px;">
        
        <div class="filter-card search-card expand" onclick="$('#buscaRapidaCpf_${instanceId}').focus()">
            <div style="display: flex; align-items: center; width: 100%;">
                <i class="fluigicon fluigicon-search"></i>
                <input type="text" id="buscaRapidaCpf_${instanceId}" placeholder="CPF...">
            </div>
        </div>

        <div class="filter-card search-card expand" onclick="$('#buscaRapidaCnpj_${instanceId}').focus()">
            <div style="display: flex; align-items: center; width: 100%;">
                <i class="fluigicon fluigicon-search"></i>
                <input type="text" id="buscaRapidaCnpj_${instanceId}" placeholder="CNPJ Empresa...">
            </div>
        </div>

        <div class="filter-card dropdown-card expand">
            <div style="display: flex; align-items: center;">
                <i class="fluigicon fluigicon-time icon-sm" style="color:var(--cor-primaria); margin-right:5px;"></i>
                <span class="card-label">Jornada</span>
            </div>
            <i class="fluigicon fluigicon-chevron-down arrow"></i>
            <div class="filter-card-options">
                <label><input type="radio" name="rdJornada_${instanceId}" class="chk-filtro-jornada" value="" checked> Todas</label>
                <label><input type="radio" name="rdJornada_${instanceId}" class="chk-filtro-jornada" value="CLT"> CLT</label>
                <label><input type="radio" name="rdJornada_${instanceId}" class="chk-filtro-jornada" value="Estágio"> Estágio</label>
                <label><input type="radio" name="rdJornada_${instanceId}" class="chk-filtro-jornada" value="Aprendiz"> Aprendiz</label>
            </div>
        </div>

        <div class="filter-card dropdown-card expand">
            <div style="display: flex; align-items: center;">
                <i class="fluigicon fluigicon-wheelchair icon-sm" style="color:var(--cor-primaria); margin-right:5px;"></i>
                <span class="card-label">Diversidade</span>
            </div>
            <i class="fluigicon fluigicon-chevron-down arrow"></i>
            <div class="filter-card-options">
                <label><input type="radio" name="rdPcd_${instanceId}" class="chk-filtro-pcd" value="TODOS" checked> Exibir Todos</label>
                <label><input type="radio" name="rdPcd_${instanceId}" class="chk-filtro-pcd" value="PCD"> Apenas Vagas PCD</label>
            </div>
        </div>

        <div class="filter-card action-card" id="btnLimparFiltros_${instanceId}" style="cursor: pointer; background: #FEF2F2; border-color: #FCA5A5;">
            <i class="fluigicon fluigicon-eraser icon-sm" style="color:#DC2626; margin-right:5px;"></i>
            <span class="card-label" style="color:#DC2626; font-weight: 600;">Limpar</span>
        </div>

    </div>

    <div class="row" style="margin-top: 10px;">
        <div class="col-md-12">
            <div class="table-responsive">
                <table id="tblAdmissao_${instanceId}" class="table table-hover table-striped table-condensed">
                    <thead>
     
                    <tbody></tbody>
                    <tfoot>
                        <tr>
                            <td colspan="6" style="padding: 15px 0; background-color: #fff; border-top: 2px solid #eee;">
                                <div class="filter-cards-row" style="justify-content: center; margin: 0; gap: 30px;">
                                    
                                    <div class="filter-card info-card card-aberto">
                                        <i class="fluigicon fluigicon-users icon-sm text-primary"></i>
                                        <span class="card-label">Candidatos na Fila:</span>
                                        <span class="card-value" id="lblTotalFila_${instanceId}">0</span>
                                    </div>

                                    <div class="filter-card info-card card-baixado">
                                        <i class="fluigicon fluigicon-wheelchair icon-sm text-success"></i>
                                        <span class="card-label">Vagas PCD:</span>
                                        <span class="card-value" id="lblTotalPcd_${instanceId}">0</span>
                                    </div>

                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>

</div>