'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración Global</h1>
        <p className="text-slate-500 mt-1">Ajustes técnicos y claves de API de la plataforma SaaS.</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Integración con Pasarela de Pagos (Izipay)</CardTitle>
          <CardDescription>
            Configuración para la Fase 4. Estas credenciales permitirán cobrar a los gimnasios de manera automática.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Izipay Client ID</Label>
            <Input type="password" value="************************" readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label>Izipay Client Secret</Label>
            <Input type="password" value="************************" readOnly disabled />
          </div>
          <div className="pt-4">
            <Button disabled>Guardar Credenciales</Button>
            <p className="text-xs text-slate-500 mt-2">Esta sección estará habilitada en la Fase 4.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
