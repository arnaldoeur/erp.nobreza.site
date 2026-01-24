
export const translations = {
    'pt-MZ': {
        'system.settings.title': 'Sistema & Manutenção',
        'system.settings.subtitle': 'Configurações globais, backups e diagnósticos.',
        'system.loading': 'Processando...',
        'system.os': 'Sistema Operacional',
        'system.preferences': 'Preferências',
        'system.language': 'Idioma do Sistema',
        'system.language.desc': 'Língua de exibição',
        'system.contrast': 'Modo de Contraste',
        'system.contrast.desc': 'Visualização melhorada',
        'system.nightmode': 'Modo Noturno',
        'system.nightmode.desc': 'Fundo escuro e conforto visual',
        'system.security': 'Dados & Segurança',
        'system.backup': 'Backup Manual',
        'system.backup.desc': 'Exporte todos os dados da empresa (Vendas, Produtos, Clientes) para um arquivo JSON seguro.',
        'system.backup.button': 'Fazer Backup Agora',
        'system.backup.process': 'Exportando...',
        'system.backup.success': 'Backup gerado com sucesso.',
        'system.backup.error': 'Erro ao gerar backup:',
        'system.colors': 'Paleta de Cores',
        'system.colors.desc': 'Personalize as cores do sistema',
        'system.primary': 'Cor Primária',
        'system.secondary': 'Cor Secundária'
    },
    'en-US': {
        'system.settings.title': 'System & Maintenance',
        'system.settings.subtitle': 'Global settings, backups, and diagnostics.',
        'system.loading': 'Processing...',
        'system.os': 'Operating System',
        'system.preferences': 'Preferences',
        'system.language': 'System Language',
        'system.language.desc': 'Display language',
        'system.contrast': 'Contrast Mode',
        'system.contrast.desc': 'Enhanced visualization',
        'system.nightmode': 'Night Mode',
        'system.nightmode.desc': 'Dark background and visual comfort',
        'system.security': 'Data & Security',
        'system.backup': 'Manual Backup',
        'system.backup.desc': 'Export all company data (Sales, Products, Customers) to a secure JSON file.',
        'system.backup.button': 'Backup Now',
        'system.backup.process': 'Exporting...',
        'system.backup.success': 'Backup generated successfully.',
        'system.backup.error': 'Error generating backup:',
        'system.colors': 'Color Palette',
        'system.colors.desc': 'Customize system colors',
        'system.primary': 'Primary Color',
        'system.secondary': 'Secondary Color'
    }
};

export type Language = 'pt-MZ' | 'en-US';

export const t = (key: string, lang: Language): string => {
    return translations[lang][key as keyof typeof translations['pt-MZ']] || key;
};
