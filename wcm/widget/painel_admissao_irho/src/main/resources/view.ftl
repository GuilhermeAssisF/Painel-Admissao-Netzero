<div id="WidgetAdmissao_${instanceId}" class="super-widget wcm-widget-class fluig-style-guide" data-params="WidgetAdmissao.instance()">

    <!-- Bibliotecas Necessárias -->
    <script type="text/javascript" src="/webdesk/vcXMLRPC.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/v/bs/dt-1.10.12/datatables.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>

    <!-- Cabeçalho -->
    <div class="custom-page-header">
        <div class="header-title">
            <h2>
                <i class="fluigicon fluigicon-user-add icon-md" style="color: #015eb4;"></i> 
                Painel de Admissão Digital
            </h2>
        </div>

        <div class="header-actions">
            <!-- Paginação -->
            <div class="filter-card dropdown-card" style="min-width: 130px; justify-content: space-between;">
                <span class="card-label">Exibir: <span id="lblPageLen_${instanceId}" style="color: #2196F3;">10</span></span>
                <i class="fluigicon fluigicon-chevron-down arrow"></i>
                <div class="filter-card-options" style="min-width: 100px;">
                    <div class="opt-page-len" data-val="10">10 registos</div>
                    <div class="opt-page-len" data-val="25">25 registos</div>
                    <div class="opt-page-len" data-val="50">50 registos</div>
                    <div class="opt-page-len" data-val="100">100 registos</div>
                </div>
            </div>

            <!-- Visibilidade de Colunas -->
            <div class="filter-card dropdown-card">
                <i class="fluigicon fluigicon-columns icon-sm" style="color:#607d8b; margin-right:5px;"></i>
                <span class="card-label">Colunas</span>
                <i class="fluigicon fluigicon-chevron-down arrow"></i>
                <div class="filter-card-options" id="colVis_${instanceId}" style="min-width: 180px;">
                    <label><input type="checkbox" class="toggle-vis" data-column="0" checked> Nº Solicitação</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="1" checked> Filial</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="2" checked> CPF</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="3" checked> Nome Candidato</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="4" checked> Email</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="5" checked> Cargo Aprovado</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="6" checked> Departamento</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="7" checked> Jornada</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="8" checked> Salário</label>
                    <label><input type="checkbox" class="toggle-vis" data-column="9" checked> Data Início</label>
                </div>
            </div>
        </div>
    </div>

    <!-- Filtros Superiores de Busca -->
    <div class="row">
        <div class="col-md-6">
            <div class="form-group">
                <label for="filtroFilial_${instanceId}">Filial / Empresa</label>
                <select id="filtroFilial_${instanceId}" class="form-control">
                    <option value="">Todas as Filiais</option>
                    <option value="SP">São Paulo - Matriz</option>
                    <option value="RJ">Rio de Janeiro - Filial</option>
                    <option value="MG">Minas Gerais - Filial</option>
                </select>
            </div>
        </div>
        <div class="col-md-2">
            <div class="form-group">
                <label for="filtroDataDe_${instanceId}">Data Início (De)</label>
                <input type="date" id="filtroDataDe_${instanceId}" class="form-control">
            </div>
        </div>
        <div class="col-md-2">
            <div class="form-group">
                <label for="filtroDataAte_${instanceId}">Data Início (Até)</label>
                <input type="date" id="filtroDataAte_${instanceId}" class="form-control">
            </div>
        </div>
        <div class="col-md-2">
            <label>&nbsp;</label>
            <button class="btn btn-info btn-block" id="btnAtualizar_${instanceId}">
                <i class="fluigicon fluigicon-search"></i> Aplicar
            </button>
        </div>
    </div>

    <!-- Linha de Chips (Filtros Dinâmicos e Rápidos) -->
    <div class="row">
        <div class="col-md-12">
            <div class="filter-cards-row">
                
                <div class="filter-card search-card" onclick="$('#buscaGeral_${instanceId}').focus()">
                    <i class="fluigicon fluigicon-search"></i>
                    <input type="text" id="buscaGeral_${instanceId}" placeholder="Pesquisar globalmente...">
                </div>
                
                <div class="filter-card search-card" onclick="$('#buscaRapidaCpf_${instanceId}').focus()">
                    <i class="fluigicon fluigicon-search"></i>
                    <input type="text" id="buscaRapidaCpf_${instanceId}" placeholder="Filtrar por NIF/CPF...">
                </div>

                <div class="filter-card dropdown-card">
                    <i class="fluigicon fluigicon-filter icon-sm" style="color:#2196F3; margin-right:5px;"></i>
                    <span class="card-label">Status Processo</span>
                    <i class="fluigicon fluigicon-chevron-down arrow"></i>
                    <div class="filter-card-options">
                        <label><input type="checkbox" class="chk-filtro-status" value="em_andamento" checked> <span class="text-warning">Em Andamento</span></label>
                        <label><input type="checkbox" class="chk-filtro-status" value="concluida" checked> <span class="text-success">Concluída</span></label>
                        <label><input type="checkbox" class="chk-filtro-status" value="cancelada" checked> <span class="text-muted">Cancelada</span></label>
                    </div>
                </div>

                <div class="filter-card dropdown-card">
                    <i class="fluigicon fluigicon-folder-open icon-sm" style="color:#FF9800; margin-right:5px;"></i>
                    <span class="card-label">Documentação</span>
                    <i class="fluigicon fluigicon-chevron-down arrow"></i>
                    <div class="filter-card-options">
                        <label><input type="checkbox" class="chk-filtro-docs" value="pendente" checked> <span class="text-danger">Pendente</span></label>
                        <label><input type="checkbox" class="chk-filtro-docs" value="validada" checked> <span class="text-success">Validada</span></label>
                    </div>
                </div>

                <div class="filter-card action-card" id="btnLimparFiltros_${instanceId}">
                    <i class="fluigicon fluigicon-eraser icon-sm" style="color:#d32f2f; margin-right:5px;"></i>
                    <span class="card-label">Limpar Filtros</span>
                </div>

            </div>
        </div>
    </div>

    <!-- Tabela de Registos -->
    <div class="row" style="margin-top: 10px;">
        <div class="col-md-12">
            <div class="table-responsive">
                <table id="tblAdmissao_${instanceId}" class="table table-hover table-striped">
                    <thead>
                        <tr>
                            <th width="8%" class="text-center">ID ATS</th>
                            <th width="10%">CNPJ Filial</th>
                            <th width="12%" class="text-center">CPF</th>
                            <th width="15%">Nome Candidato</th>
                            <th width="15%">Email</th>
                            <th width="12%">Cargo Aprovado</th>
                            <th width="10%">Departamento</th>
                            <th width="8%" class="text-center">Contratação</th>
                            <th width="10%" class="text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                    <tfoot>
                        <tr>
                            <td colspan="10" style="padding: 15px 0; background-color: #fff; border-top: 2px solid #eee;">
                                <!-- Cards de Totais no Rodapé -->
                                <div class="filter-cards-row" style="justify-content: center; margin: 0; gap: 30px;">
                                    <div class="filter-card info-card card-aberto">
                                        <i class="fluigicon fluigicon-user-clock icon-sm text-warning"></i>
                                        <span class="card-label">Admissões Pendentes:</span>
                                        <span class="card-value" id="lblTotalPendentes_${instanceId}">0</span>
                                    </div>

                                    <div class="filter-card info-card card-baixado">
                                        <i class="fluigicon fluigicon-user-check icon-sm text-success"></i>
                                        <span class="card-label">Admissões Concluídas:</span>
                                        <span class="card-value" id="lblTotalConcluidas_${instanceId}">0</span>
                                    </div>

                                    <div class="filter-card info-card card-total">
                                        <i class="fluigicon fluigicon-money icon-sm text-primary"></i>
                                        <span class="card-label">Soma de Salários (Visíveis):</span>
                                        <span class="card-value" id="lblSomaSalarios_${instanceId}">R$ 0,00</span>
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