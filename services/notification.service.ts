
import { supabase } from './supabase'; // Adjusted path based on typical structure, checks auth.service
import { DailyClosure, CompanyInfo, User } from '../types';

/**
 * Service to handle system notifications via Email.
 * currently configured to invoke a Supabase Edge Function 'send-email'.
 * 
 * NOTE: Ensure you have deployed the 'send-email' function in Supabase.
 */
export const NotificationService = {

    /**
     * Sends a summary email upon Daily Closure.
     */
    sendDailyClosureEmail: async (closure: DailyClosure, companyInfo: CompanyInfo, user: User) => {
        console.log('Attempting to send Daily Closure Email...');

        try {
            // 1. Prepare email payload
            const payload = {
                type: 'DAILY_CLOSURE',
                to: [user.email, companyInfo.email].filter(Boolean), // Send to user and company
                subject: `[${companyInfo.name}] Fecho de Dia - ${new Date(closure.closureDate).toLocaleDateString()}`,
                data: {
                    companyName: companyInfo.name,
                    date: new Date(closure.closureDate).toLocaleDateString(),
                    responsible: closure.responsibleName,
                    systemTotal: closure.systemTotal,
                    manualCash: closure.manualCash,
                    difference: closure.difference,
                    observations: closure.observations,
                }
            };

            // 2. Invoke Supabase Function (or placeholder logic)
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: payload
            });

            if (error) throw error;

            console.log('Daily Closure Email Sent!', data);
            return true;
        } catch (error) {
            console.error('Failed to send Daily Closure Email:', error);
            // Fallback: Log to console so we don't block the UI flow
            return false;
        }
    },

    /**
     * Sends a security alert email upon critical system changes.
     */
    sendSystemAlert: async (action: string, companyInfo: CompanyInfo, user: User, details: string) => {
        console.log(`Sending System Alert: ${action}`);

        try {
            const payload = {
                type: 'SYSTEM_ALERT',
                to: [companyInfo.email], // Ensure company owner gets this
                subject: `[${companyInfo.name}] Alerta de Segurança: ${action}`,
                data: {
                    companyName: companyInfo.name,
                    action: action,
                    performedBy: user.name,
                    timestamp: new Date().toISOString(),
                    details: details
                }
            };

            const { data, error } = await supabase.functions.invoke('send-email', {
                body: payload
            });

            if (error) throw error;
            return true;

        } catch (error) {
            console.error('Failed to send System Alert:', error);
            return false;
        }
    }
};
