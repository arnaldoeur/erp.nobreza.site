
import { Product, User, UserRole, Supplier, Customer } from './types';

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Paracetamol 500mg', category: 'Medicamento', code: 'MED001', purchasePrice: 10, salePrice: 25, quantity: 150, minStock: 20, supplierId: 's1', companyId: '1' },
  { id: '2', name: 'Amoxicilina 250mg', category: 'Antibiótico', code: 'MED002', purchasePrice: 50, salePrice: 120, quantity: 15, minStock: 25, supplierId: 's1', companyId: '1' },
  { id: '3', name: 'Vitamina C 1g', category: 'Suplemento', code: 'SUP001', purchasePrice: 80, salePrice: 150, quantity: 45, minStock: 10, supplierId: 's2', companyId: '1' },
  { id: '4', name: 'Gel de Banho Neutro', category: 'Higiene', code: 'HIG001', purchasePrice: 200, salePrice: 350, quantity: 8, minStock: 10, supplierId: 's2', companyId: '1' },
];

export const MOCK_USER: User = {
  id: 'u1',
  name: 'João Silva',
  email: 'joao@nobreza.site',
  role: UserRole.ADMIN,
  responsibility: 'Diretor Executivo',
  hireDate: new Date('2023-01-15'),
  active: true,
  companyId: '1'
};

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 's1',
    name: 'Farmalusa Lda',
    nuit: '400555666',
    location: 'Av. das Indústrias, 405, Maputo',
    contact: '+258 84 000 0000',
    email: 'vendas@farmalusa.co.mz',
    conditions: '30 dias',
    isPreferred: true,
    companyId: '1'
  },
  {
    id: 's2',
    name: 'MozHealth Solutions',
    nuit: '400999888',
    location: 'Rua de Bagamoyo, 12, Beira',
    contact: '+258 82 111 2222',
    email: 'info@mozhealth.co.mz',
    conditions: 'Pronto pagamento',
    isPreferred: false,
    companyId: '1'
  },
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Venda Direta',
    nuit: '999999999',
    contact: 'N/A',
    email: 'venda@nobreza.site',
    address: 'Venda Local',
    type: 'NORMAL',
    totalSpent: 0,
    createdAt: new Date(),
    companyId: '1'
  },
  {
    id: 'c2',
    name: 'Clínica São Rafael',
    nuit: '400222333',
    contact: '84 222 3333',
    email: 'financeiro@saorafael.mz',
    address: 'Rua da Malhangalene, 120, Maputo',
    type: 'INSTITUTIONAL',
    totalSpent: 12500,
    createdAt: new Date(),
    companyId: '1'
  },
];
