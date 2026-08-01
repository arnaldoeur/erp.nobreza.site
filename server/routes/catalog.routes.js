/**
 * Produtos, fornecedores e clientes.
 *
 * Todas as consultas filtram por `req.auth.companyId`, que vem do token
 * assinado. Uma linha de outra empresa é simplesmente invisível — não existe
 * caminho, em nenhuma destas rotas, que aceite um `company_id` do cliente.
 */

import { Router } from 'express';
import { asyncHandler, notFound, badRequest } from '../utils/errors.js';
import { query, queryOne, transaction } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../services/log.service.js';
import {
    requireString, optionalString, optionalEmail, requireMoney, optionalMoney,
    requireInt, optionalInt, requireUuid, optionalUuid, requireEnum, optionalEnum,
    requireBoolean, toDateOnly, toNumber, toBoolean,
} from '../utils/validate.js';

export const catalogRouter = Router();
catalogRouter.use(requireAuth);

// =============================================================================
// PRODUTOS
// =============================================================================

const PRODUCT_COLUMNS = `
    id, company_id, name, category, code, purchase_price, sale_price, quantity,
    min_stock, unit, batch, expiry_date, supplier_id, description, image_url, created_at
`;

function mapProduct(row) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        name: row.name,
        category: row.category,
        code: row.code ?? '',
        purchasePrice: toNumber(row.purchase_price),
        salePrice: toNumber(row.sale_price),
        quantity: row.quantity,
        minStock: row.min_stock,
        unit: row.unit,
        batch: row.batch ?? undefined,
        expiryDate: row.expiry_date ?? undefined,
        supplierId: row.supplier_id ?? '',
        description: row.description ?? undefined,
        imageUrl: row.image_url ?? undefined,
    };
}

/** Normaliza o corpo de um produto vindo do cliente. */
function readProductBody(body) {
    return {
        name: requireString(body?.name, 'nome'),
        category: optionalString(body?.category, 'categoria', { max: 128 }) ?? 'Geral',
        code: optionalString(body?.code, 'código', { max: 128 }),
        purchasePrice: optionalMoney(body?.purchasePrice, 'preço de compra'),
        salePrice: optionalMoney(body?.salePrice, 'preço de venda'),
        quantity: optionalInt(body?.quantity, 'quantidade', { min: 0, max: 100000000 }) ?? 0,
        minStock: optionalInt(body?.minStock, 'stock mínimo', { min: 0, max: 100000000 }) ?? 5,
        unit: optionalString(body?.unit, 'unidade', { max: 32 }) ?? 'Unidade',
        batch: optionalString(body?.batch, 'lote', { max: 128 }),
        expiryDate: toDateOnly(body?.expiryDate, 'validade'),
        supplierId: optionalUuid(body?.supplierId, 'fornecedor'),
        description: optionalString(body?.description, 'descrição', { max: 5000 }),
    };
}

catalogRouter.get('/products', asyncHandler(async (req, res) => {
    const rows = await query(
        `SELECT ${PRODUCT_COLUMNS} FROM products WHERE company_id = ? ORDER BY name`,
        [req.auth.companyId]
    );
    res.json(rows.map(mapProduct));
}));

catalogRouter.post('/products', asyncHandler(async (req, res) => {
    const data = readProductBody(req.body);
    const id = newId();

    await query(
        `INSERT INTO products
            (id, company_id, name, category, code, purchase_price, sale_price, quantity,
             min_stock, unit, batch, expiry_date, supplier_id, description)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, req.auth.companyId, data.name, data.category, data.code, data.purchasePrice,
         data.salePrice, data.quantity, data.minStock, data.unit, data.batch,
         data.expiryDate, data.supplierId, data.description]
    );

    // O stock inicial é um movimento como qualquer outro, para que o histórico
    // do produto comece no primeiro número e não apareça do nada.
    if (data.quantity !== 0) {
        await query(
            `INSERT INTO stock_movements
                (id, company_id, product_id, quantity_delta, quantity_after, reason, performed_by, notes)
             VALUES (?,?,?,?,?,'INITIAL',?,?)`,
            [newId(), req.auth.companyId, id, data.quantity, data.quantity, req.auth.userId, 'Stock inicial no registo do produto']
        );
    }

    const row = await queryOne(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [id]);
    res.status(201).json(mapProduct(row));
}));

catalogRouter.put('/products/:id', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'produto');
    const data = readProductBody(req.body);

    const updated = await transaction(async (connection) => {
        // FOR UPDATE bloqueia a linha até ao commit: se dois utilizadores
        // gravarem o mesmo produto ao mesmo tempo, o segundo espera pelo
        // primeiro em vez de sobrepor os dados às cegas.
        const [existing] = await connection.execute(
            'SELECT quantity FROM products WHERE id = ? AND company_id = ? FOR UPDATE',
            [id, req.auth.companyId]
        );
        if (existing.length === 0) throw notFound('Produto não encontrado.');

        const previousQuantity = existing[0].quantity;

        await connection.execute(
            `UPDATE products SET
                name = ?, category = ?, code = ?, purchase_price = ?, sale_price = ?,
                quantity = ?, min_stock = ?, unit = ?, batch = ?, expiry_date = ?,
                supplier_id = ?, description = ?
             WHERE id = ? AND company_id = ?`,
            [data.name, data.category, data.code, data.purchasePrice, data.salePrice,
             data.quantity, data.minStock, data.unit, data.batch, data.expiryDate,
             data.supplierId, data.description, id, req.auth.companyId]
        );

        // Uma correção manual de stock deixa rasto, tal como uma venda.
        if (data.quantity !== previousQuantity) {
            await connection.execute(
                `INSERT INTO stock_movements
                    (id, company_id, product_id, quantity_delta, quantity_after, reason, performed_by, notes)
                 VALUES (?,?,?,?,?,'ADJUSTMENT',?,?)`,
                [newId(), req.auth.companyId, id, data.quantity - previousQuantity,
                 data.quantity, req.auth.userId, 'Ajuste manual na ficha do produto']
            );
        }

        const [rows] = await connection.execute(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [id]);
        return rows[0];
    });

    res.json(mapProduct(updated));
}));

/** Importação em lote, usada pelo carregamento de ficheiros no ecrã de stock. */
catalogRouter.post('/products/batch', asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.products) ? req.body.products : null;
    if (!items || items.length === 0) throw badRequest('Nenhum produto enviado.');
    if (items.length > 2000) throw badRequest('Importe no máximo 2000 produtos de cada vez.');

    const parsed = items.map(readProductBody);

    const created = await transaction(async (connection) => {
        const ids = [];
        for (const data of parsed) {
            const id = newId();
            ids.push(id);
            await connection.execute(
                `INSERT INTO products
                    (id, company_id, name, category, code, purchase_price, sale_price, quantity,
                     min_stock, unit, batch, expiry_date, supplier_id, description)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [id, req.auth.companyId, data.name, data.category, data.code, data.purchasePrice,
                 data.salePrice, data.quantity, data.minStock, data.unit, data.batch,
                 data.expiryDate, data.supplierId, data.description]
            );
            if (data.quantity !== 0) {
                await connection.execute(
                    `INSERT INTO stock_movements
                        (id, company_id, product_id, quantity_delta, quantity_after, reason, performed_by, notes)
                     VALUES (?,?,?,?,?,'IMPORT',?,?)`,
                    [newId(), req.auth.companyId, id, data.quantity, data.quantity, req.auth.userId, 'Importação em lote']
                );
            }
        }
        return ids.length;
    });

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'PRODUCT_IMPORT', details: `${created} produtos importados`, ip: req.ip,
    });

    res.status(201).json({ created });
}));

/** Atualização em massa de um único campo, a partir da seleção no ecrã de stock. */
catalogRouter.patch('/products/bulk', asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id) => requireUuid(id, 'produto')) : [];
    if (ids.length === 0) throw badRequest('Nenhum produto selecionado.');

    // Lista fechada de colunas. Sem isto, o nome do campo vinha do cliente e
    // era interpolado na consulta — o caminho direto para injeção de SQL.
    const FIELDS = {
        category: (value) => requireString(value, 'categoria', { max: 128 }),
        salePrice: (value) => requireMoney(value, 'preço de venda'),
        purchasePrice: (value) => requireMoney(value, 'preço de compra'),
        minStock: (value) => requireInt(value, 'stock mínimo', { min: 0 }),
        unit: (value) => requireString(value, 'unidade', { max: 32 }),
        supplierId: (value) => requireUuid(value, 'fornecedor'),
    };
    const COLUMNS = {
        category: 'category', salePrice: 'sale_price', purchasePrice: 'purchase_price',
        minStock: 'min_stock', unit: 'unit', supplierId: 'supplier_id',
    };

    const field = requireString(req.body?.field, 'campo', { max: 64 });
    if (!Object.hasOwn(FIELDS, field)) throw badRequest(`O campo "${field}" não pode ser alterado em massa.`);

    const value = FIELDS[field](req.body?.value);
    const placeholders = ids.map(() => '?').join(',');

    const result = await query(
        `UPDATE products SET ${COLUMNS[field]} = ? WHERE company_id = ? AND id IN (${placeholders})`,
        [value, req.auth.companyId, ...ids]
    );

    res.json({ updated: result.affectedRows });
}));

/**
 * Ajusta todos os preços de venda por uma percentagem.
 *
 * Substitui o RPC `adjust_all_prices`. A percentagem é limitada a um
 * intervalo razoável e a operação fica registada — antes era uma chamada
 * direta a uma função da base de dados a partir do browser, sem limite nem
 * rasto, capaz de reescrever o catálogo inteiro num pedido.
 */
catalogRouter.post('/products/adjust-prices', requireRole('ADMIN', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const percentage = requireInt(req.body?.percentage, 'percentagem', { min: -90, max: 500 });

    const result = await query(
        `UPDATE products
            SET sale_price = ROUND(sale_price * (1 + ? / 100), 2)
          WHERE company_id = ?`,
        [percentage, req.auth.companyId]
    );

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'PRICE_ADJUSTMENT',
        details: `Preços de venda ajustados em ${percentage}% (${result.affectedRows} produtos)`,
        ip: req.ip,
    });

    res.json({ updated: result.affectedRows, percentage });
}));

catalogRouter.delete('/products/:id', requireRole('ADMIN', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'produto');
    const result = await query('DELETE FROM products WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (result.affectedRows === 0) throw notFound('Produto não encontrado.');

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'PRODUCT_DELETE', details: `Produto ${id} removido`, ip: req.ip,
    });
    res.json({ ok: true });
}));

catalogRouter.post('/products/bulk-delete', requireRole('ADMIN', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id) => requireUuid(id, 'produto')) : [];
    if (ids.length === 0) throw badRequest('Nenhum produto selecionado.');

    const placeholders = ids.map(() => '?').join(',');
    const result = await query(
        `DELETE FROM products WHERE company_id = ? AND id IN (${placeholders})`,
        [req.auth.companyId, ...ids]
    );

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'PRODUCT_BULK_DELETE', details: `${result.affectedRows} produtos removidos`, ip: req.ip,
    });
    res.json({ deleted: result.affectedRows });
}));

/** Histórico de movimentos de um produto. Não existia equivalente antes. */
catalogRouter.get('/products/:id/movements', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'produto');
    const rows = await query(
        `SELECT m.*, u.name AS user_name
           FROM stock_movements m
           LEFT JOIN users u ON u.id = m.performed_by
          WHERE m.product_id = ? AND m.company_id = ?
          ORDER BY m.created_at DESC
          LIMIT 200`,
        [id, req.auth.companyId]
    );
    res.json(rows.map((row) => ({
        id: row.id,
        productId: row.product_id,
        quantityDelta: row.quantity_delta,
        quantityAfter: row.quantity_after,
        reason: row.reason,
        referenceId: row.reference_id ?? undefined,
        notes: row.notes ?? undefined,
        performedBy: row.user_name ?? 'Sistema',
        createdAt: row.created_at,
    })));
}));

// =============================================================================
// FORNECEDORES
// =============================================================================

const SUPPLIER_COLUMNS = `
    id, company_id, name, nuit, location, contact, email, conditions,
    estimated_delivery, is_preferred, logo, created_at
`;

function mapSupplier(row) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        name: row.name,
        nuit: row.nuit ?? '',
        location: row.location ?? '',
        contact: row.contact ?? '',
        email: row.email ?? '',
        conditions: row.conditions ?? '',
        estimated_delivery: row.estimated_delivery ?? undefined,
        isPreferred: toBoolean(row.is_preferred),
        logo: row.logo ?? undefined,
    };
}

function readSupplierBody(body) {
    return {
        name: requireString(body?.name, 'nome'),
        nuit: optionalString(body?.nuit, 'NUIT', { max: 32 }),
        location: optionalString(body?.location, 'localização', { max: 255 }),
        contact: optionalString(body?.contact, 'contacto', { max: 64 }),
        email: optionalEmail(body?.email),
        conditions: optionalString(body?.conditions, 'condições', { max: 5000 }),
        estimatedDelivery: optionalString(body?.estimated_delivery ?? body?.estimatedDelivery, 'prazo de entrega', { max: 128 }),
        isPreferred: requireBoolean(body?.isPreferred, false),
        logo: optionalString(body?.logo, 'logótipo', { max: 5_000_000 }),
    };
}

catalogRouter.get('/suppliers', asyncHandler(async (req, res) => {
    const rows = await query(
        `SELECT ${SUPPLIER_COLUMNS} FROM suppliers WHERE company_id = ? ORDER BY is_preferred DESC, name`,
        [req.auth.companyId]
    );
    res.json(rows.map(mapSupplier));
}));

catalogRouter.post('/suppliers', asyncHandler(async (req, res) => {
    const data = readSupplierBody(req.body);
    const id = newId();

    await query(
        `INSERT INTO suppliers
            (id, company_id, name, nuit, location, contact, email, conditions, estimated_delivery, is_preferred, logo)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, req.auth.companyId, data.name, data.nuit, data.location, data.contact,
         data.email, data.conditions, data.estimatedDelivery, data.isPreferred ? 1 : 0, data.logo]
    );

    const row = await queryOne(`SELECT ${SUPPLIER_COLUMNS} FROM suppliers WHERE id = ?`, [id]);
    res.status(201).json(mapSupplier(row));
}));

/**
 * Procura um fornecedor pelo nome e cria-o se não existir.
 *
 * Usado pela importação de produtos. A operação corre numa transação para que
 * duas importações simultâneas não criem o mesmo fornecedor duas vezes.
 */
catalogRouter.post('/suppliers/find-or-create', asyncHandler(async (req, res) => {
    const name = requireString(req.body?.name, 'nome');

    const id = await transaction(async (connection) => {
        const [existing] = await connection.execute(
            'SELECT id FROM suppliers WHERE company_id = ? AND name = ? LIMIT 1',
            [req.auth.companyId, name]
        );
        if (existing.length > 0) return existing[0].id;

        const newSupplierId = newId();
        await connection.execute(
            'INSERT INTO suppliers (id, company_id, name) VALUES (?,?,?)',
            [newSupplierId, req.auth.companyId, name]
        );
        return newSupplierId;
    });

    res.json({ id });
}));

catalogRouter.put('/suppliers/:id', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'fornecedor');
    const data = readSupplierBody(req.body);

    const result = await query(
        `UPDATE suppliers SET
            name = ?, nuit = ?, location = ?, contact = ?, email = ?,
            conditions = ?, estimated_delivery = ?, is_preferred = ?, logo = ?
         WHERE id = ? AND company_id = ?`,
        [data.name, data.nuit, data.location, data.contact, data.email, data.conditions,
         data.estimatedDelivery, data.isPreferred ? 1 : 0, data.logo, id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Fornecedor não encontrado.');

    const row = await queryOne(`SELECT ${SUPPLIER_COLUMNS} FROM suppliers WHERE id = ?`, [id]);
    res.json(mapSupplier(row));
}));

catalogRouter.delete('/suppliers/:id', requireRole('ADMIN', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'fornecedor');
    const result = await query('DELETE FROM suppliers WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (result.affectedRows === 0) throw notFound('Fornecedor não encontrado.');
    res.json({ ok: true });
}));

// =============================================================================
// CLIENTES
// =============================================================================

const CUSTOMER_COLUMNS = `
    id, company_id, name, nuit, contact, email, address, type, total_spent, created_at
`;

function mapCustomer(row) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        name: row.name,
        nuit: row.nuit ?? '',
        contact: row.contact ?? '',
        email: row.email ?? '',
        address: row.address ?? '',
        type: row.type,
        totalSpent: toNumber(row.total_spent),
        createdAt: row.created_at,
    };
}

catalogRouter.get('/customers', asyncHandler(async (req, res) => {
    let rows = await query(
        `SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE company_id = ? ORDER BY name`,
        [req.auth.companyId]
    );

    // O ponto de venda precisa sempre de um destinatário. Se a empresa ainda
    // não tem clientes, criamos o de balcão para que a primeira venda funcione.
    if (rows.length === 0) {
        const id = newId();
        await query(
            `INSERT INTO customers (id, company_id, name, address, type)
             VALUES (?, ?, 'Venda Directa', 'Balcão', 'NORMAL')`,
            [id, req.auth.companyId]
        );
        rows = await query(`SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE id = ?`, [id]);
    }

    res.json(rows.map(mapCustomer));
}));

function readCustomerBody(body) {
    return {
        name: requireString(body?.name, 'nome'),
        nuit: optionalString(body?.nuit, 'NUIT', { max: 32 }),
        contact: optionalString(body?.contact, 'contacto', { max: 64 }),
        email: optionalEmail(body?.email),
        address: optionalString(body?.address, 'morada', { max: 500 }),
        type: optionalEnum(body?.type, 'tipo', ['NORMAL', 'INSTITUTIONAL'], 'NORMAL'),
    };
}

catalogRouter.post('/customers', asyncHandler(async (req, res) => {
    const data = readCustomerBody(req.body);
    const id = newId();

    await query(
        `INSERT INTO customers (id, company_id, name, nuit, contact, email, address, type)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id, req.auth.companyId, data.name, data.nuit, data.contact, data.email, data.address, data.type]
    );

    const row = await queryOne(`SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE id = ?`, [id]);
    res.status(201).json(mapCustomer(row));
}));

catalogRouter.put('/customers/:id', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'cliente');
    const data = readCustomerBody(req.body);

    const result = await query(
        `UPDATE customers SET name = ?, nuit = ?, contact = ?, email = ?, address = ?, type = ?
         WHERE id = ? AND company_id = ?`,
        [data.name, data.nuit, data.contact, data.email, data.address, data.type, id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Cliente não encontrado.');

    const row = await queryOne(`SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE id = ?`, [id]);
    res.json(mapCustomer(row));
}));

catalogRouter.delete('/customers/:id', requireRole('ADMIN', 'ADMINISTRATIVE', 'COMMERCIAL'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'cliente');
    const result = await query('DELETE FROM customers WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (result.affectedRows === 0) throw notFound('Cliente não encontrado.');
    res.json({ ok: true });
}));
