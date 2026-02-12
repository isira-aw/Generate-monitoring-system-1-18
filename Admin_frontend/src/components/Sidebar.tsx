'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Monitor,
  LogOut,
  Shield,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admins', label: 'Manage Admins', icon: Users },
  { href: '/devices', label: 'Manage Devices', icon: Monitor },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1E40AF] text-[#d9d9d9] flex flex-col z-50">
      {/* Logo area */}
      <div className="p-6 border-b border-[#d9d9d9]/20">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#d9d9d9]" />
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-xs text-[#d9d9d9]/70">Generator Monitoring</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#d9d9d9] text-[#1E40AF]'
                  : 'text-[#d9d9d9]/80 hover:bg-[#d9d9d9]/20 hover:text-[#d9d9d9]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="p-4 border-t border-[#d9d9d9]/20">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium truncate">{admin?.name}</p>
          <p className="text-xs text-[#d9d9d9]/70 truncate">{admin?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-[#d9d9d9]/80 hover:bg-[#d9d9d9]/20 hover:text-[#d9d9d9] transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
