"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCard } from "@/components/dashboard/TableCard";
import { io } from "socket.io-client";
import { Activity, DollarSign, Gamepad2, TrendingUp } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export default function Dashboard() {
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState({
    activeSessions: 0,
    dailyRevenue: 0,
    monthlyRevenue: 0,
    typeStats: {} as Record<string, number>
  });
  const router = useRouter();

  const fetchResources = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setResources(data);
    } catch (e) { console.error("Error fetching resources", e); }
  }, [router]);

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/resources/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      const typeStats: Record<string, number> = {};
      resources.forEach((r: any) => {
        const typeLabel = r.type;
        if (!typeStats[typeLabel]) typeStats[typeLabel] = 0;
        if (r.status === 'OCCUPIED') {
          typeStats[typeLabel] += 1;
        }
      });

      setStats({
        activeSessions: data.activeSessions || 0,
        dailyRevenue: data.dailyRevenue || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        typeStats
      });
    } catch (e) { console.error("Error fetching stats", e); }
  }, [resources]);

  useEffect(() => {
    fetchResources();
    fetchStats();

    const socket = io(API_BASE_URL);
    socket.on('sessionUpdate', () => {
      fetchResources();
    });

    return () => { socket.disconnect(); };
  }, [fetchResources, fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [resources, fetchStats]);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-black text-slate-800">لوحة التحكم - مركز الزعيم</h1>
        <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm">
          تحديث مباشر <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-ping mr-1"></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="الجلسات النشطة" value={stats.activeSessions} icon={<Activity className="text-blue-600" />} color="border-blue-500" />
        <StatCard title="إيراد اليوم" value={`${stats.dailyRevenue.toFixed(2)} ريال`} icon={<DollarSign className="text-emerald-600" />} color="border-emerald-500" />
        <StatCard title="إيراد الشهر" value={`${stats.monthlyRevenue.toFixed(2)} ريال`} icon={<TrendingUp className="text-indigo-600" />} color="border-indigo-500" />
        <StatCard title="الأصناف" value={Object.keys(stats.typeStats).length} icon={<Gamepad2 className="text-orange-600" />} color="border-orange-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {resources.map((resource: any) => (
          <TableCard key={resource.id} resource={resource} onUpdate={fetchResources} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: any; icon: React.ReactNode; color: string }) {
  return (
    <Card className={`shadow-md border-r-4 ${color} bg-white`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-black text-slate-500">{title}</CardTitle>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}
