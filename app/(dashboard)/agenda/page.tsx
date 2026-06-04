'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type Event, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { createClient } from '@/lib/supabase/client'
import type { Meeting, Lead, Client } from '@/types'
import { Plus, Calendar as CalendarIcon } from 'lucide-react'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'pt-BR': ptBR },
})

interface CalendarEvent extends Event {
  id: string
  title: string
  start: Date
  end: Date
  color: string
  resource?: any
}

export default function AgendaPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    lead_id: '',
    location: '',
    color: '#3B82F6',
  })
  const [loading, setLoading] = useState(false)
  const [supabase] = useState(() => createClient())

  const loadEvents = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: meetings } = await supabase
      .from('meetings')
      .select('*, leads(name)')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true })

    if (meetings) {
      setEvents(
        meetings.map((m: any) => ({
          id: m.id,
          title: m.leads?.name ? `${m.title} - ${m.leads.name}` : m.title,
          start: new Date(m.start_time),
          end: new Date(m.end_time),
          color: m.color || '#3B82F6',
          resource: m,
        }))
      )
    }
  }, [supabase])

  const loadLeads = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    if (data) setLeads(data)
  }, [supabase])

  useEffect(() => {
    loadEvents()
    loadLeads()
  }, [loadEvents, loadLeads])

  const handleSelectSlot = ({ start }: { start: Date }) => {
    const end = new Date(start)
    end.setHours(end.getHours() + 1)
    setFormData({
      title: '',
      description: '',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      lead_id: '',
      location: '',
      color: '#3B82F6',
    })
    setEditingEvent(null)
    setShowModal(true)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormData({
      title: event.resource?.title || event.title,
      description: event.resource?.description || '',
      start_time: event.start.toISOString(),
      end_time: event.end.toISOString(),
      lead_id: event.resource?.lead_id || '',
      location: event.resource?.location || '',
      color: event.color,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const meetingData = {
      user_id: user.id,
      title: formData.title,
      description: formData.description,
      start_time: formData.start_time,
      end_time: formData.end_time,
      lead_id: formData.lead_id || null,
      location: formData.location || null,
      color: formData.color,
    }

    try {
      if (editingEvent) {
        await supabase
          .from('meetings')
          .update(meetingData)
          .eq('id', editingEvent.id)
      } else {
        await supabase.from('meetings').insert(meetingData)
      }

      setShowModal(false)
      loadEvents()
    } catch (error) {
      console.error('Save meeting error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingEvent) return
    setLoading(true)
    try {
      await supabase.from('meetings').delete().eq('id', editingEvent.id)
      setShowModal(false)
      loadEvents()
    } catch (error) {
      console.error('Delete meeting error:', error)
    } finally {
      setLoading(false)
    }
  }

  const eventPropGetter = (event: CalendarEvent) => ({
    style: {
      backgroundColor: event.color,
      borderRadius: '6px',
      border: 'none',
      color: '#fff',
    },
  })

  const messages = {
    today: 'Hoje',
    previous: 'Anterior',
    next: 'Próximo',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Nenhum evento neste período',
    showMore: (total: number) => `+${total} mais`,
  }

  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Agenda</h1>
        <button
          onClick={() => {
            const now = new Date()
            const end = new Date(now)
            end.setHours(end.getHours() + 1)
            setFormData({
              title: '',
              description: '',
              start_time: now.toISOString(),
              end_time: end.toISOString(),
              lead_id: '',
              location: '',
              color: '#3B82F6',
            })
            setEditingEvent(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all"
        >
          <Plus size={16} />
          Nova Reunião
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-bg-card border border-border rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventPropGetter}
            messages={messages}
            culture="pt-BR"
            style={{ height: 600 }}
          />
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon size={18} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-text-primary">Próximos 7 Dias</h3>
          </div>

          <div className="space-y-3">
            {nextDays.map((day) => {
              const dayEvents = events.filter(
                (e) =>
                  e.start.getDate() === day.getDate() &&
                  e.start.getMonth() === day.getMonth() &&
                  e.start.getFullYear() === day.getFullYear()
              )
              return (
                <div key={day.toISOString()} className="border-b border-white/[0.06] pb-2 last:border-0">
                  <p className="text-xs text-gray-400 font-medium">
                    {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-gray-600 mt-1">Nenhum evento</p>
                  ) : (
                    dayEvents.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                        <p className="text-xs text-gray-300 truncate">{e.title}</p>
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              {editingEvent ? 'Editar Reunião' : 'Nova Reunião'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                  placeholder="Título da reunião"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data/Hora Início</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time.slice(0, 16)}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: new Date(e.target.value).toISOString() })
                    }
                    className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data/Hora Fim</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time.slice(0, 16)}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: new Date(e.target.value).toISOString() })
                    }
                    className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Lead</label>
                <select
                  value={formData.lead_id}
                  onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                >
                  <option value="">Selecionar lead...</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name || lead.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Local</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                  placeholder="Online / Endereço"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400 h-20 resize-none"
                  placeholder="Descrição..."
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Cor</label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {editingEvent && (
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                  >
                    Excluir
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !formData.title}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

