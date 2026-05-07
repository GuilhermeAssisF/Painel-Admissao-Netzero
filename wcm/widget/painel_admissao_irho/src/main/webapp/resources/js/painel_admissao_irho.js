var WidgetAdmissao = SuperWidget.extend({
    instanceId: null,
    table: null,

    // Filtros Iniciais (Nascem Vazios para mostrar TUDO do ATS)
    filtros: {
        dataDe: "",
        dataAte: "",
        cpf: "",
        cnpj: ""
    },

    // ==========================================
    // CACHE DE ALTA PERFORMANCE
    // ==========================================
    cacheColigadas: null,
    cacheRequisicoes: {},

    init: function () {
        var that = this;

        // Limpa os campos de data no arranque
        $("#filtroDataDe_" + this.instanceId).val("");
        $("#filtroDataAte_" + this.instanceId).val("");

        this.setupListeners();

        // Constrói a interface do Dashboard Moderno acima da tabela
        this.buildDashboardUI();

        // Atraso intencional para carregar dependências e desenhar tabela
        setTimeout(function () {
            that.initTable();
            that.carregarDados();
        }, 300);
    },

    setupListeners: function () {
        var that = this;

        // ==========================================
        // LINHA 1: Datas (Acionado apenas pelo botão)
        // ==========================================
        $("#btnAtualizarDatas_" + this.instanceId).on('click', function () {
            that.filtros.dataDe = $("#filtroDataDe_" + that.instanceId).val();
            that.filtros.dataAte = $("#filtroDataAte_" + that.instanceId).val();
            that.table.draw(); // Dispara o motor de filtro (que avalia as datas)
        });

        // Pesquisa Global (Busca em todas as colunas ao mesmo tempo)
        $("#buscaGeral_" + this.instanceId).on("keyup", function () {
            if (that.table) that.table.search($(this).val()).draw();
        });

        // ==========================================
        // LINHA 2: Filtros Específicos (Acionamento automático)
        // ==========================================

        // CPF (Busca à prova de formatação)
        $("#buscaRapidaCpf_" + this.instanceId).on("keyup", function () {
            that.filtros.cpf = $(this).val().replace(/\D/g, ''); // Guarda só números
            if (that.table) that.table.draw();
        });

        // CNPJ (Busca à prova de formatação)
        $("#buscaRapidaCnpj_" + this.instanceId).on("keyup", function () {
            that.filtros.cnpj = $(this).val().replace(/\D/g, ''); // Guarda só números
            if (that.table) that.table.draw();
        });

        // Jornada (Busca direta por valor exato, pois é um dropdown)
        $(".chk-filtro-jornada").on("change", function () {
            var valor = $(this).val();
            if (that.table) that.table.column(2).search(valor).draw(); // <-- Alterado de 3 para 2
        });

        // Refiltragem Rádio de PCD
        $(".chk-filtro-pcd").on("change", function () {
            that.table.draw();
        });

        // ==========================================
        // CONTROLOS DE UI (Menus, Limpeza, etc)
        // ==========================================

        // Controlo de Menus Dropdown
        $(".dropdown-card").on("click", function (e) {
            if ($(e.target).closest('input, label').length > 0) return;
            var $options = $(this).find(".filter-card-options");
            var isActive = $options.hasClass("active");

            $(".filter-card-options").removeClass("active");
            $(".dropdown-card .arrow").css("transform", "rotate(0deg)");

            if (!isActive) {
                $options.addClass("active");
                $(this).find(".arrow").css("transform", "rotate(180deg)");
            }
        });

        $(document).on('click.fecharMenu', function (e) {
            if (!$(e.target).closest('.dropdown-card').length) {
                $(".filter-card-options").removeClass("active");
                $(".dropdown-card .arrow").css("transform", "rotate(0deg)");
            }
        });

        // Limpar TODOS os Filtros
        $("#btnLimparFiltros_" + this.instanceId).on("click", function () {
            $("#buscaGeral_" + that.instanceId).val("");
            $("#buscaRapidaCpf_" + that.instanceId).val("");
            $("#buscaRapidaCnpj_" + that.instanceId).val("");
            $("#filtroDataDe_" + that.instanceId).val("");
            $("#filtroDataAte_" + that.instanceId).val("");

            $(".chk-filtro-pcd[value='TODOS']").prop('checked', true);
            $(".chk-filtro-jornada[value='']").prop('checked', true);

            that.filtros.dataDe = "";
            that.filtros.dataAte = "";
            that.filtros.cpf = "";
            that.filtros.cnpj = "";

            if (that.table) {
                that.table.search("").column(2).search("").draw();
            }
            FLUIGC.toast({ message: 'Todos os filtros foram limpos.', type: 'info' });
        });

        $(".opt-page-len").on('click', function () {
            var len = $(this).data("val");
            $("#lblPageLen_" + that.instanceId).text(len);
            if (that.table) that.table.page.len(len).draw();
            $(".filter-card-options").removeClass("active");
        });

        // ==========================================================
        // MOTOR DE BUSCA CUSTOMIZADO (Blindado contra erros de formatação)
        // ==========================================================
        while ($.fn.dataTable.ext.search.length > 0) {
            $.fn.dataTable.ext.search.pop();
        }

        $.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
            if (!that || !that.table || settings.nTable.id !== "tblAdmissao_" + that.instanceId) {
                return true;
            }

            var row = rowData;
            if (!row) return true;

            // 1. Filtro de Datas
            var dataContratacao = row.dataContratacao || "";
            if (that.filtros.dataDe && that.filtros.dataDe !== "" && dataContratacao !== "" && dataContratacao < that.filtros.dataDe) return false;
            if (that.filtros.dataAte && that.filtros.dataAte !== "" && dataContratacao !== "" && dataContratacao > that.filtros.dataAte) return false;

            // 2. Filtro PCD
            var pcdFiltro = $(".chk-filtro-pcd:checked").val();
            if (pcdFiltro === "PCD") {
                var isPCD = (row.deficienciaFisica === "1" || row.deficienciaAuditiva === "1" || row.deficienciaVisual === "1" || row.deficienciaIntelectual === "1");
                if (!isPCD) return false;
            }

            // 3. Filtro CPF (Lê apenas números do campo e da linha)
            if (that.filtros.cpf && that.filtros.cpf !== "") {
                var rowCpf = (row.cpf || "").replace(/\D/g, ''); // Tira pontos e traços do dado nativo
                if (rowCpf.indexOf(that.filtros.cpf) === -1) return false;
            }

            // 4. Filtro CNPJ (Lê apenas números do campo e da linha)
            if (that.filtros.cnpj && that.filtros.cnpj !== "") {
                var rowCnpj = (row.cnpjFilial || "").replace(/\D/g, ''); // Tira pontos e barras do dado nativo
                if (rowCnpj.indexOf(that.filtros.cnpj) === -1) return false;
            }

            return true;
        });
    },

    /**
     * Inicia a renderização do DataTables
     */
    initTable: function () {
        var that = this;

        if ($.fn.DataTable.isDataTable('#tblAdmissao_' + this.instanceId)) {
            $('#tblAdmissao_' + this.instanceId).DataTable().destroy();
        }

        this.table = $('#tblAdmissao_' + this.instanceId).DataTable({
            language: { url: "//cdn.datatables.net/plug-ins/1.10.12/i18n/Portuguese-Brasil.json" },
            dom: 'rtip',
            order: [[0, "desc"]], // Ajustado pois a coluna 4 antiga não existe mais
            autoWidth: false,
            deferRender: true,
            columns: [
                // 0. ID ATS
                { title: "ID ATS", data: "codRequisicaoATS", className: "text-center", defaultContent: "-" },

                // 1. CANDIDATO + CONTATO
                {
                    title: "Candidato e Contato",
                    data: null,
                    render: function (row) {
                        var cpf = row.cpf ? row.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "-";
                        return '<div class="stacked-cell">' +
                            '<strong>' + (row.nomeCandidato || '-') + '</strong>' +
                            '<span class="sub-text">CPF: ' + cpf + '</span>' +
                            '<div style="margin-top: 6px; display: flex; flex-direction: column; gap: 2px;">' +
                            '<a href="mailto:' + row.email + '" class="link-email sub-text"><i class="fluigicon fluigicon-envelope icon-sm"></i> ' + (row.email || '-') + '</a>' +
                            '<span class="sub-text"><i class="fa-solid fa-phone"></i> ' + (row.telefone || '-') + '</span>' +
                            '</div>' +
                            '</div>';
                    }
                },

                // 2. VAGA + LOCAL + PREVISÃO
                {
                    title: "Detalhes da Vaga",
                    data: null,
                    render: function (row) {
                        var cnpj = row.cnpjFilial ? row.cnpjFilial.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "-";
                        var data = row.dataContratacao ? moment(row.dataContratacao).format('DD/MM/YYYY') : "-";

                        return '<div class="stacked-cell">' +
                            '<strong>' + (row.cargoAprovado || '-') + '</strong>' +
                            '<span class="label-jornada" style="margin-top: 2px; margin-bottom: 4px;">' + (row.jornada || '-') + '</span>' +
                            '<span class="sub-text"><strong>Depto:</strong> ' + (row.departamento || '-') + '</span>' +
                            '<span class="sub-text-muted">CNPJ: ' + cnpj + '</span>' +
                            '<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--gray-200);">' +
                            '<span class="sub-text" style="color: var(--gray-800);"><i class="fluigicon fluigicon-calendar icon-sm"></i> Admissão: <strong>' + data + '</strong></span>' +
                            '</div>' +
                            '</div>';
                    }
                },

                // 3. INFO EXTRA
                {
                    title: "Info Extra",
                    data: null,
                    render: function (row) {
                        var nasc = row.dataNascimento ? moment(row.dataNascimento).format('DD/MM/YYYY') : "-";
                        var isPCD = (row.deficienciaFisica === "1" || row.deficienciaAuditiva === "1" || row.deficienciaVisual === "1" || row.deficienciaIntelectual === "1");
                        var labelPcd = isPCD ? '<span class="label label-success" style="margin-top:4px;">PCD</span>' : '';

                        var reqERP = row.codRequisicaoERP || '-';
                        var btnRequisicao = '';

                        // Se existe uma requisição no ERP, adiciona o botão
                        if (reqERP !== '-' && reqERP !== '') {
                            var rowJson = encodeURIComponent(JSON.stringify(row));
                            btnRequisicao = '<button class="btn btn-info btn-xs btn-rounded" style="margin-top: 6px; font-size: 10px; width: 100%;" onclick="WidgetAdmissao.instance().verDadosRequisicao(\'' + rowJson + '\')">' +
                                '<i class="fluigicon fluigicon-zoom-in"></i> Ver Requisição</button>';
                        }

                        return '<div class="stacked-cell">' +
                            '<span class="sub-text">Nasc: ' + nasc + '</span>' +
                            '<span class="sub-text">Tipo Req: ' + (row.tipoRequisicao || '-') + '</span>' +
                            '<span class="sub-text">Req ERP: <strong>' + reqERP + '</strong></span>' +
                            labelPcd +
                            btnRequisicao +
                            '</div>';
                    }
                },

                // 4. STATUS FLUIG
                {
                    title: "Status Fluig",
                    data: null,
                    className: "text-center",
                    render: function (row) {
                        if (row.processoAbertoId) {
                            var statusProcesso = String(row.statusProcesso || "0");

                            // 1. Processo Cancelado
                            if (statusProcesso === "1") {
                                return '<div class="stacked-cell" style="align-items: center;">' +
                                    '<span class="label label-danger" style="white-space: normal; text-align: center; margin-bottom: 4px; padding: 4px 8px;">Solicitação Cancelada</span>' +
                                    '<span class="sub-text-muted">Fluig: ' + row.processoAbertoId + '</span>' +
                                    '</div>';
                            }

                            // 2. Processo Finalizado
                            if (statusProcesso === "2") {
                                return '<div class="stacked-cell" style="align-items: center;">' +
                                    '<span class="label label-success" style="white-space: normal; text-align: center; margin-bottom: 4px; padding: 4px 8px;">Solicitação Finalizada</span>' +
                                    '<span class="sub-text-muted">Fluig: ' + row.processoAbertoId + '</span>' +
                                    '</div>';
                            }

                            // 3. Processo em Andamento (Status 0) - Lógica original das atividades
                            var dicAtividades = {
                                "97": { nome: "Admissão RH", cor: "info" },
                                "122": { nome: "Aguard. Candidato", cor: "warning" },
                                "150": { nome: "Aguard. Correção", cor: "danger" },
                                "135": { nome: "Gerar Kit", cor: "info" },
                                "128": { nome: "Validar Kit", cor: "info" },
                                "129": { nome: "Assinatura Cand.", cor: "warning" },
                                "138": { nome: "Integração RM", cor: "default" },
                                "139": { nome: "Integração RM", cor: "default" },
                                "104": { nome: "Finalizado", cor: "success" }
                            };

                            var dicPassosCandidato = {
                                "1": "Passo 1 - Propostas", "2": "Passo 2 - LGPD", "3": "Passo 3 - Dados",
                                "4": "Passo 4 - Formação", "5": "Passo 5 - Dependentes", "6": "Passo 6 - Filiação",
                                "7": "Passo 7 - Benefícios", "8": "Passo 8 - Documentos", "9": "Passo 9 - Fim"
                            };

                            var atvId = row.atividadeFluig || "0";
                            var infoAtv = dicAtividades[atvId] || { nome: "Em Andamento (" + atvId + ")", cor: "default" };

                            var htmlBadges = '<span class="label label-' + infoAtv.cor + '" style="white-space: normal; text-align: center; margin-bottom: 4px;">' + infoAtv.nome + '</span>';

                            if (atvId === "122" && row.passoCandidato && row.passoCandidato !== "") {
                                var nomePasso = dicPassosCandidato[row.passoCandidato] || ("Passo " + row.passoCandidato);
                                htmlBadges += '<span class="label" style="background-color: #3b82f6 !important; color: #ffffff !important; white-space: normal; text-align: center; margin-bottom: 4px; font-size: 11px; border: none;">' + nomePasso + '</span>';
                            }

                            return '<div class="stacked-cell" style="align-items: center;">' +
                                htmlBadges +
                                '<span class="sub-text-muted">Fluig: ' + row.processoAbertoId + '</span>' +
                                '</div>';
                        } else {
                            return '<span class="label label-default">Não Iniciado</span>';
                        }
                    }
                },

                // 5. AÇÕES
                {
                    title: "Ações",
                    data: null, className: "text-center", orderable: false,
                    render: function (data, type, row) {
                        var rowJson = encodeURIComponent(JSON.stringify(row));

                        var statusProcesso = String(row.statusProcesso || "0");
                        var isCancelado = (statusProcesso === "1");
                        var isFinalizado = (statusProcesso === "2");

                        if (row.processoAbertoId && !isCancelado && !isFinalizado) {
                            // PROCESSO NORMAL (ABERTO = 0)
                            var botoes = '<div style="display: flex; flex-direction: column; gap: 4px; align-items: stretch;">' +
                                '<button class="btn btn-warning btn-sm btn-rounded" style="width: 100%; font-size: 11px; padding: 4px 8px;" title="Abrir Processo" onclick="WidgetAdmissao.instance().abrirProcessoExistente(\'' + row.processoAbertoId + '\')">' +
                                '<i class="fluigicon fluigicon-info-sign"></i> Ver Solicitação</button>';

                            var atvsCandidato = ["122", "150", "129"];
                            if (atvsCandidato.indexOf(String(row.atividadeFluig)) !== -1) {
                                botoes += '<button class="btn btn-success btn-sm btn-rounded" style="width: 100%; font-size: 11px; padding: 4px 8px;" title="Reenviar Link por E-mail" onclick="WidgetAdmissao.instance().reenviarEmailCandidato(\'' + rowJson + '\')">' +
                                    '<i class="fluigicon fluigicon-envelope"></i> Reenviar E-mail</button>';
                            }

                            botoes += '</div>';
                            return botoes;

                        } else if (row.processoAbertoId && isCancelado) {
                            // PROCESSO FOI CANCELADO (STATUS = 1) -> Dois botões com novo layout
                            return '<div style="display: flex; flex-direction: column; gap: 4px; align-items: stretch;">' +
                                '<button class="btn btn-warning btn-sm btn-rounded" style="width: 100%; font-size: 11px; padding: 4px 8px;" title="Ver Histórico Cancelado" onclick="WidgetAdmissao.instance().abrirProcessoExistente(\'' + row.processoAbertoId + '\')">' +
                                '<i class="fluigicon fluigicon-info-sign"></i> Ver Solicitação</button>' +
                                '<button class="btn btn-primary btn-sm btn-rounded" style="width: 100%; font-size: 11px; padding: 4px 8px;" title="Iniciar Novo Processo" onclick="WidgetAdmissao.instance().iniciarProcessoAdmissao(\'' + rowJson + '\')">' +
                                '<i class="fluigicon fluigicon-play-circle"></i> Iniciar Nova</button>' +
                                '</div>';

                        } else if (row.processoAbertoId && isFinalizado) {
                            // PROCESSO FOI FINALIZADO COM SUCESSO (STATUS = 2)
                            return '<div style="display: flex; flex-direction: column; align-items: stretch;">' +
                                '<button class="btn btn-success btn-sm btn-rounded" style="width: 100%; font-size: 11px; padding: 4px 8px;" title="Ver Processo Concluído" onclick="WidgetAdmissao.instance().abrirProcessoExistente(\'' + row.processoAbertoId + '\')">' +
                                '<i class="fluigicon fluigicon-check-circle-on"></i> Ver Solicitação</button>' +
                                '</div>';

                        } else {
                            // NUNCA FOI INICIADO
                            return '<div style="display: flex; flex-direction: column; align-items: stretch;">' +
                                '<button class="btn btn-primary btn-sm btn-rounded" style="width: 100%; font-size: 11px; padding: 4px 8px;" onclick="WidgetAdmissao.instance().iniciarProcessoAdmissao(\'' + rowJson + '\')">' +
                                '<i class="fluigicon fluigicon-play-circle"></i> Iniciar</button>' +
                                '</div>';
                        }
                    }
                }
            ],
            data: []
        });

        this.table.on('draw', function () { that.calcularTotais(); });
    },

    /**
     * Calcula os totais do rodapé com base nos registos VISÍVEIS
     */
    calcularTotais: function () {
        if (!this.table) return;
        var rows = this.table.rows({ filter: 'applied' }).data();

        var totalFila = 0;
        var totalPcd = 0;

        rows.each(function (row) {
            totalFila++;
            if (row.deficienciaFisica === "1" || row.deficienciaAuditiva === "1" || row.deficienciaVisual === "1" || row.deficienciaIntelectual === "1") {
                totalPcd++;
            }
        });

        $("#lblTotalFila_" + this.instanceId).text(totalFila);
        $("#lblTotalPcd_" + this.instanceId).text(totalPcd);
    },

    /**
     * Carrega os dados reais de forma Assíncrona e usa uma Fila de Workers para os Status em Background.
     */
    carregarDados: function () {
        var that = this;
        var load = FLUIGC.loading(window, { textMessage: 'Carregando dados dos candidatos...' });
        load.show();

        var fetchDataset = function (name, fields, constraints) {
            return new Promise(function (resolve, reject) {
                DatasetFactory.getDataset(name, fields, constraints, null, {
                    success: function (data) { resolve(data.values || []); },
                    error: function (err) { reject(err); }
                });
            });
        };

        // PROJEÇÃO: Trazendo apenas o necessário do formulário
        var formFields = [
            "cpfcnpj", "cpfcnpjValue", "idProcessoFluig", "cpNumeroSolicitacao",
            "cpPassoAtualCandidato", "cppassoatualcandidato", "atividadeAtual",
            "txtNomeColaborador", "txtNomeSocial", "txtEmail", "cpEmailCandidato",
            "txtCELULAR", "FUN_IDDESCFUN", "FUN_CARGO", "FUN_SECAO_IDDESC_AD",
            "FUN_ADMISSAO", "FUN_CNPJ_FILIAL", "dtDataNascColaborador", "cpJornadaAdmissao"
        ];

        var constraintsForm = [DatasetFactory.createConstraint("metadata#active", "true", "true", ConstraintType.MUST)];

        Promise.all([
            fetchDataset("ds_dados_publicos_candidato", formFields, constraintsForm),
            fetchDataset("ds_irho_atsAprovados", null, null)
        ]).then(function (resultados) {

            var dsAbertosValues = resultados[0];
            var registosATS = resultados[1];
            var mapProcessos = {};

            // 1. Mapeia o formulário
            for (var i = 0; i < dsAbertosValues.length; i++) {
                var r = dsAbertosValues[i];
                var cpfForm = r["cpfcnpj"] || r.cpfcnpj || r["cpfcnpjValue"] || r.cpfcnpjValue;
                var idProc = r["idProcessoFluig"] || r.idProcessoFluig || r["cpNumeroSolicitacao"] || r.cpNumeroSolicitacao;

                if (cpfForm && idProc && idProc !== "" && idProc !== "null") {
                    var cpfLimpo = String(cpfForm).replace(/\D/g, '');
                    mapProcessos[cpfLimpo] = {
                        id: String(idProc), atividade: r["atividadeAtual"] || r.atividadeAtual || "0", passo: r["cpPassoAtualCandidato"] || r["cppassoatualcandidato"] || "",
                        nome: r["txtNomeColaborador"] || r["txtNomeSocial"] || "Sem Nome", email: r["txtEmail"] || r["cpEmailCandidato"] || "", telefone: r["txtCELULAR"] || "",
                        cargo: r["FUN_IDDESCFUN"] || r["FUN_CARGO"] || "-", departamento: r["FUN_SECAO_IDDESC_AD"] || "-",
                        dataContratacao: (r["FUN_ADMISSAO"] && r["FUN_ADMISSAO"].indexOf("/") > -1) ? r["FUN_ADMISSAO"].split('/').reverse().join('-') : "",
                        dataNascimento: (r["dtDataNascColaborador"] && r["dtDataNascColaborador"].indexOf("/") > -1) ? r["dtDataNascColaborador"].split('/').reverse().join('-') : "",
                        jornada: r["cpJornadaAdmissao"] || "-", cnpjFilial: r["FUN_CNPJ_FILIAL"] || "", processadoNoATS: false
                    };
                }
            }

            var finalRegistros = [];
            if (registosATS.length > 0 && registosATS[0].ERROR && registosATS[0].ERROR !== "") registosATS = [];

            // 2. Cruza com ATS
            for (var j = 0; j < registosATS.length; j++) {
                var c = registosATS[j];
                var atsCpfLimpo = (c.cpf || "").replace(/\D/g, '');

                if (mapProcessos[atsCpfLimpo]) {
                    c.processoAbertoId = mapProcessos[atsCpfLimpo].id;
                    c.atividadeFluig = mapProcessos[atsCpfLimpo].atividade;
                    c.passoCandidato = mapProcessos[atsCpfLimpo].passo;
                    c.statusProcesso = "0";
                    mapProcessos[atsCpfLimpo].processadoNoATS = true;
                } else {
                    c.processoAbertoId = null; c.atividadeFluig = null; c.passoCandidato = null; c.statusProcesso = null;
                }
                finalRegistros.push(c);
            }

            // 3. Resgata Manuais
            for (var cpfKey in mapProcessos) {
                if (mapProcessos[cpfKey].processadoNoATS === false) {
                    var pLocal = mapProcessos[cpfKey];
                    finalRegistros.push({
                        codRequisicaoATS: '<div style="line-height: 1.3; font-size: 11px; color: #6b7280; font-weight: 500;">Processo<br>Aberto<br>Manualmente</div>',
                        nomeCandidato: pLocal.nome, cpf: cpfKey, email: pLocal.email, telefone: pLocal.telefone, cargoAprovado: pLocal.cargo, departamento: pLocal.departamento,
                        dataContratacao: pLocal.dataContratacao, dataNascimento: pLocal.dataNascimento, jornada: pLocal.jornada, cnpjFilial: pLocal.cnpjFilial,
                        processoAbertoId: pLocal.id, atividadeFluig: pLocal.atividade, passoCandidato: pLocal.passo, statusProcesso: "0",
                        tipoRequisicao: "Manual", codRequisicaoERP: "-", deficienciaFisica: "0", deficienciaAuditiva: "0", deficienciaVisual: "0", deficienciaIntelectual: "0", isManual: true
                    });
                }
            }

            // MÁGICA: Tira o loading e desenha a tabela NA HORA
            that.table.clear().rows.add(finalRegistros).draw();
            load.hide();

            // Atualiza os Cards Superiores
            that.updateMetrics(finalRegistros);

            // =========================================================================
            // WORKER QUEUE: Busca de Status Individual e Paralela (À prova de bugs do Fluig)
            // =========================================================================

            // Removemos duplicatas para não fazer requisições à toa
            var idsParaStatus = [];
            finalRegistros.forEach(function (r) {
                var id = r.processoAbertoId ? String(r.processoAbertoId) : null;
                if (id && id !== "null" && id !== "" && idsParaStatus.indexOf(id) === -1) {
                    idsParaStatus.push(id);
                }
            });

            if (idsParaStatus.length > 0) {
                var idIndex = 0;

                var processarProximoId = function () {
                    if (idIndex >= idsParaStatus.length) return; // Fila terminou

                    var currentId = idsParaStatus[idIndex];
                    idIndex++;

                    // A grande jogada: O Fluig NÃO falha quando usamos um MUST isolado para uma chave primária!
                    var cStatus = [DatasetFactory.createConstraint("workflowProcessPK.processInstanceId", currentId, currentId, ConstraintType.MUST)];

                    // Enviamos os fields como null para garantir que nenhuma projeção quebre o dataset nativo
                    fetchDataset("workflowProcess", null, cStatus)
                        .then(function (dsStatus) {
                            var realStatus = null;
                            if (dsStatus && dsStatus.length > 0) {
                                realStatus = String(dsStatus[0]["status"]);
                            }

                            var mudouAlguem = false;
                            var rowsToRemove = [];

                            // Atualiza a(s) linha(s) exata(s) que pertencem a este ID
                            that.table.rows().every(function () {
                                var rData = this.data();

                                if (String(rData.processoAbertoId) === currentId) {
                                    // 1. PROCESSO APAGADO DO FLUIG (FANTASMA)
                                    if (realStatus === null) {
                                        if (rData.isManual) {
                                            rowsToRemove.push(this); // Manual apagado = Remove
                                        } else {
                                            // ATS apagado = Solta o ID para o RH iniciar um novo
                                            rData.processoAbertoId = null;
                                            rData.atividadeFluig = null;
                                            rData.passoCandidato = null;
                                            rData.statusProcesso = null;
                                            this.data(rData);
                                            mudouAlguem = true;
                                        }
                                    }
                                    // 2. PROCESSO EXISTE (Avalia os Status Reais 0, 1 ou 2)
                                    else {
                                        if (rData.isManual && realStatus === "1") {
                                            // A SUA REGRA: Processo Manual + Status Cancelado (1) = Remove
                                            rowsToRemove.push(this);
                                        } else if (rData.statusProcesso !== realStatus) {
                                            // Atualiza processos abertos, finalizados e os cancelados do ATS
                                            rData.statusProcesso = realStatus;
                                            this.data(rData);
                                            mudouAlguem = true;
                                        }
                                    }
                                }
                            });

                            // Arranca a linha do DataTables se caiu nas regras de exclusão
                            if (rowsToRemove.length > 0) {
                                for (var k = 0; k < rowsToRemove.length; k++) {
                                    rowsToRemove[k].remove();
                                }
                                mudouAlguem = true;
                            }

                            // Redesenha a tabela instantaneamente sem piscar a tela
                            if (mudouAlguem) that.table.draw(false);

                            // Manda o Worker puxar o próximo ID da fila
                            processarProximoId();

                        }).catch(function (e) {
                            console.error("Erro ao checar ID " + currentId, e);
                            processarProximoId(); // Se der erro de rede, não trava a fila, apenas segue
                        });
                };

                // Lança 3 "Trabalhadores" simultâneos. Eles vão limpar a lista inteira juntos.
                for (var w = 0; w < 3; w++) {
                    processarProximoId();
                }
            }

        }).catch(function (err) {
            console.error("Erro no Promise.all:", err);
            FLUIGC.toast({ title: 'Erro:', message: 'Falha ao buscar as bases de dados iniciais.', type: 'danger' });
            load.hide();
        });
    },

    /**
     * Redireciona para a tela de Início do Processo preenchendo APENAS os dados solicitados.
     */
    /**
     * Redireciona para a tela de Início do Processo preenchendo APENAS os dados solicitados.
     */
    iniciarProcessoAdmissao: function (rowJsonEncoded) {
        var c = JSON.parse(decodeURIComponent(rowJsonEncoded));
        var dtContBR = c.dataContratacao ? c.dataContratacao.split('-').reverse().join('/') : "";

        // 1. Limpa o CNPJ que vem do ATS para ter apenas números (Ex: 45455135000180)
        var cnpjBuscaLimpo = String(c.cnpjFilial || "").replace(/\D/g, '');

        var load = FLUIGC.loading(window, { textMessage: 'Validando CNPJ e buscando Filial no RM...' });
        load.show();

        // 2. Busca todas as filiais no dataset ponte via AJAX para não travar a tela
        var url = WCMAPI.getServerURL() + '/api/public/ecm/dataset/datasets';

        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name: "ds_irho_empresaFilial" }), // Sem constraints para trazer todas as opções
            success: function (res) {
                load.hide();
                var filialSelecionada = null;

                if (res.content && res.content.values && res.content.values.length > 0) {
                    var filiais = res.content.values;

                    // 3. Percorre o dataset deparando os CNPJs
                    for (var i = 0; i < filiais.length; i++) {
                        var rowFilial = filiais[i];

                        // Pega o CNPJ da Filial retornado pelo RM (Lida com letras maiúsculas/minúsculas da API do Fluig)
                        var cnpjRM = String(rowFilial["CNPJ_FILIAL"] || rowFilial["cnpj_filial"] || "").replace(/\D/g, '');

                        // Se o CNPJ_FILIAL estiver vazio na linha, tenta olhar o CNPJ da Coligada (Matriz)
                        if (cnpjRM === "") {
                            cnpjRM = String(rowFilial["CNPJ"] || rowFilial["cnpj"] || "").replace(/\D/g, '');
                        }

                        // DE/PARA: Se os números baterem perfeitamente, achamos a filial correspondente!
                        if (cnpjRM !== "" && cnpjRM === cnpjBuscaLimpo) {
                            filialSelecionada = rowFilial;
                            console.log("[DEBUG] Match Perfeito de CNPJ Encontrado: ", filialSelecionada);
                            break; // Encontrou, interrompe o laço
                        }
                    }
                }

                if (!filialSelecionada && cnpjBuscaLimpo !== "") {
                    FLUIGC.toast({ title: 'Atenção:', message: 'Nenhuma filial encontrada para o CNPJ ' + c.cnpjFilial + '. O campo no formulário ficará em branco.', type: 'warning' });
                }

                // 4. Monta o pacote de dados injetando o resultado do de/para
                var atsData = {
                    "txtOrigemAdmissao": "TOTVS_ATS",
                    "txtIdCandidatoATS": c.idCandidatoATS || "",
                    "cpNumRequisicaoERP": c.codRequisicaoERP || "",
                    "cpNumRequisicaoATS": c.codRequisicaoATS || "",

                    "cpfcnpj": c.cpf || "",
                    "txtNomeSocial": c.nomeCandidato || "",
                    "txtEmail": c.email || "",
                    "cpEmailCandidato": c.email || "",
                    "txtCELULAR": c.telefone || "",
                    "FUN_ADMISSAO": dtContBR,
                    "cpDataPrevisaoAdmissao": dtContBR,
                    "cpJornadaAdmissao": c.jornada || "CLT",

                    "cpDeficienciaFisica": c.deficienciaFisica === "1" ? "Sim" : "Não",
                    "cpDeficienciaAuditiva": c.deficienciaAuditiva === "1" ? "Sim" : "Não",
                    "cpDeficienciaVisual": c.deficienciaVisual === "1" ? "Sim" : "Não",
                    "cpDeficienciaIntelectual": c.deficienciaIntelectual === "1" ? "Sim" : "Não",
                    "cand_possui_deficiencia": (c.deficienciaFisica === "1" || c.deficienciaAuditiva === "1" || c.deficienciaVisual === "1" || c.deficienciaIntelectual === "1") ? "Sim" : "Não",

                    "CNPJ_FILIAL_ATS": c.cnpjFilial || "",

                    // =====================================================================
                    // INJEÇÃO DA FILIAL ENCONTRADA NO ZOOM
                    // =====================================================================
                    "IDDESC_EMPRESAFILIAL": filialSelecionada ? (filialSelecionada["IDDESC_EMPFILIALCOM"] || filialSelecionada["iddesc_empfilialcom"] || "") : "",
                    "FUN_EMPRESA": filialSelecionada ? (filialSelecionada["ID_EMPRESA"] || filialSelecionada["id_empresa"] || "") : "",
                    "FUN_FILIAL": filialSelecionada ? (filialSelecionada["ID_FILIAL"] || filialSelecionada["id_filial"] || "") : "",
                    "FUN_NOMECOMERCIAL_FILIAL": filialSelecionada ? (filialSelecionada["NOMECOMERCIAL_FILIAL"] || filialSelecionada["nomecomercial_filial"] || "") : "",
                    "FUN_CNPJ_FILIAL": filialSelecionada ? (filialSelecionada["CNPJ_FILIAL"] || filialSelecionada["cnpj_filial"] || "") : "",
                    "FUN_LOGRADOURO_FILIAL": filialSelecionada ? (filialSelecionada["LOGRADOURO_FILIAL"] || filialSelecionada["logradouro_filial"] || "") : "",
                    "FUN_BAIRRO_FILIAL": filialSelecionada ? (filialSelecionada["BAIRRO_FILIAL"] || filialSelecionada["bairro_filial"] || "") : "",
                    "FUN_CIDADE_FILIAL": filialSelecionada ? (filialSelecionada["CIDADE_FILIAL"] || filialSelecionada["cidade_filial"] || "") : "",
                    "FUN_ESTADO_FILIAL": filialSelecionada ? (filialSelecionada["ESTADO_FILIAL"] || filialSelecionada["estado_filial"] || "") : "",

                    "_dadosOriginais": c
                };

                localStorage.setItem("FLUIG_ATS_DATA", JSON.stringify(atsData));

                var tenant = WCMAPI.tenantCode || "1";
                var urlFluig = '/portal/p/' + tenant + '/pageworkflowview?processID=FLUIG-0002%20-%20Admissão%20IRHO';
                window.open(urlFluig, '_blank');
            },
            error: function (err) {
                load.hide();
                FLUIGC.toast({ title: 'Erro de Comunicação:', message: 'Falha ao consultar as Filiais no Fluig.', type: 'danger' });
            }
        });
    },

    /**
     * Função para reenviar o link para o candidato baseado na etapa em que ele está parado
     */
    reenviarEmailCandidato: function (rowJsonEncoded) {
        var row = JSON.parse(decodeURIComponent(rowJsonEncoded));
        var numSolicitacao = row.processoAbertoId;
        var nome = row.nomeCandidato;
        var atividade = String(row.atividadeFluig);

        var load = FLUIGC.loading(window, { textMessage: 'Buscando e-mail atualizado do candidato...' });
        load.show();

        // 1. Busca os dados do formulário atualizados no Fluig
        var c1 = DatasetFactory.createConstraint("idProcessoFluig", numSolicitacao, numSolicitacao, ConstraintType.MUST);

        DatasetFactory.getDataset("ds_dados_publicos_candidato", null, [c1], null, {
            success: function (dsDados) {
                var emailDestino = "";

                if (dsDados && dsDados.values && dsDados.values.length > 0) {
                    // Pega o e-mail do campo principal, com fallback caso existam variações
                    emailDestino = dsDados.values[0].txtEmail || dsDados.values[0].cpEmailCandidato || "";
                }

                if (!emailDestino || emailDestino.trim() === "") {
                    load.hide();
                    FLUIGC.toast({ title: 'Aviso:', message: 'E-mail não encontrado no cadastro deste processo.', type: 'warning' });
                    return;
                }

                load.textMessage = 'Enviando e-mail...';

                // 2. Identifica qual a URL que precisamos buscar baseado na etapa
                var chaveUrlConfig = "URL_PAGINA_CANDIDATO"; // Padrão para a 122
                if (atividade === "150") chaveUrlConfig = "URL_PAGINA_CORRECAO";
                if (atividade === "129") chaveUrlConfig = "URL_PAGINA_ASSINATURA";

                // 3. Busca a URL Base dinamicamente no Dataset de Configurações
                var cActive = DatasetFactory.createConstraint("metadata#active", "true", "true", ConstraintType.MUST);

                DatasetFactory.getDataset("Form_Configuracoes_Admissao", null, [cActive], null, {
                    success: function (dsConfig) {
                        var baseUrl = "URL_NAO_CONFIGURADA";

                        if (dsConfig && dsConfig.values && dsConfig.values.length > 0) {
                            baseUrl = dsConfig.values[0][chaveUrlConfig];
                        }

                        if (baseUrl === "URL_NAO_CONFIGURADA" || !baseUrl) {
                            load.hide();
                            FLUIGC.toast({ title: 'Erro de Configuração:', message: 'A URL (' + chaveUrlConfig + ') não foi encontrada nas configurações.', type: 'danger' });
                            return;
                        }

                        // 4. Monta o link final com o ID da solicitação e dispara o Dataset de Envio
                        var linkPublico = baseUrl + "?id_origem=" + numSolicitacao;

                        var cEmail = DatasetFactory.createConstraint("emailDestino", emailDestino, emailDestino, ConstraintType.MUST);
                        var cNome = DatasetFactory.createConstraint("nomeCandidato", nome, nome, ConstraintType.MUST);
                        var cLink = DatasetFactory.createConstraint("linkAcesso", linkPublico, linkPublico, ConstraintType.MUST);

                        DatasetFactory.getDataset("ds_reenviar_email_link", null, [cEmail, cNome, cLink], null, {
                            success: function (data) {
                                load.hide();
                                if (data.values && data.values.length > 0 && data.values[0].status == "OK") {
                                    FLUIGC.toast({ title: 'Sucesso:', message: 'E-mail reenviado para ' + emailDestino, type: 'success' });
                                } else {
                                    var msgErro = (data.values && data.values.length > 0) ? data.values[0].mensagem : "Erro desconhecido";
                                    FLUIGC.toast({ title: 'Erro no Envio:', message: msgErro, type: 'danger' });
                                }
                            },
                            error: function (msg) {
                                load.hide();
                                FLUIGC.toast({ title: 'Falha Técnica:', message: 'Erro ao se comunicar com o Dataset de envio de e-mails.', type: 'danger' });
                            }
                        });
                    },
                    error: function (err) {
                        load.hide();
                        FLUIGC.toast({ title: 'Falha de Leitura:', message: 'Erro ao consultar o Form_Configuracoes_Admissao.', type: 'danger' });
                    }
                });
            },
            error: function (err) {
                load.hide();
                FLUIGC.toast({ title: 'Erro de Leitura:', message: 'Não foi possível buscar os dados públicos do candidato.', type: 'danger' });
            }
        });
    },

    /**
     * Redireciona diretamente para o visualizador de um processo que já foi aberto.
     */
    abrirProcessoExistente: function (processInstanceId) {
        var tenant = WCMAPI.tenantCode || "1";
        // URL nativa do Fluig para abrir tarefas existentes
        var urlFluig = '/portal/p/' + tenant + '/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=' + processInstanceId;
        window.open(urlFluig, '_blank');
    },

    /**
     * Busca os dados da Requisição utilizando Cache (Memória) para velocidade extrema.
     */
    verDadosRequisicao: function (rowJsonEncoded) {
        var instance = WidgetAdmissao.instance();
        var c = JSON.parse(decodeURIComponent(rowJsonEncoded));
        var idReq = String(c.codRequisicaoERP || "").trim();
        var tipoReq = String(c.tipoRequisicao || "").trim();
        var cnpjBuscaLimpo = String(c.cnpjFilial || "").replace(/\D/g, '');

        if (!idReq || idReq === "" || idReq === "-") {
            FLUIGC.toast({ title: 'Aviso:', message: 'Não há requisição vinculada.', type: 'warning' });
            return;
        }

        if (tipoReq === "1") {
            FLUIGC.toast({ title: 'Em breve:', message: 'A visualização de Requisições de Substituição será liberada na próxima atualização.', type: 'info' });
            return;
        }

        // =======================================================================
        // OTIMIZAÇÃO: Se a requisição já foi descarregada nesta sessão, abre NA HORA!
        // =======================================================================
        if (instance.cacheRequisicoes[idReq]) {
            instance.montarModalRequisicao(instance.cacheRequisicoes[idReq], idReq);
            return;
        }

        var load = FLUIGC.loading(window, { textMessage: 'Validando Coligada...' });
        load.show();

        // Promessa para procurar a Coligada de forma inteligente (Só vai ao servidor na 1ª vez)
        var obterColigada = function () {
            return new Promise(function (resolve, reject) {
                if (instance.cacheColigadas) {
                    resolve(instance.cacheColigadas[cnpjBuscaLimpo]); // Retorna da memória instantaneamente
                    return;
                }

                // Se a memória estiver vazia, vai buscar ao servidor
                DatasetFactory.getDataset("ds_irho_empresaFilial", null, null, null, {
                    success: function (res) {
                        instance.cacheColigadas = {};
                        if (res && res.values) {
                            for (var i = 0; i < res.values.length; i++) {
                                var cnpjRM = String(res.values[i]["CNPJ_FILIAL"] || res.values[i]["cnpj_filial"] || res.values[i]["CNPJ"] || "").replace(/\D/g, '');
                                var codEmp = String(res.values[i]["ID_EMPRESA"] || res.values[i]["id_empresa"] || "");
                                if (cnpjRM !== "") instance.cacheColigadas[cnpjRM] = codEmp;
                            }
                        }
                        resolve(instance.cacheColigadas[cnpjBuscaLimpo]);
                    },
                    error: function (err) { reject(err); }
                });
            });
        };

        // Executa o fluxo otimizado
        obterColigada().then(function (codColigadaEncontrada) {
            if (!codColigadaEncontrada) {
                load.hide();
                FLUIGC.toast({ title: 'Erro:', message: 'Coligada não identificada para este CNPJ.', type: 'warning' });
                return;
            }

            load.textMessage = 'Consultando TOTVS RM...';

            var cColigada = DatasetFactory.createConstraint("CODCOLIGADA", codColigadaEncontrada, codColigadaEncontrada, ConstraintType.MUST);
            var cIdReq = DatasetFactory.createConstraint("IDREQ", idReq, idReq, ConstraintType.MUST);

            DatasetFactory.getDataset("ds_irho_aumentoQuadro", null, [cColigada, cIdReq], null, {
                success: function (dsReq) {
                    load.hide();
                    if (dsReq && dsReq.values && dsReq.values.length > 0) {
                        var r = dsReq.values[0];
                        if (r["ERROR"] && r["ERROR"] !== "") {
                            FLUIGC.toast({ title: 'Erro do RM:', message: r["ERROR"], type: 'danger' });
                            return;
                        }

                        // Guardamos a coligada encontrada dentro do objeto para o modal saber qual é
                        r._codColigadaEncontrada = codColigadaEncontrada;

                        // GUARDA NA MEMÓRIA para o próximo clique!
                        instance.cacheRequisicoes[idReq] = r;

                        instance.montarModalRequisicao(r, idReq);
                    } else {
                        FLUIGC.toast({ title: 'Aviso:', message: 'Requisição não encontrada no RM.', type: 'warning' });
                    }
                },
                error: function (err) { load.hide(); FLUIGC.toast({ title: 'Erro:', message: 'Falha ao consultar RM.', type: 'danger' }); }
            });

        }).catch(function () {
            load.hide();
            FLUIGC.toast({ title: 'Erro:', message: 'Falha ao buscar a Filial.', type: 'danger' });
        });
    },

    /**
     * Isola a montagem visual do Modal (Pode ser chamado instantaneamente pelo Cache ou após ir ao RM)
     */
    montarModalRequisicao: function (r, idReq) {
        var labels = {
            "CODCOLREQUISICAO": "Coligada Req.", "IDREQ": "ID Requisição", "JUSTIFICATIVA": "Justificativa/Vaga", "DATAABERTURA": "Abertura",
            "CODCOLREQUISITANTE": "Coligada Solicitante", "CHAPAREQUISITANTE": "Chapa Solicitante", "CODATENDIMENTO": "Tipo Atendimento", "CODLOCAL": "Localidade",
            "CODSTATUS": "Status", "DATACANCELAMENTO": "Cancelamento", "DATAPREVISTA": "Previsão", "DATACONCLUSAO": "Conclusão",
            "NUMVAGAS": "Total de Vagas", "CODFILIAL": "Cód. Filial", "CODSECAO": "Cód. Seção", "CODFUNCAO": "Cód. Função",
            "CODTABELASALARIAL": "Tab. Salarial", "CODNIVELSALARIAL": "Nível Salarial", "CODFAIXASALARIAL": "Faixa Salarial", "VLRSALARIO": "Salário Base",
            "RECCREATEDBY": "Criado por", "RECCREATEDON": "Criado em", "RECMODIFIEDBY": "Alterado por", "RECMODIFIEDON": "Alterado em",
            "CODCOLHIERARQUIAREQUISITANTE": "Col. Hierarquia", "IDHIERARQUIAREQUISITANTE": "ID Hierarquia", "CODCOLHIERARQUIADESTINO": "Col. Destino", "IDHIERARQUIADESTINO": "ID Destino",
            "CODCCUSTO": "Centro de Custo", "IDITEMCONTABIL": "Item Contábil", "IDCLASSEVALOR": "Classe Valor", "TEMEXCECAOORCAMENTO": "Exceção Orçam."
        };

        var fmt = function (key) {
            var val = r[key] || r[key.toLowerCase()] || "-";
            if (val === "null") val = "-";
            if (key.indexOf("DATA") > -1 || (key.indexOf("REC") > -1 && key.indexOf("ON") > -1)) {
                if (val !== "-") val = moment(val).format("DD/MM/YYYY");
            }
            if (key === "VLRSALARIO" && val !== "-") {
                val = parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
            return val;
        };

        var htmlStyles = [
            '<style>',
            '#modal-dados-requisicao .modal-header, #modal-dados-requisicao .modal-footer { display: none !important; }',
            '#modal-dados-requisicao .modal-content { border-radius: 20px; border: none; background: #f9fafb; }',
            '.react-wrapper { font-family: "Inter", sans-serif; }',
            '.react-head { background: #fff; padding: 24px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; border-radius: 20px 20px 0 0; }',
            '.section-title { font-size: 11px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 10px 0; padding-left: 8px; border-left: 3px solid #3b82f6; }',
            '.group-card { background: #fff; border-radius: 12px; border: 1px solid #f3f4f6; padding: 8px 16px; margin-bottom: 16px; }',
            '.react-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f9fafb; }',
            '.react-row:last-child { border-bottom: none; }',
            '.react-label { font-size: 12px; color: #6b7280; font-weight: 500; }',
            '.react-value { font-size: 12px; color: #111827; font-weight: 600; text-align: right; }',
            '.close-btn { font-size: 32px; color: #ef4444; font-weight: 900; cursor: pointer; border: none; background: none; line-height: 0.6; transition: transform 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; }',
            '.close-btn:hover { color: #b91c1c; transform: scale(1.1); }',
            '</style>'
        ].join('');

        var renderRow = function (key) {
            return '<div class="react-row"><span class="react-label">' + labels[key] + '</span><span class="react-value">' + fmt(key) + '</span></div>';
        };

        var htmlBody = '<div class="react-wrapper">' +
            '<div class="react-head"><div><h3 style="margin:0; font-weight:700;">' + fmt("JUSTIFICATIVA") + '</h3><span style="color:#6b7280; font-size:12px;">ID Req: <strong>' + idReq + '</strong> &bull; Coligada: ' + (r._codColigadaEncontrada || "-") + '</span></div>' +
            '<button class="close-btn" onclick="$(\'#modal-dados-requisicao\').find(\'button[data-dismiss=modal]\').click();">&times;</button></div>' +
            '<div style="padding: 0 24px 24px 24px; max-height: 70vh; overflow-y: auto;">' +
            '<div class="section-title">Identificação e Status</div>' +
            '<div class="group-card">' + renderRow("CODSTATUS") + renderRow("DATAABERTURA") + renderRow("NUMVAGAS") + renderRow("CODATENDIMENTO") + '</div>' +
            '<div class="section-title">Localização e Estrutura</div>' +
            '<div class="group-card">' + renderRow("CODCOLREQUISICAO") + renderRow("CODFILIAL") + renderRow("CODSECAO") + renderRow("CODCCUSTO") + renderRow("CODLOCAL") + '</div>' +
            '<div class="section-title">Cargo e Salário</div>' +
            '<div class="group-card">' + renderRow("CODFUNCAO") + renderRow("VLRSALARIO") + renderRow("CODTABELASALARIAL") + renderRow("CODNIVELSALARIAL") + renderRow("CODFAIXASALARIAL") + renderRow("TEMEXCECAOORCAMENTO") + '</div>' +
            '<div class="section-title">Prazos</div>' +
            '<div class="group-card">' + renderRow("DATAPREVISTA") + renderRow("DATACONCLUSAO") + renderRow("DATACANCELAMENTO") + '</div>' +
            '<div class="section-title">Hierarquia e Solicitante</div>' +
            '<div class="group-card">' + renderRow("CHAPAREQUISITANTE") + renderRow("IDHIERARQUIAREQUISITANTE") + renderRow("IDHIERARQUIADESTINO") + '</div>' +
            '<div class="section-title">Auditoria</div>' +
            '<div class="group-card">' + renderRow("RECCREATEDBY") + renderRow("RECCREATEDON") + renderRow("RECMODIFIEDBY") + renderRow("RECMODIFIEDON") + '</div>' +
            '</div></div>';

        FLUIGC.modal({
            content: htmlStyles + htmlBody,
            id: 'modal-dados-requisicao',
            size: 'large'
        });
    },

    /**
     * Constrói o HTML e CSS do Dashboard Moderno (BARRAS VERTICAIS + ALTURA COMPACTA)
     */
    buildDashboardUI: function () {
        var cssDashboard = [
            '<style>',
            '.irho-dash-wrapper { font-family: "Inter", "Poppins", sans-serif; margin-bottom: 20px; }',

            /* Grid 1/1/2 */
            '.irho-metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }',
            '@media (max-width: 1024px) { .irho-metrics-grid { grid-template-columns: repeat(2, 1fr); } }',
            '@media (max-width: 768px) { .irho-metrics-grid { grid-template-columns: 1fr; } }',
            '.col-span-1 { grid-column: span 1; }',
            '.col-span-2 { grid-column: span 2; }',

            /* Layout dos Cards (Mais Compactos) */
            /* Reduzimos o padding vertical para 12px e a min-height para 120px */
            '.irho-metric-card { background: #FFFFFF; border-radius: 12px; padding: 12px 16px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03); border: 1px solid #F0F2F8; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; height: 100%; min-height: 120px; }',
            '.irho-metric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05); }',

            /* Cabeçalho do Card (Ícones e margens menores) */
            '.irho-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }',
            '.irho-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }',
            '.irho-card-title { font-size: 12px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }',

            /* Cores dos Ícones */
            '.irho-icon-purple { background: #EEF0FF; color: #5B5FEF; }',
            '.irho-icon-blue { background: #E0F2FE; color: #0EA5E9; }',
            '.irho-icon-orange { background: #FFEDD5; color: #F97316; }',

            /* Mini-linhas de dados (Menos padding entre elas) */
            '.irho-mini-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed #F3F4F6; }',
            '.irho-mini-row:last-child { border-bottom: none; padding-bottom: 0; }',
            '.irho-mini-label { font-size: 11px; color: #4B5563; display: flex; align-items: center; gap: 6px; }',
            '.irho-mini-value { font-size: 13px; font-weight: 700; color: #111827; }',

            /* Estilos do Gráfico de Barras CSS (Altura Reduzida) */
            /* Reduzimos a altura base do container do gráfico de 150px para 120px */
            '.irho-chart-container { display: flex; flex-direction: row; align-items: flex-end; justify-content: space-around; height: 120px; padding-top: 5px; padding-bottom: 2px; width: 100%; }',
            '.irho-bar-wrapper { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; max-width: 80px; flex: 1; cursor: pointer; }',
            '.irho-bar-value { font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 4px; transition: color 0.2s; }',
            '.irho-bar-track { width: 32px; flex-grow: 1; background: #F3F4F6; border-radius: 4px 4px 0 0; display: flex; align-items: flex-end; overflow: hidden; }',
            '.irho-bar-fill { width: 100%; background: linear-gradient(0deg, #5B5FEF 0%, #818CF8 100%); border-radius: 4px 4px 0 0; transition: height 1s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s; }',
            '.irho-bar-label { font-size: 10px; color: #6B7280; font-weight: 600; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 6px; line-height: 1.1; }',

            /* TOOLTIP MÁGICO */
            '.irho-tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #111827; color: #FFFFFF; padding: 8px 12px; border-radius: 6px; font-size: 11px; white-space: nowrap; opacity: 0; visibility: hidden; transition: all 0.2s ease-out; z-index: 50; text-align: center; line-height: 1.4; pointer-events: none; margin-bottom: -5px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }',
            '.irho-tooltip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 5px; border-style: solid; border-color: #111827 transparent transparent transparent; }',
            '.irho-bar-wrapper:hover .irho-tooltip { opacity: 1; visibility: visible; margin-bottom: 6px; }',
            '.irho-bar-wrapper:hover .irho-bar-fill { filter: brightness(1.1); }',
            '.irho-bar-wrapper:hover .irho-bar-value { color: #5B5FEF; }',

            /* Animação do Ícone Em Andamento */
            '@keyframes fluig-spin { 100% { transform: rotate(360deg); } }',
            '.icon-spin-custom { animation: fluig-spin 2s linear infinite; }',

            '.fluig-style-guide .wcm-widget-class { background-color: transparent !important; }',
            '</style>'
        ].join('');

        var htmlDashboard = [
            '<div class="irho-dash-wrapper" id="dashMetrics_' + this.instanceId + '">',
            '<div class="irho-metrics-grid">',

            // CARD 1: Status das Solicitações
            '<div class="irho-metric-card col-span-1">',
            '<div class="irho-card-header">',
            '<div class="irho-icon-box irho-icon-blue"><i class="fluigicon fluigicon-info-sign"></i></div>',
            '<h4 class="irho-card-title">Status Global</h4>',
            '</div>',
            '<div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">',
            '<div class="irho-mini-row">',
            '<span class="irho-mini-label"><i class="fluigicon fluigicon-time icon-sm" style="color: #9CA3AF;"></i> Não Iniciadas</span>',
            '<span class="irho-mini-value" id="valNaoIniciado_' + this.instanceId + '">0</span>',
            '</div>',
            '<div class="irho-mini-row">',
            '<span class="irho-mini-label"><i class="fluigicon fluigicon-cog icon-spin-custom icon-sm" style="color: #3B82F6;"></i> Em Andamento</span>',
            '<span class="irho-mini-value" id="valAbertos_' + this.instanceId + '">0</span>',
            '</div>',
            '<div class="irho-mini-row">',
            '<span class="irho-mini-label"><i class="fluigicon fluigicon-check-circle-on icon-sm" style="color: #22C55E;"></i> Finalizadas</span>',
            '<span class="irho-mini-value" id="valFinalizados_' + this.instanceId + '">0</span>',
            '</div>',
            '</div>',
            '</div>',

            // CARD 2: Origem dos Dados
            '<div class="irho-metric-card col-span-1">',
            '<div class="irho-card-header">',
            '<div class="irho-icon-box irho-icon-orange"><i class="fluigicon fluigicon-transfer"></i></div>',
            '<h4 class="irho-card-title">Origem dos Dados</h4>',
            '</div>',
            '<div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">',
            '<div class="irho-mini-row">',
            '<span class="irho-mini-label"><i class="fluigicon fluigicon-cloud-upload icon-sm" style="color: #F97316;"></i> Integração ATS</span>',
            '<span class="irho-mini-value" id="valAts_' + this.instanceId + '">0</span>',
            '</div>',
            '<div class="irho-mini-row">',
            '<span class="irho-mini-label"><i class="fluigicon fluigicon-user-add icon-sm" style="color: #6B7280;"></i> Abertura Manual</span>',
            '<span class="irho-mini-value" id="valManual_' + this.instanceId + '">0</span>',
            '</div>',
            '</div>',
            '</div>',

            // CARD 3: Gráfico de Admissões por Coligada
            '<div class="irho-metric-card col-span-2">',
            '<div class="irho-card-header">',
            '<div class="irho-icon-box irho-icon-purple"><i class="fluigicon fluigicon-company"></i></div>',
            '<h4 class="irho-card-title">Admissões por Coligada</h4>',
            '</div>',
            '<div class="irho-chart-container" id="chartColigada_' + this.instanceId + '">',
            '<div style="text-align: center; color: #9CA3AF; font-size: 11px; margin-top: 10px; width: 100%;">Calculando dados do RM...</div>',
            '</div>',
            '</div>',

            '</div>',
            '</div>'
        ].join('');

        $('head').append(cssDashboard);

        var $wrapper = $('#tblAdmissao_' + this.instanceId).parents('.table-responsive').parent();
        if ($wrapper.prev('.row').length > 0) {
            $wrapper.prev('.row').before(htmlDashboard);
        } else {
            $wrapper.prepend(htmlDashboard);
        }
    },

    /**
     * Calcula as métricas complexas e injeta os dados extras para o Tooltip do Gráfico
     */
    updateMetrics: function (registros) {
        if (!registros || registros.length === 0) return;
        var that = this;

        var contAts = 0, contManual = 0;
        var cNaoIniciado = 0, cAberto = 0, cFinalizado = 0;
        var mapColigadasCount = {};

        for (var i = 0; i < registros.length; i++) {
            var r = registros[i];

            if (r.isManual) contManual++; else contAts++;

            if (!r.processoAbertoId || r.processoAbertoId === "null" || r.processoAbertoId === "") {
                cNaoIniciado++;
            } else if (r.statusProcesso === "0") {
                cAberto++;
            } else if (r.statusProcesso === "2") {
                cFinalizado++;
            }

            var cnpj = String(r.cnpjFilial || "").replace(/\D/g, '');
            if (cnpj) {
                mapColigadasCount[cnpj] = (mapColigadasCount[cnpj] || 0) + 1;
            }
        }

        this.animateValue("valNaoIniciado_" + this.instanceId, cNaoIniciado);
        this.animateValue("valAbertos_" + this.instanceId, cAberto);
        this.animateValue("valFinalizados_" + this.instanceId, cFinalizado);
        this.animateValue("valAts_" + this.instanceId, contAts);
        this.animateValue("valManual_" + this.instanceId, contManual);

        var url = WCMAPI.getServerURL() + '/api/public/ecm/dataset/datasets';
        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name: "ds_irho_empresaFilial" }),
            success: function (res) {
                var mapNomes = {};
                var mapDetalhes = {}; // NOVO: Guarda dados extra para o Tooltip

                if (res.content && res.content.values) {
                    res.content.values.forEach(function (f) {
                        var cnpjRM = String(f["CNPJ_FILIAL"] || f["cnpj_filial"] || f["CNPJ"] || "").replace(/\D/g, '');
                        var nomeBruto = String(f["NOMECOMERCIAL_FILIAL"] || f["nomecomercial_filial"] || ("Coligada " + f["ID_EMPRESA"]));
                        var codColigada = String(f["ID_EMPRESA"] || f["id_empresa"] || "-");

                        var nomeLimpo = nomeBruto.replace(/^NETZERO\s*(-\s*)?/i, '').trim();

                        if (cnpjRM) {
                            mapNomes[cnpjRM] = nomeLimpo;
                            mapDetalhes[cnpjRM] = {
                                cod: codColigada,
                                nomeFull: nomeBruto // Guarda o nome original sem cortes para o detalhe
                            };
                        }
                    });
                }

                // Agrupador agora guarda um objeto em vez de apenas um número
                var aggChart = {};
                for (var cnpjKey in mapColigadasCount) {
                    var nomeAmigavel = mapNomes[cnpjKey] || "Não Identificada";
                    var detalhe = mapDetalhes[cnpjKey] || { cod: "-", nomeFull: "Desconhecida" };

                    if (!aggChart[nomeAmigavel]) {
                        aggChart[nomeAmigavel] = {
                            value: 0,
                            cod: detalhe.cod,
                            nomeFull: detalhe.nomeFull
                        };
                    }
                    aggChart[nomeAmigavel].value += mapColigadasCount[cnpjKey];
                }

                var chartData = [];
                var maxVal = 0;
                for (var n in aggChart) {
                    chartData.push({
                        name: n,
                        value: aggChart[n].value,
                        cod: aggChart[n].cod,
                        nomeFull: aggChart[n].nomeFull
                    });
                    if (aggChart[n].value > maxVal) maxVal = aggChart[n].value;
                }
                chartData.sort(function (a, b) { return b.value - a.value; });

                chartData = chartData.slice(0, 5);

                var htmlChart = "";
                chartData.forEach(function (item) {
                    var percentual = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                    if (percentual > 0 && percentual < 5) percentual = 5;

                    htmlChart += '<div class="irho-bar-wrapper">' +
                        // INJEÇÃO DO TOOLTIP AQUI
                        '<div class="irho-tooltip">' +
                        '<strong style="color:#818CF8;">Cód. Coligada:</strong> ' + item.cod + '<br>' +
                        '<strong>Filial:</strong> ' + item.nomeFull +
                        '</div>' +
                        '<div class="irho-bar-value">' + item.value + '</div>' +
                        '<div class="irho-bar-track"><div class="irho-bar-fill" style="height: 0%;" data-height="' + percentual + '%"></div></div>' +
                        '<div class="irho-bar-label">' + item.name + '</div>' +
                        '</div>';
                });

                if (chartData.length === 0) {
                    htmlChart = '<div style="text-align:center; color:#9CA3AF; font-size:12px; width: 100%;">Sem dados para exibir</div>';
                }

                $("#chartColigada_" + that.instanceId).html(htmlChart);

                setTimeout(function () {
                    $("#chartColigada_" + that.instanceId + " .irho-bar-fill").each(function () {
                        $(this).css('height', $(this).attr('data-height'));
                    });
                }, 100);
            }
        });
    },

    /**
     * Efeito especial de contagem (0 até o valor final)
     */
    animateValue: function (id, endVal) {
        var obj = document.getElementById(id);
        if (!obj) return;

        var startVal = 0;
        var duration = 1200;
        var startTime = null;

        var step = function (currentTime) {
            if (!startTime) startTime = currentTime;
            var progress = Math.min((currentTime - startTime) / duration, 1);
            var easeProgress = progress * (2 - progress);

            obj.innerHTML = Math.floor(easeProgress * (endVal - startVal) + startVal);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = endVal;
            }
        };
        window.requestAnimationFrame(step);
    }
});