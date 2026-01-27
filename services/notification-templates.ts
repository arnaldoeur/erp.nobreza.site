
/**
 * Premium Notification Templates for Nobreza ERP
 * Centralizes all system messaging for consistent branding and professional tone.
 */

export const NotificationTemplates = {
    // 1. Onboarding & Relationship
    USER_WELCOME: {
        subject: "Bem-vindo à {{company_name}}!",
        html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #1e293b;">
                <div style="background: #064e3b; padding: 40px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Seja muito bem-vindo(a)!</h1>
                </div>
                <div style="padding: 40px; line-height: 1.6;">
                    <p>Olá, <strong>{{user_name}}</strong>,</p>
                    <p>A empresa <strong>{{company_name}}</strong> foi registrada com sucesso no Nobreza ERP e, a partir de agora, você passa a contar com ferramentas pensadas para organizar processos, aumentar o controlo financeiro e apoiar o crescimento sustentável da sua farmácia.</p>
                    <p>Recomendamos que conclua as configurações iniciais para ativar relatórios, alertas automáticos e análises inteligentes.</p>
                    <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; pt: 20px; font-size: 12px; color: #64748b;">
                        — Equipe Nobreza ERP | Gestão Inteligente para Farmácias
                    </div>
                </div>
            </div>
        `
    },
    FIRST_LOGIN: {
        subject: "Que bom ter você connosco, {{user_name}}!",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>Que bom ter você connosco, <strong>{{user_name}}</strong>.</p>
                <p>Este é o primeiro passo para transformar dados em decisões e decisões em crescimento real para a <strong>{{company_name}}</strong>.</p>
                <p>Explore o painel principal e, se precisar, nossa equipa está sempre pronta para apoiar.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },
    INCOMPLETE_CONFIG: {
        subject: "Configuração Incompleta - {{company_name}}",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>Identificámos que algumas configurações importantes da <strong>{{company_name}}</strong> ainda não foram concluídas.</p>
                <p>Esses dados são essenciais para que o sistema gere alertas de stock, relatórios financeiros e recomendações automáticas de compras.</p>
                <p>Concluir agora garante mais segurança e melhor desempenho operacional.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },

    // 2. Stock, Expiry & Purchases
    STOCK_LOW: {
        subject: "⚠️ Alerta de Stock Baixo: {{product_name}}",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>Atenção, <strong>{{user_name}}</strong>.</p>
                <p>O produto <strong>{{product_name}}</strong> encontra-se com stock reduzido, restando apenas <strong>{{quantity}}</strong> unidades em armazém.</p>
                <p>Manter este produto disponível é importante para evitar perda de vendas e frustração de clientes.</p>
                <p>Considere realizar reposição o quanto antes.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },
    OUT_OF_STOCK: {
        subject: "🚫 Produto Esgotado: {{product_name}}",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>Informamos que o produto <strong>{{product_name}}</strong> encontra-se atualmente sem stock na <strong>{{company_name}}</strong>.</p>
                <p>Esta situação pode impactar diretamente o atendimento aos clientes e o desempenho financeiro diário.</p>
                <p>Recomendamos a reposição imediata para manter a continuidade das vendas.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },
    EXPIRY_NEAR: {
        subject: "⏳ Alerta de Validade: {{product_name}}",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>O produto <strong>{{product_name}}</strong> está próximo da data de vencimento, faltando <strong>{{days}}</strong> dias.</p>
                <p>Para reduzir perdas e melhorar a rotação de stock, considere aplicar campanhas promocionais ou priorizar a venda deste item.</p>
                <p>Uma boa gestão de validade protege o seu lucro.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },
    PURCHASE_RECOMMENDATION: {
        subject: "🤖 Recomendação de Compra IA: {{product_name}}",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>Com base no histórico recente de vendas da <strong>{{company_name}}</strong>, o sistema identificou alta procura pelo produto <strong>{{product_name}}</strong>.</p>
                <p>Recomendamos reposição ainda esta semana para manter o ritmo de faturação e evitar rupturas de stock.</p>
                <p>Esta recomendação foi gerada automaticamente pelo módulo de inteligência do Nobreza ERP.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },

    // 3. Sales, Billing & Performance
    GOAL_ACHIEVED: {
        subject: "🎉 Meta Atingida! Parabéns equipa.",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>Parabéns, equipa da <strong>{{company_name}}</strong>.</p>
                <p>A meta de vendas definida para hoje foi atingida com sucesso, refletindo um excelente trabalho de atendimento e organização.</p>
                <p>Manter este padrão de desempenho é essencial para o crescimento contínuo do negócio.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },
    DROP_IN_SALES: {
        subject: "📉 Alerta: Queda no volume de vendas",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>Identificámos uma redução no volume de vendas nas últimas horas na <strong>{{company_name}}</strong>.</p>
                <p>Este pode ser um sinal de falta de produtos estratégicos, menor fluxo de clientes ou necessidade de ação promocional.</p>
                <p>Recomendamos verificar stock e desempenho por categoria no painel financeiro.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },
    INVOICE_EMITTED: {
        subject: "📄 Fatura Emitida: #{{invoice_number}}",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>A fatura número <strong>{{invoice_number}}</strong> foi emitida com sucesso e já está registada no sistema.</p>
                <p>Todas as informações foram automaticamente incluídas nos relatórios financeiros e no controlo de caixa.</p>
                <p>Transparência e rastreabilidade são pilares de uma gestão forte.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },

    // 4. Team & Operations
    NEW_COLLABORATOR: {
        subject: "👥 Novo colaborador adicionado",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>O colaborador <strong>{{employee_name}}</strong> foi adicionado com sucesso à equipa da <strong>{{company_name}}</strong>.</p>
                <p>Já é possível atribuir permissões, turnos e responsabilidades diretamente pelo sistema.</p>
                <p>Uma equipa bem organizada garante processos mais rápidos e seguros.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },
    TASK_PENDING: {
        subject: "📌 Tarefa Pendente: {{task_name}}",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>A tarefa <strong>{{task_name}}</strong> permanece pendente no sistema.</p>
                <p>Concluir atividades no tempo certo ajuda a evitar falhas operacionais e melhora a fluidez do atendimento ao cliente.</p>
                <p>Recomendamos a verificação do painel de tarefas.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },

    // 5. Reports & Insights
    MONTHLY_REPORT: {
        subject: "📊 Relatório Mensal Disponível: {{month}}",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>O relatório financeiro referente ao mês de <strong>{{month}}</strong> já está disponível para consulta.</p>
                <p>Nele poderá analisar faturação, despesas, produtos mais vendidos e margens de lucro.</p>
                <p>Tomar decisões com base em dados é o caminho para um crescimento consistente.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },
    AUTO_INSIGHT: {
        subject: "💡 Insight Automático Nobreza ERP",
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>O sistema identificou que os clientes da <strong>{{company_name}}</strong> compram mais produtos da categoria <strong>{{product_category}}</strong> no período das <strong>{{best_time}}</strong>.</p>
                <p>Ajustar a reposição de stock e a escala da equipa nesses horários pode aumentar significativamente as vendas.</p>
                <p>Este insight foi gerada automaticamente pela inteligência do Nobreza ERP.</p>
                <p style="margin-top: 20px; color: #64748b;">— Equipe Nobreza ERP | Gestão Inteligente para Farmácias</p>
            </div>
        `
    },

    // 6. Branding & Relationship
    BRAND_MSG_1: {
        subject: "Cuidando de voçê, enquanto cuida de vidas.",
        html: `<h1>Gerir uma farmácia é cuidar de vidas todos os dias.</h1><p>O Nobreza ERP existe para que você possa focar no que realmente importa, enquanto cuidamos da gestão.</p><p>— Equipe Nobreza ERP</p>`
    },
    BRAND_MSG_2: {
        subject: "Crescer é um processo contínuo.",
        html: `<h1>Cada relatório analisado, cada stock bem controlado e cada decisão consciente constroem um negócio mais forte.</h1><p>Continue avançando. O crescimento é um processo contínuo.</p><p>— Equipe Nobreza ERP</p>`
    }
};
