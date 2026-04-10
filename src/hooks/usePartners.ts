import { useState, useEffect, useCallback } from 'react'
import { fetchKanban, movePartnerStage } from '../lib/api'
import type { KanbanFilters } from '../lib/api'
import type { Partner, PipelineStage } from '../types/partner'

interface KanbanState {
  [stage: string]: { count: number; partners: Partner[] }
}

export function usePartners(filters: KanbanFilters) {
  const [kanban, setKanban] = useState<KanbanState>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchKanban(filters)
      setKanban(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    const timer = setTimeout(load, 300) // debounce
    return () => clearTimeout(timer)
  }, [load])

  const movePartner = useCallback(
    async (partnerId: string, toStage: PipelineStage) => {
      try {
        await movePartnerStage(partnerId, toStage)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to move')
      }
    },
    [load]
  )

  return { kanban, loading, error, movePartner, reload: load }
}
