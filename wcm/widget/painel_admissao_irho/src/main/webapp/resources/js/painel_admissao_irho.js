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
                { data: "codRequisicaoATS", className: "text-center", defaultContent: "-" },

                // 1. CANDIDATO + CONTATO
                {
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

                // 3. INFO EXTRA (Nasc + Tipo + ERP + PCD)
                {
                    data: null,
                    render: function (row) {
                        var nasc = row.dataNascimento ? moment(row.dataNascimento).format('DD/MM/YYYY') : "-";
                        var isPCD = (row.deficienciaFisica === "1" || row.deficienciaAuditiva === "1" || row.deficienciaVisual === "1" || row.deficienciaIntelectual === "1");
                        var labelPcd = isPCD ? '<span class="label label-success" style="margin-top:4px;">PCD</span>' : '';

                        return '<div class="stacked-cell">' +
                            '<span class="sub-text">Nasc: ' + nasc + '</span>' +
                            '<span class="sub-text">Tipo Req: ' + (row.tipoRequisicao || '-') + '</span>' +
                            '<span class="sub-text">Req ERP: <strong>' + (row.codRequisicaoERP || '-') + '</strong></span>' +
                            labelPcd +
                            '</div>';
                    }
                },

                // 4. STATUS FLUIG
                {
                    data: null,
                    className: "text-center",
                    render: function (row) {
                        if (row.processoAbertoId) {
                            // Dicionário de Atividades Mapeado do seu FLUIG-0002.process
                            var dicAtividades = {
                                "97": { nome: "Admissão RH", cor: "info" },          // Azul
                                "122": { nome: "Aguard. Candidato", cor: "warning" }, // Laranja
                                "150": { nome: "Aguard. Correção", cor: "danger" },   // Vermelho
                                "135": { nome: "Gerar Kit", cor: "info" },            // Azul
                                "128": { nome: "Validar Kit", cor: "info" },          // Azul
                                "129": { nome: "Assinatura Cand.", cor: "warning" },  // Laranja
                                "138": { nome: "Integração RM", cor: "default" },     // Cinza
                                "139": { nome: "Integração RM", cor: "default" },     // Cinza
                                "104": { nome: "Finalizado", cor: "success" }         // Verde
                            };

                            var atvId = row.atividadeFluig || "0";
                            var infoAtv = dicAtividades[atvId] || { nome: "Em Andamento (" + atvId + ")", cor: "default" };

                            return '<div class="stacked-cell" style="align-items: center;">' +
                                '<span class="label label-' + infoAtv.cor + '" style="white-space: normal; text-align: center; margin-bottom: 4px;">' + infoAtv.nome + '</span>' +
                                '<span class="sub-text-muted">Fluig: ' + row.processoAbertoId + '</span>' +
                                '</div>';
                        } else {
                            return '<span class="label label-default">Não Iniciado</span>';
                        }
                    }
                },

                // 5. AÇÕES
                {
                    data: null, className: "text-center", orderable: false,
                    render: function (data, type, row) {
                        var rowJson = encodeURIComponent(JSON.stringify(row));
                        if (row.processoAbertoId) {
                            return '<button class="btn btn-warning btn-sm btn-rounded" onclick="WidgetAdmissao.instance().abrirProcessoExistente(\'' + row.processoAbertoId + '\')">' +
                                '<i class="fluigicon fluigicon-info-sign"></i> Ver</button>';
                        } else {
                            return '<button class="btn btn-primary btn-sm btn-rounded" onclick="WidgetAdmissao.instance().iniciarProcessoAdmissao(\'' + rowJson + '\')">' +
                                '<i class="fluigicon fluigicon-play-circle"></i> Iniciar</button>';
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
    carregarDados: function () {
        var that = this;
        var load = FLUIGC.loading(window, { textMessage: 'Carregando dados e validando processos ativos...' });
        load.show();

        setTimeout(function () {
            try {
                // 1. Busca os processos pelo seu NOVO DATASET avançado
                // A constraint metadata#active garante que só vamos ler a versão atual do formulário (evita lentidão e duplicidade)
                var constraintsForm = [
                    DatasetFactory.createConstraint("metadata#active", "true", "true", ConstraintType.MUST)
                ];

                // ATENÇÃO: Se você deu um nome diferente para o dataset ponte, altere aqui:
                var dsAbertos = DatasetFactory.getDataset("ds_dados_publicos_candidato", null, constraintsForm, null);
                var mapProcessos = {};

                if (dsAbertos && dsAbertos.values) {
                    for (var i = 0; i < dsAbertos.values.length; i++) {
                        var r = dsAbertos.values[i];

                        // Blindagem: Busca o CPF e o ID exatamente com os "names" que estão no seu view.ftl do formulário
                        var cpfForm = r["cpfcnpj"] || r.cpfcnpj || r["cpfcnpjValue"] || r.cpfcnpjValue;
                        var idProc = r["idProcessoFluig"] || r.idProcessoFluig || r["cpNumeroSolicitacao"] || r.cpNumeroSolicitacao;

                        // Só processa se realmente achou um CPF e um ID válido nessa linha
                        if (cpfForm && idProc && idProc !== "" && idProc !== "null") {
                            var cpfLimpo = String(cpfForm).replace(/\D/g, '');

                            // Cria o de/para usando o CPF limpo como chave
                            mapProcessos[cpfLimpo] = {
                                id: String(idProc),
                                atividade: r["atividadeAtual"] || r.atividadeAtual || "0"
                            };
                        }
                    }
                }

                // 2. Busca os candidatos no ATS
                var dsData = DatasetFactory.getDataset("ds_irho_atsAprovados", null, null, null);
                var registos = dsData.values || [];

                if (registos.length > 0 && registos[0].ERROR && registos[0].ERROR !== "") {
                    FLUIGC.toast({ title: 'Aviso do ATS:', message: registos[0].ERROR, type: 'warning' });
                    that.table.clear().draw();
                } else {
                    // 3. Cruza as informações: Injeta ID e Atividade no JSON do ATS se der Match
                    for (var j = 0; j < registos.length; j++) {
                        var c = registos[j];
                        var atsCpfLimpo = (c.cpf || "").replace(/\D/g, '');

                        if (mapProcessos[atsCpfLimpo]) {
                            c.processoAbertoId = mapProcessos[atsCpfLimpo].id;
                            c.atividadeFluig = mapProcessos[atsCpfLimpo].atividade;
                        } else {
                            c.processoAbertoId = null;
                            c.atividadeFluig = null;
                        }
                    }
                    that.table.clear().rows.add(registos).draw();
                }
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
    iniciarProcessoAdmissao: function (rowJsonEncoded) {
        var c = JSON.parse(decodeURIComponent(rowJsonEncoded));

        // Formata apenas a Data de Admissão/Contratação (pois removemos a Data de Nascimento)
        var dtContBR = c.dataContratacao ? c.dataContratacao.split('-').reverse().join('/') : "";

        var atsData = {
            // 1. CAMPOS TÉCNICOS
            "txtOrigemAdmissao": "TOTVS_ATS",
            "txtIdCandidatoATS": c.idCandidatoATS || "",
            "cpNumRequisicaoERP": c.codRequisicaoERP || "",
            "cpNumRequisicaoATS": c.codRequisicaoATS || "",

            // 2. DADOS BÁSICOS
            "cpfcnpj": c.cpf || "",

            // NOVO: Nome vai para o Nome Social para não conflitar com a SERPRO
            "txtNomeSocial": c.nomeCandidato || "",

            "txtEmail": c.email || "",
            "cpEmailCandidato": c.email || "",

            // NOVO: Telefone vai para o Celular 1
            "txtCELULAR": c.telefone || "",

            "FUN_ADMISSAO": dtContBR,
            "cpDataPrevisaoAdmissao": dtContBR,
            "cpJornadaAdmissao": c.jornada || "CLT",

            // 3. DEFICIÊNCIAS
            "cpDeficienciaFisica": c.deficienciaFisica === "1" ? "Sim" : "Não",
            "cpDeficienciaAuditiva": c.deficienciaAuditiva === "1" ? "Sim" : "Não",
            "cpDeficienciaVisual": c.deficienciaVisual === "1" ? "Sim" : "Não",
            "cpDeficienciaIntelectual": c.deficienciaIntelectual === "1" ? "Sim" : "Não",
            "cand_possui_deficiencia": (c.deficienciaFisica === "1" || c.deficienciaAuditiva === "1" || c.deficienciaVisual === "1" || c.deficienciaIntelectual === "1") ? "Sim" : "Não",

            // 4. CHAVE ESPECIAL PARA O ZOOM (O formulário vai usar isto para pesquisar)
            "CNPJ_FILIAL_ATS": c.cnpjFilial || "",

            // Empacota o envelope original intacto para a "Cola do RH"
            "_dadosOriginais": c
        };

        localStorage.setItem("FLUIG_ATS_DATA", JSON.stringify(atsData));

        var tenant = WCMAPI.tenantCode || "1";
        var urlFluig = '/portal/p/' + tenant + '/pageworkflowview?processID=FLUIG-0002%20-%20Admissão%20IRHO';

        window.open(urlFluig, '_blank');
    },

    /**
     * Redireciona diretamente para o visualizador de um processo que já foi aberto.
     */
    abrirProcessoExistente: function (processInstanceId) {
        var tenant = WCMAPI.tenantCode || "1";
        // URL nativa do Fluig para abrir tarefas existentes
        var urlFluig = '/portal/p/' + tenant + '/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=' + processInstanceId;
        window.open(urlFluig, '_blank');
    }
});