"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCard } from "@/components/dashboard/TableCard";
import { io } from "socket.io-client";
import { Activity, Gamepad2, Laptop, Trophy, Target } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export default function Dashboard() {
  const [resources, setResources] = useState([]);
  const [availableStats, setAvailableStats] = useState<Record<string, number>>({});
  const [activeCount, setActiveCount] = useState(0);
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

      // حساب الإحصائيات للأصناف المتاحة
      const stats: Record<string, number> = {};
      let active = 0;
      data.forEach((r: any) => {
        if (!stats[r.type]) stats[r.type] = 0;
        if (r.status === 'AVAILABLE') {
          stats[r.type] += 1;
        } else {
          active += 1;
        }
      });
      setAvailableStats(stats);
      setActiveCount(active);
    } catch (e) { console.error("Error fetching resources", e); }
  }, [router]);

  useEffect(() => {
    fetchResources();

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      upgrade: false
    });

    socket.on('sessionUpdate', () => {
      fetchResources();
    });

    return () => { socket.disconnect(); };
  }, [fetchResources]);

  // دالة لاختيار أيقونة بناءً على نوع الصنف
  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'بلاي ستيشن': return <Gamepad2 className="text-blue-600" />;
      case 'بلياردو': return <Target className="text-emerald-600" />;
      case 'تنس طاولة': return <Trophy className="text-orange-600" />;
      default: return <Laptop className="text-indigo-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-black text-slate-800">لوحة التحكم - مركز الزعيم</h1>
        <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm">
          تحديث مباشر <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-ping mr-1"></span>
        </div>
      </div>

      {/* بطاقات الأصناف المتاحة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="الجلسات النشطة" value={activeCount} icon={<Activity className="text-red-600" />} color="border-red-500" />

        {Object.entries(availableStats).map(([type, count]) => (
          <StatCard
            key={type}
            title={`متوفر: ${type}`}
            value={count}
            icon={getIcon(type)}
            color="border-emerald-500"
          />
        ))}
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
        <CardTitle className="text-xs font-black text-slate-500">{title}</CardTitle>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-slate-900">{value} جهاز</div>
      </CardContent>
    </Card>
  );
}
