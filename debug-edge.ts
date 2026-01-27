
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://bqumgotokazxbdsaphxg.supabase.co',
    'REPLACE_WITH_SERVICE_ROLE' // I don't have the key, but I can use the anon/client key if the function doesn't verify JWT
);

async function debugEmail() {
    const { data, error } = await (supabase.functions as any).invoke('resend-domains', {
        body: {
            action: 'SEND_EMAIL',
            from: 'Nobreza ERP <enviados@nobreza.site>',
            to: ['arnaldoeur@gmail.com'], // Using a likely user email from context
            subject: 'Debug Test',
            html: '<p>Test</p>'
        }
    });

    console.log('Data:', data);
    console.log('Error:', error);
}

debugEmail().catch(console.error);
