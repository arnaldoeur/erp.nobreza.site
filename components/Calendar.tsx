import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, Clock, User as UserIcon, X, Filter } from 'lucide-react';
import { createPortal } from 'react-dom';
import { CalendarService } from '../services/calendar.service';
import { CalendarEvent, User } from '../types';

interface CalendarProps {
    currentUser: User;
    team: User[];
}

export const Calendar: React.FC<CalendarProps> = ({ currentUser, team }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'MINE'>('ALL');
    const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'MONTH' | '7DAYS' | '15DAYS'>('MONTH');
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
    const [showTodayOnly, setShowTodayOnly] = useState(false);

    // New Event Form State
    const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
        title: '',
        description: '',
        startTime: new Date(),
        endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        location: '',
        type: 'MEETING',
        priority: 'MEDIUM',
        status: 'PENDING'
    });
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

    useEffect(() => {
        loadEvents();
    }, [currentDate, filter]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const allEvents = await CalendarService.getEvents();
            setEvents(allEvents);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;

        try {
            await CalendarService.createEvent({
                ...newEvent,
                isPersonal: filter === 'MINE' || newEvent.isPersonal
            }, selectedAttendees);
            setIsModalOpen(false);
            setNewEvent({
                title: '',
                description: '',
                startTime: new Date(),
                endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
                location: '',
                type: 'MEETING',
                priority: 'MEDIUM',
                status: 'PENDING'
            });
            setSelectedAttendees([]);
            loadEvents();
        } catch (err) {
            alert("Erro ao criar evento.");
        }
    };

    const handleUpdateStatus = async (id: string, status: 'PENDING' | 'COMPLETED' | 'OVERDUE') => {
        try {
            await CalendarService.updateEvent(id, { status });
            loadEvents();
        } catch (err) {
            console.error("Error updating status", err);
        }
    };

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDay(today.getDate());
    };

    const filteredEvents = events.filter(e => {
        // Visibility Filter:
        // 'ALL' (Equipa) shows non-personal events
        // 'MINE' (Pessoal) shows personal events created by the user
        const matchesVisibility = filter === 'ALL'
            ? !e.isPersonal
            : (e.isPersonal && e.createdBy === currentUser.id);

        // Priority Filter
        const matchesPriority = priorityFilter === 'ALL' || e.priority === priorityFilter;

        return matchesVisibility && matchesPriority;
    });

    const getEventsForDay = (day: number, month = currentDate.getMonth(), year = currentDate.getFullYear()) => {
        return filteredEvents.filter(e => {
            const eventDate = new Date(e.startTime);
            return eventDate.getDate() === day &&
                eventDate.getMonth() === month &&
                eventDate.getFullYear() === year;
        });
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shadow-inner">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">Agenda</h2>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{currentDate.toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                        {(['MONTH', '7DAYS', '15DAYS'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setViewMode(v)}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === v ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
                                {v === 'MONTH' ? 'Mês' : v === '7DAYS' ? '7 Dias' : '15 Dias'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                        <button
                            onClick={() => setFilter('ALL')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${filter === 'ALL' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
                            Equipa
                        </button>
                        <button
                            onClick={() => setFilter('MINE')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${filter === 'MINE' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
                            Pessoal
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowTodayOnly(!showTodayOnly)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm flex items-center gap-2 ${showTodayOnly ? 'bg-emerald-950 text-white border-emerald-950' : 'bg-white text-emerald-700 border-emerald-100 hover:bg-emerald-50'}`}
                        >
                            <CalendarIcon size={14} />
                            {showTodayOnly ? 'Ver Calendário' : 'Hoje (Foco)'}
                        </button>
                        <div className="flex items-center gap-1 ml-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
                            <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-emerald-700"><ChevronLeft size={16} /></button>
                            <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-emerald-700"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-emerald-950 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-emerald-900 transition-all flex items-center gap-2">
                        <Plus size={16} /> Novo Evento
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Sidebar Filters */}
                <div className="w-64 bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-col gap-8 shrink-0">
                    <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Âmbito da Agenda</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setFilter('ALL')}
                                className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter === 'ALL' ? 'bg-emerald-950 text-white border-emerald-950' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}
                            >
                                Equipa
                            </button>
                            <button
                                onClick={() => setFilter('MINE')}
                                className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter === 'MINE' ? 'bg-emerald-950 text-white border-emerald-950' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}
                            >
                                Pessoal
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Filtrar por Importância</h4>
                        <div className="space-y-2">
                            <button
                                onClick={() => setPriorityFilter('ALL')}
                                className={`w-full p-3 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-between transition-all ${priorityFilter === 'ALL' ? 'bg-emerald-950 text-white shadow-lg' : 'bg-gray-50 text-emerald-950 hover:bg-gray-100'}`}
                            >
                                Todos <span>{filteredEvents.length}</span>
                            </button>
                            <button
                                onClick={() => setPriorityFilter('HIGH')}
                                className={`w-full p-3 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-between transition-all ${priorityFilter === 'HIGH' ? 'bg-red-500 text-white shadow-lg' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                                Alta Prioridade <span>{events.filter(e => e.priority === 'HIGH' && (filter === 'ALL' ? !e.isPersonal : (e.isPersonal && e.createdBy === currentUser.id))).length}</span>
                            </button>
                            <button
                                onClick={() => setPriorityFilter('MEDIUM')}
                                className={`w-full p-3 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-between transition-all ${priorityFilter === 'MEDIUM' ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                            >
                                Média <span>{events.filter(e => e.priority === 'MEDIUM' && (filter === 'ALL' ? !e.isPersonal : (e.isPersonal && e.createdBy === currentUser.id))).length}</span>
                            </button>
                            <button
                                onClick={() => setPriorityFilter('LOW')}
                                className={`w-full p-3 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-between transition-all ${priorityFilter === 'LOW' ? 'bg-blue-500 text-white shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                            >
                                Baixa <span>{events.filter(e => e.priority === 'LOW' && (filter === 'ALL' ? !e.isPersonal : (e.isPersonal && e.createdBy === currentUser.id))).length}</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Dica da Agenda</p>
                            <p className="text-[10px] text-emerald-600 font-medium leading-relaxed">Pode filtrar por prioridade para focar no que é mais urgente hoje.</p>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid / Today View */}
                <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 overflow-hidden flex flex-col">
                    {showTodayOnly ? (
                        <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <h3 className="text-4xl font-black text-emerald-950 uppercase tracking-tighter">O Teu Dia</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        {new Date().toLocaleDateString('pt-MZ', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">Total</span>
                                        <span className="text-xl font-black text-emerald-950">{getEventsForDay(new Date().getDate(), new Date().getMonth(), new Date().getFullYear()).length}</span>
                                    </div>
                                    <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                                        <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest block">Pendentes</span>
                                        <span className="text-xl font-black text-blue-950">{getEventsForDay(new Date().getDate(), new Date().getMonth(), new Date().getFullYear()).filter(e => e.status !== 'COMPLETED').length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                                {getEventsForDay(new Date().getDate(), new Date().getMonth(), new Date().getFullYear()).length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/10">
                                            <CalendarIcon size={40} />
                                        </div>
                                        <h4 className="text-2xl font-black text-emerald-950 uppercase mb-2">Tudo em dia!</h4>
                                        <p className="text-sm font-bold text-gray-400 max-w-xs">Não tens mais eventos planeados para hoje. Aproveita para relaxar ou adiantar o trabalho de amanhã.</p>
                                    </div>
                                ) : (
                                    getEventsForDay(new Date().getDate(), new Date().getMonth(), new Date().getFullYear())
                                        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                        .map(ev => (
                                            <div
                                                key={ev.id}
                                                className={`group relative p-8 rounded-[2.5rem] border-2 transition-all hover:scale-[1.01] active:scale-[0.99] ${ev.status === 'COMPLETED' ? 'bg-emerald-50/30 border-emerald-100 opacity-75' : ev.status === 'OVERDUE' ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100 shadow-xl shadow-emerald-900/5'}`}
                                            >
                                                <div className="flex justify-between items-start gap-6">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ev.priority === 'HIGH' ? 'bg-red-100 text-red-700' : ev.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                Prioridade {ev.priority === 'HIGH' ? 'Alta' : ev.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ev.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : ev.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {ev.status === 'COMPLETED' ? 'Concluído' : ev.status === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                                                            </div>
                                                        </div>
                                                        <h4 className={`text-2xl font-black uppercase tracking-tight mb-2 ${ev.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-emerald-950'}`}>{ev.title}</h4>
                                                        <p className="text-sm font-bold text-gray-500 mb-6 line-clamp-2">{ev.description || 'Sem descrição detalhada.'}</p>

                                                        <div className="flex flex-wrap gap-4">
                                                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                                                                <Clock size={16} className="text-emerald-600" />
                                                                <span className="text-xs font-black text-gray-700 uppercase tracking-wide">
                                                                    {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            {ev.location && (
                                                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                                                                    <MapPin size={16} className="text-emerald-600" />
                                                                    <span className="text-xs font-black text-gray-700 uppercase tracking-wide">{ev.location}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        {ev.status !== 'COMPLETED' ? (
                                                            <button
                                                                onClick={() => handleUpdateStatus(ev.id, 'COMPLETED')}
                                                                className="w-14 h-14 bg-emerald-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 hover:scale-110 active:scale-90 transition-all"
                                                                title="Marcar como Concluído"
                                                            >
                                                                <Plus size={24} className="rotate-45" /> {/* Simulating a check with rotated plus or just use check if available */}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUpdateStatus(ev.id, 'PENDING')}
                                                                className="w-14 h-14 bg-gray-100 text-gray-400 rounded-[1.5rem] flex items-center justify-center hover:bg-gray-200 transition-all"
                                                                title="Reabrir Evento"
                                                            >
                                                                <Clock size={24} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-7 mb-4">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest py-2">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className={`flex-1 grid gap-2 custom-scrollbar overflow-y-auto ${viewMode === 'MONTH' ? 'grid-cols-7' : 'grid-cols-1'}`}>
                                {viewMode === 'MONTH' ? (
                                    <>
                                        {Array.from({ length: firstDayOfMonth(currentDate) }).map((_, i) => (
                                            <div key={`empty-${i}`} className="bg-gray-50/30 rounded-xl"></div>
                                        ))}
                                        {Array.from({ length: daysInMonth(currentDate) }).map((_, i) => {
                                            const day = i + 1;
                                            const dayEvents = getEventsForDay(day);
                                            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                                            const isSelected = selectedDay === day;

                                            return (
                                                <div
                                                    key={day}
                                                    onClick={() => setSelectedDay(day)}
                                                    onDoubleClick={() => {
                                                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 9, 0);
                                                        setNewEvent({
                                                            ...newEvent,
                                                            startTime: date,
                                                            endTime: new Date(new Date(date).setHours(date.getHours() + 1))
                                                        });
                                                        setIsModalOpen(true);
                                                    }}
                                                    className={`min-h-[100px] border rounded-xl p-2 transition-all flex flex-col gap-1 cursor-pointer group hover:scale-[1.02] active:scale-95 ${isSelected ? 'ring-2 ring-emerald-500 border-transparent shadow-lg z-10' : 'border-gray-100 hover:border-emerald-200'} ${isToday ? 'bg-emerald-50/50' : 'bg-white'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <span className={`text-xs font-black w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isToday ? 'bg-emerald-600 text-white shadow-lg' : isSelected ? 'bg-emerald-100 text-emerald-800' : 'text-gray-400 group-hover:text-emerald-600'}`}>{day}</span>
                                                        {dayEvents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                                                    </div>
                                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-24 pt-1">
                                                        {dayEvents.map(ev => (
                                                            <div key={ev.id} className={`p-1.5 rounded-lg border transition-all relative group/item ${ev.priority === 'HIGH' ? 'bg-red-50 border-red-100' :
                                                                ev.priority === 'MEDIUM' ? 'bg-amber-50 border-amber-100' :
                                                                    'bg-blue-50 border-blue-100'
                                                                }`}>
                                                                <div className="flex justify-between items-start gap-1">
                                                                    <p className={`text-[9px] font-black truncate leading-tight flex-1 ${ev.priority === 'HIGH' ? 'text-red-900' :
                                                                        ev.priority === 'MEDIUM' ? 'text-amber-900' :
                                                                            'text-blue-900'
                                                                        }`}>{ev.title}</p>
                                                                    {ev.status === 'COMPLETED' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                                                    {ev.status === 'OVERDUE' && <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 animate-pulse" />}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        {Array.from({ length: viewMode === '7DAYS' ? 7 : 15 }).map((_, i) => {
                                            const date = new Date();
                                            date.setDate(date.getDate() + i);
                                            const day = date.getDate();
                                            const dayEvents = filteredEvents.filter(e => {
                                                const eventDate = new Date(e.startTime);
                                                return eventDate.getDate() === day && eventDate.getMonth() === date.getMonth() && eventDate.getFullYear() === date.getFullYear();
                                            });
                                            const isToday = i === 0;

                                            return (
                                                <div key={i} className={`p-6 rounded-[2rem] border transition-all flex items-center gap-6 ${isToday ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-gray-50/30 border-gray-100'}`}>
                                                    <div className="flex flex-col items-center min-w-[60px]">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{date.toLocaleDateString('pt-MZ', { weekday: 'short' })}</span>
                                                        <span className={`text-2xl font-black mt-1 ${isToday ? 'text-emerald-700' : 'text-gray-900'}`}>{day}</span>
                                                    </div>
                                                    <div className="h-10 w-px bg-gray-200" />
                                                    <div className="flex-1 flex gap-3 overflow-x-auto py-2 custom-scrollbar">
                                                        {dayEvents.length === 0 ? (
                                                            <p className="text-xs font-bold text-gray-300 italic uppercase tracking-wider">Sem eventos planeados</p>
                                                        ) : (
                                                            dayEvents.map(ev => (
                                                                <div key={ev.id} className={`min-w-[200px] p-4 rounded-2xl border flex flex-col gap-2 ${ev.priority === 'HIGH' ? 'bg-white border-red-100' : ev.priority === 'MEDIUM' ? 'bg-white border-amber-100' : 'bg-white border-blue-100'}`}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${ev.priority === 'HIGH' ? 'bg-red-500' : ev.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                                        <p className="text-xs font-black text-gray-800 truncate line-clamp-1">{ev.title}</p>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <Clock size={12} className="text-gray-400" />
                                                                            <span className="text-[10px] font-bold text-gray-500">{new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        </div>
                                                                        {ev.status === 'COMPLETED' ? (
                                                                            <span className="text-[8px] font-black text-emerald-600 uppercase">Concluído</span>
                                                                        ) : ev.status === 'OVERDUE' ? (
                                                                            <span className="text-[8px] font-black text-red-600 uppercase">Atrasado</span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* New Event Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-emerald-950/90 backdrop-blur-2xl z-[99999] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 md:p-12 shadow-[0_32px_80px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-emerald-700 transition-all z-10"><X size={24} /></button>
                        <h3 className="text-3xl font-black text-emerald-950 uppercase tracking-tight mb-8">Novo Evento</h3>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Título</label>
                                <input
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-emerald-500 outline-none"
                                    placeholder="Ex: Reunião Geral"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Tipo de Evento</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, isPersonal: false })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${!newEvent.isPersonal ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                    >
                                        Evento de Equipa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, isPersonal: true })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newEvent.isPersonal ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                    >
                                        Agenda Pessoal
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Estado</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, status: 'PENDING' })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newEvent.status === 'PENDING' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                    >
                                        Pendente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, status: 'COMPLETED' })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newEvent.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                    >
                                        Concluído
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, status: 'OVERDUE' })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newEvent.status === 'OVERDUE' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                    >
                                        Atrasado
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Importância</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, priority: 'LOW' })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newEvent.priority === 'LOW' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                    >
                                        Baixa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, priority: 'MEDIUM' })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newEvent.priority === 'MEDIUM' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                    >
                                        Média
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, priority: 'HIGH' })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newEvent.priority === 'HIGH' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                    >
                                        Alta
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Descrição</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-emerald-500 outline-none h-24 resize-none"
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                    placeholder="Detalhes adicionais..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Início</label>
                                    <input
                                        type="datetime-local"
                                        value={newEvent.startTime?.toISOString().slice(0, 16)}
                                        onChange={e => setNewEvent({ ...newEvent, startTime: new Date(e.target.value) })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-emerald-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Fim</label>
                                    <input
                                        type="datetime-local"
                                        value={newEvent.endTime?.toISOString().slice(0, 16)}
                                        onChange={e => setNewEvent({ ...newEvent, endTime: new Date(e.target.value) })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-emerald-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Localização</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-4 top-3.5 text-gray-400" />
                                    <input
                                        value={newEvent.location}
                                        onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                        className="w-full pl-10 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-emerald-500 outline-none"
                                        placeholder="Sala de Reuniões / Online"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Convidados</label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-2 border border-gray-100 rounded-xl">
                                    {team.filter(u => u.id !== currentUser.id).map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                if (selectedAttendees.includes(user.id)) {
                                                    setSelectedAttendees(selectedAttendees.filter(id => id !== user.id));
                                                } else {
                                                    setSelectedAttendees([...selectedAttendees, user.id]);
                                                }
                                            }}
                                            className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 border transition-all ${selectedAttendees.includes(user.id) ? 'bg-emerald-100 border-emerald-300' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-800">
                                                {user.name.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-gray-700 truncate">{user.name}</span>
                                        </div>
                                    ))}
                                    {team.length <= 1 && <p className="text-xs text-gray-400 p-2 col-span-2 text-center">Nenhum membro da equipa disponível.</p>}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 uppercase text-xs tracking-wider transition-all">Cancelar</button>
                                <button type="submit" className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                                    Criar Evento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
