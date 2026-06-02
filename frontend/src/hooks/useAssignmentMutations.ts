import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'

export function useAssignCoach() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ coach, athlete }: { coach: string; athlete: string }) =>
      api.post<any>('/api/gyms/coach-assignments/', { coach, athlete }),
    onMutate: async ({ athlete, coach }) => {
      await queryClient.cancelQueries({ queryKey: ['coach-assignments'] })
      const prev = queryClient.getQueryData(['coach-assignments'])
      queryClient.setQueryData(['coach-assignments'], (old: any) => {
        if (!old) return old
        const items = Array.isArray(old) ? old : old.results || []
        return { ...old, results: [...items, { athlete, coach, is_active: true }] }
      })
      return { prev }
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['coach-assignments'], context?.prev)
      showError(err, 'Error al asignar coach.')
    },
    onSuccess: () => {
      showSuccess('Coach asignado correctamente.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-assignments'] })
    },
  })
}

export function useRemoveCoach() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignmentId: string) =>
      api.delete(`/api/gyms/coach-assignments/${assignmentId}/`),
    onMutate: async (assignmentId) => {
      await queryClient.cancelQueries({ queryKey: ['coach-assignments'] })
      const prev = queryClient.getQueryData(['coach-assignments'])
      queryClient.setQueryData(['coach-assignments'], (old: any) => {
        if (!old) return old
        const items = Array.isArray(old) ? old : old.results || []
        const filtered = items.filter((a: any) => a.id !== assignmentId)
        return Array.isArray(old) ? filtered : { ...old, results: filtered }
      })
      return { prev }
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['coach-assignments'], context?.prev)
      showError(err, 'Error al quitar coach.')
    },
    onSuccess: () => {
      showSuccess('Coach removido correctamente.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-assignments'] })
    },
  })
}

export function useAssignNutritionist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ nutritionist, athlete }: { nutritionist: string; athlete: string }) =>
      api.post<any>('/api/gyms/nutritionist-assignments/', { nutritionist, athlete }),
    onMutate: async ({ athlete, nutritionist }) => {
      await queryClient.cancelQueries({ queryKey: ['nutritionist-assignments'] })
      const prev = queryClient.getQueryData(['nutritionist-assignments'])
      queryClient.setQueryData(['nutritionist-assignments'], (old: any) => {
        if (!old) return old
        const items = Array.isArray(old) ? old : old.results || []
        return { ...old, results: [...items, { athlete, nutritionist, is_active: true }] }
      })
      return { prev }
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['nutritionist-assignments'], context?.prev)
      showError(err, 'Error al asignar nutricionista.')
    },
    onSuccess: () => {
      showSuccess('Nutricionista asignado correctamente.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionist-assignments'] })
    },
  })
}

export function useRemoveNutritionist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignmentId: string) =>
      api.delete(`/api/gyms/nutritionist-assignments/${assignmentId}/`),
    onMutate: async (assignmentId) => {
      await queryClient.cancelQueries({ queryKey: ['nutritionist-assignments'] })
      const prev = queryClient.getQueryData(['nutritionist-assignments'])
      queryClient.setQueryData(['nutritionist-assignments'], (old: any) => {
        if (!old) return old
        const items = Array.isArray(old) ? old : old.results || []
        const filtered = items.filter((a: any) => a.id !== assignmentId)
        return Array.isArray(old) ? filtered : { ...old, results: filtered }
      })
      return { prev }
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['nutritionist-assignments'], context?.prev)
      showError(err, 'Error al quitar nutricionista.')
    },
    onSuccess: () => {
      showSuccess('Nutricionista removido correctamente.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionist-assignments'] })
    },
  })
}
