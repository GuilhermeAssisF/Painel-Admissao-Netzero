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

    init: function () {
        var that = this;

        // Limpa os campos de data no arranque
        $("#filtroDataDe_" + this.instanceId).val("");
        $("#filtroDataAte_" + this.instanceId).val("");

        this.setupListeners();

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
     * Carrega os dados reais do Dataset de forma síncrona/blindada.
     */
    /**
     * Carrega os dados reais do Dataset de forma síncrona/blindada.
     */
    carregarDados: function () {
        var that = this;
        var load = FLUIGC.loading(window, { textMessage: 'Carregando dados e validando processos ativos...' });
        load.show();

        setTimeout(function () {
            try {
                // 1. Busca os processos pelo seu NOVO DATASET avançado
                var constraintsForm = [
                    DatasetFactory.createConstraint("metadata#active", "true", "true", ConstraintType.MUST)
                ];

                var dsAbertos = DatasetFactory.getDataset("ds_dados_publicos_candidato", null, constraintsForm, null);
                var mapProcessos = {};

                if (dsAbertos && dsAbertos.values) {
                    for (var i = 0; i < dsAbertos.values.length; i++) {
                        var r = dsAbertos.values[i];

                        // Capturando os dados básicos do Fluig para caso o processo seja manual
                        var cpfForm = r["cpfcnpj"] || r.cpfcnpj || r["cpfcnpjValue"] || r.cpfcnpjValue;
                        var idProc = r["idProcessoFluig"] || r.idProcessoFluig || r["cpNumeroSolicitacao"] || r.cpNumeroSolicitacao;
                        var passoCandidato = r["cpPassoAtualCandidato"] || r.cpPassoAtualCandidato || r["cppassoatualcandidato"] || r.cppassoatualcandidato || "";

                        // Campos complementares para desenhar a linha manual no painel
                        var nomeCandidato = r["txtNomeColaborador"] || r.txtNomeColaborador || r["txtNomeSocial"] || r.txtNomeSocial || "Sem Nome";
                        var emailCandidato = r["txtEmail"] || r.txtEmail || r["cpEmailCandidato"] || r.cpEmailCandidato || "";
                        var telefone = r["txtCELULAR"] || r.txtCELULAR || "";
                        var cargo = r["FUN_IDDESCFUN"] || r.FUN_IDDESCFUN || r["FUN_CARGO"] || r.FUN_CARGO || "-";
                        var departamento = r["FUN_SECAO_IDDESC_AD"] || r.FUN_SECAO_IDDESC_AD || "-";
                        var dataAdmissao = r["FUN_ADMISSAO"] || r.FUN_ADMISSAO || "";
                        var cnpjFilial = r["FUN_CNPJ_FILIAL"] || r.FUN_CNPJ_FILIAL || "";
                        var dataNasc = r["dtDataNascColaborador"] || r.dtDataNascColaborador || "";
                        var jornada = r["cpJornadaAdmissao"] || r.cpJornadaAdmissao || "-";

                        // O Fluig guarda as datas como DD/MM/YYYY, o seu painel (moment.js) espera YYYY-MM-DD
                        var dtContratacao = "";
                        if (dataAdmissao && dataAdmissao.indexOf("/") > -1) {
                            dtContratacao = dataAdmissao.split('/').reverse().join('-');
                        }

                        var dtNascimento = "";
                        if (dataNasc && dataNasc.indexOf("/") > -1) {
                            dtNascimento = dataNasc.split('/').reverse().join('-');
                        }

                        if (cpfForm && idProc && idProc !== "" && idProc !== "null") {
                            var cpfLimpo = String(cpfForm).replace(/\D/g, '');

                            mapProcessos[cpfLimpo] = {
                                id: String(idProc),
                                atividade: r["atividadeAtual"] || r.atividadeAtual || "0",
                                passo: passoCandidato,
                                // Guardando os dados extras capturados
                                nome: nomeCandidato,
                                email: emailCandidato,
                                telefone: telefone,
                                cargo: cargo,
                                departamento: departamento,
                                dataContratacao: dtContratacao,
                                dataNascimento: dtNascimento,
                                jornada: jornada,
                                cnpjFilial: cnpjFilial,
                                processadoNoATS: false // Usado para saber se veio do ATS ou se é manual
                            };
                        }
                    }
                }

                // 2. Busca os candidatos no ATS
                var dsData = DatasetFactory.getDataset("ds_irho_atsAprovados", null, null, null);
                var registosATS = dsData.values || [];
                var finalRegistros = [];

                if (registosATS.length > 0 && registosATS[0].ERROR && registosATS[0].ERROR !== "") {
                    FLUIGC.toast({ title: 'Aviso do ATS:', message: registosATS[0].ERROR, type: 'warning' });
                    registosATS = []; // Zera, mas não limpa a tabela ainda para poder exibir os Manuais
                }

                var constraintsStatus = [];
                var mapLinhasTabela = {};

                // 3. PRIMEIRO PASSO: Cruza os dados do ATS com os processos abertos
                for (var j = 0; j < registosATS.length; j++) {
                    var c = registosATS[j];
                    var atsCpfLimpo = (c.cpf || "").replace(/\D/g, '');

                    if (mapProcessos[atsCpfLimpo]) {
                        c.processoAbertoId = mapProcessos[atsCpfLimpo].id;
                        c.atividadeFluig = mapProcessos[atsCpfLimpo].atividade;
                        c.passoCandidato = mapProcessos[atsCpfLimpo].passo;
                        c.statusProcesso = "0";

                        mapProcessos[atsCpfLimpo].processadoNoATS = true;

                        constraintsStatus.push(DatasetFactory.createConstraint("workflowProcessPK.processInstanceId", c.processoAbertoId, c.processoAbertoId, ConstraintType.SHOULD));
                        mapLinhasTabela[c.processoAbertoId] = c;

                    } else {
                        c.processoAbertoId = null;
                        c.atividadeFluig = null;
                        c.passoCandidato = null;
                        c.statusProcesso = null;
                    }

                    finalRegistros.push(c);
                }

                // 4. SEGUNDO PASSO: Resgata os CPFs que o Fluig tem mas o ATS não enviou (OS MANUAIS)
                for (var cpfKey in mapProcessos) {
                    if (mapProcessos.hasOwnProperty(cpfKey)) {
                        var processoLocal = mapProcessos[cpfKey];

                        if (processoLocal.processadoNoATS === false) {

                            var manualRecord = {
                                codRequisicaoATS: '<div style="line-height: 1.3; font-size: 11px; color: #6b7280; font-weight: 500;">Processo<br>Aberto<br>Manualmente</div>',
                                nomeCandidato: processoLocal.nome,
                                cpf: cpfKey,
                                email: processoLocal.email,
                                telefone: processoLocal.telefone,
                                cargoAprovado: processoLocal.cargo,
                                departamento: processoLocal.departamento,
                                dataContratacao: processoLocal.dataContratacao,
                                dataNascimento: processoLocal.dataNascimento,
                                jornada: processoLocal.jornada,
                                cnpjFilial: processoLocal.cnpjFilial,

                                processoAbertoId: processoLocal.id,
                                atividadeFluig: processoLocal.atividade,
                                passoCandidato: processoLocal.passo,
                                statusProcesso: "0",

                                tipoRequisicao: "Manual",
                                codRequisicaoERP: "-",
                                deficienciaFisica: "0",
                                deficienciaAuditiva: "0",
                                deficienciaVisual: "0",
                                deficienciaIntelectual: "0",
                                isManual: true
                            };

                            constraintsStatus.push(DatasetFactory.createConstraint("workflowProcessPK.processInstanceId", manualRecord.processoAbertoId, manualRecord.processoAbertoId, ConstraintType.SHOULD));
                            mapLinhasTabela[manualRecord.processoAbertoId] = manualRecord;

                            finalRegistros.push(manualRecord);
                        }
                    }
                }

                // 5. TERCEIRO PASSO: Bate no Dataset nativo para checar status (Cancelado/Finalizado)
                if (constraintsStatus.length > 0) {
                    var dsStatus = DatasetFactory.getDataset("workflowProcess", ["workflowProcessPK.processInstanceId", "status"], constraintsStatus, null);
                    if (dsStatus && dsStatus.values) {
                        for (var s = 0; s < dsStatus.values.length; s++) {
                            var rowStatus = dsStatus.values[s];
                            var pId = String(rowStatus["workflowProcessPK.processInstanceId"]);
                            if (mapLinhasTabela[pId]) {
                                mapLinhasTabela[pId].statusProcesso = String(rowStatus["status"]);
                            }
                        }
                    }
                }

                that.table.clear().rows.add(finalRegistros).draw();

            } catch (err) {
                console.error("Erro na busca dos datasets:", err);
                FLUIGC.toast({ title: 'Erro:', message: 'Falha ao conectar com os Datasets.', type: 'danger' });
            } finally {
                load.hide();
            }
        }, 100);
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
     * Busca a Coligada, consulta o RM e abre o Modal com Botão de Fechar Vermelho e Bold
     */
    verDadosRequisicao: function (rowJsonEncoded) {
        var c = JSON.parse(decodeURIComponent(rowJsonEncoded));
        var idReq = String(c.codRequisicaoERP || "").trim();
        var cnpjBuscaLimpo = String(c.cnpjFilial || "").replace(/\D/g, '');

        if (!idReq || idReq === "" || idReq === "-") {
            FLUIGC.toast({ title: 'Aviso:', message: 'Não há requisição vinculada.', type: 'warning' });
            return;
        }

        var load = FLUIGC.loading(window, { textMessage: 'Sincronizando com TOTVS RM...' });
        load.show();

        // 1. Busca Coligada via CNPJ
        var url = WCMAPI.getServerURL() + '/api/public/ecm/dataset/datasets';
        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name: "ds_irho_empresaFilial" }), 
            success: function (res) {
                var codColigadaEncontrada = null;
                if (res.content && res.content.values) {
                    var filiais = res.content.values;
                    for (var i = 0; i < filiais.length; i++) {
                        var cnpjRM = String(filiais[i]["CNPJ_FILIAL"] || filiais[i]["cnpj_filial"] || filiais[i]["CNPJ"] || "").replace(/\D/g, '');
                        if (cnpjRM === cnpjBuscaLimpo) {
                            codColigadaEncontrada = String(filiais[i]["ID_EMPRESA"] || filiais[i]["id_empresa"] || "");
                            break;
                        }
                    }
                }

                if (!codColigadaEncontrada) {
                    load.hide();
                    FLUIGC.toast({ title: 'Erro:', message: 'Coligada não identificada.', type: 'warning' });
                    return;
                }

                // 2. Consulta Dataset de Aumento de Quadro
                var cColigada = DatasetFactory.createConstraint("CODCOLIGADA", codColigadaEncontrada, codColigadaEncontrada, ConstraintType.MUST);
                var cIdReq = DatasetFactory.createConstraint("IDREQ", idReq, idReq, ConstraintType.MUST);

                DatasetFactory.getDataset("ds_irho_aumentoQuadro", null, [cColigada, cIdReq], null, {
                    success: function(dsReq) {
                        load.hide();
                        if (dsReq && dsReq.values && dsReq.values.length > 0) {
                            var r = dsReq.values[0];

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

                            var fmt = function(key) {
                                var val = r[key] || r[key.toLowerCase()] || "-";
                                if (val === "null") val = "-";
                                if (key.indexOf("DATA") > -1 || (key.indexOf("REC") > -1 && key.indexOf("ON") > -1)) {
                                    if (val !== "-") val = moment(val).format("DD/MM/YYYY");
                                }
                                if (key === "VLRSALARIO" && val !== "-") {
                                    val = parseFloat(val).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
                                }
                                return val;
                            };

                            // CSS AJUSTADO: Botão de fechar vermelho e grosso
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
                                
                                // ESTILIZAÇÃO DO BOTÃO SOLICITADA
                                '.close-btn { ',
                                '   font-size: 32px; ',
                                '   color: #ef4444; ', // Vermelho vivo
                                '   font-weight: 900; ', // Bem grosso
                                '   cursor: pointer; ',
                                '   border: none; ',
                                '   background: none; ',
                                '   line-height: 0.6; ',
                                '   transition: transform 0.2s, color 0.2s; ',
                                '   display: flex; ',
                                '   align-items: center; ',
                                '   justify-content: center; ',
                                '   width: 32px; height: 32px; ',
                                '}',
                                '.close-btn:hover { color: #b91c1c; transform: scale(1.1); }',
                                '</style>'
                            ].join('');

                            var renderRow = function(key) {
                                return '<div class="react-row"><span class="react-label">' + labels[key] + '</span><span class="react-value">' + fmt(key) + '</span></div>';
                            };

                            var htmlBody = '<div class="react-wrapper">' +
                                '<div class="react-head"><div><h3 style="margin:0; font-weight:700;">' + fmt("JUSTIFICATIVA") + '</h3><span style="color:#6b7280; font-size:12px;">Solicitação ' + fmt("IDREQ") + '</span></div>' +
                                // CORREÇÃO DO ONCLICK: Usando a instância diretamente via seletor do Fluig
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

                        } else {
                            FLUIGC.toast({ title: 'Aviso:', message: 'Requisição não encontrada.', type: 'warning' });
                        }
                    },
                    error: function(err) { load.hide(); FLUIGC.toast({ title: 'Erro:', message: 'Falha no dataset.', type: 'danger' }); }
                });
            }
        });
    }
});