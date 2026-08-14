import { ReactNode } from 'react'

export default function PageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="h-16 flex items-center justify-between gap-4 px-6 border-b border-slate-200 bg-white">
      <h1 className="text-lg font-bold text-slate-900 truncate">{title}</h1>
      {actions && (
        <div className="hidden md:flex items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  )
}
