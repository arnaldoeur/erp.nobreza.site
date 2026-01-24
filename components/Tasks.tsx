import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Clock, AlertCircle, CheckCircle2, User as UserIcon, MapPin, X, Trash2, Calendar } from 'lucide-react';
import { CollabService, CollabTask } from '../services/collab.service';
import { User } from '../types';

interface TasksProps {
    currentUser: User;
    team: User[];
}

export const Tasks: React.FC<TasksProps> = ({ currentUser, team }) => {
    const [tasks, setTasks] = useState<CollabTask[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<CollabTask | null>(null);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        const data = await CollabService.getTasks();
        setTasks(data);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const task: CollabTask = {
            ...editingTask,
            company_id: currentUser.companyId,
            creator_id: currentUser.id,
            title: formData.get('title') as string,
            description: (formData.get('description') as string) || null, // Handle empty string
            status: formData.get('status') as any,
            priority: formData.get('priority') as any,
            assigned_to: (formData.get('assigned_to') as string) || null, // Fix: Invalid UUID syntax
            due_date: (formData.get('due_date') as string) || null,
            location: (formData.get('location') as string) || null,
        };

        // Remove nulls if API doesn't like them, or keep them if it does. 
        // Supabase/Postgres is fine with null for optional columns.
        // But we need to make sure we don't send "" for UUID.

        try {
            await CollabService.saveTask(task);
            setIsModalOpen(false);
            setEditingTask(null);
            loadTasks();
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar tarefa.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta tarefa?")) return;
        await CollabService.deleteTask(id);
        loadTasks();
    };

    const moveTask = async (task: CollabTask, newStatus: 'PENDING' | 'PROGRESS' | 'DONE') => {
        await CollabService.saveTask({ ...task, status: newStatus });
        loadTasks();
    };

    const getPriorityColor = (p: string) => {
        if (p === 'HIGH') return 'text-red-600 bg-red-50';
        if (p === 'MEDIUM') return 'text-amber-600 bg-amber-50';
        return 'text-blue-600 bg-blue-50';
    };

    const getAssigneeName = (id?: string) => {
        return team.find(u => u.id === id)?.name || 'Sem responsável';
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Tarefas da Equipa</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de pendentes e fluxo de trabalho</p>
                </div>
                <button
                    onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                    className="bg-emerald-950 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-3 text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                >
                    <Plus size={18} /> Nova Tarefa
                </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                {(['PENDING', 'PROGRESS', 'DONE'] as const).map(status => (
                    <div
                        key={status}
                        className="bg-slate-50/50 p-4 rounded-[2.5rem] border border-slate-100 flex flex-col h-full overflow-hidden transition-colors hover:bg-slate-50/80"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const taskId = e.dataTransfer.getData('taskId');
                            const task = tasks.find(t => t.id === taskId);
                            if (task && task.status !== status) {
                                moveTask(task, status);
                            }
                        }}
                    >
                        <div className="flex items-center justify-between mb-6 px-4 shrink-0">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${status === 'PENDING' ? 'bg-slate-400' : status === 'PROGRESS' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                {status === 'PENDING' ? 'Pendentes' : status === 'PROGRESS' ? 'Em Curso' : 'Concluído'}
                            </h3>
                            <span className="bg-white text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-100">
                                {tasks.filter(t => t.status === status).length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar pb-20">
                            {tasks.filter(t => t.status === status).map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('taskId', task.id!);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                                    className="bg-white p-5 rounded-[1.8rem] shadow-sm border border-slate-50 group hover:border-emerald-500/50 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-grab active:cursor-grabbing relative hover:-translate-y-1"
                                >
                                    <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full w-fit mb-3 ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </div>
                                    <h4 className="text-sm font-black text-slate-950 mb-1 uppercase tracking-tight leading-tight">{task.title}</h4>
                                    <p className="text-[11px] font-bold text-slate-400 line-clamp-2 mb-4 leading-relaxed">{task.description || 'Sem descrição.'}</p>

                                    <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                                                <Calendar size={12} className="text-emerald-600" />
                                                {task.due_date || 'Sem data'}
                                            </div>
                                            {task.location && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                                                    <MapPin size={12} className="text-emerald-600" />
                                                    {task.location}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex -space-x-2">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-emerald-700 shadow-sm" title={getAssigneeName(task.assigned_to)}>
                                                {getAssigneeName(task.assigned_to)[0]}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Edição/Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }} className="absolute top-8 right-8 p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><X size={20} /></button>

                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configure os detalhes do trabalho</p>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Título da Tarefa</label>
                                    <input name="title" required defaultValue={editingTask?.title} placeholder="Ex: Conferir Validades" className="w-full px-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Descrição</label>
                                    <textarea name="description" defaultValue={editingTask?.description} rows={3} placeholder="Instruções adicionais..." className="w-full px-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all resize-none" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Estado</label>
                                        <select name="status" defaultValue={editingTask?.status || 'PENDING'} className="w-full px-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer">
                                            <option value="PENDING">PENDENTE</option>
                                            <option value="PROGRESS">EM CURSO</option>
                                            <option value="DONE">CONCLUÍDO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Prioridade</label>
                                        <select name="priority" defaultValue={editingTask?.priority || 'MEDIUM'} className="w-full px-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer">
                                            <option value="LOW">BAIXA</option>
                                            <option value="MEDIUM">MÉDIA</option>
                                            <option value="HIGH">ALTA</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Responsável</label>
                                        <select name="assigned_to" defaultValue={editingTask?.assigned_to} className="w-full px-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer">
                                            <option value="">Ninguém</option>
                                            {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Data Limite</label>
                                        <input type="date" name="due_date" defaultValue={editingTask?.due_date} className="w-full px-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all cursor-pointer" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Localização / Secção</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input name="location" defaultValue={editingTask?.location} placeholder="Ex: Armazém A" className="w-full pl-14 pr-6 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                {editingTask && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(editingTask.id!)}
                                        className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all active:scale-95"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button type="submit" className="flex-1 bg-emerald-950 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-emerald-950/20 active:scale-95 transition-all">
                                    {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

