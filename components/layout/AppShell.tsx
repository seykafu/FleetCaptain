'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  HomeIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface AppShellProps {
  children: ReactNode
  pageTitle?: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/buses', label: 'Buses', icon: TruckIcon },
  { href: '/maintenance', label: 'Maintenance', icon: WrenchScrewdriverIcon },
  { href: '/inventory', label: 'Inventory', icon: CubeIcon },
  { href: '/forecasts', label: 'Forecasts', icon: ChartBarIcon },
  { href: '/settings', label: 'Settings', icon: Cog6ToothIcon },
]

export function AppShell({ children, pageTitle = 'Dashboard' }: AppShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-60 bg-white border-r border-borderLight fixed h-screen overflow-y-auto z-50 transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-borderLight flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <Image
              src="/FleetCaptain.png"
              alt="FleetCaptain Logo"
              width={120}
              height={40}
              className="object-contain"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-textMuted hover:text-textMain"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  isActive
                    ? 'bg-blue-50 text-primary border-l-2 border-primary'
                    : 'text-textMuted hover:bg-blue-50 hover:text-textMain'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-60">
        {/* Top Bar */}
        <header className="bg-transparent border-b border-borderLight h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-textMuted hover:text-textMain"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-textMain">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-textMuted" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-1.5 rounded-full bg-white border border-borderLight text-sm text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-48 lg:w-64"
              />
            </div>
            {/* Notifications */}
            <button className="relative p-2 text-textMuted hover:text-textMain transition-colors">
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-statusRed rounded-full"></span>
            </button>
            {/* User */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">
                OM
              </div>
              <div className="hidden lg:block text-sm">
                <div className="font-medium text-textMain">Operations Manager</div>
                <div className="text-xs text-textMuted">Admin</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
