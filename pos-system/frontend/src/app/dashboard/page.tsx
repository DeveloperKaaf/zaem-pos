"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCard } from "@/components/dashboard/TableCard";
import { io } from "socket.io-client";
import { Activity, Gamepad2, Laptop, Trophy, Target, LayoutGrid, Zap } from "lucide-react";
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
      setResources(Array.isArray(data) ? data : []);

      // حساب الإحصائيات للأصناف المتاحة
      const stats: Record<string, number> = {};
      let active = 0;
      (Array.isArray(data) ? data : []).forEach((r: any) => {
        const type = r.type || "أخرى";
        if (!stats[type]) stats[type] = 0;
        if (r.status === 'AVAILABLE') {
          stats[type] += 1;
        } else {
          active += 1;
        }
      });
      setAvailableStats(stats);
      setActiveCount(active);
    } catch (e) { console.error("Error fetching resources", e); }
  }, [router]);

  // تجميع الأجهزة حسب النوع في صفوف مستقلة
  const groupedResources = useMemo(() => {
    const groups: Record<string, any[]> = {};
    resources.forEach((resource: any) => {
      const type = resource.type || "أخرى";
      if (!groups[type]) groups[type] = [];
      groups[type].push(resource);
    });
    // ترتيب المجموعات لضمان بقاء الواجهة منظمة
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, any[]>);
  }, [resources]);

  useEffect(() => {
    fetchResources();
    const socket = io(API_BASE_URL, { transports: ['websocket'], upgrade: false });
    socket.on('sessionUpdate', () => fetchResources());
    return () => { socket.disconnect(); };
  }, [fetchResources]);

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('بلاي ستيشن')) return <Gamepad2 className="h-6 w-6 text-blue-600" />;
    if (t.includes('بلياردو')) return <Target className="h-6 w-6 text-emerald-600" />;
    if (t.includes('تنس طاولة')) return <Trophy className="h-6 w-6 text-orange-600" />;
    if (t.includes('فرفيرة') || t.includes('فرفيره')) return <Zap className="h-6 w-6 text-purple-600" />;
    return <Laptop className="h-6 w-6 text-indigo-600" />;
  };

  return (
    <div className="p-6 space-y-10 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-black text-slate-800">لوحة التحكم - مركز الزعيم</h1>
        <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm">
          تحديث مباشر <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-ping mr-1"></span>
        </div>
      </div>

      {/* بطاقات الملخص العلوي */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="الجلسات النشطة" value={activeCount} icon={<Activity className="text-red-600" />} color="border-red-500" />
        {Object.entries(availableStats).map(([type, count]) => (
          <StatCard key={type} title={`متوفر: ${type}`} value={count} icon={getIcon(type)} color="border-emerald-500" />
        ))}
      </div>

      {/* عرض الأجهزة مقسمة حسب النوع (كل نوع في صف مستقل) */}
      <div className="space-y-12 pb-20">
        {Object.entries(groupedResources).map(([type, items]) => (
          <section key={type} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200">
                {getIcon(type)}
              </div>
              <h2 className="text-2xl font-black text-slate-800">{type}</h2>
              <div className="flex-grow h-px bg-slate-200 mr-4"></div>
              <Badge variant="outline" className="text-slate-500 font-bold border-slate-200">
                عدد الأجهزة: {items.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((resource: any) => (
                <TableCard key={resource.id} resource={resource} onUpdate={fetchResources} />
              ))}
            </div>
          </section>
        ))}

        {resources.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <LayoutGrid className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">لم يتم العثور على أجهزة مضافة</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: any; icon: React.ReactNode; color: string }) {
  return (
    <Card className={`shadow-sm border-r-4 ${color} bg-white`}>
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
