
import { mockDb } from './mockDb';

class MockQueryBuilder {
    private tableName: string;
    private filters: any[] = [];
    private _select: string = '*';
    private _single: boolean = false;
    private _order: any = null;
    private _limit: number | null = null;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    select(columns: string = '*') {
        this._select = columns;
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ type: 'eq', column, value });
        return this;
    }

    ilike(column: string, value: string) {
        // Simple case-insensitive match simulation
        this.filters.push({ type: 'ilike', column, value: value.replace(/%/g, '') });
        return this;
    }

    in(column: string, values: any[]) {
        this.filters.push({ type: 'in', column, value: values });
        return this;
    }

    single() {
        this._single = true;
        return this;
    }

    order(column: string, opts?: { ascending?: boolean }) {
        this._order = { column, ascending: opts?.ascending ?? true };
        return this;
    }

    limit(count: number) {
        this._limit = count;
        return this;
    }

    async then(resolve: any, reject: any) {
        // Execute Query
        let data = mockDb.getTable(this.tableName);

        // Apply Filters
        for (const filter of this.filters) {
            if (filter.type === 'eq') {
                data = data.filter((row: any) => row[filter.column] == filter.value);
            } else if (filter.type === 'in') {
                data = data.filter((row: any) => filter.value.includes(row[filter.column]));
            } else if (filter.type === 'ilike') {
                const search = filter.value.toLowerCase();
                data = data.filter((row: any) => String(row[filter.column] || '').toLowerCase().includes(search));
            }
        }

        // Apply Order
        if (this._order) {
            data.sort((a: any, b: any) => {
                const valA = a[this._order.column];
                const valB = b[this._order.column];
                if (valA < valB) return this._order.ascending ? -1 : 1;
                if (valA > valB) return this._order.ascending ? 1 : -1;
                return 0;
            });
        }

        // Apply Limit
        if (this._limit) {
            data = data.slice(0, this._limit);
        }

        // Apply Single
        if (this._single) {
            if (data.length === 0) return resolve({ data: null, error: { message: 'Row not found' } });
            if (data.length > 1) return resolve({ data: null, error: { message: 'Multiple rows found' } });
            return resolve({ data: data[0], error: null });
        }

        return resolve({ data, error: null });
    }

    // Mutation Methods
    async insert(data: any | any[]) {
        if (Array.isArray(data)) {
            const results = data.map(item => mockDb.insert(this.tableName, item));
            return { data: results, error: null };
        } else {
            const result = mockDb.insert(this.tableName, data);
            return { data: result, error: null };
        }
    }

    async update(updates: any) {
        // In Supabase, update() is usually followed by eq().
        // Since we can't chain backward easily in this simple Promise-like structure without complex proxies,
        // we'll return a special object that waits for filters.
        // Or simpler: We attach the updates to this builder and apply them on execution?
        // Actually, typical usage: supabase.from('t').update({...}).eq('id', 1)

        // We will store the updates and apply them when the promise resolves (triggered by await)
        this._pendingUpdate = updates;
        return this;
    }

    private _pendingUpdate: any = null;
    private _pendingDelete: boolean = false;

    async delete() {
        this._pendingDelete = true;
        return this;
    }

    // Override 'then' to handle mutations
    // We need to re-implement the 'then' properly. The previous implementation was only for SELECT.
}

// Better mock approach: Return a Proxy or a robust Builder
class RobustMockBuilder {
    private tableName: string;
    private filters: any[] = [];
    private _updates: any = null;
    private _isDelete: boolean = false;
    private _isInsert: boolean = false;
    private _insertData: any = null;

    // Select options
    private _select: string | null = null;
    private _single: boolean = false;
    private _order: any = null;
    private _limit: number | null = null;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    select(columns: string = '*') {
        this._select = columns;
        return this;
    }

    insert(data: any) {
        this._isInsert = true;
        this._insertData = data;
        return this;
    }

    update(data: any) {
        this._updates = data;
        return this;
    }

    delete() {
        this._isDelete = true;
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ type: 'eq', column, value });
        return this;
    }

    in(column: string, values: any[]) {
        this.filters.push({ type: 'in', column, values });
        return this;
    }

    ilike(column: string, value: string) {
        this.filters.push({ type: 'ilike', column, value });
        return this;
    }

    single() {
        this._single = true;
        return this;
    }

    limit(n: number) { this._limit = n; return this; }
    order(col: string, opts: any) { this._order = { col, opts }; return this; }

    // This makes it awaitable
    then(resolve: (value: any) => void, reject: (reason?: any) => void) {
        setTimeout(() => {
            try {
                const result = this.execute();
                resolve(result);
            } catch (e) {
                reject(e);
            }
        }, 50); // Small delay to simulate async
    }

    execute() {
        if (this._isInsert) {
            if (Array.isArray(this._insertData)) {
                const res = this._insertData.map(d => mockDb.insert(this.tableName, d));
                return { data: res, error: null };
            } else {
                const res = mockDb.insert(this.tableName, this._insertData);
                return { data: res, error: null };
            }
        }

        let rows = mockDb.getTable(this.tableName);

        // Apply filters to find targets
        let filteredRows = rows.filter((row: any) => {
            return this.filters.every(f => {
                if (f.type === 'eq') return row[f.column] == f.value;
                if (f.type === 'in') return f.values.includes(row[f.column]);
                if (f.type === 'ilike') return String(row[f.column] || '').toLowerCase().includes(f.value.toLowerCase().replace(/%/g, ''));
                return true;
            });
        });

        if (this._isDelete) {
            filteredRows.forEach((row: any) => mockDb.delete(this.tableName, row.id));
            return { data: null, error: null };
        }

        if (this._updates) {
            filteredRows.forEach((row: any) => mockDb.update(this.tableName, row.id, this._updates));
            return { data: filteredRows.map((r: any) => ({ ...r, ...this._updates })), error: null };
        }

        // SELECT logic
        let result = [...filteredRows];
        if (this._order) {
            // simple sort
            result.sort((a, b) => a[this._order.col] > b[this._order.col] ? 1 : -1);
            if (this._order.opts?.ascending === false) result.reverse();
        }
        if (this._limit) {
            result = result.slice(0, this._limit);
        }

        if (this._single) {
            if (result.length === 0) return { data: null, error: { message: "Not found", code: "PGRST116" } };
            return { data: result[0], error: null };
        }

        return { data: result, error: null };
    }
}

export const mockSupabase = {
    from: (table: string) => new RobustMockBuilder(table),
    auth: {
        signInWithPassword: async ({ email, password }: any) => {
            const user = mockDb.findUserByEmail(email);
            if (user) {
                return {
                    data: {
                        user: {
                            id: user.id,
                            email: user.email,
                            user_metadata: { name: user.name, company_id: user.company_id }
                        },
                        session: { access_token: 'mock-token' }
                    },
                    error: null
                };
            }
            return { data: { user: null }, error: { message: 'Invalid credentials' } };
        },
        signUp: async ({ email, password, options }: any) => {
            // Mock Check if exists
            const exists = mockDb.findUserByEmail(email);
            if (exists) return { data: { user: null }, error: { message: 'User already registered' } };

            // Create phantom auth user (the real user creation usually happens in public table via triggers or service)
            // But for mock, we return success and let the service create the user in public table
            return {
                data: {
                    user: { id: `new-${Date.now()}`, email, user_metadata: options?.data },
                    session: { access_token: 'mock-token' }
                },
                error: null
            };
        },
        signOut: async () => {
            return { error: null };
        },
        getSession: async () => {
            // Always return a dummy session if we have a user in localStorage (AuthService handles this)
            // But AuthService.syncSession calls this.
            // We can return null and let AuthService fall back to localStorage 'current_user' if strictly needed
            return { data: { session: null }, error: null };
        },
        updateUser: async ({ password }: any) => {
            return { error: null };
        }
    },
    rpc: async (fn: string, args: any) => {
        if (fn === 'check_user_active_profile') {
            const user = mockDb.findUserByEmail(args.target_email);
            return { data: !!user, error: null };
        }
        if (fn === 'claim_public_profile') {
            return { data: true, error: null };
        }
        return { data: null, error: null };
    },
    functions: {
        invoke: async () => ({ data: {}, error: null })
    }
};
