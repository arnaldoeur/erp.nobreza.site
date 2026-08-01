#!/usr/bin/env node
/**
 * Executor de migrações.
 *
 * Aplica por ordem os ficheiros .sql de `server/db/migrations`, registando
 * cada um em `schema_migrations` com o seu checksum.
 *
 * O sistema anterior não tinha nada disto: 55 ficheiros aplicados à mão, com
 * números repetidos e migrações de emergência que se anulavam umas às outras.
 * Ninguém conseguia dizer que estado a base de dados tinha, nem recriá-lo.
 *
 * Uso:
 *   npm run db:migrate            aplicar as migrações pendentes
 *   npm run db:migrate -- --status   listar o que está aplicado e pendente
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

function checksum(contents) {
    return crypto.createHash('sha256').update(contents).digest('hex');
}

async function listMigrations() {
    const entries = await fs.readdir(MIGRATIONS_DIR);
    return entries.filter((name) => name.endsWith('.sql')).sort();
}

/**
 * Divide o ficheiro em instruções individuais.
 *
 * O driver corre com `multipleStatements: false` por segurança, por isso cada
 * instrução é enviada em separado. A divisão respeita literais entre aspas e
 * comentários, para que um `;` dentro de uma string não parta a instrução.
 */
function splitStatements(sql) {
    const statements = [];
    let current = '';
    let quote = null;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < sql.length; i += 1) {
        const char = sql[i];
        const next = sql[i + 1];

        if (inLineComment) {
            if (char === '\n') inLineComment = false;
            current += char;
            continue;
        }
        if (inBlockComment) {
            current += char;
            if (char === '*' && next === '/') {
                current += next;
                i += 1;
                inBlockComment = false;
            }
            continue;
        }
        if (quote) {
            current += char;
            // Uma barra invertida escapa o caractere seguinte dentro da string.
            if (char === '\\') {
                current += next ?? '';
                i += 1;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }

        if (char === '-' && next === '-') { inLineComment = true; current += char; continue; }
        if (char === '/' && next === '*') { inBlockComment = true; current += char; continue; }
        if (char === "'" || char === '"' || char === '`') { quote = char; current += char; continue; }

        if (char === ';') {
            const trimmed = current.trim();
            if (trimmed) statements.push(trimmed);
            current = '';
            continue;
        }
        current += char;
    }

    const tail = current.trim();
    if (tail) statements.push(tail);

    // Descartar fragmentos que sejam apenas comentários.
    return statements.filter((statement) =>
        statement.split('\n').some((line) => {
            const clean = line.trim();
            return clean.length > 0 && !clean.startsWith('--');
        })
    );
}

async function ensureMigrationsTable(connection) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version     VARCHAR(255) NOT NULL,
            applied_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            checksum    CHAR(64)     NOT NULL,
            PRIMARY KEY (version)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function main() {
    const statusOnly = process.argv.includes('--status');

    const connection = await mysql.createConnection({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        multipleStatements: false,
        charset: 'utf8mb4_unicode_ci',
        timezone: 'Z',
    });

    try {
        await ensureMigrationsTable(connection);

        const [appliedRows] = await connection.query('SELECT version, checksum FROM schema_migrations');
        const applied = new Map(appliedRows.map((row) => [row.version, row.checksum]));
        const files = await listMigrations();

        if (statusOnly) {
            console.log('\nEstado das migrações\n');
            for (const file of files) {
                const contents = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
                const current = checksum(contents);
                const previous = applied.get(file);
                if (!previous) console.log(`  pendente   ${file}`);
                else if (previous !== current) console.log(`  ALTERADA   ${file}  (o ficheiro mudou depois de aplicado)`);
                else console.log(`  aplicada   ${file}`);
            }
            console.log('');
            return;
        }

        let count = 0;
        for (const file of files) {
            const contents = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
            const current = checksum(contents);
            const previous = applied.get(file);

            if (previous) {
                // Um ficheiro já aplicado que mudou de conteúdo significa que a
                // base de dados e o repositório discordam. Parar é mais seguro
                // do que reaplicar e arriscar destruir dados.
                if (previous !== current) {
                    throw new Error(
                        `A migração ${file} já foi aplicada mas o ficheiro mudou desde então.\n` +
                        'Migrações aplicadas são imutáveis: crie uma migração nova em vez de editar esta.'
                    );
                }
                continue;
            }

            const statements = splitStatements(contents);
            process.stdout.write(`  a aplicar ${file} (${statements.length} instruções)... `);

            // Cada migração corre dentro de uma transação. O MySQL faz commit
            // implícito em instruções DDL, pelo que isto não garante atomicidade
            // total do DDL — mas garante que o registo em schema_migrations só
            // acontece se o ficheiro chegou ao fim sem erro.
            await connection.beginTransaction();
            try {
                for (const statement of statements) {
                    await connection.query(statement);
                }
                await connection.query(
                    'INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)',
                    [file, current]
                );
                await connection.commit();
                console.log('feito');
                count += 1;
            } catch (error) {
                await connection.rollback();
                console.log('FALHOU');
                throw new Error(`Migração ${file} falhou: ${error.message}`);
            }
        }

        console.log(count === 0 ? '\nNada a aplicar — a base de dados está atualizada.\n' : `\n${count} migração(ões) aplicada(s).\n`);
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error(`\n${error.message}\n`);
    process.exit(1);
});
