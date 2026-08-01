/**
 * Vendas e documentos de faturação.
 *
 * O registo de uma venda é a operação mais crítica do sistema e era a que
 * estava pior. O código anterior:
 *
 *   1. inseria a venda;
 *   2. inseria os artigos num segundo pedido, sem forma de desfazer o
 *      primeiro se este falhasse — o próprio comentário no ficheiro admitia
 *      "Supabase doesn't support client-side transactions easily";
 *   3. nunca abatia o stock. A função `process_sale` que devia fazê-lo
 *      referenciava colunas inexistentes e estava desativada com o comentário
 *      "Bypassing broken RPC".
 *
 * Aqui a venda é uma transação única que insere a venda, os artigos, abate o
 * stock, regista o movimento e atualiza o acumulado do cliente. Ou acontece
 * tudo, ou não acontece nada.
 */

import { Router } from 'express';
import { asyncHandler, badRequest, conflict, notFound } from '../utils/errors.js';
import { query, queryOne, transaction } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../services/log.service.js';
import {
    requireString, optionalString, requireInt, requireMoney, optionalMoney,
    requireUuid, optionalUuid, requireEnum, optionalEnum, optionalEmail,
    toDateOnly, toNumber, parseJson, toJson, pagination,
} from '../utils/validate.js';

export const salesRouter = Router();
salesRouter.use(requireAuth);

/**
 * Obtém e incrementa um contador sequencial, dentro da transação em curso.
 *
 * `FOR UPDATE` serializa os pedidos concorrentes: dois postos a faturar ao
 * mesmo tempo obtêm números diferentes, em vez de o mesmo número duas vezes.
 */
async function nextSequence(connection, companyId, key) {
    await connection.execute(
        `INSERT INTO document_sequences (company_id, sequence_key, current_value)
         VALUES (?, ?, 0)
         ON DUPLICATE KEY UPDATE company_id = company_id`,
        [companyId, key]
    );
    const [rows] = await connection.execute(
        'SELECT current_value FROM document_sequences WHERE company_id = ? AND sequence_key = ? FOR UPDATE',
        [companyId, key]
    );
    const next = (rows[0]?.current_value ?? 0) + 1;
    await connection.execute(
        'UPDATE document_sequences SET current_value = ? WHERE company_id = ? AND sequence_key = ?',
        [next, companyId, key]
    );
    return next;
}

// =============================================================================
// VENDAS
// =============================================================================

function mapSale(row, items) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        saleNumber: row.sale_number,
        timestamp: row.created_at,
        items,
        total: toNumber(row.total),
        discount: toNumber(row.discount),
        type: row.type,
        customerName: row.customer_name ?? undefined,
        paymentMethod: row.payment_method,
        otherPaymentDetails: row.other_payment_details ?? undefined,
        performedBy: row.performed_by,
    };
}

function mapSaleItem(row) {
    return {
        productId: row.product_id ?? '',
        companyId: Number(row.company_id),
        productName: row.product_name,
        quantity: row.quantity,
        unitPrice: toNumber(row.unit_price),
        total: toNumber(row.total),
    };
}

salesRouter.get('/sales', asyncHandler(async (req, res) => {
    const { limit, offset } = pagination(req.query, { defaultLimit: 200, maxLimit: 1000 });

    const sales = await query(
        // limit e offset são inteiros já validados por `pagination()`. São
        // interpolados porque o protocolo de instruções preparadas do MySQL
        // não aceita marcadores em LIMIT/OFFSET de forma portável.
        `SELECT * FROM sales WHERE company_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [req.auth.companyId]
    );
    if (sales.length === 0) return res.json([]);

    // Uma única consulta para todos os artigos, em vez de uma por venda.
    const placeholders = sales.map(() => '?').join(',');
    const items = await query(
        `SELECT * FROM sale_items WHERE company_id = ? AND sale_id IN (${placeholders})`,
        [req.auth.companyId, ...sales.map((sale) => sale.id)]
    );

    const itemsBySale = new Map();
    for (const item of items) {
        if (!itemsBySale.has(item.sale_id)) itemsBySale.set(item.sale_id, []);
        itemsBySale.get(item.sale_id).push(mapSaleItem(item));
    }

    res.json(sales.map((sale) => mapSale(sale, itemsBySale.get(sale.id) ?? [])));
}));

/**
 * Regista uma venda.
 *
 * Pontos que a versão anterior não garantia:
 *  - os preços são lidos da base de dados, não aceites do cliente, para que
 *    ninguém possa faturar um produto de 500 MT por 5 MT alterando o pedido;
 *  - o stock é verificado antes de ser abatido, e a venda é recusada se não
 *    houver existências suficientes;
 *  - tudo corre numa transação.
 */
salesRouter.post('/sales', asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) throw badRequest('A venda não tem artigos.');
    if (rawItems.length > 500) throw badRequest('A venda tem artigos a mais.');

    const items = rawItems.map((item) => ({
        productId: requireUuid(item?.productId, 'produto'),
        quantity: requireInt(item?.quantity, 'quantidade', { min: 1, max: 1000000 }),
    }));

    const type = optionalEnum(body.type, 'tipo', ['DIRECT', 'INVOICE'], 'DIRECT');
    const paymentMethod = requireString(body.paymentMethod, 'método de pagamento', { max: 32 });
    const otherPaymentDetails = optionalString(body.otherPaymentDetails, 'detalhes do pagamento', { max: 255 });
    const customerId = optionalUuid(body.customerId, 'cliente');
    const customerName = optionalString(body.customerName, 'nome do cliente', { max: 255 });
    const discount = optionalMoney(body.discount, 'desconto');

    const result = await transaction(async (connection) => {
        // 1. Bloquear as linhas dos produtos envolvidos, por ordem estável de
        //    identificador. A ordem fixa evita impasses (deadlocks) quando
        //    duas vendas concorrentes tocam nos mesmos produtos.
        const productIds = [...new Set(items.map((item) => item.productId))].sort();
        const placeholders = productIds.map(() => '?').join(',');

        const [products] = await connection.execute(
            `SELECT id, name, sale_price, quantity FROM products
              WHERE company_id = ? AND id IN (${placeholders})
              ORDER BY id
              FOR UPDATE`,
            [req.auth.companyId, ...productIds]
        );

        const productById = new Map(products.map((product) => [product.id, product]));

        // 2. Validar existências e calcular o total a partir dos preços reais.
        let computedTotal = 0;
        const lines = [];

        for (const item of items) {
            const product = productById.get(item.productId);
            if (!product) throw badRequest('Um dos produtos da venda já não existe.');
            if (product.quantity < item.quantity) {
                throw conflict(
                    `Stock insuficiente para "${product.name}": existem ${product.quantity} unidade(s) e foram pedidas ${item.quantity}.`
                );
            }
            const unitPrice = Number(product.sale_price);
            const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
            computedTotal += lineTotal;

            lines.push({
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: unitPrice.toFixed(2),
                total: lineTotal.toFixed(2),
                quantityAfter: product.quantity - item.quantity,
            });
        }

        const total = Math.max(0, Number((computedTotal - Number(discount)).toFixed(2)));

        // 3. Inserir a venda.
        const saleId = newId();
        const saleNumber = await nextSequence(connection, req.auth.companyId, 'SALE');

        await connection.execute(
            `INSERT INTO sales
                (id, company_id, sale_number, customer_id, customer_name, total, discount,
                 type, payment_method, other_payment_details, performed_by_id, performed_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [saleId, req.auth.companyId, saleNumber, customerId, customerName, total.toFixed(2),
             discount, type, paymentMethod, otherPaymentDetails, req.auth.userId,
             optionalString(body.performedBy, 'operador', { max: 255 }) ?? 'Sistema']
        );

        // 4. Inserir os artigos, abater o stock e registar o movimento.
        for (const line of lines) {
            await connection.execute(
                `INSERT INTO sale_items
                    (id, company_id, sale_id, product_id, product_name, quantity, unit_price, total)
                 VALUES (?,?,?,?,?,?,?,?)`,
                [newId(), req.auth.companyId, saleId, line.productId, line.productName,
                 line.quantity, line.unitPrice, line.total]
            );

            await connection.execute(
                'UPDATE products SET quantity = quantity - ? WHERE id = ? AND company_id = ?',
                [line.quantity, line.productId, req.auth.companyId]
            );

            await connection.execute(
                `INSERT INTO stock_movements
                    (id, company_id, product_id, quantity_delta, quantity_after, reason, reference_id, performed_by)
                 VALUES (?,?,?,?,?,'SALE',?,?)`,
                [newId(), req.auth.companyId, line.productId, -line.quantity,
                 line.quantityAfter, saleId, req.auth.userId]
            );
        }

        // 5. Atualizar o acumulado do cliente com um incremento atómico. A
        //    versão anterior lia o valor, somava no browser e voltava a
        //    gravar — perdendo vendas concorrentes.
        if (customerId) {
            await connection.execute(
                'UPDATE customers SET total_spent = total_spent + ? WHERE id = ? AND company_id = ?',
                [total.toFixed(2), customerId, req.auth.companyId]
            );
        }

        return { saleId, saleNumber, total, lines };
    });

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'SALE_CREATE',
        details: `Venda #${result.saleNumber} — ${result.total.toFixed(2)} MT, ${result.lines.length} artigo(s)`,
        ip: req.ip,
    });

    res.status(201).json({ id: result.saleId, saleNumber: result.saleNumber, total: result.total });
}));

/** Artigos com stock igual ou inferior ao mínimo definido. */
salesRouter.get('/stock/alerts', asyncHandler(async (req, res) => {
    const rows = await query(
        `SELECT id, name, quantity, min_stock, unit, expiry_date
           FROM products
          WHERE company_id = ? AND quantity <= min_stock
          ORDER BY quantity ASC
          LIMIT 100`,
        [req.auth.companyId]
    );
    res.json(rows.map((row) => ({
        id: row.id, name: row.name, quantity: row.quantity,
        minStock: row.min_stock, unit: row.unit, expiryDate: row.expiry_date ?? undefined,
    })));
}));

// =============================================================================
// DOCUMENTOS DE FATURAÇÃO
// =============================================================================

const BILLING_COLUMNS = `
    id, company_id, document_number, type, status, target_name, target_nuit,
    target_address, target_contact, target_email, customer_id, total, items,
    issue_date, due_date, sale_id, created_by, created_at
`;

function mapBillingDocument(row) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        documentNumber: row.document_number,
        type: row.type,
        status: row.status,
        timestamp: row.issue_date,
        items: parseJson(row.items, []),
        total: toNumber(row.total),
        targetName: row.target_name,
        targetDetails: {
            nuit: row.target_nuit ?? undefined,
            address: row.target_address ?? undefined,
            contact: row.target_contact ?? undefined,
            email: row.target_email ?? undefined,
        },
        dueDate: row.due_date ?? undefined,
        saleId: row.sale_id ?? undefined,
        performedBy: row.created_by,
    };
}

const DOCUMENT_TYPES = ['INVOICE', 'PURCHASE_ORDER', 'SUPPLIER_INVOICE', 'RECEIPT', 'QUOTE'];
const DOCUMENT_STATUSES = ['DRAFT', 'PENDING', 'SENT', 'PAID', 'CANCELLED'];

/** Prefixo da numeração, por tipo de documento. */
const NUMBER_PREFIX = {
    INVOICE: 'FT', RECEIPT: 'RC', QUOTE: 'ORC',
    PURCHASE_ORDER: 'OC', SUPPLIER_INVOICE: 'FF',
};

salesRouter.get('/billing-documents', asyncHandler(async (req, res) => {
    const { limit, offset } = pagination(req.query, { defaultLimit: 200, maxLimit: 1000 });
    const rows = await query(
        `SELECT ${BILLING_COLUMNS} FROM billing_documents
          WHERE company_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [req.auth.companyId]
    );
    res.json(rows.map(mapBillingDocument));
}));

salesRouter.post('/billing-documents', asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const type = requireEnum(body.type, 'tipo de documento', DOCUMENT_TYPES);
    const status = optionalEnum(body.status, 'estado', DOCUMENT_STATUSES, 'PENDING');
    const targetName = optionalString(body.targetName, 'destinatário', { max: 255 }) ?? 'Consumidor Final';
    const total = requireMoney(body.total, 'total');
    const items = Array.isArray(body.items) ? body.items : [];
    const details = body.targetDetails ?? {};

    const created = await transaction(async (connection) => {
        const sequence = await nextSequence(connection, req.auth.companyId, `DOC_${type}`);
        const year = new Date().getUTCFullYear();
        const documentNumber = `${NUMBER_PREFIX[type]} ${year}/${String(sequence).padStart(4, '0')}`;
        const id = newId();

        await connection.execute(
            `INSERT INTO billing_documents
                (id, company_id, document_number, type, status, target_name, target_nuit,
                 target_address, target_contact, target_email, customer_id, total, items,
                 due_date, sale_id, created_by_id, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [id, req.auth.companyId, documentNumber, type, status, targetName,
             optionalString(details.nuit, 'NUIT', { max: 32 }),
             optionalString(details.address, 'morada', { max: 500 }),
             optionalString(details.contact, 'contacto', { max: 64 }),
             optionalEmail(details.email),
             optionalUuid(body.customerId, 'cliente'),
             total, toJson(items),
             toDateOnly(body.dueDate, 'data de vencimento'),
             optionalUuid(body.saleId, 'venda'),
             req.auth.userId,
             optionalString(body.performedBy, 'emitido por', { max: 255 }) ?? 'Sistema']
        );

        const [rows] = await connection.execute(`SELECT ${BILLING_COLUMNS} FROM billing_documents WHERE id = ?`, [id]);
        return rows[0];
    });

    res.status(201).json(mapBillingDocument(created));
}));

salesRouter.patch('/billing-documents/:id', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'documento');
    const status = requireEnum(req.body?.status, 'estado', DOCUMENT_STATUSES);

    const result = await query(
        'UPDATE billing_documents SET status = ?, last_modified_by = ? WHERE id = ? AND company_id = ?',
        [status, req.auth.userId, id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Documento não encontrado.');

    const row = await queryOne(`SELECT ${BILLING_COLUMNS} FROM billing_documents WHERE id = ?`, [id]);
    res.json(mapBillingDocument(row));
}));

salesRouter.delete('/billing-documents/:id', requireRole('ADMIN', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'documento');
    const result = await query(
        'DELETE FROM billing_documents WHERE id = ? AND company_id = ?',
        [id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Documento não encontrado.');

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'DOCUMENT_DELETE', details: `Documento ${id} eliminado`, ip: req.ip,
    });
    res.json({ ok: true });
}));
