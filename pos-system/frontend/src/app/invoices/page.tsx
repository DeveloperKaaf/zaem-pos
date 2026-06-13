"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Printer, RefreshCw, Clock, Timer, Wallet, AlertCircle } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

function ActiveSessionRow({ session }: { session: any }) {
  const [displayTime, setDisplayTime] = useState("");
  const [liveAmount, setLiveAmount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const start = new Date(session.startTime).getTime();
      const now = Date.now();

      if (session.durationMin > 0) {
        const end = start + session.durationMin * 60 * 1000;
        const diff = end - now;
        if (diff <= 0) {
          setDisplayTime("انتهى الوقت");
        } else {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setDisplayTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        }
      } else {
        const diff = now - start;
        const diffMin = Math.ceil(diff / 60000);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setDisplayTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        // افتراض سعر الساعة 30 ريال (0.5 ريال للدقيقة)
        setLiveAmount(diffMin * 0.5);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <TableRow className="hover:bg-slate-50 transition-all border-b">
      <TableCell className="font-black text-xl text-slate-800 py-4">{session.resourceName}</TableCell>
      <TableCell className="text-slate-400 font-bold">
        {new Date(session.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
      </TableCell>
      <TableCell>
        {session.durationMin === 0 ? (
          <div className="flex flex-col">
            <span className="text-emerald-600 font-black text-lg">{liveAmount.toFixed(2)} ريال</span>
            <span className="text-[10px] text-slate-400 font-bold tracking-tighter italic">حساب لحظي متراكم</span>
          </div>
        ) : (
          <Badge className="bg-blue-50 text-blue-700 border-blue-100 px-3 font-bold">مدفوع مسبقاً</Badge>
        )}
      </TableCell>
      <TableCell className="text-left">
        <div className="flex items-center gap-3 justify-end">
          <span className={`text-3xl font-mono font-black ${displayTime === "انتهى الوقت" ? "text-red-500 animate-bounce" : "text-slate-700"}`}>
            {displayTime}
          </span>
          <div className={`p-2 rounded-lg ${displayTime === "انتهى الوقت" ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}>
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function InvoicesPage() {
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      const invRes = await fetch(`${API_BASE_URL}/invoices/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const invData = await invRes.json();
      setPendingInvoices(Array.isArray(invData) ? invData : []);

      const resRes = await fetch(`${API_BASE_URL}/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await resRes.json();
      const active = (Array.isArray(resData) ? resData : []).flatMap((r: any) =>
        (r.sessions || []).filter((s: any) => s.status === 'ACTIVE').map((s: any) => ({...s, resourceName: r.name}))
      );
      setActiveSessions(active);
    } catch (err) {
      console.error("Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePay = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) { alert('انتهت صلاحية الجلسة'); router.push('/login'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        alert('✅ تم تحصيل المبلغ وإغلاق الفاتورة بنجاح');
        fetchData(); // تحديث القائمة فوراً
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`❌ فشل التحصيل: ${data.message || 'خطأ غير معروف في السيرفر'}`);
      }
    } catch (e) {
      alert('⚠️ خطأ في الاتصال بالسيرفر، تأكد من أنك أونلاين');
    }
  };

  const printInvoice = (inv: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة - ${inv.session.resource.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; text-align: center; color: #333; }
            .header { border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
            .details { text-align: right; margin-bottom: 30px; font-size: 14px; }
            .total { font-size: 28px; font-weight: 900; border-top: 2px solid #000; padding-top: 15px; margin-top: 20px; color: #059669; }
            .footer { margin-top: 50px; font-size: 12px; color: #999; border-top: 1px dashed #ccc; padding-top: 10px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <h1 style="margin:0">مركز الزعيم POS</h1>
            <p style="margin:5px 0">فاتورة ضريبية مبسطة</p>
          </div>
          <div class="details">
            <p>رقم الفاتورة: <strong>#INV-${inv.id}</strong></p>
            <p>الجهاز/الطاولة: <strong>${inv.session.resource.name}</strong></p>
            <p>التاريخ: ${new Date(inv.createdAt).toLocaleString('ar-SA')}</p>
            <p>الموظف المسؤول: ${inv.session.user?.name || 'مدير النظام'}</p>
          </div>
          <div class="total">
             الإجمالي: ${inv.totalAmount.toFixed(2)} ريال
          </div>
          <div class="footer">
            شكراً لثقتكم بنا! <br> المبالغ المدفوعة غير مستردة.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-end border-b pb-6 border-slate-200">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">الرقابة والتحصيل</h1>
          <p className="text-slate-500 font-bold mt-1 text-xs tracking-widest">إدارة العمليات المالية والزمنية</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="h-12 px-6 font-bold shadow-sm bg-white">
          <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="shadow-xl border-none overflow-hidden bg-white">
          <CardHeader className="border-b p-6 bg-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-800">
                <Timer className="h-8 w-8 text-blue-600" /> الجلسات النشطة حالياً
              </CardTitle>
              <Badge className="bg-blue-600 text-white px-4 py-1 text-sm font-black animate-pulse">{activeSessions.length} أجهزة تعمل</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-black text-slate-500 text-right">الجهاز</TableHead>
                  <TableHead className="font-black text-slate-500 text-right">وقت البدء</TableHead>
                  <TableHead className="font-black text-slate-500 text-right">الحساب</TableHead>
                  <TableHead className="font-black text-slate-500 text-left px-6">العداد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.length > 0 ? activeSessions.map((s: any) => (
                  <ActiveSessionRow key={s.id} session={s} />
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400 font-bold italic">لا توجد جلسات مفتوحة حالياً</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-2xl border-none overflow-hidden bg-white border-t-8 border-t-emerald-500">
          <CardHeader className="bg-emerald-50 p-6 border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl font-black text-emerald-900">
                <Wallet className="h-8 w-8 text-emerald-600" /> فواتير بانتظار التحصيل
              </CardTitle>
              <Badge className="bg-emerald-600 text-white font-black px-4">{pendingInvoices.length} عملاء غادروا</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-black text-right">رقم الفاتورة</TableHead>
                  <TableHead className="font-black text-right">الجهاز</TableHead>
                  <TableHead className="font-black text-center text-lg">المبلغ المطلوب</TableHead>
                  <TableHead className="font-black text-left px-6">الإجراء المالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.length > 0 ? pendingInvoices.map((inv: any) => (
                  <TableRow key={inv.id} className="hover:bg-emerald-50/30 transition-colors border-b">
                    <TableCell className="font-mono font-bold text-slate-400 text-sm">#INV-{inv.id}</TableCell>
                    <TableCell className="font-black text-xl text-slate-700 text-right">{inv.session.resource.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-3xl font-black text-emerald-700 bg-emerald-50 px-6 py-2 rounded-2xl border-2 border-emerald-200 inline-block shadow-sm">
                        {inv.totalAmount.toFixed(2)} <span className="text-sm">ريال</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-left space-x-3 space-x-reverse flex justify-end p-6">
                      <Button variant="outline" className="h-14 w-14 border-slate-200 hover:bg-slate-50 shadow-sm" onClick={() => printInvoice(inv)}>
                        <Printer className="h-6 w-6 text-slate-500" />
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 h-14 px-10 font-black text-xl shadow-lg hover:translate-y-[-2px] transition-all"
                        onClick={() => handlePay(inv.id)}
                      >
                        تم استلام المبلغ
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-300 italic font-bold">كل الفواتير محصلة ✅</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
