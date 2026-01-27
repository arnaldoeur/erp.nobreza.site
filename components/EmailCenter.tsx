import React, { useState, useEffect } from 'react';
import { EmailSettings } from './EmailSettings';
import { EmailClient } from './EmailClient';
import { EmailAccountService } from '../services/email-accounts.service'; // Make sure this is correct path
import { CompanyService } from '../services/company.service';
import { User } from '../types';

interface EmailCenterProps {
    companyId: string;
    currentUser: User;
}

export const EmailCenter: React.FC<EmailCenterProps> = ({ companyId, currentUser }) => {
    const [view, setView] = useState<'CLIENT' | 'SETTINGS' | 'LOADING'>('LOADING');
    const [hasAccounts, setHasAccounts] = useState(false);

    const checkAccounts = async () => {
        try {
            const accs = await EmailAccountService.getAccounts(companyId);
            const hasPersonalAccounts = accs.some(a => a.account_type !== 'SYSTEM');

            if (accs.length > 0) {
                setHasAccounts(hasPersonalAccounts);
                setView('CLIENT');
            } else {
                setHasAccounts(false);
                setView('SETTINGS');
            }
        } catch (e) {
            setView('SETTINGS');
        }
    };

    useEffect(() => {
        checkAccounts();
    }, [companyId]);

    if (view === 'LOADING') {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (view === 'SETTINGS') {
        return (
            <EmailSettings
                companyId={companyId}
                currentUser={currentUser}
                onBack={hasAccounts ? () => setView('CLIENT') : undefined}
            />
        );
    }

    return (
        <EmailClient
            companyId={companyId}
            currentUser={currentUser}
            onSettingsClick={() => setView('SETTINGS')}
        />
    );
};
