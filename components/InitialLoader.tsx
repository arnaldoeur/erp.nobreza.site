
import React, { useEffect, useState } from 'react';
import { Pill } from 'lucide-react';

interface InitialLoaderProps {
    onComplete: () => void;
}

export const InitialLoader: React.FC<InitialLoaderProps> = ({ onComplete }) => {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        // Stage 0: Initial render
        // Stage 1: Reveal logo (200ms)
        // Stage 2: Reveal Text (1000ms)
        // Stage 3: Fade out (2500ms)
        // Complete: 3000ms

        const t1 = setTimeout(() => setStage(1), 200);
        const t2 = setTimeout(() => setStage(2), 1000);
        const t3 = setTimeout(() => setStage(3), 2500);
        const t4 = setTimeout(() => onComplete(), 3000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-950 transition-opacity duration-700 ${stage === 3 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className={`relative transition-all duration-1000 transform ${stage >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse rounded-full" />
                <img src="/nobreza_erp_logo_white_vertical.png" alt="Nobreza ERP" className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl" />
            </div>

            <div className="mt-8 text-center overflow-hidden">
                <h1 className={`text-4xl font-black text-white tracking-tighter transition-all duration-1000 transform ${stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    NOBREZA <span className="text-emerald-500">ERP</span>
                </h1>
                <div className={`h-0.5 bg-emerald-500/50 mt-4 mx-auto transition-all duration-1000 delay-300 ${stage >= 2 ? 'w-16' : 'w-0'}`} />
                <p className={`mt-4 text-emerald-200/60 uppercase tracking-[0.3em] text-[10px] font-bold transition-all duration-1000 delay-500 ${stage >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    Gestão Inteligente para Farmácias
                </p>
            </div>
        </div>
    );
};
