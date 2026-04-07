var WidgetAdmissao = SuperWidget.extend({
    instanceId: null,
    table: null,

    // Filtros Iniciais
    filtros: {
        filial: "",
        dataDe: "",
        dataAte: ""
    },

    init: function () {
        var that = this;
        var hoje = moment();

        // Configuração inicial de datas (Mês atual)
        this.filtros.dataDe = hoje.clone().startOf('month').format('YYYY-MM-DD');
        this.filtros.dataAte = hoje.clone().endOf('month').format('YYYY-MM-DD');

        $("#filtroDataDe_" + this.instanceId).val(this.filtros.dataDe);
        $("#filtroDataAte_" + this.instanceId).val(this.filtros.dataAte);

        this.setupListeners();
        
        // Atraso intencional para carregar dependências e desenhar tabela
        setTimeout(function () {
            that.initTable();
            that.carregarDados();
        }, 300);
    },

    setupListeners: function () {
        var that = this;

        // Botão Aplicar (Datas e Filial)
        $("#btnAtualizar_" + this.instanceId).on('click', function () {
            that.filtros.filial = $("#filtroFilial_" + that.instanceId).val();
            that.filtros.dataDe = $("#filtroDataDe_" + that.instanceId).val();
            that.filtros.dataAte = $("#filtroDataAte_" + that.instanceId).val();
            that.carregarDados();
        });

        // Buscas Rápidas (Chips)
        $("#buscaGeral_" + this.instanceId).on("keyup", function () {
            if (that.table) that.table.search($(this).val()).draw();
        });

        $("#buscaRapidaCpf_" + this.instanceId).on("keyup", function () {
            var valor = $(this).val().replace(/\D/g, ''); // Limpa formatação
            if (that.table) that.table.column(2).search(valor).draw();
        });

        // Controlo de Menus Dropdown (Chips)
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

        // Fechar menus ao clicar fora
        $(document).on('click.fecharMenu', function (e) {
            if (!$(e.target).closest('.dropdown-card').length) {
                $(".filter-card-options").removeClass("active");
                $(".dropdown-card .arrow").css("transform", "rotate(0deg)");
            }
        });

        // Refiltragem ao alterar Checkboxes
        $(".chk-filtro-status, .chk-filtro-docs").on("change", function () {
            that.aplicarFiltrosLocais();
        });

        // Limpar Filtros
        $("#btnLimparFiltros_" + this.instanceId).on("click", function () {
            $("#buscaGeral_" + that.instanceId).val("");
            $("#buscaRapidaCpf_" + that.instanceId).val("");
            $(".chk-filtro-status, .chk-filtro-docs").prop('checked', true);
            
            if (that.table) {
                that.table.search("").column(2).search("").draw();
            }
            that.aplicarFiltrosLocais();
            FLUIGC.toast({ message: 'Filtros limpos.', type: 'info' });
        });
    },

    /**
     * Inicia a renderização do DataTables com as colunas mapeadas do ATS.
     */
    initTable: function () {
        var that = this;

        if ($.fn.DataTable.isDataTable('#tblAdmissao_' + this.instanceId)) {
            $('#tblAdmissao_' + this.instanceId).DataTable().destroy();
        }

        this.table = $('#tblAdmissao_' + this.instanceId).DataTable({
            language: { url: "//cdn.datatables.net/plug-ins/1.10.12/i18n/Portuguese-Brasil.json" },
            dom: 'rtip',
            order: [[7, "asc"]], // Ordena pela Data de Contratação
            autoWidth: false,
            columns: [
                { data: "idCandidatoATS", className: "text-center" },
                { data: "cnpjFilial", render: function(d) { return d ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "-"; } },
                { data: "cpf", className: "text-center", render: function(d) { return d ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "-"; } },
                { data: "nomeCandidato", render: function(d) { return '<b>' + d + '</b>'; } },
                { data: "email", render: function(d) { return '<a href="mailto:'+d+'">'+d+'</a>'; } },
                { data: "cargoAprovado" },
                { data: "departamento" },
                {
                    data: "dataContratacao", className: "text-center",
                    render: function (d) { return d ? moment(d).format('DD/MM/YYYY') : "-"; }
                },
                {
                    data: null, className: "text-center", orderable: false,
                    render: function (data, type, row) {
                        var rowJson = encodeURIComponent(JSON.stringify(row));
                        return '<button class="btn btn-primary btn-sm" onclick="WidgetAdmissao.instance().iniciarProcessoAdmissao(\'' + rowJson + '\')">' +
                               '<i class="fluigicon fluigicon-play-circle"></i> Iniciar Admissão</button>';
                    }
                }
            ],
            data: []
        });

        this.table.on('draw', function () { that.calcularTotais(); });
    },

    /**
     * Calcula os totais do rodapé com base nos registos da página atual.
     */
    calcularTotais: function () {
        if (!this.table) return;
        var rows = this.table.rows({ page: 'current' }).data();
        
        var pendentes = 0;
        var concluidas = 0;
        var somaSalarios = 0;

        rows.each(function (row) {
            somaSalarios += parseFloat(row.salario) || 0;
            if (row.status === "em_andamento") pendentes++;
            else if (row.status === "concluida") concluidas++;
        });

        $("#lblTotalPendentes_" + this.instanceId).text(pendentes);
        $("#lblTotalConcluidas_" + this.instanceId).text(concluidas);
        $("#lblSomaSalarios_" + this.instanceId).text(somaSalarios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    },

    /**
     * Carrega os dados reais do Dataset do ATS.
     */
    carregarDados: function () {
        var that = this;
        var load = FLUIGC.loading(window, { textMessage: 'Buscando candidatos aprovados no ATS...' });
        load.show();

        DatasetFactory.getDataset("ds_irho_atsAprovados", null, null, null, {
            success: function (data) {
                var registos = data.values || [];
                
                // Se o dataset retornou um erro do Identity ou da TOTVS, avisa na tela
                if (registos.length > 0 && registos[0].ERROR && registos[0].ERROR !== "") {
                    FLUIGC.toast({ title: 'Aviso:', message: registos[0].ERROR, type: 'warning' });
                    that.table.clear().draw();
                } else {
                    that.table.clear().rows.add(registos).draw();
                }
                load.hide();
            },
            error: function(err) { 
                load.hide(); 
                FLUIGC.toast({ title: 'Erro:', message: 'Falha ao conectar com o Dataset do ATS.', type: 'danger' });
            }
        });
    },

    /**
     * Redireciona para a tela de Início do Processo FLUIG-0002 preenchendo os dados do ATS.
     */
    iniciarProcessoAdmissao: function (rowJsonEncoded) {
        var c = JSON.parse(decodeURIComponent(rowJsonEncoded));

        // Converte as datas do formato YYYY-MM-DD para o formato BR (DD/MM/YYYY)
        var dtNascBR = c.dataNascimento ? c.dataNascimento.split('-').reverse().join('/') : "";
        var dtContBR = c.dataContratacao ? c.dataContratacao.split('-').reverse().join('/') : "";

        // =========================================================
        // MAPA DE DADOS (ATS -> FORMULÁRIO DE ADMISSÃO)
        // =========================================================
        var atsData = {
            "txtOrigemAdmissao": "TOTVS_ATS",
            "txtIdCandidatoATS": c.idCandidatoATS || "",
            "cpNumRequisicaoERP": c.codRequisicaoERP || "",
            "cpNumRequisicaoATS": c.codRequisicaoATS || "",
            "cpTipoRequisicao": c.tipoRequisicao || "",

            "cpfcnpj": c.cpf || "",
            "txtNomeColaborador": c.nomeCandidato || "",
            "txtEmail": c.email || "",
            "cpEmailCandidato": c.email || "",
            "cpTelefoneCandidato": c.telefone || "",
            "dtDataNascColaborador": dtNascBR,

            "FUN_CARGO_DESC_AD": c.cargoAprovado || "",
            "FUN_SECAO_IDDESC_AD": c.departamento || "",
            "cpJornadaAdmissao": c.jornada || "CLT",
            "cpDataPrevisaoAdmissao": dtContBR,
            "FUN_EMPRESA_CNPJ": c.cnpjFilial || "", 
            
            "cpDeficienciaFisica": c.deficienciaFisica === "1" ? "Sim" : "Não",
            "cpDeficienciaAuditiva": c.deficienciaAuditiva === "1" ? "Sim" : "Não",
            "cpDeficienciaVisual": c.deficienciaVisual === "1" ? "Sim" : "Não",
            "cpDeficienciaIntelectual": c.deficienciaIntelectual === "1" ? "Sim" : "Não",
            "cand_possui_deficiencia": (c.deficienciaFisica === "1" || c.deficienciaAuditiva === "1" || c.deficienciaVisual === "1" || c.deficienciaIntelectual === "1") ? "Sim" : "Não"
        };

        // Salva os dados temporariamente no cache do navegador
        localStorage.setItem("FLUIG_ATS_DATA", JSON.stringify(atsData));

        // Descobre o Tenant atual e monta a URL para iniciar o processo FLUIG-0002
        var tenant = WCMAPI.tenantCode || "1";
        var urlFluig = '/portal/p/' + tenant + '/pageworkflowview?processID=FLUIG-0002%20-%20Admissão%20IRHO';
        
        // Abre a aba de Iniciar Solicitação
        window.open(urlFluig, '_blank');
    }
});