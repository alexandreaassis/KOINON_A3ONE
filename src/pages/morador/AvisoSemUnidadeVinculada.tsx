import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AvisoSemUnidadeProps {
  /** Rótulo opcional do módulo, ex.: "Credenciamento" — aparece no título do aviso */
  modulo?: string
}

/**
 * Aviso exibido quando o usuário autenticado (tipicamente um gestor admin/mesa)
 * não tem nenhuma unidade vinculada à conta: a tela morador não tem sobre o que
 * operar e não deve inventar uma unidade fantasma.
 */
export const AvisoSemUnidadeVinculada: React.FC<AvisoSemUnidadeProps> = ({ modulo }) => (
  <div className="max-w-2xl mx-auto py-8">
    <Card className="border-amber-200 bg-amber-50/60 text-center p-6 shadow-sm">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">
        Nenhuma unidade vinculada à conta{modulo ? ` — ${modulo}` : ''}
      </h2>
      <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
        Sua conta de gestão (admin/mesa) não está vinculada a nenhuma unidade do condomínio. As
        telas do módulo do morador operam sempre sobre uma unidade específica — para usá-las,
        vincule uma unidade real à sua conta em Administração › Cadastros de Unidades.
      </p>
    </Card>
  </div>
)

export default AvisoSemUnidadeVinculada
