"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/dashboard/TableCard";
import { io } from "socket.io-client";
import { Activity, Gamepad2, Laptop, Trophy, Target, LayoutGrid, Zap, Maximize, Minimize, PlayCircle } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [resources, setResources] = useState([]);
  const [availableStats, setAvailableStats] = useState<Record<string, number>>({});
  const [activeCount, setActiveCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShiftStarted, setIsShiftStarted] = useState(false);
  const router = useRouter();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    const shiftStatus = localStorage.getItem('shiftStarted');
    const shiftUser = localStorage.getItem('shiftUser');

    // Check if shift is started AND it belongs to the current user
    if (shiftStatus === 'true' && shiftUser === user?.id) {
      setIsShiftStarted(true);
    } else {
      setIsShiftStarted(false);
    }

    fetchResources();
    const socket = io(API_BASE_URL, { transports: ['websocket'], upgrade: false });
    socket.on('sessionUpdate', () => fetchResources());

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      socket.disconnect();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [fetchResources]);

  const startShift = () => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    localStorage.setItem('shiftStarted', 'true');
    if (user?.id) {
        localStorage.setItem('shiftUser', user.id);
    }
    setIsShiftStarted(true);
  };

  const groupedResources = useMemo(() => {
    const groups: Record<string, any[]> = {};
    resources.forEach((resource: any) => {
      const type = resource.type || "أخرى";
      if (!groups[type]) groups[type] = [];
      groups[type].push(resource);
    });
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, any[]>);
  }, [resources]);

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('بلاي ستيشن')) return <Gamepad2 className="h-6 w-6 text-blue-600" />;
    if (t.includes('بلياردو')) return <Target className="h-6 w-6 text-emerald-600" />;
    if (t.includes('تنس طاولة')) return <Trophy className="h-6 w-6 text-orange-600" />;
    if (t.includes('فرفيرة') || t.includes('فرفيره')) return <Zap className="h-6 w-6 text-purple-600" />;
    return <Laptop className="h-6 w-6 text-indigo-600" />;
  };

  return (
    <div className="p-6 space-y-10 bg-slate-50 min-h-screen relative" dir="rtl">
      {!isShiftStarted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <Card className="w-full max-w-md p-8 text-center space-y-6">
            <PlayCircle className="w-20 h-20 text-blue-500 mx-auto animate-pulse" />
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-800">بدء وردية جديدة</h2>
              <p className="text-slate-500 font-bold">يجب بدء الشفت لتتمكن من تشغيل الأجهزة والتحكم</p>
            </div>
            <Button onClick={startShift} className="w-full h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20">
              بدء الشفت الآن
            </Button>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-black text-slate-800">لوحة التحكم - مركز زعيم الكرة للترفية</h1>
        <div className="flex items-center gap-4">
          <Button
            onClick={toggleFullscreen}
            variant="outline"
            className="flex items-center gap-2 font-bold border-2 hover:bg-slate-100 transition-all"
          >
            {isFullscreen ? (
              <><Minimize className="h-5 w-5" /> خروج من الشاشة الكاملة</>
            ) : (
              <><Maximize className="h-5 w-5" /> ملء الشاشة</>
            )}
          </Button>
          <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm">
            تحديث مباشر <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-ping mr-1"></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="الجلسات النشطة" value={activeCount} icon={<Activity className="text-red-600" />} color="border-red-500" />
        {Object.entries(availableStats).map(([type, count]) => (
          <StatCard key={type} title={`متوفر: ${type}`} value={count} icon={getIcon(type)} color="border-emerald-500" />
        ))}
      </div>

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
