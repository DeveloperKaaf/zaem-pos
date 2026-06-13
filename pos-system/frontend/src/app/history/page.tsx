"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export default function HistoryPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'START_SESSION': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">بدء جلسة</Badge>;
      case 'STOP_SESSION': return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold">إنهاء جلسة</Badge>;
      case 'INVOICE_PAID': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold">تحصيل مبلغ</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <h1 className="text-4xl font-black text-slate-900 tracking-tight">سجل العمليات الميدانية</h1>
      <Card className="shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table dir="rtl">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-black text-slate-600">التاريخ والوقت</TableHead>
                <TableHead className="font-black text-slate-600">الموظف</TableHead>
                <TableHead className="font-black text-slate-600">العملية</TableHead>
                <TableHead className="font-black text-slate-600">التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow><TableCell colSpan={4} className="text-center py-20 animate-pulse font-bold text-slate-400">جاري تحميل السجل...</TableCell></TableRow>
              ) : logs.map((log: any) => (
                <TableRow key={log.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <TableCell className="font-mono text-xs text-slate-500 font-bold">
                    {format(new Date(log.timestamp), 'yyyy/MM/dd | hh:mm a', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-slate-700">{log.user?.name || 'النظام'}</div>
                    <div className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">{log.user?.role}</div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="text-sm font-bold text-slate-600">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
