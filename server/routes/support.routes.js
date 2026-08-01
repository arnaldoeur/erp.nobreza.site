/**
 * Suporte: pedidos de assistência e assistente de IA.
 *
 * A chave da OpenRouter estava escrita à mão em `services/support.service.ts`,
 * no código do frontend, e portanto compilada para dentro do JavaScript
 * servido a qualquer visitante do site. Bastava abrir as ferramentas de
 * programador para a copiar e gastar a conta.
 *
 * Agora a chave vive apenas no servidor e o browser fala com esta rota.
 */

import { Router } from 'express';
import { createLimiter } from '../middleware/rate-limit.js';
import { asyncHandler, badRequest, notFound } from '../utils/errors.js';
import { query, queryOne } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { config } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import {
    requireString, optionalString, requireUuid, requireEnum, optionalEnum,
    parseJson, toJson, toNumber,
} from '../utils/validate.js';

export const supportRouter = Router();
supportRouter.use(requireAuth);

// =============================================================================
// PEDIDOS DE ASSISTÊNCIA
// =============================================================================

supportRouter.get('/support/tickets', asyncHandler(async (req, res) => {
    const rows = await query(
        `SELECT t.*, u.name AS user_name
           FROM support_tickets t
           LEFT JOIN users u ON u.id = t.user_id
          WHERE t.company_id = ?
          ORDER BY t.created_at DESC
          LIMIT 200`,
        [req.auth.companyId]
    );
    res.json(rows.map((row) => ({
        id: row.id,
        company_id: String(row.company_id),
        user_id: row.user_id ?? '',
        user_name: row.user_name ?? 'Utilizador',
        subject: row.subject,
        description: row.description ?? '',
        priority: row.priority,
        status: row.status,
        created_at: row.created_at,
    })));
}));

supportRouter.post('/support/tickets', asyncHandler(async (req, res) => {
    const id = newId();
    await query(
        `INSERT INTO support_tickets (id, company_id, user_id, subject, description, priority, status)
         VALUES (?,?,?,?,?,?,'OPEN')`,
        [id, req.auth.companyId, req.auth.userId,
         requireString(req.body?.subject, 'assunto'),
         optionalString(req.body?.description, 'descrição', { max: 10000 }),
         optionalEnum(req.body?.priority, 'prioridade', ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], 'MEDIUM')]
    );

    const row = await queryOne('SELECT * FROM support_tickets WHERE id = ?', [id]);
    res.status(201).json({ ...row, company_id: String(row.company_id) });
}));

// =============================================================================
// CONVERSAS DE SUPORTE
// =============================================================================

supportRouter.get('/support/chats', asyncHandler(async (req, res) => {
    const type = optionalEnum(req.query.type, 'tipo', ['AI', 'HUMAN'], 'AI');
    const rows = await query(
        `SELECT * FROM support_chats
          WHERE company_id = ? AND user_id = ? AND type = ?
          ORDER BY last_message_at DESC
          LIMIT 100`,
        [req.auth.companyId, req.auth.userId, type]
    );
    res.json(rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        status: row.status,
        last_message_at: row.last_message_at,
    })));
}));

supportRouter.post('/support/chats', asyncHandler(async (req, res) => {
    const type = optionalEnum(req.body?.type, 'tipo', ['AI', 'HUMAN'], 'AI');
    const title = optionalString(req.body?.title, 'título', { max: 255 })
        ?? (type === 'AI' ? 'Assistente Virtual' : 'Suporte Especializado');

    const id = newId();
    await query(
        'INSERT INTO support_chats (id, company_id, user_id, type, title) VALUES (?,?,?,?,?)',
        [id, req.auth.companyId, req.auth.userId, type, title]
    );

    const row = await queryOne('SELECT * FROM support_chats WHERE id = ?', [id]);
    res.status(201).json({ id: row.id, title: row.title, type: row.type, status: row.status, last_message_at: row.last_message_at });
}));

/** Confirma que a conversa pertence a quem faz o pedido. */
async function assertChatOwnership(chatId, auth) {
    const chat = await queryOne(
        'SELECT id FROM support_chats WHERE id = ? AND company_id = ? AND user_id = ?',
        [chatId, auth.companyId, auth.userId]
    );
    if (!chat) throw notFound('Conversa não encontrada.');
    return chat;
}

supportRouter.get('/support/chats/:id/messages', asyncHandler(async (req, res) => {
    const chatId = requireUuid(req.params.id, 'conversa');
    await assertChatOwnership(chatId, req.auth);

    const rows = await query(
        'SELECT * FROM support_messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 500',
        [chatId]
    );
    res.json(rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        attachments: parseJson(row.attachments, []),
        created_at: row.created_at,
    })));
}));

// O assistente custa dinheiro a cada pergunta. Sem limite, uma página aberta
// em ciclo esgotaria o saldo da conta OpenRouter.
const aiLimiter = createLimiter({
    windowMs: 60 * 1000,
    limit: 10,
    message: 'Demasiadas perguntas seguidas ao assistente. Aguarde um momento.',
});

/**
 * Envia uma pergunta ao assistente e devolve a resposta.
 *
 * O contexto de negócio (vendas, stock) é reunido aqui, no servidor, a partir
 * da empresa da sessão. Antes era o browser que o enviava, o que significava
 * que o conteúdo do pedido — e portanto o que a IA "sabia" — era escolhido
 * pelo cliente.
 */
supportRouter.post('/support/chats/:id/ask', aiLimiter, asyncHandler(async (req, res) => {
    const chatId = requireUuid(req.params.id, 'conversa');
    await assertChatOwnership(chatId, req.auth);

    const question = requireString(req.body?.question, 'pergunta', { max: 4000 });

    // Grava a pergunta antes de chamar o modelo, para que não se perca se a
    // chamada externa falhar.
    await query(
        "INSERT INTO support_messages (id, chat_id, role, content) VALUES (?,?,'user',?)",
        [newId(), chatId, question]
    );
    await query('UPDATE support_chats SET last_message_at = UTC_TIMESTAMP(3) WHERE id = ?', [chatId]);

    if (!config.ai.apiKey) {
        const message = 'O assistente de IA não está configurado neste sistema. Contacte o suporte.';
        await query(
            "INSERT INTO support_messages (id, chat_id, role, content) VALUES (?,?,'assistant',?)",
            [newId(), chatId, message]
        );
        return res.json({ answer: message, configured: false });
    }

    const [user, products, sales] = await Promise.all([
        queryOne('SELECT name, role FROM users WHERE id = ?', [req.auth.userId]),
        query(
            `SELECT name, quantity, min_stock, sale_price FROM products
              WHERE company_id = ? ORDER BY quantity ASC LIMIT 20`,
            [req.auth.companyId]
        ),
        query(
            `SELECT total, created_at, payment_method FROM sales
              WHERE company_id = ? ORDER BY created_at DESC LIMIT 10`,
            [req.auth.companyId]
        ),
    ]);

    const history = await query(
        'SELECT role, content FROM support_messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 12',
        [chatId]
    );

    const systemPrompt = [
        'És a assistente do Nobreza ERP, um sistema de gestão de farmácias em Moçambique.',
        'Responde sempre em português de Portugal, de forma breve e prática. A moeda é o Metical (MT).',
        'Usa apenas os dados fornecidos abaixo. Se não souberes, diz que não sabes — nunca inventes números.',
        '',
        `Utilizador: ${user?.name ?? 'Desconhecido'} (perfil ${user?.role ?? 'OTHER'})`,
        '',
        'Produtos com menor stock:',
        products.map((product) =>
            `- ${product.name}: ${product.quantity} em stock (mínimo ${product.min_stock}), ${toNumber(product.sale_price).toFixed(2)} MT`
        ).join('\n') || '- (sem produtos registados)',
        '',
        'Vendas recentes:',
        sales.map((sale) =>
            `- ${new Date(sale.created_at).toISOString().slice(0, 16).replace('T', ' ')}: ${toNumber(sale.total).toFixed(2)} MT (${sale.payment_method})`
        ).join('\n') || '- (sem vendas registadas)',
    ].join('\n');

    let answer;
    try {
        // Tempo limite explícito: sem ele, um modelo lento bloquearia uma
        // ligação do pool até o cliente desistir.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.ai.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.ai.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history.reverse().map((message) => ({
                        role: message.role === 'user' ? 'user' : 'assistant',
                        content: message.content,
                    })),
                ],
                max_tokens: 800,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`OpenRouter respondeu ${response.status}`);

        const data = await response.json();
        answer = data.choices?.[0]?.message?.content?.trim();
        if (!answer) throw new Error('Resposta vazia do modelo.');
    } catch (error) {
        console.error(`[ia] Falha ao gerar resposta: ${error.message}`);
        answer = 'Estou com dificuldades técnicas neste momento. Tente novamente dentro de instantes.';
    }

    await query(
        "INSERT INTO support_messages (id, chat_id, role, content) VALUES (?,?,'assistant',?)",
        [newId(), chatId, answer]
    );
    await query('UPDATE support_chats SET last_message_at = UTC_TIMESTAMP(3) WHERE id = ?', [chatId]);

    res.json({ answer, configured: true });
}));
