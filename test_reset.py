
import requests
import json

url = 'https://bqumgotokazxbdsaphxg.supabase.co/functions/v1/resend-domains'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdW1nb3Rva2F6eGJkc2FwaHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTc4MzEsImV4cCI6MjA4NDU3MzgzMX0.upUvOVOiqqACQzgisfQ-VZS3g5GGMJg7dA0JBJDn_0c'
}
payload = {
    'action': 'REQUEST_PASSWORD_RESET',
    'email': 'oliveira@farmacianobreza.com'
}

try:
    response = requests.post(url, headers=headers, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
