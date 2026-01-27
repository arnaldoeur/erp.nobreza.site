
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqumgotokazxbdsaphxg.supabase.co';
const supabaseKey = 'YOUR_ANON_KEY'; // I'll need to find this or use the one from .env

async function testReset() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.functions.invoke('resend-domains', {
        body: {
            action: 'REQUEST_PASSWORD_RESET',
            email: 'oliveira@farmacianobreza.com',
            redirectTo: 'https://farmacianobreza.com/#reset-password'
        }
    });

    console.log('Result:', data);
    console.log('Error:', error);
}

// testReset();
