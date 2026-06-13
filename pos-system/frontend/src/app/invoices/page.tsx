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
        setLiveAmount(diffMin * 0.5);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <TableRow className="hover:bg-slate-50 transition-all">
      <TableCell className="font-black text-xl text-slate-800">{session.resourceName}</TableCell>
      <TableCell className="text-slate-400 font-bold">
        {new Date(session.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
      </TableCell>
      <TableCell>
        {session.durationMin === 0 ? (
          <div className="flex flex-col">
            <span className="text-emerald-600 font-black text-lg">{liveAmount.toFixed(2)} ريال</span>
            <span className="text-[10px] text-slate-400 font-bold">حساب لحظي (0.5 ر/د)</span>
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
      const active = resData.flatMap((r: any) =>
        r.sessions.filter((s: any) => s.status === 'ACTIVE').map((s: any) => ({...s, resourceName: r.name}))
      );
      setActiveSessions(active);
    } catch (err) {
      console.error(err);
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
    try {
      await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const printInvoice = (inv: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة - ${inv.session.resource.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .details { text-align: right; margin-bottom: 30px; }
            .total { font-size: 24px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
            .footer { margin-top: 50px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>مركز الزعيم للترفيه</h1>
            <p>رقم الفاتورة: #${inv.id}</p>
          </div>
          <div class="details">
            <p>الجهاز: <strong>${inv.session.resource.name}</strong></p>
            <p>التاريخ: ${new Date(inv.createdAt).toLocaleString('ar-SA')}</p>
            <p>طريقة الوقت: ${inv.session.durationMin > 0 ? inv.session.durationMin + ' دقيقة' : 'وقت مفتوح'}</p>
          </div>
          <div class="total">
            المبلغ الإجمالي: ${inv.totalAmount.toFixed(2)} ريال
          </div>
          <div class="footer">
            شكراً لزيارتكم! نتمنى لكم يوماً سعيداً.
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
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">الرقابة والمتابعة</h1>
          <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest italic">Zaem Entertainment POS v1.0</p>
        </div>
        <Button onClick={fetchData} className="bg-white text-slate-700 hover:bg-slate-100 border-2 border-slate-200 font-bold px-6 shadow-sm h-12">
          <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="shadow-xl border-none overflow-hidden">
          <CardHeader className="bg-white border-b p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-800">
                <Timer className="h-8 w-8 text-blue-600" /> متابعة الجلسات الحالية
              </CardTitle>
              <Badge className="bg-blue-600 text-white px-4 py-1 text-sm font-black">{activeSessions.length} نشط</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 text-right">
                <TableRow>
                  <TableHead className="font-black text-slate-500 text-right">الجهاز / الطاولة</TableHead>
                  <TableHead className="font-black text-slate-500 text-right">وقت البدء</TableHead>
                  <TableHead className="font-black text-slate-500 text-right">الحساب المالي</TableHead>
                  <TableHead className="font-black text-slate-500 text-left">العداد الحي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.length > 0 ? activeSessions.map((s: any) => (
                  <ActiveSessionRow key={s.id} session={s} />
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-300 italic">لا يوجد عملاء حالياً</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-none overflow-hidden">
          <CardHeader className="bg-emerald-600 text-white p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl font-black">
                <Wallet className="h-8 w-8 text-emerald-200" /> تحصيل مبالغ المغادرة
              </CardTitle>
              <Badge className="bg-emerald-800 text-white font-black">{pendingInvoices.length} فواتير</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-right">رقم الفاتورة</TableHead>
                  <TableHead className="font-black text-right">الجهاز</TableHead>
                  <TableHead className="font-black text-center text-lg">المبلغ النهائي</TableHead>
                  <TableHead className="font-black text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.length > 0 ? pendingInvoices.map((inv: any) => (
                  <TableRow key={inv.id} className="hover:bg-emerald-50/50 border-b border-slate-100">
                    <TableCell className="font-mono font-bold text-slate-400">#{inv.id}</TableCell>
                    <TableCell className="font-black text-xl text-slate-700 text-right">{inv.session.resource.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-3xl font-black text-emerald-600 bg-white px-6 py-2 rounded-2xl border-2 border-emerald-100 shadow-sm inline-block">
                        {inv.totalAmount.toFixed(2)} ريال
                      </span>
                    </TableCell>
                    <TableCell className="text-left space-x-3 space-x-reverse flex justify-end p-4">
                      <Button variant="outline" className="h-12 w-12 border-slate-200" onClick={() => printInvoice(inv)}>
                        <Printer className="h-5 w-5 text-slate-500" />
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8 font-black text-lg shadow-lg"
                        onClick={() => handlePay(inv.id)}
                      >
                        تحصيل وإغلاق
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-300 italic">لا يوجد مبالغ بانتظار التحصيل</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
