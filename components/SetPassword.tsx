import React, { useState } from 'react';
import { Lock, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AuthService } from '../services/auth.service';

/**
 * Definição de palavra-passe a partir do link recebido por e-mail.
 *
 * Serve tanto a recuperação (`/redefinir-senha`) como a ativação de conta
 * (`/ativar-conta`) — é o mesmo mecanismo, com mensagens diferentes.
 *
 * Este ecrã não existia. O e-mail de recuperação anterior apontava para
 * `/#reset-password` sem token nenhum, e a troca de palavra-passe exigia uma
 * sessão já iniciada — pelo que quem tinha esquecido a palavra-passe nunca a
 * conseguia recuperar.
 */

interface SetPasswordProps {
    token: string;
    mode: 'RESET' | 'ACTIVATE';
    onDone: () => void;
}

export const SetPassword: React.FC<SetPasswordProps> = ({ token, mode, onDone }) => {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const isActivation = mode === 'ACTIVATE';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Verificação imediata, antes de gastar um pedido ao servidor. As
        // mesmas regras são aplicadas lá, que é onde contam.
        if (password !== confirmation) {
            setError('As palavras-passe não coincidem.');
            return;
        }
        if (password.length < 8) {
            setError('A palavra-passe tem de ter pelo menos 8 caracteres.');
            return;
        }
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            setError('A palavra-passe tem de conter pelo menos uma letra e um número.');
            return;
        }

        setLoading(true);
        try {
            await AuthService.completePasswordReset(token, password);
            setDone(true);
        } catch (err: any) {
            setError(err.message || 'Não foi possível definir a palavra-passe.');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-950 p-4">
                <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
                    <h1 className="text-xl font-black text-white mb-2">Palavra-passe definida</h1>
                    <p className="text-sm text-emerald-100/60 mb-8">
                        Já pode iniciar sessão no Nobreza ERP com a sua nova palavra-passe.
                    </p>
                    <button
                        onClick={onDone}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all"
                    >
                        Iniciar sessão
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-emerald-950 p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur space-y-5">
                <div className="text-center mb-2">
                    <ShieldCheck size={40} className="mx-auto text-emerald-400 mb-3" />
                    <h1 className="text-xl font-black text-white">
                        {isActivation ? 'Ative a sua conta' : 'Nova palavra-passe'}
                    </h1>
                    <p className="text-xs text-emerald-100/50 mt-2">
                        {isActivation
                            ? 'Escolha a palavra-passe que vai usar para entrar no sistema.'
                            : 'Escolha uma nova palavra-passe para a sua conta.'}
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-200 leading-relaxed">{error}</p>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">
                        Palavra-passe
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock size={18} className="text-white/20 group-focus-within:text-emerald-400" />
                        </div>
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                            placeholder="••••••••"
                        />
                    </div>
                    <p className="text-[10px] text-white/30 ml-1">Mínimo 8 caracteres, com pelo menos uma letra e um número.</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-1">
                        Confirmar palavra-passe
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock size={18} className="text-white/20 group-focus-within:text-emerald-400" />
                        </div>
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Definir palavra-passe'}
                </button>

                <button
                    type="button"
                    onClick={onDone}
                    className="w-full text-[11px] uppercase font-bold text-emerald-200/60 hover:text-white py-2 transition-colors"
                >
                    Voltar ao início de sessão
                </button>
            </form>
        </div>
    );
};
