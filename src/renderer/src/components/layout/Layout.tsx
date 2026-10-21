import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900 select-none">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-slate-50/70 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
