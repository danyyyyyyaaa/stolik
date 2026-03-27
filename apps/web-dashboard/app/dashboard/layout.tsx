import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  )
}
