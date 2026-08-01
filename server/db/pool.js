/**
 * Pool de ligações MySQL e utilitários de transação.
 *
 * Todo o acesso à base de dados passa por aqui. Não existe outro caminho:
 * o browser fala com a API, a API fala com este módulo.
 */

import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

export const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci',
    // A sessão trabalha sempre em UTC. Sem isto, o MySQL converteria os
    // DATETIME segundo o fuso do servidor, que na Hostinger não é
    // necessariamente o mesmo da aplicação.
    timezone: 'Z',
    // Devolver DECIMAL como string evita a perda de precisão que acontece ao
    // converter para o Number do JavaScript. A conversão para número é feita
    // explicitamente nos mapeamentos, onde sabemos que é seguro.
    decimalNumbers: false,
    // Nomes de tabela e coluna são sempre literais no nosso código; os valores
    // vão sempre por placeholders. Manter isto desligado remove uma via de
    // injeção caso alguma consulta futura seja escrita com descuido.
    multipleStatements: false,
    dateStrings: false,
});

/**
 * Executa uma consulta parametrizada e devolve as linhas.
 *
 * Os valores vão sempre como placeholders `?` — nunca interpolados na string
 * SQL. É esta a defesa contra injeção de SQL, e não há exceções a ela.
 */
export async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

/** Devolve a primeira linha, ou null. */
export async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Corre `handler` dentro de uma transação, com commit automático em caso de
 * sucesso e rollback em caso de exceção.
 *
 * É o que faltava por completo no sistema anterior: o cliente inseria a venda
 * e depois os artigos em dois pedidos separados, sem forma de desfazer o
 * primeiro se o segundo falhasse — deixando vendas órfãs sem linhas.
 *
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<T>} handler
 * @returns {Promise<T>}
 * @template T
 */
export async function transaction(handler) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await handler(connection);
        await connection.commit();
        return result;
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            // O rollback pode falhar se a ligação já tiver caído. O erro
            // original é o que interessa reportar, mas registamos este para
            // não desaparecer em silêncio.
            console.error('[db] Falha no rollback:', rollbackError.message);
        }
        throw error;
    } finally {
        connection.release();
    }
}

/** Confirma que a base de dados responde. Usado pelo health check e no arranque. */
export async function ping() {
    const connection = await pool.getConnection();
    try {
        await connection.ping();
        return true;
    } finally {
        connection.release();
    }
}

export async function closePool() {
    await pool.end();
}
