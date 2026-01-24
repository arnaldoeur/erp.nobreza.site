
import React, { useState, useEffect } from 'react';
import { Quote, Sparkles } from 'lucide-react';

const QUOTES = [
    "Cuidar da saúde é um ato diário de responsabilidade.",
    "Cada atendimento é uma oportunidade de salvar tempo, saúde e confiança.",
    "A farmácia é o primeiro porto seguro da comunidade.",
    "Eficiência salva vidas. Organize, atenda, cuide.",
    "Excelência não é um ato, é um hábito.",
    "O seu sorriso é o melhor remédio para quem entra preocupado.",
    "Farmácia Nobreza: Onde o cuidado encontra a competência.",
    "Pequenos gestos de atenção geram grandes resultados.",
    "A organização é a chave para um atendimento ágil e seguro.",
    "Trate cada cliente como se fosse a única pessoa no mundo.",
    "Inovação é fazer melhor o que já fazemos bem.",
    "Seu trabalho impacta vidas. Faça com paixão.",
    "Qualidade no atendimento é o nosso compromisso inegociável.",
    "Cada detalhe conta quando o assunto é saúde."
];

export const QuoteWidget: React.FC = () => {
    const [quote, setQuote] = useState("");

    useEffect(() => {
        // Improved Daily Rotation Logic
        // Uses full date (Year + Month + Day) to ensure a new unique daily index rotation
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        const index = dayOfYear % QUOTES.length;
        setQuote(QUOTES[index]);
    }, []);

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 md:p-8 text-white shadow-xl flex flex-col justify-center h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Quote size={120} />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-400 mb-4 text-xs font-black uppercase tracking-widest">
                    <Sparkles size={16} />
                    <span>Inspiração do Dia</span>
                </div>

                <p className="text-lg md:text-xl font-medium leading-relaxed font-serif italic text-emerald-50">
                    "{quote}"
                </p>

                <div className="mt-6 flex items-center gap-3">
                    <div className="h-1 w-12 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">Equipa Nobreza</span>
                </div>
            </div>
        </div>
    );
};
