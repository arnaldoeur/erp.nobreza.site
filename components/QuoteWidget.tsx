
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
        const today = new Date();
        // Use a more stable day identification (YYYY-MM-DD)
        const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

        // Simple hash of the date string to get an index
        let hash = 0;
        for (let i = 0; i < dateStr.length; i++) {
            hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
            hash |= 0;
        }

        const index = Math.abs(hash) % QUOTES.length;
        setQuote(QUOTES[index]);
    }, []);

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 text-white shadow-xl flex flex-col justify-center h-full min-h-[120px]">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Quote size={80} className="md:w-32 md:h-32" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-400 mb-2 md:mb-4 text-[10px] font-black uppercase tracking-widest">
                    <Sparkles size={14} />
                    <span>Inspiração do Dia</span>
                </div>

                <p className="text-sm md:text-lg font-medium leading-relaxed font-serif italic text-emerald-50">
                    "{quote}"
                </p>

                <div className="mt-4 md:mt-6 flex items-center gap-3">
                    <div className="h-1 w-8 md:w-12 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">Equipa Nobreza</span>
                </div>
            </div>
        </div>
    );
};
