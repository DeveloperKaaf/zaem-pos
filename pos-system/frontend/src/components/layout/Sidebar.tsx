"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  FileText,
  History,
  LogOut,
  Users,
  Wallet,
  ShieldCheck,
  UtensilsCrossed,
  Calculator,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const menuItems = [
    { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'شاشة الكاشير', href: '/invoices', icon: Wallet, show: true },
    { name: 'تقفيل الشفت', href: '/shift', icon: Calculator, show: true },
    { name: 'منيو البوفيه', href: '/menu', icon: UtensilsCrossed, show: true },
    { name: 'المصروفات', href: '/expenses', icon: Receipt, show: isAdmin },
    { name: 'سجل العمليات', href: '/history', icon: History, show: isAdmin },
    { name: 'التقارير المالية', href: '/reports', icon: FileText, show: isAdmin },
    { name: 'إدارة الأجهزة', href: '/settings', icon: Settings, show: isAdmin },
    { name: 'الموظفين', href: '/users', icon: Users, show: user?.role === 'ADMIN' },
  ];

  return (
    <div className="flex flex-col h-screen w-72 bg-slate-950 text-white shadow-2xl border-l border-slate-800" dir="rtl">
      <div className="p-8 border-b border-slate-900 bg-slate-900/50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
                <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tighter text-white">الزعيم POS</h1>
                <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">نظام الإدارة المتكامل</p>
            </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (!item.show) return null;
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-4 text-sm font-bold rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className={cn("ml-3 h-6 w-6 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-900 bg-slate-900/30">
        <div className="mb-4 flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center font-black text-white">
                {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-black truncate">{user?.name || 'مستخدم'}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{user?.role === 'ADMIN' ? 'مدير عام' : 'كاشير'}</p>
            </div>
        </div>
        <button
          onClick={() => { localStorage.clear(); window.location.href='/login'; }}
          className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-400 rounded-xl hover:bg-red-950/30 transition-colors border border-transparent hover:border-red-900/50"
        >
          <LogOut className="ml-3 h-5 w-5" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
