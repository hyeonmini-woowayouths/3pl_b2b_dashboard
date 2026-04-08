import { useState, useEffect, useCallback } from 'react'
import { fetchKanban, movePartnerStage } from '../lib/api'
import type { Partner, PipelineStage } from '../types/partner'

interface KanbanState {
  [stage: string]: { count: number; partners: Partner[] }
}

export function usePartners(searchQuery: string) {
  const [kanban, setKanban] = useState<KanbanState>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchKanban(searchQuery || undefined)
      setKanban(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    load()
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

  const allPartners = Object.values(kanban).flatMap((s) => s.partners)

  return { kanban, allPartners, loading, error, movePartner, reload: load }
}
