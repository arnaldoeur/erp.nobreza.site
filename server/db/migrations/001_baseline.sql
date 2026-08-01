-- =============================================================================
-- Nobreza ERP — Schema Base (MySQL 8 / MariaDB 10.5+)
-- =============================================================================
-- Substitui as 55 migrações incrementais do Supabase/Postgres por um estado
-- único, determinístico e reprodutível.
--
-- Compatível com MySQL 8 e com MariaDB, que é o que a Hostinger fornece no
-- alojamento partilhado e Business. Daí a collation ser utf8mb4_unicode_ci e
-- não utf8mb4_0900_ai_ci: esta última só existe no MySQL 8 e faria a migração
-- falhar num servidor MariaDB.
--
-- Convenções aplicadas em todo o ficheiro:
--
--   Identificadores    `companies.id` é BIGINT UNSIGNED AUTO_INCREMENT (era
--                      `bigint identity` no Postgres). Todas as outras chaves
--                      são CHAR(36) com UUID v4 gerado na aplicação — o MySQL
--                      não tem `gen_random_uuid()` como default de coluna.
--
--   Datas              DATETIME(3), sempre em UTC. Não se usa TIMESTAMP: tem
--                      o limite de 2038 e converte silenciosamente segundo o
--                      fuso da sessão, o que corrompe dados quando o servidor
--                      e a aplicação discordam. A conversão para Africa/Maputo
--                      é feita na interface.
--
--   Dinheiro           DECIMAL(14,2). Nunca FLOAT ou DOUBLE — vírgula
--                      flutuante em valores monetários acumula erro e faz o
--                      fecho de caixa nunca bater certo.
--
--   Enumerados         ENUM nativo, em vez dos CHECK do Postgres. Ocupa menos,
--                      valida no motor e documenta os valores válidos.
--
--   Isolamento         `company_id` em todas as tabelas de negócio. No Supabase
--                      isto era garantido por RLS. Aqui é garantido pela API:
--                      o `company_id` vem sempre do token de sessão e nunca do
--                      cliente. Ver server/middleware/tenant.js.
--
--   Motor              InnoDB (transações e chaves estrangeiras) com
--                      utf8mb4_unicode_ci (acentuação portuguesa correta,
--                      emojis no chat, comparação insensível a acentos).
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- CONTROLO DE MIGRAÇÕES
-- =============================================================================
-- A ausência desta tabela era a razão pela qual o estado da base de dados
-- anterior não era reproduzível: não havia forma de saber o que já tinha sido
-- aplicado, e as migrações de emergência contradiziam-se entre si.

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(255) NOT NULL,
    applied_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    checksum    CHAR(64)     NOT NULL,
    PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 1. NÚCLEO — EMPRESAS E UTILIZADORES
-- =============================================================================

CREATE TABLE IF NOT EXISTS companies (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name                   VARCHAR(255)    NOT NULL,
    slogan                 VARCHAR(255)    NULL,
    nuit                   VARCHAR(32)     NULL,
    address                VARCHAR(500)    NULL,
    email                  VARCHAR(255)    NULL,
    contact                VARCHAR(64)     NULL,
    contact_alt            VARCHAR(64)     NULL,
    website                VARCHAR(255)    NULL,

    -- Logótipos guardados como data URI ou caminho em /uploads.
    logo                   MEDIUMTEXT      NULL,
    logo_horizontal        MEDIUMTEXT      NULL,
    logo_vertical          MEDIUMTEXT      NULL,

    theme_color            VARCHAR(9)      NOT NULL DEFAULT '#10b981',
    theme_color_secondary  VARCHAR(9)      NOT NULL DEFAULT '#6366f1',
    is_dark_mode           TINYINT(1)      NOT NULL DEFAULT 0,
    language               VARCHAR(10)     NOT NULL DEFAULT 'pt-MZ',
    timezone               VARCHAR(64)     NOT NULL DEFAULT 'Africa/Maputo',

    closing_time           VARCHAR(5)      NULL,
    working_hours          JSON            NULL,
    shifts                 JSON            NULL,
    payment_methods        JSON            NULL,
    email_domain           VARCHAR(255)    NULL,

    active                 TINYINT(1)      NOT NULL DEFAULT 1,
    created_at             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_companies_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Utilizadores
-- -----------------------------------------------------------------------------
-- No Supabase a identidade vivia em `auth.users` e esta tabela era apenas o
-- perfil. Sem Supabase Auth, esta passa a ser a tabela de identidade completa:
-- guarda o hash da password e o estado de bloqueio por tentativas falhadas.
--
-- `password_hash` é NULL enquanto a conta não foi ativada. Um administrador
-- cria o membro da equipa, e a pessoa define a própria password através do
-- link de ativação recebido por e-mail. Uma conta com hash NULL nunca
-- autentica (ver server/services/auth.service.js).

CREATE TABLE IF NOT EXISTS users (
    id                     CHAR(36)        NOT NULL,
    company_id             BIGINT UNSIGNED NOT NULL,

    name                   VARCHAR(255)    NOT NULL,
    email                  VARCHAR(255)    NOT NULL,
    password_hash          VARCHAR(255)    NULL,

    role                   ENUM('ADMIN','COMMERCIAL','TECHNICIAN','ADMINISTRATIVE',
                                'PARTNER','HEALTH','OTHER') NOT NULL DEFAULT 'OTHER',
    is_super_admin         TINYINT(1)      NOT NULL DEFAULT 0,

    employee_id            VARCHAR(64)     NULL,
    -- Número sequencial por empresa, apresentado à equipa. Atribuído pela API
    -- dentro da transação de criação, para não haver saltos nem repetições.
    sequential_id          INT UNSIGNED    NULL,

    responsibility         VARCHAR(255)    NULL,
    photo                  MEDIUMTEXT      NULL,
    contact                VARCHAR(64)     NULL,
    location               VARCHAR(255)    NULL,
    social_security_number VARCHAR(64)     NULL,
    base_salary            DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    base_hours             DECIMAL(6,2)    NOT NULL DEFAULT 160.00,
    hire_date              DATE            NULL,

    active                 TINYINT(1)      NOT NULL DEFAULT 1,
    email_verified_at      DATETIME(3)     NULL,
    last_login_at          DATETIME(3)     NULL,
    -- Trava de força bruta: ver server/services/auth.service.js
    failed_login_attempts  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until           DATETIME(3)     NULL,

    created_at             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    -- O e-mail identifica a conta no login, logo é único globalmente.
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_company_sequential (company_id, sequential_id),
    KEY idx_users_company (company_id),
    KEY idx_users_company_active (company_id, active),
    CONSTRAINT fk_users_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Tokens de renovação de sessão
-- -----------------------------------------------------------------------------
-- Guarda-se apenas o SHA-256 do token, nunca o token em si: se a base de dados
-- for lida indevidamente, as sessões não podem ser reconstruídas.

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           CHAR(36)     NOT NULL,
    user_id      CHAR(36)     NOT NULL,
    token_hash   CHAR(64)     NOT NULL,
    expires_at   DATETIME(3)  NOT NULL,
    revoked_at   DATETIME(3)  NULL,
    user_agent   VARCHAR(255) NULL,
    ip_address   VARCHAR(45)  NULL,
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_token_hash (token_hash),
    KEY idx_refresh_user (user_id),
    KEY idx_refresh_expires (expires_at),
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Tokens de recuperação e ativação de conta
-- -----------------------------------------------------------------------------
-- O sistema anterior enviava um e-mail com um link SEM token nenhum, para
-- `/#reset-password`, e depois exigia uma sessão já iniciada para trocar a
-- password — pelo que a recuperação nunca podia funcionar.
--
-- Aqui o token é aleatório (32 bytes), guardado apenas como hash, expira, e
-- é de uso único (`used_at`).

CREATE TABLE IF NOT EXISTS auth_tokens (
    id          CHAR(36)    NOT NULL,
    user_id     CHAR(36)    NOT NULL,
    purpose     ENUM('PASSWORD_RESET','ACCOUNT_ACTIVATION') NOT NULL,
    token_hash  CHAR(64)    NOT NULL,
    expires_at  DATETIME(3) NOT NULL,
    used_at     DATETIME(3) NULL,
    created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_token_hash (token_hash),
    KEY idx_auth_tokens_user (user_id, purpose),
    KEY idx_auth_tokens_expires (expires_at),
    CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. MÓDULO COMERCIAL
-- =============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id                 CHAR(36)        NOT NULL,
    company_id         BIGINT UNSIGNED NOT NULL,
    name               VARCHAR(255)    NOT NULL,
    nuit               VARCHAR(32)     NULL,
    location           VARCHAR(255)    NULL,
    contact            VARCHAR(64)     NULL,
    email              VARCHAR(255)    NULL,
    conditions         TEXT            NULL,
    estimated_delivery VARCHAR(128)    NULL,
    is_preferred       TINYINT(1)      NOT NULL DEFAULT 0,
    logo               MEDIUMTEXT      NULL,
    created_at         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_suppliers_company (company_id),
    -- Suporta o `findOrCreateByName`, que antes fazia uma pesquisa sem índice.
    KEY idx_suppliers_company_name (company_id, name),
    CONSTRAINT fk_suppliers_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
    id          CHAR(36)        NOT NULL,
    company_id  BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    nuit        VARCHAR(32)     NULL,
    contact     VARCHAR(64)     NULL,
    email       VARCHAR(255)    NULL,
    address     VARCHAR(500)    NULL,
    type        ENUM('NORMAL','INSTITUTIONAL') NOT NULL DEFAULT 'NORMAL',
    -- Mantido como valor acumulado por compatibilidade com a interface, mas
    -- passa a ser atualizado dentro da transação da venda, não por uma leitura
    -- seguida de escrita a partir do browser (que perdia atualizações
    -- concorrentes).
    total_spent DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_customers_company (company_id),
    KEY idx_customers_company_name (company_id, name),
    CONSTRAINT fk_customers_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id             CHAR(36)        NOT NULL,
    company_id     BIGINT UNSIGNED NOT NULL,
    name           VARCHAR(255)    NOT NULL,
    category       VARCHAR(128)    NOT NULL DEFAULT 'Geral',
    code           VARCHAR(128)    NULL,
    purchase_price DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    sale_price     DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    -- Quantidade em stock. Mantida como valor corrente para leitura rápida,
    -- mas alterada exclusivamente através de `stock_movements`, dentro de
    -- transações, para que exista sempre rasto de quem mexeu e porquê.
    quantity       INT             NOT NULL DEFAULT 0,
    min_stock      INT             NOT NULL DEFAULT 5,
    unit           VARCHAR(32)     NOT NULL DEFAULT 'Unidade',
    batch          VARCHAR(128)    NULL,
    expiry_date    DATE            NULL,
    supplier_id    CHAR(36)        NULL,
    description    TEXT            NULL,
    image_url      VARCHAR(500)    NULL,
    created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    -- O código do produto tem de ser único dentro da empresa. Antes não era
    -- garantido, o que permitia dois artigos com o mesmo código de barras.
    UNIQUE KEY uq_products_company_code (company_id, code),
    KEY idx_products_company (company_id),
    KEY idx_products_company_name (company_id, name),
    KEY idx_products_company_category (company_id, category),
    -- Suporta o alerta de stock baixo sem varrer a tabela inteira.
    KEY idx_products_company_quantity (company_id, quantity),
    -- Suporta o alerta de validade a expirar.
    KEY idx_products_expiry (company_id, expiry_date),
    KEY idx_products_supplier (supplier_id),
    CONSTRAINT fk_products_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    -- RESTRICT e não CASCADE: apagar um fornecedor não pode apagar o catálogo.
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id)
        REFERENCES suppliers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Vendas
-- -----------------------------------------------------------------------------
-- A coluna `items` em JSON foi eliminada. Antes os artigos de uma venda
-- existiam em dois sítios — `sales.items` (JSONB) e a tabela `sale_items` — e
-- divergiam. A tabela normalizada é agora a única fonte de verdade.

CREATE TABLE IF NOT EXISTS sales (
    id                     CHAR(36)        NOT NULL,
    company_id             BIGINT UNSIGNED NOT NULL,
    -- Número sequencial por empresa, para referência humana ("Venda #142").
    sale_number            INT UNSIGNED    NOT NULL,
    customer_id            CHAR(36)        NULL,
    -- Nome guardado em cópia: se o cliente for apagado ou mudar de nome, o
    -- histórico da venda tem de continuar a refletir o momento da transação.
    customer_name          VARCHAR(255)    NULL,
    total                  DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    discount               DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    type                   ENUM('DIRECT','INVOICE') NOT NULL DEFAULT 'DIRECT',
    payment_method         VARCHAR(32)     NOT NULL,
    other_payment_details  VARCHAR(255)    NULL,
    -- Quem registou a venda. O ID permite auditoria; o nome é um instantâneo.
    performed_by_id        CHAR(36)        NULL,
    performed_by           VARCHAR(255)    NOT NULL,
    created_at             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_company_number (company_id, sale_number),
    KEY idx_sales_company (company_id),
    -- Índice principal das listagens e dos gráficos do painel.
    KEY idx_sales_company_created (company_id, created_at),
    KEY idx_sales_customer (customer_id),
    KEY idx_sales_performed_by (performed_by_id),
    CONSTRAINT fk_sales_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id)
        REFERENCES customers (id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_user FOREIGN KEY (performed_by_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_items (
    id           CHAR(36)        NOT NULL,
    company_id   BIGINT UNSIGNED NOT NULL,
    sale_id      CHAR(36)        NOT NULL,
    product_id   CHAR(36)        NULL,
    -- Nome e preço são instantâneos do momento da venda. Se o produto mudar
    -- de preço amanhã, a venda de hoje não pode mudar de valor.
    product_name VARCHAR(255)    NOT NULL,
    quantity     INT             NOT NULL,
    unit_price   DECIMAL(14,2)   NOT NULL,
    total        DECIMAL(14,2)   NOT NULL,

    PRIMARY KEY (id),
    KEY idx_sale_items_sale (sale_id),
    KEY idx_sale_items_company (company_id),
    KEY idx_sale_items_product (product_id),
    CONSTRAINT fk_sale_items_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id)
        REFERENCES sales (id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Movimentos de stock
-- -----------------------------------------------------------------------------
-- Tabela nova. Antes, o stock era apenas um número que se sobrescrevia — e,
-- na prática, a venda nem sequer o abatia. Sem histórico era impossível
-- responder a "porque é que este produto tem 3 unidades e não 7?".
--
-- Cada alteração de `products.quantity` passa a ter aqui uma linha
-- correspondente, escrita na mesma transação.

CREATE TABLE IF NOT EXISTS stock_movements (
    id             CHAR(36)        NOT NULL,
    company_id     BIGINT UNSIGNED NOT NULL,
    product_id     CHAR(36)        NOT NULL,
    -- Negativo em saídas, positivo em entradas.
    quantity_delta INT             NOT NULL,
    -- Stock resultante após o movimento, para reconciliação e auditoria.
    quantity_after INT             NOT NULL,
    reason         ENUM('SALE','SALE_REVERSAL','PURCHASE','ADJUSTMENT',
                        'INITIAL','LOSS','EXPIRY','IMPORT') NOT NULL,
    -- Identificador do documento que originou o movimento (id da venda, etc).
    reference_id   CHAR(36)        NULL,
    notes          VARCHAR(500)    NULL,
    performed_by   CHAR(36)        NULL,
    created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_stock_mov_product (product_id, created_at),
    KEY idx_stock_mov_company (company_id, created_at),
    KEY idx_stock_mov_reference (reference_id),
    KEY idx_stock_mov_user (performed_by),
    CONSTRAINT fk_stock_mov_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_mov_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_mov_user FOREIGN KEY (performed_by)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. MÓDULO FINANCEIRO
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Numeração sequencial de documentos
-- -----------------------------------------------------------------------------
-- A numeração de faturas tem de ser contínua e sem repetições, por empresa e
-- por tipo. Antes o identificador era gerado no browser a partir do relógio
-- local, o que produzia saltos e podia repetir com dois postos em simultâneo.
--
-- A API incrementa esta linha com `SELECT ... FOR UPDATE` dentro da mesma
-- transação do documento, o que serializa os pedidos concorrentes.

CREATE TABLE IF NOT EXISTS document_sequences (
    company_id    BIGINT UNSIGNED NOT NULL,
    sequence_key  VARCHAR(64)     NOT NULL,
    current_value INT UNSIGNED    NOT NULL DEFAULT 0,
    updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (company_id, sequence_key),
    CONSTRAINT fk_doc_seq_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Documentos de faturação
-- -----------------------------------------------------------------------------
-- No Supabase, a tabela `documents` acumulava duas coisas sem relação: os
-- documentos de faturação (faturas, recibos, ordens de compra) e a biblioteca
-- de ficheiros anexados. Daí as oito migrações de correção seguidas, as
-- colunas obrigatórias que tiveram de passar a nulas, e o `name NOT NULL` que
-- partia a inserção de faturas.
--
-- Aqui são duas tabelas distintas, cada uma com as suas colunas obrigatórias.

CREATE TABLE IF NOT EXISTS billing_documents (
    id               CHAR(36)        NOT NULL,
    company_id       BIGINT UNSIGNED NOT NULL,
    -- Referência apresentada ao cliente, ex.: "FT 2026/0042".
    document_number  VARCHAR(64)     NOT NULL,
    type             ENUM('INVOICE','PURCHASE_ORDER','SUPPLIER_INVOICE','RECEIPT','QUOTE')
                     NOT NULL,
    status           ENUM('DRAFT','PENDING','SENT','PAID','CANCELLED')
                     NOT NULL DEFAULT 'PENDING',

    target_name      VARCHAR(255)    NOT NULL DEFAULT 'Consumidor Final',
    target_nuit      VARCHAR(32)     NULL,
    target_address   VARCHAR(500)    NULL,
    target_contact   VARCHAR(64)     NULL,
    target_email     VARCHAR(255)    NULL,
    customer_id      CHAR(36)        NULL,

    total            DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    -- Instantâneo das linhas do documento no momento da emissão. Aqui o JSON
    -- é intencional e correto: um documento emitido é imutável e não deve
    -- mudar se o catálogo mudar depois.
    items            JSON            NOT NULL,

    issue_date       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    due_date         DATE            NULL,
    -- Venda que originou o documento, quando emitido a partir do POS.
    sale_id          CHAR(36)        NULL,

    created_by_id    CHAR(36)        NULL,
    created_by       VARCHAR(255)    NOT NULL DEFAULT 'Sistema',
    last_modified_by CHAR(36)        NULL,
    created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_company_number (company_id, document_number),
    KEY idx_billing_company_created (company_id, created_at),
    KEY idx_billing_company_type (company_id, type),
    KEY idx_billing_company_status (company_id, status),
    KEY idx_billing_customer (customer_id),
    KEY idx_billing_sale (sale_id),
    KEY idx_billing_created_by (created_by_id),
    KEY idx_billing_modified_by (last_modified_by),
    CONSTRAINT fk_billing_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_billing_customer FOREIGN KEY (customer_id)
        REFERENCES customers (id) ON DELETE SET NULL,
    CONSTRAINT fk_billing_sale FOREIGN KEY (sale_id)
        REFERENCES sales (id) ON DELETE SET NULL,
    CONSTRAINT fk_billing_created_by FOREIGN KEY (created_by_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_billing_modified_by FOREIGN KEY (last_modified_by)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
    id          CHAR(36)        NOT NULL,
    company_id  BIGINT UNSIGNED NOT NULL,
    user_id     CHAR(36)        NULL,
    description VARCHAR(500)    NOT NULL,
    amount      DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    type        ENUM('Operational','Salary','Maintenance','Technical','Tax','Other')
                NOT NULL DEFAULT 'Operational',
    date        DATE            NOT NULL,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_expenses_company_date (company_id, date),
    KEY idx_expenses_user (user_id),
    CONSTRAINT fk_expenses_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_expenses_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_closures (
    id               CHAR(36)        NOT NULL,
    company_id       BIGINT UNSIGNED NOT NULL,
    closure_date     DATETIME(3)     NOT NULL,
    shift            VARCHAR(64)     NULL,
    responsible_id   CHAR(36)        NULL,
    responsible_name VARCHAR(255)    NULL,
    system_total     DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    manual_cash      DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    difference       DECIMAL(14,2)   NOT NULL DEFAULT 0.00,
    observations     TEXT            NULL,
    status           ENUM('CLOSED','REOPENED','AUDITED') NOT NULL DEFAULT 'CLOSED',
    created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_closures_company_date (company_id, closure_date),
    KEY idx_closures_responsible (responsible_id),
    CONSTRAINT fk_closures_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_closures_responsible FOREIGN KEY (responsible_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS health_plans (
    id                  CHAR(36)        NOT NULL,
    company_id          BIGINT UNSIGNED NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    insurer             VARCHAR(255)    NULL,
    coverage_percentage DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    contact             VARCHAR(64)     NULL,
    email               VARCHAR(255)    NULL,
    website             VARCHAR(255)    NULL,
    description         TEXT            NULL,
    coverage_details    TEXT            NULL,
    active              TINYINT(1)      NOT NULL DEFAULT 1,
    created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_health_plans_company (company_id, active),
    CONSTRAINT fk_health_plans_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
    id         CHAR(36)        NOT NULL,
    company_id BIGINT UNSIGNED NOT NULL,
    user_id    CHAR(36)        NULL,
    type       VARCHAR(64)     NOT NULL,
    period     VARCHAR(32)     NOT NULL,
    summary    TEXT            NULL,
    data       JSON            NULL,
    metadata   JSON            NULL,
    created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_reports_company_created (company_id, created_at),
    KEY idx_reports_user (user_id),
    CONSTRAINT fk_reports_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_reports_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. REGISTO DE ATIVIDADE E TEMPO
-- =============================================================================

-- O `id` era TEXT gerado no browser (`LOG-{timestamp}`), o que permitia
-- colisões entre postos e falsificação. Passa a UUID atribuído pelo servidor.

CREATE TABLE IF NOT EXISTS system_logs (
    id         CHAR(36)        NOT NULL,
    company_id BIGINT UNSIGNED NOT NULL,
    user_id    CHAR(36)        NULL,
    -- Nome em cópia: o registo tem de continuar legível depois de o
    -- utilizador ser removido.
    user_name  VARCHAR(255)    NULL,
    action     VARCHAR(128)    NOT NULL,
    details    TEXT            NULL,
    ip_address VARCHAR(45)     NULL,
    timestamp  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_logs_company_timestamp (company_id, timestamp),
    KEY idx_logs_user (user_id),
    KEY idx_logs_action (company_id, action),
    CONSTRAINT fk_logs_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_shifts (
    id               CHAR(36)        NOT NULL,
    company_id       BIGINT UNSIGNED NOT NULL,
    user_id          CHAR(36)        NOT NULL,
    start_time       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    end_time         DATETIME(3)     NULL,
    status           ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
    notes            TEXT            NULL,
    metadata         JSON            NULL,
    created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_shifts_user_status (user_id, status),
    KEY idx_shifts_company_start (company_id, start_time),
    CONSTRAINT fk_shifts_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_shifts_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id         CHAR(36)        NOT NULL,
    company_id BIGINT UNSIGNED NOT NULL,
    user_id    CHAR(36)        NULL,
    type       VARCHAR(64)     NOT NULL,
    title      VARCHAR(255)    NOT NULL,
    content    TEXT            NULL,
    is_read    TINYINT(1)      NOT NULL DEFAULT 0,
    metadata   JSON            NULL,
    created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    -- Serve a consulta dominante: notificações por ler de um utilizador.
    KEY idx_notif_user_read (user_id, is_read, created_at),
    KEY idx_notif_company (company_id, created_at),
    CONSTRAINT fk_notif_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. MÓDULO DE COLABORAÇÃO
-- =============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id          CHAR(36)        NOT NULL,
    company_id  BIGINT UNSIGNED NOT NULL,
    creator_id  CHAR(36)        NULL,
    assigned_to CHAR(36)        NULL,
    title       VARCHAR(255)    NOT NULL,
    description TEXT            NULL,
    status      ENUM('PENDING','PROGRESS','DONE') NOT NULL DEFAULT 'PENDING',
    priority    ENUM('LOW','MEDIUM','HIGH')       NOT NULL DEFAULT 'MEDIUM',
    due_date    DATE            NULL,
    location    VARCHAR(255)    NULL,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_tasks_company_status (company_id, status),
    KEY idx_tasks_assigned (assigned_to, status),
    KEY idx_tasks_creator (creator_id),
    KEY idx_tasks_due (company_id, due_date),
    CONSTRAINT fk_tasks_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_creator FOREIGN KEY (creator_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assigned_to)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_chat_groups (
    id          CHAR(36)        NOT NULL,
    company_id  BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    description TEXT            NULL,
    image_url   MEDIUMTEXT      NULL,
    created_by  CHAR(36)        NULL,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_chat_groups_company_name (company_id, name),
    KEY idx_chat_groups_creator (created_by),
    CONSTRAINT fk_chat_groups_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_groups_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_chat_group_members (
    group_id  CHAR(36)    NOT NULL,
    user_id   CHAR(36)    NOT NULL,
    role      ENUM('ADMIN','MEMBER') NOT NULL DEFAULT 'MEMBER',
    joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (group_id, user_id),
    KEY idx_group_members_user (user_id),
    CONSTRAINT fk_group_members_group FOREIGN KEY (group_id)
        REFERENCES erp_chat_groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_members_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A coluna chamava-se `grupo_id` (mistura de idiomas herdada). Passa a
-- `group_id`, coerente com o resto do schema.

CREATE TABLE IF NOT EXISTS erp_chat_messages (
    id         CHAR(36)        NOT NULL,
    company_id BIGINT UNSIGNED NOT NULL,
    group_id   CHAR(36)        NOT NULL,
    user_id    CHAR(36)        NULL,
    user_name  VARCHAR(255)    NULL,
    content    TEXT            NOT NULL,
    mentions   JSON            NULL,
    created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    -- Ordenação natural da conversa e base da sondagem de mensagens novas.
    KEY idx_chat_msg_group_created (group_id, created_at),
    KEY idx_chat_msg_company (company_id),
    KEY idx_chat_msg_user (user_id),
    CONSTRAINT fk_chat_msg_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_msg_group FOREIGN KEY (group_id)
        REFERENCES erp_chat_groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_msg_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Biblioteca de ficheiros
-- -----------------------------------------------------------------------------
-- A metade "ficheiros" da antiga tabela `documents`, agora isolada. Sem
-- Supabase Storage, `file_path` é um caminho relativo dentro de UPLOAD_DIR e
-- o ficheiro é servido por uma rota autenticada — nunca por URL pública, como
-- acontecia no bucket que a migração 28 tornou aberto a toda a gente.

CREATE TABLE IF NOT EXISTS documents (
    id               CHAR(36)        NOT NULL,
    company_id       BIGINT UNSIGNED NOT NULL,
    user_id          CHAR(36)        NULL,
    name             VARCHAR(255)    NOT NULL,
    category         VARCHAR(128)    NULL,
    file_path        VARCHAR(500)    NOT NULL,
    file_type        VARCHAR(128)    NULL,
    file_size        INT UNSIGNED    NULL,
    last_modified_by CHAR(36)        NULL,
    created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_documents_company_created (company_id, created_at),
    KEY idx_documents_user (user_id),
    KEY idx_documents_modified_by (last_modified_by),
    CONSTRAINT fk_documents_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_modified_by FOREIGN KEY (last_modified_by)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. SUPORTE
-- =============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id          CHAR(36)        NOT NULL,
    company_id  BIGINT UNSIGNED NOT NULL,
    user_id     CHAR(36)        NULL,
    subject     VARCHAR(255)    NOT NULL,
    description TEXT            NULL,
    priority    ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
    status      ENUM('OPEN','IN_ANALYSIS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_tickets_company_status (company_id, status),
    KEY idx_tickets_user (user_id),
    CONSTRAINT fk_tickets_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_chats (
    id              CHAR(36)        NOT NULL,
    company_id      BIGINT UNSIGNED NOT NULL,
    user_id         CHAR(36)        NOT NULL,
    type            ENUM('AI','HUMAN') NOT NULL DEFAULT 'AI',
    title           VARCHAR(255)    NOT NULL DEFAULT 'Nova Conversa',
    status          ENUM('OPEN','CLOSED','ARCHIVED') NOT NULL DEFAULT 'OPEN',
    last_message_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_support_chats_user (user_id, type, last_message_at),
    KEY idx_support_chats_company (company_id),
    CONSTRAINT fk_support_chats_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_support_chats_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_messages (
    id          CHAR(36)    NOT NULL,
    chat_id     CHAR(36)    NOT NULL,
    role        ENUM('user','assistant','system') NOT NULL,
    content     MEDIUMTEXT  NOT NULL,
    attachments JSON        NULL,
    created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_support_msg_chat (chat_id, created_at),
    CONSTRAINT fk_support_msg_chat FOREIGN KEY (chat_id)
        REFERENCES support_chats (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. CALENDÁRIO
-- =============================================================================

CREATE TABLE IF NOT EXISTS erp_events (
    id          CHAR(36)        NOT NULL,
    company_id  BIGINT UNSIGNED NOT NULL,
    title       VARCHAR(255)    NOT NULL,
    description TEXT            NULL,
    start_time  DATETIME(3)     NOT NULL,
    end_time    DATETIME(3)     NOT NULL,
    location    VARCHAR(255)    NULL,
    type        ENUM('MEETING','TASK','REMINDER') NOT NULL DEFAULT 'MEETING',
    priority    ENUM('LOW','MEDIUM','HIGH')       NOT NULL DEFAULT 'MEDIUM',
    status      ENUM('PENDING','COMPLETED','OVERDUE') NOT NULL DEFAULT 'PENDING',
    is_personal TINYINT(1)      NOT NULL DEFAULT 0,
    -- Preenchido quando o evento nasce da sincronização de uma tarefa, para
    -- que editar a tarefa não crie um evento duplicado de cada vez.
    task_id     CHAR(36)        NULL,
    created_by  CHAR(36)        NULL,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    -- Consulta dominante: eventos de uma empresa num intervalo de datas.
    KEY idx_events_company_start (company_id, start_time),
    KEY idx_events_creator (created_by),
    UNIQUE KEY uq_events_task (task_id),
    CONSTRAINT fk_events_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_events_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_events_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_event_attendees (
    event_id CHAR(36)    NOT NULL,
    user_id  CHAR(36)    NOT NULL,
    status   ENUM('PENDING','ACCEPTED','DECLINED') NOT NULL DEFAULT 'PENDING',
    added_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (event_id, user_id),
    KEY idx_attendees_user (user_id),
    CONSTRAINT fk_attendees_event FOREIGN KEY (event_id)
        REFERENCES erp_events (id) ON DELETE CASCADE,
    CONSTRAINT fk_attendees_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. MÓDULO DE E-MAIL
-- =============================================================================
-- As passwords SMTP e IMAP eram guardadas em texto simples e devolvidas ao
-- browser num `select('*')`. Passam a ser cifradas com AES-256-GCM
-- (server/utils/crypto.js) e nunca saem do servidor: a API remove estes
-- campos de qualquer resposta.
--
-- O sufixo `_encrypted` no nome da coluna é deliberado — torna impossível
-- alguém escrever uma password em claro aqui por distração.

CREATE TABLE IF NOT EXISTS erp_email_accounts (
    id                  CHAR(36)        NOT NULL,
    company_id          BIGINT UNSIGNED NOT NULL,
    user_id             CHAR(36)        NULL,
    account_type        ENUM('COMPANY','TEAM','PERSONAL','SYSTEM') NOT NULL DEFAULT 'PERSONAL',
    display_name        VARCHAR(255)    NOT NULL,
    email               VARCHAR(255)    NOT NULL,

    smtp_host           VARCHAR(255)    NULL,
    smtp_port           SMALLINT UNSIGNED NULL DEFAULT 465,
    smtp_user           VARCHAR(255)    NULL,
    smtp_pass_encrypted VARBINARY(1024) NULL,
    smtp_secure         TINYINT(1)      NOT NULL DEFAULT 1,

    imap_host           VARCHAR(255)    NULL,
    imap_port           SMALLINT UNSIGNED NULL DEFAULT 993,
    imap_user           VARCHAR(255)    NULL,
    imap_pass_encrypted VARBINARY(1024) NULL,
    imap_secure         TINYINT(1)      NOT NULL DEFAULT 1,

    is_active           TINYINT(1)      NOT NULL DEFAULT 1,
    created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_email_accounts_company_email (company_id, email),
    KEY idx_email_accounts_company (company_id),
    KEY idx_email_accounts_user (user_id),
    CONSTRAINT fk_email_accounts_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_email_accounts_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_email_folders (
    id           CHAR(36)     NOT NULL,
    account_id   CHAR(36)     NOT NULL,
    name         VARCHAR(255) NOT NULL,
    path         VARCHAR(500) NOT NULL,
    type         ENUM('INBOX','SENT','DRAFT','TRASH','JUNK','ARCHIVE','CUSTOM')
                 NOT NULL DEFAULT 'CUSTOM',
    total_count  INT UNSIGNED NOT NULL DEFAULT 0,
    unseen_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_sync    DATETIME(3)  NULL,
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_folders_account_path (account_id, path),
    CONSTRAINT fk_folders_account FOREIGN KEY (account_id)
        REFERENCES erp_email_accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_emails_metadata (
    id              CHAR(36)     NOT NULL,
    account_id      CHAR(36)     NOT NULL,
    folder_id       CHAR(36)     NOT NULL,
    uid             INT UNSIGNED NOT NULL,
    message_id      VARCHAR(500) NULL,
    subject         VARCHAR(500) NULL,
    from_name       VARCHAR(255) NULL,
    from_addr       VARCHAR(255) NULL,
    to_addr         JSON         NULL,
    cc_addr         JSON         NULL,
    bcc_addr        JSON         NULL,
    date            DATETIME(3)  NULL,
    flags           JSON         NULL,
    has_attachments TINYINT(1)   NOT NULL DEFAULT 0,
    snippet         TEXT         NULL,
    body_structure  JSON         NULL,
    created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    -- Impede duplicados quando uma sincronização IMAP é repetida.
    UNIQUE KEY uq_emails_folder_uid (folder_id, uid),
    KEY idx_emails_folder_date (folder_id, date),
    KEY idx_emails_account (account_id),
    CONSTRAINT fk_emails_account FOREIGN KEY (account_id)
        REFERENCES erp_email_accounts (id) ON DELETE CASCADE,
    CONSTRAINT fk_emails_folder FOREIGN KEY (folder_id)
        REFERENCES erp_email_folders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS erp_domains (
    id          CHAR(36)        NOT NULL,
    company_id  BIGINT UNSIGNED NOT NULL,
    domain      VARCHAR(255)    NOT NULL,
    status      ENUM('not_started','pending','verified','failed') NOT NULL DEFAULT 'not_started',
    dns_records JSON            NULL,
    provider_id VARCHAR(255)    NULL,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_domains_company_domain (company_id, domain),
    CONSTRAINT fk_domains_company FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
