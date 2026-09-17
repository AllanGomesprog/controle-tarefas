import { parseLocalDate, } from '../utils/dates.js';
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Plus } from 'lucide-react';

export default function CalendarView({ tasks, onAddTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayTasks, setSelectedDayTasks] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Helper to change month
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayTasks(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayTasks(null);
  };

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week for 1st of month (0-6)
  const totalDays = new Date(year, month + 1, 0).getDate(); // Total days in current month
  const prevTotalDays = new Date(year, month, 0).getDate(); // Total days in previous month

  const calendarDays = [];

  // Previous month filler days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevTotalDays - i;
    calendarDays.push({
      day: dayNum,
      isCurrentMonth: false,
      date: new Date(year, month - 1, dayNum)
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month filler days
  const remainingCells = 42 - calendarDays.length; // 6 rows * 7 columns = 42 cells
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const getEventsForDate = (date) => {
    const dStr = date.toDateString();
    
    // User added tasks matching this date
    const dayTasks = tasks.filter(t => {
      const taskDate = parseLocalDate(t.dueDate);
      return taskDate.toDateString() === dStr;
    }).map(t => ({
      ...t,
      isCustomTask: true
    }));

    return dayTasks;
  };

  const handleDayClick = (dayData) => {
    if (!dayData.isCurrentMonth) return;
    const events = getEventsForDate(dayData.date);
    setSelectedDayTasks({
      day: dayData.day,
      date: dayData.date,
      events: events
    });
  };

  const handleCreateTaskFromDay = () => {
    if (!selectedDayTasks) return;
    // Format date as YYYY-MM-DD
    const localDate = selectedDayTasks.date;
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    onAddTask(formattedDate);
    setSelectedDayTasks(null);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="calendar-container">
      {/* Calendar Controller */}
      <div className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronLeft 
            onClick={prevMonth} 
            className="btn btn-secondary" 
            style={{ padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            size={36} 
          />
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', fontWeight: '600', minWidth: '160px', textAlign: 'center' }}>
            {monthNames[month]} {year}
          </h3>
          <ChevronRight 
            onClick={nextMonth} 
            className="btn btn-secondary" 
            style={{ padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            size={36} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Info size={14} />
          <span>São exibidos os vencimentos das tarefas cadastradas pelo escritório.</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="card-panel" style={{ padding: '16px' }}>
        <div className="calendar-grid">
          {/* Day Names */}
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="calendar-day-name">{d}</div>
          ))}

          {/* Days */}
          {calendarDays.map((cell, idx) => {
            const events = getEventsForDate(cell.date);
            const todayClass = isToday(cell.date) ? 'today' : '';
            const otherMonthClass = !cell.isCurrentMonth ? 'other-month' : '';
            
            return (
              <div 
                key={idx} 
                className={`calendar-day ${todayClass} ${otherMonthClass}`}
                onClick={() => handleDayClick(cell)}
              >
                <span className="day-number">{cell.day}</span>
                <div className="day-events">
                  {events.slice(0, 3).map((ev, evIdx) => {
                    let typeClass = 'custom';
                    if (ev.type) {
                      typeClass = ev.type.toLowerCase();
                    } else if (ev.category) {
                      if (ev.category.includes('DAS')) typeClass = 'das';
                      else if (ev.category.includes('FGTS')) typeClass = 'fgts';
                      else if (ev.category.includes('e-Social') || ev.category.includes('Folha')) typeClass = 'esocial';
                    }
                    
                    return (
                      <div 
                        key={evIdx} 
                        className={`day-event ${typeClass}`}
                        title={`${ev.title} - ${ev.client || ''}`}
                      >
                        {ev.title}
                      </div>
                    );
                  })}
                  {events.length > 3 && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', fontWeight: 'bold' }}>
                      +{events.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Modal/Sideview */}
      {selectedDayTasks && (
        <div className="modal-overlay" onClick={() => setSelectedDayTasks(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h3>Agenda - Dia {selectedDayTasks.day} de {monthNames[month]}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDayTasks(null)}>Fechar</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {selectedDayTasks.events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  Nenhuma guia ou tarefa agendada para este dia.
                </div>
              ) : (
                selectedDayTasks.events.map((ev, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      padding: '12px', 
                      backgroundColor: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: ev.isCustomTask ? 'var(--accent-cyan)' : 'var(--primary-light)' }}>
                        {ev.title}
                      </strong>
                      <span className="badge priority-low" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        {ev.isCustomTask ? 'Obrigação Cliente' : 'Guia Padrão'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <strong>Cliente:</strong> {ev.client}
                    </div>
                    {ev.status && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                        <strong>Status:</strong> 
                        <span className={`badge ${ev.status === 'Concluído' ? 'completed' : ev.status === 'Em Andamento' ? 'inprogress' : 'pending'}`} style={{ fontSize: '0.65rem' }}>
                          {ev.status}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateTaskFromDay}>
              <Plus size={16} /> Criar Nova Tarefa para Este Dia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
