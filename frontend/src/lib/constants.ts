// Colores y etiquetas compartidas entre páginas del panel

export const levelColors: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700 border-green-100',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-100',
  advanced: 'bg-rose-50 text-rose-700 border-rose-100',
}

export const levelLabels: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export const routineStatusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  archived: 'bg-red-50 text-red-700 border-red-100',
}

export const routineStatusLabels: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  archived: 'Archivada',
}

export const roleLabels: Record<string, string> = {
  athlete: 'Atleta',
  coach: 'Coach',
  nutritionist: 'Nutricionista',
  receptionist: 'Recepción',
  gym_admin: 'Admin',
  super_admin: 'Super Admin',
}

export const roleColors: Record<string, string> = {
  athlete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  coach: 'bg-blue-50 text-blue-700 border-blue-200',
  nutritionist: 'bg-amber-50 text-amber-700 border-amber-200',
  receptionist: 'bg-purple-50 text-purple-700 border-purple-200',
  gym_admin: 'bg-rose-50 text-rose-700 border-rose-200',
  super_admin: 'bg-slate-100 text-slate-700 border-slate-200',
}

export const appointmentStatusColors: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-amber-50 text-amber-700 border-amber-200',
}

export const appointmentStatusLabels: Record<string, string> = {
  scheduled: 'Programada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

export const XP_PER_LEVEL = 500
