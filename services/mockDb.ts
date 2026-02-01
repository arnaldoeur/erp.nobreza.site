
import { User, UserRole } from '../types';

// Initial Data
const DEFAULT_COMPANY_ID = 'comp-default-001';
const DEFAULT_USER_ID = 'user-admin-001';

const INITIAL_DATA = {
    users: [
        {
            id: DEFAULT_USER_ID,
            email: 'admin@nobreza.site',
            name: 'Administrador',
            role: 'ADMIN',
            company_id: DEFAULT_COMPANY_ID,
            active: true,
            created_at: new Date().toISOString(),
            employee_id: 'EMP-001',
            responsibility: 'Gerente'
        }
    ],
    companies: [
        {
            id: DEFAULT_COMPANY_ID,
            name: 'Farmácia Nobreza',
            active: true,
            created_at: new Date().toISOString(),
            theme_color: '#10b981'
        }
    ],
    products: [],
    customers: [],
    sales: [],
    suppliers: [],
    daily_closures: [],
    logs: [],
    billing_documents: [],
    expenses: [],
    shifts: [],
    email_accounts: [],
    notifications: []
};

class MockDatabase {
    private data: any;

    constructor() {
        this.load();
    }

    private load() {
        const stored = localStorage.getItem('nobreza_mock_db');
        if (stored) {
            this.data = JSON.parse(stored);
        } else {
            this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
            this.save();
        }
    }

    private save() {
        localStorage.setItem('nobreza_mock_db', JSON.stringify(this.data));
    }

    public getTable(tableName: string) {
        if (!this.data[tableName]) {
            this.data[tableName] = [];
            this.save();
        }
        return this.data[tableName];
    }

    public insert(tableName: string, record: any) {
        const table = this.getTable(tableName);
        const newRecord = { ...record, id: record.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, created_at: record.created_at || new Date().toISOString() };
        table.push(newRecord);
        this.save();
        return newRecord;
    }

    public update(tableName: string, id: string, updates: any) {
        const table = this.getTable(tableName);
        const index = table.findIndex((r: any) => r.id === id);
        if (index !== -1) {
            table[index] = { ...table[index], ...updates };
            this.save();
            return table[index];
        }
        return null;
    }

    public delete(tableName: string, id: string) {
        const table = this.getTable(tableName);
        this.data[tableName] = table.filter((r: any) => r.id !== id);
        this.save();
    }

    // Auth Helpers
    public findUserByEmail(email: string) {
        return this.data.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    }
}

export const mockDb = new MockDatabase();
