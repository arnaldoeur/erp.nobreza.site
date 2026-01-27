
const supabaseUrl = 'https://bqumgotokazxbdsaphxg.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdW1nb3Rva2F6eGJkc2FwaHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTc4MzEsImV4cCI6MjA4NDU3MzgzMX0.upUvOVOiqqACQzgisfQ-VZS3g5GGMJg7dA0JBJDn_0c';

async function debugV14() {
    console.log("Checking Domain Status...");
    const resp1 = await fetch(`${supabaseUrl}/functions/v1/resend-domains`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ action: 'CHECK_DOMAIN' })
    });
    console.log("Domain Check Status:", resp1.status);
    console.log("Domain Check Body:", await resp1.text());

    console.log("\nTriggering Password Reset...");
    const resp2 = await fetch(`${supabaseUrl}/functions/v1/resend-domains`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({
            action: 'REQUEST_PASSWORD_RESET',
            email: 'oliveira@farmacianobreza.com',
            redirectTo: 'http://localhost:5173/#reset-password'
        })
    });
    console.log("Reset Request Status:", resp2.status);
    console.log("Reset Request Body:", await resp2.text());
}

debugV14();
