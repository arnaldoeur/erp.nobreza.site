
const https = require('https');

const data = JSON.stringify({
    action: 'REQUEST_PASSWORD_RESET',
    email: 'oliveira@farmacianobreza.com',
    redirectTo: 'https://farmacianobreza.com/#reset-password'
});

const options = {
    hostname: 'bqumgotokazxbdsaphxg.supabase.co',
    port: 443,
    path: '/functions/v1/resend-domains',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdW1nb3Rva2F6eGJkc2FwaHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTc4MzEsImV4cCI6MjA4NDU3MzgzMX0.upUvOVOiqqACQzgisfQ-VZS3g5GGMJg7dA0JBJDn_0c',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.write(data);
req.end();
