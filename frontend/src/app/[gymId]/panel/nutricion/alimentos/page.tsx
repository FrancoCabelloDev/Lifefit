'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Apple, Plus, Search, Pencil, Trash2, Loader2, X, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import { useRoleGuard } from '@/hooks/useRoleGuard'

interface Food {
  id: string
  name: string
  food_group: string
  food_group_display: string
  source: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fats_per_100g: number
  fiber_per_100g: number
  created_by_name: string | null
}

const FOOD_GROUPS = [
  { value: 'meats',      label: 'Carnes y derivados' },
  { value: 'dairy',      label: 'Lácteos y huevos' },
  { value: 'cereals',    label: 'Cereales y derivados' },
  { value: 'legumes',    label: 'Legumbres y derivados' },
  { value: 'vegetables', label: 'Verduras y hortalizas' },
  { value: 'fruits',     label: 'Frutas' },
  { value: 'fats',       label: 'Grasas y aceites' },
  { value: 'beverages',  label: 'Bebidas' },
  { value: 'others',     label: 'Otros' },
]

const GROUP_COLORS: Record<string, string> = {
  meats:      'bg-rose-50 text-rose-700 border-rose-100',
  dairy:      'bg-blue-50 text-blue-700 border-blue-100',
  cereals:    'bg-amber-50 text-amber-700 border-amber-100',
  legumes:    'bg-orange-50 text-orange-700 border-orange-100',
  vegetables: 'bg-green-50 text-green-700 border-green-100',
  fruits:     'bg-pink-50 text-pink-700 border-pink-100',
  fats:       'bg-yellow-50 text-yellow-700 border-yellow-100',
  beverages:  'bg-sky-50 text-sky-700 border-sky-100',
  others:     'bg-slate-50 text-slate-600 border-slate-200',
}

const EMPTY_FORM = {
  name: '',
  food_group: 'others',
  source: 'CENAN',
  calories_per_100g: '',
  protein_per_100g: '',
  carbs_per_100g: '',
  fats_per_100g: '',
  fiber_per_100g: '',
}

export default function AlimentosPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useRoleGuard(gymId, ['nutritionist'])
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<Food | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Food | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const foodsQuery = useQuery({
    queryKey: ['foods', gymId, filterGroup],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filterGroup !== 'all') params.group = filterGroup
      const res = await api.get<any>('/api/nutrition/foods/', { params })
      return Array.isArray(res) ? res : (res?.results ?? [])
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      editingFood
        ? api.patch(`/api/nutrition/foods/${editingFood.id}/`, data)
        : api.post('/api/nutrition/foods/', data),
    onSuccess: () => {
      showSuccess(editingFood ? 'Alimento actualizado' : 'Alimento creado')
      queryClient.invalidateQueries({ queryKey: ['foods', gymId] })
      closeModal()
    },
    onError: (err) => showError(err, 'Error al guardar el alimento'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/nutrition/foods/${id}/`),
    onSuccess: () => {
      showSuccess('Alimento eliminado')
      queryClient.invalidateQueries({ queryKey: ['foods', gymId] })
      setDeleteTarget(null)
    },
    onError: (err) => showError(err, 'Error al eliminar'),
  })

  const openCreate = () => {
    setEditingFood(null)
    setForm({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  const openEdit = (food: Food) => {
    setEditingFood(food)
    setForm({
      name: food.name,
      food_group: food.food_group,
      source: food.source,
      calories_per_100g: String(food.calories_per_100g),
      protein_per_100g: String(food.protein_per_100g),
      carbs_per_100g: String(food.carbs_per_100g),
      fats_per_100g: String(food.fats_per_100g),
      fiber_per_100g: String(food.fiber_per_100g),
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingFood(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({
      name: form.name.trim(),
      food_group: form.food_group,
      source: form.source.trim() || 'CENAN',
      calories_per_100g: parseFloat(form.calories_per_100g) || 0,
      protein_per_100g: parseFloat(form.protein_per_100g) || 0,
      carbs_per_100g: parseFloat(form.carbs_per_100g) || 0,
      fats_per_100g: parseFloat(form.fats_per_100g) || 0,
      fiber_per_100g: parseFloat(form.fiber_per_100g) || 0,
    })
  }

  const f = (v: string, field: keyof typeof form) =>
    setForm(prev => ({ ...prev, [field]: v }))

  const allFoods: Food[] = foodsQuery.data || []
  const filtered = search.trim()
    ? allFoods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : allFoods

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alimentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Base de datos nutricional de tu gimnasio</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="w-4 h-4" />
          Nuevo alimento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar alimento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos los grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los grupos</SelectItem>
            {FOOD_GROUPS.map(g => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {foodsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Apple className="w-7 h-7 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">
              {search ? `Sin resultados para "${search}"` : 'No hay alimentos registrados'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {!search && 'Crea el primer alimento de tu base de datos'}
            </p>
          </div>
          {!search && (
            <Button onClick={openCreate} variant="outline" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Crear alimento
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Cabecera de tabla */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Alimento</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Energía</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Proteína</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">H. Carbono</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Grasa</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Fibra</span>
            <span />
          </div>

          <div className="divide-y divide-slate-50">
            {filtered.map(food => (
              <div key={food.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{food.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-[10px] border px-1.5 py-0 ${GROUP_COLORS[food.food_group] || GROUP_COLORS.others}`}>
                      {food.food_group_display}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{food.source}</span>
                  </div>
                </div>
                <MacroCell value={food.calories_per_100g} unit="kcal" />
                <MacroCell value={food.protein_per_100g} unit="g" />
                <MacroCell value={food.carbs_per_100g} unit="g" />
                <MacroCell value={food.fats_per_100g} unit="g" />
                <MacroCell value={food.fiber_per_100g} unit="g" dim />
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => openEdit(food)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(food)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">{filtered.length} alimento{filtered.length !== 1 ? 's' : ''} · valores por 100 g</span>
          </div>
        </div>
      )}

      {/* Modal crear / editar */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingFood ? 'Editar alimento' : 'Nuevo alimento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {/* Nombre y Fuente */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nombre del alimento</Label>
                <Input
                  value={form.name}
                  onChange={e => f(e.target.value, 'name')}
                  placeholder="Ej: Arroz blanco cocido"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Grupo alimentario</Label>
                <Select value={form.food_group} onValueChange={v => f(v, 'food_group')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_GROUPS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fuente</Label>
                <Input
                  value={form.source}
                  onChange={e => f(e.target.value, 'source')}
                  placeholder="CENAN"
                />
              </div>
            </div>

            {/* Macros */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Macronutrientes por 100 g
              </p>
              <div className="grid grid-cols-2 gap-3">
                <MacroInput label="Energía (kcal)" value={form.calories_per_100g} onChange={v => f(v, 'calories_per_100g')} />
                <MacroInput label="Proteínas (g)" value={form.protein_per_100g} onChange={v => f(v, 'protein_per_100g')} />
                <MacroInput label="H. Carbono (g)" value={form.carbs_per_100g} onChange={v => f(v, 'carbs_per_100g')} />
                <MacroInput label="Grasas (g)" value={form.fats_per_100g} onChange={v => f(v, 'fats_per_100g')} />
                <MacroInput label="Fibra (g) — opcional" value={form.fiber_per_100g} onChange={v => f(v, 'fiber_per_100g')} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingFood ? 'Guardar cambios' : 'Crear alimento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal confirmación de eliminación */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm bg-white rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">¿Eliminar alimento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mt-1">
            Eliminarás <span className="font-semibold text-slate-800">"{deleteTarget?.name}"</span> de tu base de datos. Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-rose-600 hover:bg-rose-700"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MacroCell({ value, unit, dim }: { value: number; unit: string; dim?: boolean }) {
  return (
    <div className="text-right">
      <span className={`text-sm font-medium ${dim ? 'text-slate-400' : 'text-slate-700'}`}>
        {Number(value).toFixed(1)}
      </span>
      <span className="text-[10px] text-slate-400 ml-0.5">{unit}</span>
    </div>
  )
}

function MacroInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step={0.01}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  )
}
