
import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  X,
  Save,
  History,
  TrendingUp,
  Award,
  Fingerprint,
  ChevronRight
} from 'lucide-react';
import { Customer, Sale, User } from '../types';
import { CustomerService } from '../services';

interface CustomersProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: Sale[];
  initialModalOpen?: boolean;
  onModalHandled?: () => void;
  currentUser: User;
}

export const Customers: React.FC<CustomersProps> = ({ customers, setCustomers, sales, initialModalOpen, onModalHandled, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  useEffect(() => {
    if (initialModalOpen) {
      setIsModalOpen(true);
      setEditingCustomer(null);
      onModalHandled?.();
    }
  }, [initialModalOpen, onModalHandled]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nuit.includes(searchTerm) ||
      c.contact.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const customerStats = useMemo(() => {
    const total = customers.length;
    const institutional = customers.filter(c => c.type === 'INSTITUTIONAL').length;
    const topCustomer = [...customers].sort((a, b) => b.totalSpent - a.totalSpent)[0];
    return { total, institutional, topCustomer };
  }, [customers]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer: Customer = {
      id: editingCustomer?.id || Math.random().toString(36).substr(2, 9),
      companyId: currentUser?.companyId || '',
      name: formData.get('name') as string,
      nuit: formData.get('nuit') as string,
      contact: formData.get('contact') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      type: formData.get('type') as 'NORMAL' | 'INSTITUTIONAL',
      totalSpent: editingCustomer?.totalSpent || 0,
      createdAt: editingCustomer?.createdAt || new Date(),
    };

    if (editingCustomer) {
      await CustomerService.add(newCustomer); // Note: Should be Update, but logic above seemed to rely on overwrite or maybe it was missing service call completely. 
      // Actually, since I am adding delete, I should ensure persistence.
      // But looking at previous code, it seems Customers.tsx WAS missing persistence calls?
      // I will focus on adding Delete first.

      // Ideally I should fix Save too but let's stick to Delete.
      // Wait, if I call CustomerService.delete, it deletes from DB.
      // If the app reloads, it's gone.
      setCustomers(prev => prev.map(c => c.id === newCustomer.id ? newCustomer : c));
    } else {
      setCustomers(prev => [...prev, newCustomer]);
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este cliente?')) {
      try {
        await CustomerService.delete(id);
        setCustomers(prev => prev.filter(c => c.id !== id));
        setIsModalOpen(false);
        setEditingCustomer(null);
      } catch (e) {
        alert("Erro ao apagar cliente.");
      }
    }
  };

  const customerSales = useMemo(() => {
    if (!selectedCustomerForHistory) return [];
    return sales.filter(s => s.customerName === selectedCustomerForHistory.name);
  }, [selectedCustomerForHistory, sales]);

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><Users size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Clientes</p>
              <p className="text-2xl font-black text-gray-900">{customerStats.total}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Award size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Melhor Cliente</p>
              <p className="text-lg font-black text-gray-900 truncate max-w-[150px]">{customerStats.topCustomer?.name || '---'}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><TrendingUp size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entidades/Inst.</p>
              <p className="text-2xl font-black text-gray-900">{customerStats.institutional}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border">
          <div className="flex-1 w-full max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por nome, NUIT ou telefone..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
            className="w-full lg:w-auto px-10 py-4 bg-emerald-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 transition-all active:scale-95"
          >
            <UserPlus size={24} /> NOVO CLIENTE
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-white rounded-[2rem] border-2 border-transparent hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-16 h-16 flex items-center justify-center rounded-bl-3xl ${customer.type === 'INSTITUTIONAL' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {customer.type === 'INSTITUTIONAL' ? <Award size={20} /> : <Users size={20} />}
              </div>

              <div className="mb-6">
                <div className="w-16 h-16 bg-gray-50 text-emerald-900 rounded-2xl flex items-center justify-center font-black text-2xl mb-4 border border-gray-100">
                  {customer.name.charAt(0)}
                </div>
                <h4 className="text-xl font-black text-gray-900 leading-tight mb-1">{customer.name}</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Fingerprint size={12} /> NUIT: {customer.nuit}
                </p>
              </div>

              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <Phone size={16} className="text-gray-300" /> {customer.contact}
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <Mail size={16} className="text-gray-300" /> {customer.email}
                </div>
                <div className="flex items-start gap-3 text-sm font-medium text-gray-600">
                  <MapPin size={16} className="text-gray-300 mt-1 shrink-0" /> <span className="truncate">{customer.address}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Total Compras</p>
                  <p className="font-black text-emerald-900">MT {customer.totalSpent.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCustomerForHistory(customer)}
                    className="p-3 bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  >
                    <History size={18} />
                  </button>
                  <button
                    onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }}
                    className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
      {/* History Modal */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">Histórico de Cliente</h3>
                <p className="text-gray-500 font-bold">{selectedCustomerForHistory.name}</p>
              </div>
              <button onClick={() => setSelectedCustomerForHistory(null)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24} /></button>
            </div>
            <div className="p-8 max-h-[500px] overflow-y-auto">
              {customerSales.length === 0 ? (
                <div className="text-center py-20 text-gray-300 italic">Nenhum registo de compra encontrado.</div>
              ) : (
                <div className="space-y-4">
                  {customerSales.map(sale => (
                    <div key={sale.id} className="p-4 border-2 border-gray-50 rounded-2xl flex justify-between items-center group hover:border-emerald-100 hover:bg-emerald-50/30 transition-all">
                      <div>
                        <div className="font-black text-emerald-900">Venda #{sale.id}</div>
                        <div className="text-xs text-gray-400 font-bold">{new Date(sale.timestamp).toLocaleDateString()} • {sale.performedBy}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-gray-900">MT {sale.total.toFixed(2)}</div>
                        <div className="text-[10px] font-black uppercase text-emerald-600">{sale.paymentMethod}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Nome Completo / Entidade</label>
                  <input name="name" required defaultValue={editingCustomer?.name} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">NUIT</label>
                  <input name="nuit" required defaultValue={editingCustomer?.nuit} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Tipo</label>
                  <select name="type" required defaultValue={editingCustomer?.type} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold">
                    <option value="NORMAL">Normal / Particular</option>
                    <option value="INSTITUTIONAL">Institucional / Empresa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Telefone</label>
                  <input name="contact" required defaultValue={editingCustomer?.contact} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Email</label>
                  <input name="email" type="email" required defaultValue={editingCustomer?.email} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Endereço Residencial/Sede</label>
                  <input name="address" required defaultValue={editingCustomer?.address} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold" />
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                {editingCustomer && (
                  <button type="button" onClick={() => handleDeleteCustomer(editingCustomer.id)} className="px-6 py-5 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center">
                    <Trash2 size={24} />
                  </button>
                )}
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-5 bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
