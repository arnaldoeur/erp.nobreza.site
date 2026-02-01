# PRD - Production Readiness Document
**Project:** Nobreza ERP
**Environment:** Production (erp.nobreza.site)
**Hosting:** Hostinger (Node.js)

## Application Architecture
- **Frontend:** React + Vite (SPA)
- **Backend:** Supabase (Database, Auth, Edge Functions)
- **Server:** Node.js + Express (Serving Static Assets)

## Deployment Instructions (Hostinger)
1. **Upload Files:**
   - Upload the contents of the root directory (excluding `node_modules`).
   - Ensure `server.js`, `package.json`, and the `dist` folder are present.
   - *Note:* It is recommended to upload the `dist` folder generated locally.

2. **Configuration:**
   - **Root:** Set web root to `/` (or `public_html`).
   - **Startup File:** `server.js`
   - **Environment Variables:**
     - `VITE_SUPABASE_URL`: [Your Supabase URL]
     - `VITE_SUPABASE_ANON_KEY`: [Your Supabase Anon Key]
     - `PORT`: (Managed by Hostinger, typically 3000 or 8080)

3. **Install Dependencies:**
   - Run `npm install --production` in the Hostinger terminal or console to install `express`.

4. **Start Application:**
   - Hostinger/PM2 will automatically run `npm start` or `node server.js`.

## SCP - Server Configuration Plan / Scripts
### Application Start Script
No servidor, a aplicação deve ser iniciada com:
```bash
node server.js
```
*Garantido pelo script "start" no package.json.*

### Backup Strategy
- **Databases:** Managed by Supabase (Daily Backups).
- **Code:** Git Version Control (GitHub).

### Monitoring
- **Logs:** Check `pm2 logs` or Hostinger Control Panel logs.
- **Uptime:** Hostinger Monitor.
