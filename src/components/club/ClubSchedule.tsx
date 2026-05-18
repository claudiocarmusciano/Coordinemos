'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuthStore, apiFetch } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trash2, Plus, Clock } from 'lucide-react'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const DURATION_OPTIONS = [60, 75, 90, 120]

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function generateTimes(bands: { startTime: string; endTime: string; slotDuration: number }[]) {
  const times: { startTime: string; endTime: string }[] = []
  for (const band of bands) {
    let cur = timeToMinutes(band.startTime)
    const last = timeToMinutes(band.endTime)
    while (cur <= last) {
      times.push({ startTime: minutesToTime(cur), endTime: minutesToTime(cur + band.slotDuration) })
      cur += band.slotDuration
    }
  }
  return times.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

type Band = {
  id: string
  clubId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDuration: number
}

export function ClubSchedule() {
  const { token } = useAuthStore()
  const [bands, setBands] = useState<Band[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(1) // Monday by default

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formStartTime, setFormStartTime] = useState('08:00')
  const [formEndTime, setFormEndTime] = useState('14:00')
  const [formDuration, setFormDuration] = useState(90)
  const [submitting, setSubmitting] = useState(false)

  const loadBands = useCallback(async () => {
    try {
      const data = await apiFetch('/api/club/schedule', token)
      setBands(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar el horario')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadBands() }, [loadBands])

  const dayBands = bands.filter((b) => b.dayOfWeek === selectedDay)
  const previewTimes = generateTimes(dayBands)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta franja?')) return
    try {
      await apiFetch(`/api/club/schedule/${id}`, token, { method: 'DELETE' })
      toast.success('Franja eliminada')
      loadBands()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiFetch('/api/club/schedule', token, {
        method: 'POST',
        body: JSON.stringify({
          dayOfWeek: selectedDay,
          startTime: formStartTime,
          endTime: formEndTime,
          slotDuration: formDuration,
        }),
      })
      toast.success('Franja agregada')
      setShowForm(false)
      loadBands()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar franja')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Horario semanal</h2>
        <p className="text-sm text-muted-foreground">
          Definí las franjas horarias por día para generar turnos en lote
        </p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {DAY_LABELS.map((label, idx) => (
          <button
            key={idx}
            onClick={() => { setSelectedDay(idx); setShowForm(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              selectedDay === idx
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: bands table */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground">
                  Franjas — {DAY_LABELS[selectedDay]}
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowForm((v) => !v)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar franja
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add form */}
              {showForm && (
                <form
                  onSubmit={handleSubmit}
                  className="border border-border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Inicio</Label>
                      <Input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="bg-input border-border text-foreground"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Inicio del último turno</Label>
                      <Input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="bg-input border-border text-foreground"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Duración del turno</Label>
                    <div className="flex gap-2 flex-wrap">
                      {DURATION_OPTIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFormDuration(d)}
                          className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                            formDuration === d
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                          }`}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {submitting ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowForm(false)}
                      className="text-muted-foreground"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {dayBands.length === 0 && !showForm ? (
                <div className="py-8 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No hay franjas para este día
                  </p>
                </div>
              ) : (
                dayBands.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inicio</th>
                          <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fin (último)</th>
                          <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duración</th>
                          <th className="py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {dayBands.map((b) => (
                          <tr key={b.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2.5 text-foreground font-medium">{b.startTime}</td>
                            <td className="py-2.5 text-foreground">{b.endTime}</td>
                            <td className="py-2.5 text-muted-foreground">{b.slotDuration} min</td>
                            <td className="py-2.5 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(b.id)}
                                className="h-7 w-7"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Right: preview */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">
                Vista previa — {DAY_LABELS[selectedDay]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewTimes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Agregá franjas para ver los turnos que se generarían
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    {previewTimes.length} turno{previewTimes.length !== 1 ? 's' : ''} por cancha
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {previewTimes.map((t) => (
                      <div
                        key={t.startTime}
                        className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm"
                      >
                        <span className="font-semibold text-primary">{t.startTime}</span>
                        <span className="text-muted-foreground text-xs"> → {t.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
