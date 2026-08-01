#!/usr/bin/env node
/**
 * Semente inicial: cria a empresa e a conta de administrador.
 *
 * Foi a opção escolhida para esta migração — arrancar com a base de dados
 * limpa, sem arrastar as inconsistências acumuladas no Supabase.
 *
 * O script é seguro de repetir: se já existirem empresas, não faz nada.
 *
 * Uso:
 *   npm run db:seed
 *   npm run db:seed -- --force   recria o administrador mesmo com dados existentes
 */

import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { pool, query, queryOne, transaction, closePool } from './pool.js';
import { newId } from '../utils/ids.js';
import { hashPassword } from '../services/auth.service.js';

const force = process.argv.includes('--force');

/**
 * Gera uma palavra-passe legível mas forte.
 *
 * Usada quando SEED_ADMIN_PASSWORD não é fornecida. É impressa uma única vez
 * e nunca fica gravada em lado nenhum além do hash.
 */
function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(16);
    let password = '';
    for (const byte of bytes) password += alphabet[byte % alphabet.length];
    // Garante que cumpre o requisito de conter letra e número.
    return `${password}9a`;
}

async function main() {
    const existing = await queryOne('SELECT COUNT(*) AS count FROM companies');
    if (Number(existing.count) > 0 && !force) {
        console.log('\nJá existem empresas na base de dados. Nada a fazer.');
        console.log('Use `npm run db:seed -- --force` para criar mesmo assim.\n');
        return;
    }

    const companyName = process.env.SEED_COMPANY_NAME || 'Farmácia Nobreza';
    const adminName = process.env.SEED_ADMIN_NAME || 'Administrador';
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@app.nobreza.site').toLowerCase().trim();
    const providedPassword = process.env.SEED_ADMIN_PASSWORD;
    const password = providedPassword || generatePassword();

    const duplicate = await queryOne('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (duplicate) {
        console.error(`\nJá existe uma conta com o e-mail ${adminEmail}. Escolha outro em SEED_ADMIN_EMAIL.\n`);
        process.exitCode = 1;
        return;
    }

    const passwordHash = await hashPassword(password);

    const companyId = await transaction(async (connection) => {
        const [result] = await connection.execute(
            `INSERT INTO companies (name, theme_color, language, timezone, active, payment_methods)
             VALUES (?, '#10b981', 'pt-MZ', 'Africa/Maputo', 1, ?)`,
            [companyName, JSON.stringify(['CASH', 'MPESA', 'EMOLA', 'MKESH', 'TRANSFER'])]
        );
        const id = result.insertId;

        await connection.execute(
            `INSERT INTO users
                (id, company_id, name, email, password_hash, role, is_super_admin,
                 sequential_id, active, email_verified_at)
             VALUES (?,?,?,?,?,'ADMIN',1,1,1,UTC_TIMESTAMP(3))`,
            [newId(), id, adminName, adminEmail, passwordHash]
        );

        // Cliente de balcão, para que a primeira venda funcione sem
        // configuração adicional.
        await connection.execute(
            `INSERT INTO customers (id, company_id, name, address, type)
             VALUES (?, ?, 'Venda Directa', 'Balcão', 'NORMAL')`,
            [newId(), id]
        );

        return id;
    });

    console.log('\n' + '='.repeat(66));
    console.log('  Base de dados preparada');
    console.log('='.repeat(66));
    console.log(`  Empresa .......... ${companyName} (id ${companyId})`);
    console.log(`  Administrador .... ${adminEmail}`);
    if (providedPassword) {
        console.log('  Palavra-passe .... (a definida em SEED_ADMIN_PASSWORD)');
    } else {
        console.log(`  Palavra-passe .... ${password}`);
        console.log('');
        console.log('  Guarde-a agora. Não volta a ser mostrada e não está gravada');
        console.log('  em lado nenhum — a base de dados só tem o hash.');
    }
    console.log('='.repeat(66));
    console.log('  Altere a palavra-passe no primeiro acesso, em Definições.');
    console.log('='.repeat(66) + '\n');
}

main()
    .catch((error) => {
        console.error(`\nFalha ao preparar a base de dados: ${error.message}\n`);
        process.exitCode = 1;
    })
    .finally(() => closePool());
