#!/usr/bin/env node
/**
 * Escreve dist/build-info.json no fim do build.
 *
 * Serve para responder, do browser e sem acesso ao painel, a uma pergunta que
 * de outra forma exige ir aos logs de deployment: que versão do código está
 * neste momento no servidor?
 *
 * É servido como ficheiro estático, portanto continua acessível mesmo quando
 * a aplicação Node não está a responder — que é exatamente quando a pergunta
 * interessa.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function git(command) {
    try {
        return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
        // O deploy pode correr a partir de um arquivo sem histórico de git.
        return null;
    }
}

const info = {
    commit: git('rev-parse --short HEAD') ?? 'desconhecido',
    commitMessage: git('log -1 --pretty=%s') ?? 'desconhecido',
    branch: git('rev-parse --abbrev-ref HEAD') ?? 'desconhecido',
    builtAt: new Date().toISOString(),
    node: process.version,
};

mkdirSync('dist', { recursive: true });
writeFileSync(join('dist', 'build-info.json'), JSON.stringify(info, null, 2) + '\n');

console.log(`[build-info] ${info.commit} — ${info.builtAt}`);
