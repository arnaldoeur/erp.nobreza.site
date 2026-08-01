/**
 * Registo de atividade.
 *
 * O `id` do registo era gerado no browser (`LOG-{timestamp}`), o que permitia
 * colisões entre postos e permitia a quem quisesse escrever registos com
 * qualquer conteúdo. Agora é o servidor que atribui identificador, autor,
 * momento e endereço IP — o cliente só descreve a ação.
 */

import { query } from '../db/pool.js';
import { newId } from '../utils/ids.js';

/**
 * Escreve uma entrada no registo.
 *
 * Nunca lança: um registo que falhe não pode fazer falhar a operação de
 * negócio que o originou. Um erro aqui vai para os logs do servidor.
 */
export async function logAction({ companyId, userId = null, userName = null, action, details = null, ip = null }) {
    if (!companyId || !action) return;
    try {
        await query(
            `INSERT INTO system_logs (id, company_id, user_id, user_name, action, details, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newId(), companyId, userId, userName?.slice(0, 255) ?? null, action.slice(0, 128), details ?? null, ip?.slice(0, 45) ?? null]
        );
    } catch (error) {
        console.error(`[log] Falha ao registar "${action}": ${error.message}`);
    }
}

/**
 * Notifica os administradores da empresa sobre uma ação crítica.
 *
 * A versão anterior fazia isto a partir do browser, o que significava que a
 * notificação só existia se o cliente colaborasse.
 */
export async function notifyAdminsOfCriticalAction({ companyId, action, details, actorName, actorId }) {
    const CRITICAL = ['DELETE', 'CRITICAL_ERROR', 'SECURITY', 'ROLE_CHANGE'];
    if (!CRITICAL.some((keyword) => action.includes(keyword))) return;

    try {
        const admins = await query(
            'SELECT id FROM users WHERE company_id = ? AND role = ? AND active = 1 AND id <> ?',
            [companyId, 'ADMIN', actorId ?? '']
        );
        if (admins.length === 0) return;

        const values = admins.map((admin) => [
            newId(), companyId, admin.id, 'SYSTEM',
            `Ação crítica: ${action}`.slice(0, 255),
            `${details ?? ''} — por ${actorName ?? 'sistema'}`,
        ]);

        await query(
            `INSERT INTO notifications (id, company_id, user_id, type, title, content) VALUES ${values.map(() => '(?,?,?,?,?,?)').join(',')}`,
            values.flat()
        );
    } catch (error) {
        console.error(`[log] Falha ao notificar administradores: ${error.message}`);
    }
}
