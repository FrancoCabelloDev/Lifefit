import { Skeleton } from './skeleton'

export function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden bg-white">
      <div className="p-6 border-b border-slate-100">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60 mt-2" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="border border-slate-200 rounded-2xl shadow-sm bg-white p-6">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16 mt-2" />
      <Skeleton className="h-3 w-36 mt-3" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden bg-white">
      <div className="p-6 border-b border-slate-100">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-6 py-4">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {c === 0 && <Skeleton className="h-10 w-10 rounded-xl shrink-0" />}
                      <Skeleton className={`h-4 ${c === 0 ? 'w-32' : c === cols - 1 ? 'w-16' : 'w-24'}`} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-64 mb-6" />
      <div className="flex items-end gap-3 h-48">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 p-6 border border-slate-200 rounded-2xl bg-white">
        <Skeleton className="h-20 w-20 rounded-2xl" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-2xl bg-white p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  )
}
