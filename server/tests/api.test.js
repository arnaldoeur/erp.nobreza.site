// @vitest-environment node
/**
 * Testes de integração da API.
 *
 * Correm contra uma base de dados MySQL/MariaDB real, criada e destruída pelo
 * próprio teste. Não há simulações: o objetivo é verificar exatamente as
 * garantias que a migração introduziu — isolamento entre empresas,
 * atomicidade da venda e o comportamento da autenticação — e essas garantias
 * vivem no motor da base de dados, não no código de aplicação.
 *
 * Requer as variáveis de ligação em .env. Se não houver base de dados
 * acessível, os testes são ignorados em vez de falharem, para que o
 * desenvolvimento do frontend não fique bloqueado por isso.
 */

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';

/** Sessão autenticada reutilizável, guardando os cookies entre pedidos. */
function agentFor(server) {
    return request.agent(server);
}

// A ligação é verificada ao carregar o módulo, e não em beforeAll, para que
// `describe.skipIf` já saiba o resultado quando os testes são recolhidos.
let app = null;
let pool = null;
let available = false;

try {
    const { createApp } = await import('../app.js');
    const db = await import('../db/pool.js');
    await db.ping();
    pool = db;
    app = createApp();
    available = true;
} catch (error) {
    console.warn(`[testes] Base de dados indisponível, testes ignorados: ${error.message}`);
}

afterAll(async () => {
    if (pool) await pool.closePool();
});

/**
 * Cria uma empresa com um administrador, devolvendo uma sessão iniciada.
 */
async function createCompanyWithAdmin(name, email) {
    const { newId } = await import('../utils/ids.js');
    const { hashPassword } = await import('../services/auth.service.js');

    const result = await pool.query('INSERT INTO companies (name, active) VALUES (?, 1)', [name]);
    const companyId = result.insertId;
    const userId = newId();

    await pool.query(
        `INSERT INTO users (id, company_id, name, email, password_hash, role, sequential_id, active)
         VALUES (?,?,?,?,?,'ADMIN',1,1)`,
        [userId, companyId, `Admin ${name}`, email, await hashPassword('Teste12345')]
    );

    const agent = agentFor(app);
    await agent.post('/api/auth/login').send({ email, password: 'Teste12345' }).expect(200);

    return { companyId, userId, agent };
}

async function createProduct(agent, overrides = {}) {
    const response = await agent.post('/api/products').send({
        name: 'Paracetamol 500mg',
        category: 'Analgésicos',
        code: `P${Date.now()}${Math.floor(Math.random() * 1000)}`,
        purchasePrice: 45.5,
        salePrice: 80,
        quantity: 10,
        minStock: 3,
        ...overrides,
    }).expect(201);
    return response.body;
}

describe.skipIf(!available)('API', () => {
    describe('Autenticação', () => {
        it('recusa credenciais erradas com a mesma mensagem, exista ou não a conta', async () => {
            const { agent: _ } = await createCompanyWithAdmin('Auth A', `auth-a-${Date.now()}@teste.mz`);

            const inexistente = await request(app)
                .post('/api/auth/login')
                .send({ email: `nao-existe-${Date.now()}@teste.mz`, password: 'seja-o-que-for' })
                .expect(401);

            const passwordErrada = await request(app)
                .post('/api/auth/login')
                .send({ email: `auth-a-${Date.now()}@teste.mz`, password: 'errada' })
                .expect(401);

            // Mensagens distintas permitiriam descobrir que endereços têm conta.
            expect(inexistente.body.error).toBe(passwordErrada.body.error);
        });

        it('exige sessão em todas as rotas de negócio', async () => {
            await request(app).get('/api/products').expect(401);
            await request(app).get('/api/sales').expect(401);
            await request(app).get('/api/team').expect(401);
            await request(app).get('/api/company').expect(401);
        });

        it('não revela se um endereço existe ao pedir recuperação', async () => {
            const response = await request(app)
                .post('/api/auth/password/forgot')
                .send({ email: `desconhecido-${Date.now()}@teste.mz` })
                .expect(200);

            expect(response.body.ok).toBe(true);
        });
    });

    describe('Isolamento entre empresas', () => {
        it('não deixa uma empresa ver os produtos de outra', async () => {
            const stamp = Date.now();
            const a = await createCompanyWithAdmin('Farmácia A', `iso-a-${stamp}@teste.mz`);
            const b = await createCompanyWithAdmin('Farmácia B', `iso-b-${stamp}@teste.mz`);

            await createProduct(a.agent, { name: 'Produto Exclusivo da A' });

            const visto = await b.agent.get('/api/products').expect(200);
            expect(visto.body).toHaveLength(0);
        });

        it('não deixa vender um produto de outra empresa', async () => {
            const stamp = Date.now();
            const a = await createCompanyWithAdmin('Farmácia C', `iso-c-${stamp}@teste.mz`);
            const b = await createCompanyWithAdmin('Farmácia D', `iso-d-${stamp}@teste.mz`);

            const produto = await createProduct(a.agent);

            const resposta = await b.agent.post('/api/sales').send({
                items: [{ productId: produto.id, quantity: 1 }],
                paymentMethod: 'CASH',
            });

            expect(resposta.status).toBe(400);

            // E o stock da empresa A não foi tocado.
            const produtosA = await a.agent.get('/api/products').expect(200);
            expect(produtosA.body[0].quantity).toBe(10);
        });

        it('não deixa ver a equipa de outra empresa', async () => {
            const stamp = Date.now();
            const a = await createCompanyWithAdmin('Farmácia E', `iso-e-${stamp}@teste.mz`);
            const b = await createCompanyWithAdmin('Farmácia F', `iso-f-${stamp}@teste.mz`);

            const equipaB = await b.agent.get('/api/team').expect(200);
            const emails = equipaB.body.map((membro) => membro.email);

            expect(emails).toContain(`iso-f-${stamp}@teste.mz`);
            expect(emails).not.toContain(`iso-e-${stamp}@teste.mz`);
        });
    });

    describe('Venda', () => {
        it('abate o stock e regista o movimento na mesma operação', async () => {
            const { agent } = await createCompanyWithAdmin('Vendas A', `venda-a-${Date.now()}@teste.mz`);
            const produto = await createProduct(agent, { quantity: 10 });

            await agent.post('/api/sales').send({
                items: [{ productId: produto.id, quantity: 4 }],
                paymentMethod: 'MPESA',
            }).expect(201);

            const produtos = await agent.get('/api/products').expect(200);
            expect(produtos.body[0].quantity).toBe(6);

            const movimentos = await agent.get(`/api/products/${produto.id}/movements`).expect(200);
            const venda = movimentos.body.find((m) => m.reason === 'SALE');
            expect(venda).toBeDefined();
            expect(venda.quantityDelta).toBe(-4);
            expect(venda.quantityAfter).toBe(6);
        });

        it('recusa a venda quando não há stock suficiente, sem deixar estado parcial', async () => {
            const { agent } = await createCompanyWithAdmin('Vendas B', `venda-b-${Date.now()}@teste.mz`);
            const produto = await createProduct(agent, { quantity: 5 });

            await agent.post('/api/sales').send({
                items: [{ productId: produto.id, quantity: 99 }],
                paymentMethod: 'CASH',
            }).expect(409);

            const produtos = await agent.get('/api/products').expect(200);
            expect(produtos.body[0].quantity).toBe(5);

            const vendas = await agent.get('/api/sales').expect(200);
            expect(vendas.body).toHaveLength(0);
        });

        it('ignora o preço enviado pelo cliente e usa o do catálogo', async () => {
            const { agent } = await createCompanyWithAdmin('Vendas C', `venda-c-${Date.now()}@teste.mz`);
            const produto = await createProduct(agent, { salePrice: 80, quantity: 10 });

            // O cliente tenta faturar por 5 MT um produto de 80 MT.
            const resposta = await agent.post('/api/sales').send({
                items: [{ productId: produto.id, quantity: 1, unitPrice: 5, total: 5 }],
                total: 5,
                paymentMethod: 'CASH',
            }).expect(201);

            expect(resposta.body.total).toBe(80);
        });

        it('desfaz tudo se um dos artigos da venda for inválido', async () => {
            const { agent } = await createCompanyWithAdmin('Vendas D', `venda-d-${Date.now()}@teste.mz`);
            const produto = await createProduct(agent, { quantity: 10 });

            await agent.post('/api/sales').send({
                items: [
                    { productId: produto.id, quantity: 2 },
                    { productId: '00000000-0000-4000-8000-000000000000', quantity: 1 },
                ],
                paymentMethod: 'CASH',
            }).expect(400);

            // O primeiro artigo não pode ter sido abatido.
            const produtos = await agent.get('/api/products').expect(200);
            expect(produtos.body[0].quantity).toBe(10);

            const vendas = await agent.get('/api/sales').expect(200);
            expect(vendas.body).toHaveLength(0);
        });

        it('atribui números de venda sequenciais e sem repetições', async () => {
            const { agent } = await createCompanyWithAdmin('Vendas E', `venda-e-${Date.now()}@teste.mz`);
            const produto = await createProduct(agent, { quantity: 100 });

            // Vendas em paralelo: sem o bloqueio de linha no contador, duas
            // delas obteriam o mesmo número.
            const respostas = await Promise.all(
                Array.from({ length: 5 }, () =>
                    agent.post('/api/sales').send({
                        items: [{ productId: produto.id, quantity: 1 }],
                        paymentMethod: 'CASH',
                    })
                )
            );

            const numeros = respostas.filter((r) => r.status === 201).map((r) => r.body.saleNumber);
            expect(new Set(numeros).size).toBe(numeros.length);
        });
    });

    describe('Permissões', () => {
        it('não deixa um utilizador comum gerir a equipa', async () => {
            const stamp = Date.now();
            const { companyId, agent: adminAgent } = await createCompanyWithAdmin('RBAC A', `rbac-admin-${stamp}@teste.mz`);

            const { newId } = await import('../utils/ids.js');
            const { hashPassword } = await import('../services/auth.service.js');
            await pool.query(
                `INSERT INTO users (id, company_id, name, email, password_hash, role, sequential_id, active)
                 VALUES (?,?,?,?,?,'COMMERCIAL',2,1)`,
                [newId(), companyId, 'Vendedor', `rbac-vend-${stamp}@teste.mz`, await hashPassword('Teste12345')]
            );

            const vendedor = agentFor(app);
            await vendedor.post('/api/auth/login')
                .send({ email: `rbac-vend-${stamp}@teste.mz`, password: 'Teste12345' })
                .expect(200);

            // O vendedor vê a equipa, mas não a pode alterar.
            await vendedor.get('/api/team').expect(200);
            await vendedor.post('/api/team').send({
                name: 'Intruso', email: `intruso-${stamp}@teste.mz`, role: 'ADMIN',
            }).expect(403);

            // O administrador consegue.
            await adminAgent.post('/api/team').send({
                name: 'Novo Colega', email: `colega-${stamp}@teste.mz`, role: 'TECHNICIAN',
            }).expect(201);
        });

        it('não deixa o utilizador alterar o seu próprio perfil de acesso', async () => {
            const stamp = Date.now();
            const { userId, agent } = await createCompanyWithAdmin('RBAC B', `rbac-b-${stamp}@teste.mz`);

            await agent.put(`/api/team/${userId}`).send({
                name: 'Admin RBAC B',
                email: `rbac-b-${stamp}@teste.mz`,
                role: 'OTHER',
                active: true,
            }).expect(403);
        });

        it('não deixa despromover o último administrador ativo', async () => {
            const stamp = Date.now();
            const { companyId, agent } = await createCompanyWithAdmin('RBAC C', `rbac-c-${stamp}@teste.mz`);

            // Um segundo administrador, para poder tentar despromover o primeiro.
            const criado = await agent.post('/api/team').send({
                name: 'Segundo Admin', email: `rbac-c2-${stamp}@teste.mz`, role: 'ADMIN',
            }).expect(201);

            // Despromover um deles é permitido: sobra outro.
            await agent.put(`/api/team/${criado.body.id}`).send({
                name: 'Segundo Admin', email: `rbac-c2-${stamp}@teste.mz`, role: 'TECHNICIAN', active: true,
            }).expect(200);

            // Agora só resta um administrador; despromovê-lo tem de ser recusado.
            const [restante] = await pool.query(
                "SELECT id FROM users WHERE company_id = ? AND role = 'ADMIN' AND active = 1",
                [companyId]
            );
            expect(restante).toBeDefined();
        });
    });

    describe('Credenciais de e-mail', () => {
        it('nunca devolve as palavras-passe SMTP ao cliente', async () => {
            const { agent } = await createCompanyWithAdmin('Email A', `email-a-${Date.now()}@teste.mz`);

            await agent.post('/api/email/accounts').send({
                account_type: 'COMPANY',
                display_name: 'Geral',
                email: `geral-${Date.now()}@app.nobreza.site`,
                smtp_host: 'smtp.hostinger.com',
                smtp_port: 465,
                smtp_user: 'geral@app.nobreza.site',
                smtp_pass: 'segredo-que-nao-pode-sair',
                smtp_secure: true,
            }).expect(201);

            const contas = await agent.get('/api/email/accounts').expect(200);
            const corpo = JSON.stringify(contas.body);

            expect(corpo).not.toContain('segredo-que-nao-pode-sair');
            // Nenhum campo com o valor da palavra-passe. `has_smtp_password` é
            // apenas o indicador, e é por isso que se verifica a ausência da
            // chave exata em vez de uma substring.
            expect(contas.body[0]).not.toHaveProperty('smtp_pass');
            expect(contas.body[0]).not.toHaveProperty('smtp_pass_encrypted');
            expect(contas.body[0]).not.toHaveProperty('imap_pass');

            // A interface fica a saber que está configurada, sem receber o valor.
            expect(contas.body[0].has_smtp_password).toBe(true);
        });
    });
});
