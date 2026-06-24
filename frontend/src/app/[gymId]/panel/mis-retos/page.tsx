'use client'

import { useEffect, useState, use } from 'react'
import { Target, Loader2, Trophy, Calendar, Users, CheckCircle2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import { api } from '@/lib/api'
import { showError } from '@/lib/toast'
import type { Challenge, ChallengeParticipation, PaginatedResponse } from '@/lib/types'
import PremiumGate from '@/components/PremiumGate'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { useFeatureGuard } from '@/hooks/useFeatureGuard'

const typeIcons: Record<string, string> = {
  attendance: '📋',
  distance: '📏',
  workouts: '💪',
  nutrition: '🥗',
  mixed: '🎯',
}

const typeLabels: Record<string, string> = {
  attendance: 'Asistencia',
  distance: 'Distancia',
  workouts: 'Entrenamientos',
  nutrition: 'Nutrición',
  mixed: 'Mixto',
}

export default function MisRetosPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  useRoleGuard(gymId, ['athlete'])
  useFeatureGuard(gymId, 'retos')

  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [participations, setParticipations] = useState<ChallengeParticipation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [challengesRes, participationsRes] = await Promise.all([
        api.get<PaginatedResponse<Challenge>>('/api/challenges/challenges/', { params: { status: 'active' } }),
        api.get<PaginatedResponse<ChallengeParticipation>>('/api/challenges/participations/'),
      ])
      setChallenges(challengesRes.results || [])
      setParticipations(participationsRes.results || [])
    } catch (err) {
      console.error('Error fetching challenges', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const joinedIds = new Set(participations.map(p => p.challenge))
  const getParticipation = (challengeId: string) =>
    participations.find(p => p.challenge === challengeId)

  const handleJoin = async (challengeId: string) => {
    setJoining(challengeId)
    try {
      await api.post(`/api/challenges/challenges/${challengeId}/join/`)
      await fetchData()
    } catch (err) {
      showError(err, 'Error al unirse al reto')
    } finally {
      setJoining(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <PremiumGate feature="Los retos">
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Retos</h1>
        <p className="text-slate-500 mt-2 text-lg">Desafíos y competencias del gimnasio</p>
      </div>

      {challenges.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No hay retos activos</h3>
            <p className="text-slate-500 mt-1">El staff del gimnasio aún no ha creado retos. ¡Vuelve pronto!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map((challenge) => {
            const participation = getParticipation(challenge.id)
            const joined = joinedIds.has(challenge.id)
            const progress = participation?.progress || 0
            const progressPct = challenge.goal_value > 0 ? Math.min((progress / challenge.goal_value) * 100, 100) : 0

            return (
              <Card key={challenge.id} className={`border-slate-200 shadow-sm ${joined ? 'ring-1 ring-emerald-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{typeIcons[challenge.type] || '🎯'}</span>
                      <div>
                        <h3 className="font-semibold text-slate-800">{challenge.name}</h3>
                        <Badge variant="outline" className="text-xs mt-1">
                          {typeLabels[challenge.type] || challenge.type}
                        </Badge>
                      </div>
                    </div>
                    {joined && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Unido
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{challenge.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Inicia: {new Date(challenge.start_date).toLocaleDateString('es-PE')}
                      {challenge.start_time && ` ${challenge.start_time.slice(0, 5)}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Termina: {new Date(challenge.end_date).toLocaleDateString('es-PE')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      {challenge.reward_points} pts
                    </span>
                    {challenge.responsible_name && (
                      <span className="flex items-center gap-1">
                        👤 {challenge.responsible_name}
                      </span>
                    )}
                  </div>

                  {joined && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Progreso: {progress}/{challenge.goal_value}</span>
                        <span className="font-medium text-emerald-600">{Math.round(progressPct)}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                    </div>
                  )}

                  <Button
                    onClick={() => handleJoin(challenge.id)}
                    disabled={joined || joining === challenge.id}
                    className={joined ? 'w-full bg-slate-100 text-slate-400 hover:bg-slate-100 cursor-not-allowed' : 'w-full bg-emerald-600 hover:bg-emerald-700'}
                    variant={joined ? 'outline' : 'default'}
                  >
                    {joining === challenge.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : joined ? (
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    {joined ? 'Participando' : 'Unirse al reto'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
    </PremiumGate>
  )
}
