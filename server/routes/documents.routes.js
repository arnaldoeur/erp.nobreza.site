/**
 * Biblioteca de ficheiros.
 *
 * Substitui o Supabase Storage. O bucket anterior tinha sido tornado público
 * pela migração 28, com políticas "Allow all" para leitura, escrita e remoção
 * sem autenticação — qualquer pessoa com o endereço lia ou apagava ficheiros
 * da farmácia.
 *
 * Aqui os ficheiros ficam fora da raiz pública e são servidos por uma rota
 * que verifica sessão e empresa antes de os entregar.
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { asyncHandler, badRequest, notFound, forbidden } from '../utils/errors.js';
import { query, queryOne } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { config } from '../config/env.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../services/log.service.js';
import { requireString, optionalString, requireUuid } from '../utils/validate.js';

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

/**
 * Tipos aceites.
 *
 * Lista fechada, e não uma lista de tipos proibidos: qualquer coisa fora
 * desta lista é recusada. Documentos HTML e SVG ficam de fora de propósito —
 * ambos podem conter scripts que correriam na origem do sistema se algum dia
 * fossem servidos diretamente.
 */
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain',
]);

const upload = multer({
    storage: multer.diskStorage({
        async destination(req, _file, callback) {
            // Um diretório por empresa: mesmo que um caminho escape ao
            // controlo da aplicação, não atravessa para outra empresa.
            const dir = path.join(config.uploads.dir, String(req.auth.companyId));
            try {
                await fs.mkdir(dir, { recursive: true });
                callback(null, dir);
            } catch (error) {
                callback(error);
            }
        },
        filename(_req, file, callback) {
            // O nome do ficheiro no disco é sempre gerado por nós. Usar o nome
            // enviado pelo cliente permitiria travessia de diretórios
            // ("../../etc/algo") e colisões entre utilizadores.
            const extension = path.extname(file.originalname).toLowerCase().slice(0, 10).replace(/[^a-z0-9.]/g, '');
            callback(null, `${newId()}${extension}`);
        },
    }),
    limits: { fileSize: config.uploads.maxBytes, files: 1 },
    fileFilter(_req, file, callback) {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return callback(badRequest(`Tipo de ficheiro não permitido: ${file.mimetype}`));
        }
        callback(null, true);
    },
});

function mapDocument(row) {
    return {
        id: row.id,
        company_id: String(row.company_id),
        user_id: row.user_id ?? '',
        name: row.name,
        category: row.category ?? '',
        file_type: row.file_type ?? '',
        file_size: row.file_size ?? undefined,
        // O cliente recebe o endereço da rota autenticada, nunca o caminho no disco.
        file_url: `/api/documents/${row.id}/download`,
        created_at: row.created_at,
        last_modified_at: row.updated_at,
        users: row.user_name ? { name: row.user_name } : undefined,
    };
}

documentsRouter.get('/documents', asyncHandler(async (req, res) => {
    const rows = await query(
        `SELECT d.*, u.name AS user_name
           FROM documents d
           LEFT JOIN users u ON u.id = d.user_id
          WHERE d.company_id = ?
          ORDER BY d.created_at DESC
          LIMIT 500`,
        [req.auth.companyId]
    );
    res.json(rows.map(mapDocument));
}));

documentsRouter.post('/documents', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Nenhum ficheiro enviado.');

    const name = optionalString(req.body?.name, 'nome', { max: 255 }) ?? req.file.originalname;
    const category = optionalString(req.body?.category, 'categoria', { max: 128 });
    const id = newId();
    // Caminho relativo a UPLOAD_DIR. Guardar o caminho absoluto tornaria a
    // base de dados dependente do sistema de ficheiros de um servidor.
    const relativePath = path.join(String(req.auth.companyId), req.file.filename);

    await query(
        `INSERT INTO documents (id, company_id, user_id, name, category, file_path, file_type, file_size)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id, req.auth.companyId, req.auth.userId, name.slice(0, 255), category,
         relativePath, req.file.mimetype, req.file.size]
    );

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'DOCUMENT_UPLOAD', details: `Ficheiro carregado: ${name}`, ip: req.ip,
    });

    const row = await queryOne(
        `SELECT d.*, u.name AS user_name FROM documents d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?`,
        [id]
    );
    res.status(201).json(mapDocument(row));
}));

/**
 * Entrega o ficheiro.
 *
 * A consulta filtra por `company_id`, pelo que um identificador de outra
 * empresa devolve 404 — indistinguível de um identificador inexistente.
 */
documentsRouter.get('/documents/:id/download', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'documento');

    const row = await queryOne(
        'SELECT name, file_path, file_type FROM documents WHERE id = ? AND company_id = ?',
        [id, req.auth.companyId]
    );
    if (!row) throw notFound('Documento não encontrado.');

    const absolutePath = path.resolve(config.uploads.dir, row.file_path);

    // Defesa em profundidade: mesmo que um caminho inválido tivesse chegado à
    // base de dados, não sai da pasta de uploads.
    if (!absolutePath.startsWith(path.resolve(config.uploads.dir) + path.sep)) {
        throw forbidden('Caminho de ficheiro inválido.');
    }

    try {
        await fs.access(absolutePath);
    } catch {
        throw notFound('O ficheiro já não existe no servidor.');
    }

    // `attachment` força a transferência em vez da apresentação no browser,
    // o que impede que um ficheiro carregado seja interpretado como página
    // na origem do sistema.
    res.setHeader('Content-Type', row.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.name)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    createReadStream(absolutePath).pipe(res);
}));

documentsRouter.delete('/documents/:id', requireRole('ADMIN', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'documento');

    const row = await queryOne(
        'SELECT name, file_path FROM documents WHERE id = ? AND company_id = ?',
        [id, req.auth.companyId]
    );
    if (!row) throw notFound('Documento não encontrado.');

    await query('DELETE FROM documents WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);

    // O registo é a fonte de verdade. Se o ficheiro no disco já não existir,
    // a remoção do registo não deve falhar por causa disso.
    try {
        await fs.unlink(path.resolve(config.uploads.dir, row.file_path));
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`[documentos] Não foi possível remover ${row.file_path}: ${error.message}`);
        }
    }

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'DOCUMENT_DELETE', details: `Ficheiro eliminado: ${row.name}`, ip: req.ip,
    });

    res.json({ ok: true });
}));
