
import { CompanyInfo } from '../types';
import { supabase } from './supabase';
import { AuthService } from './auth.service';

const DEFAULT_COMPANY: CompanyInfo = {
    id: '',
    name: 'Nome da Empresa',
    slogan: '',
    nuit: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    themeColor: '#10b981'
};

export const CompanyService = {
    get: async (): Promise<CompanyInfo> => {
        const user = AuthService.getCurrentUser();
        if (!user) return DEFAULT_COMPANY;

        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', user.companyId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                name: data.name,
                slogan: data.slogan || '',
                nuit: data.nuit || '',
                address: data.address || '',
                email: data.email || '',
                phone: data.contact || '', // Map contact -> phone
                website: data.website || '',
                logo: data.logo,
                logoHorizontal: data.logo_horizontal,
                logoVertical: data.logo_vertical,
                themeColor: data.theme_color || '#10b981',
                themeColorSecondary: data.theme_color_secondary || '#6366f1',
                paymentMethods: data.payment_methods || [],
                closingTime: data.closing_time,
                workingHours: data.working_hours,
                shifts: data.shifts || [],
                timezone: data.timezone || 'Africa/Maputo',
                language: data.language || 'pt-MZ',
                isDarkMode: data.is_dark_mode || false,
                emailDomain: data.email_domain
            };
        } catch (error) {
            console.error('Error fetching company info:', error);
            return DEFAULT_COMPANY;
        }
    },

    update: async (info: CompanyInfo): Promise<void> => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        // Basic payload (cols that definitely exist)
        const basicPayload = {
            name: info.name,
            slogan: info.slogan,
            nuit: info.nuit,
            address: info.address,
            email: info.email,
            contact: info.phone, // Map phone -> contact
            logo: info.logo,
            theme_color: info.themeColor,
            theme_color_secondary: info.themeColorSecondary,
            payment_methods: info.paymentMethods,
            closing_time: info.closingTime,
            working_hours: info.workingHours,
            shifts: info.shifts || [],
            timezone: info.timezone || 'Africa/Maputo',
            language: info.language,
            is_dark_mode: info.isDarkMode,
            email_domain: info.emailDomain
        };

        try {
            // 1. Try Full Update (including new Logo columns)
            const { error } = await supabase
                .from('companies')
                .update({
                    ...basicPayload,
                    logo_vertical: info.logoVertical,
                    logo_horizontal: info.logoHorizontal
                })
                .eq('id', user.companyId);

            if (error) {
                // 2. If error suggests missing columns, try Basic Update
                // 'Could not find the ... column' or generic schema error
                if (error.message && (error.message.includes("Could not find the") || error.message.includes("column"))) {
                    console.warn("Full update failed, trying basic update...");

                    const { error: basicError } = await supabase
                        .from('companies')
                        .update(basicPayload)
                        .eq('id', user.companyId);

                    if (basicError) throw basicError;

                    // Throw specific warning to notify user (handled by Settings.tsx)
                    throw new Error("DADOS SALVOS! Mas os Logotipos Extras foram ignorados porque as colunas faltam na Base de Dados.");
                }
                throw error;
            }
        } catch (error) {
            console.error('Error updating company info:', error);
            throw error;
        }
    }
};
