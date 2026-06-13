"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { CheckCircle, Printer, RefreshCw, Clock, Timer, Wallet, PlusCircle, Square, CreditCard, Landmark } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";
import { io } from "socket.io-client";

// --- مكون العداد الحي ---
function ActiveSessionRow({ session, onExtend, onStop }: { session: any, onExtend: (s: any) => void, onStop: (s: any) => void }) {
  const [displayTime, setDisplayTime] = useState("");
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const start = new Date(session.startTime).getTime();
      const now = Date.now();

      if (session.durationMin > 0) {
        const end = start + session.durationMin * 60 * 1000;
        const diff = end - now;

        if (diff <= 0) {
          setDisplayTime("انتهى الوقت");
          setIsWarning(false);
        } else {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setDisplayTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
          if (diff <= 5 * 60 * 1000) setIsWarning(true);
        }
      } else {
        const diff = now - start;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setDisplayTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <TableRow className={`hover:bg-slate-50 transition-all border-b ${isWarning ? "bg-amber-50 animate-pulse" : ""}`}>
      <TableCell className="font-black text-xl text-slate-800 py-4">{session.resourceName}</TableCell>
      <TableCell className="text-slate-400 font-bold">
        {new Date(session.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
      </TableCell>
      <TableCell>
        {session.durationMin === 0 ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold px-3 italic">وقت مفتوح</Badge>
        ) : (
          <Badge className="bg-blue-50 text-blue-700 border-blue-100 px-3 font-bold">محدد: {session.durationMin} د</Badge>
        )}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center gap-3 justify-center">
          <span className={`text-4xl font-mono font-black ${displayTime === "انتهى الوقت" ? "text-red-500 animate-bounce" : isWarning ? "text-amber-600" : "text-slate-700"}`}>
            {displayTime}
          </span>
          <Clock className={`h-6 w-6 ${isWarning ? "text-amber-500" : "text-blue-500"}`} />
        </div>
      </TableCell>
      <TableCell className="text-left space-x-2 space-x-reverse py-4 pr-6">
          <Button variant="outline" className="font-bold border-blue-200 text-blue-700 hover:bg-blue-50 h-12" onClick={() => onExtend(session)}>
            <PlusCircle className="ml-1 h-5 w-5" /> تمديد
          </Button>
          <Button variant="destructive" className="font-bold h-12" onClick={() => onStop(session)}>
            <Square className="ml-1 h-5 w-5" /> إيقاف
          </Button>
      </TableCell>
    </TableRow>
  );
}

export default function InvoicesPage() {
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExtend, setShowExtend] = useState(false);
  const [showExtendPayment, setShowExtendPayment] = useState(false);
  const [showInvoicePayment, setShowInvoicePayment] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedExtendPrice, setSelectedExtendPrice] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

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
        (r.sessions || []).filter((s: any) => s.status === 'ACTIVE').map((s: any) => ({
          ...s,
          resourceName: r.name,
          prices: r.prices
        }))
      );
      setActiveSessions(active);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const socket = io(API_BASE_URL, { transports: ['websocket'], upgrade: false });
    socket.on('sessionUpdate', () => fetchData());
    return () => { socket.disconnect(); };
  }, [fetchData]);

  const handlePay = async (id: number, paymentMethod: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ paymentMethod })
    });
    if (res.ok) {
      setShowInvoicePayment(false);
      fetchData();
    }
  };

  const handleStopSession = async (session: any) => {
    if (!confirm(`هل تريد إنهاء وقت ${session.resourceName}؟ سيتم إصدار الفاتورة فوراً.`)) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/stop/${session.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) { alert("خطأ في الاتصال"); }
  };

  const handleFinalExtend = async (paymentMethod: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          extraMin: selectedExtendPrice.durationMin,
          paymentMethod
        })
      });
      if (res.ok) {
        setShowExtendPayment(false);
        setShowExtend(false);
        fetchData();
      }
    } catch (e) { alert("خطأ في التمديد"); }
  };

  const printInvoice = (inv: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة - ${inv.session.resource.name}</title>
          <style>
            body { font-family: Arial; padding: 20px; text-align: center; line-height: 1.6; }
            .header { border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
            .total { font-size: 28px; font-weight: bold; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px; }
            .detail { font-size: 16px; margin: 10px 0; }
            .payment-badge { background: #eee; padding: 5px 15px; border-radius: 5px; font-weight: bold; margin-top: 10px; display: inline-block; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <h1>مركز زعيم الكرة للترفية</h1>
            <p>فاتورة رقم #${inv.id}</p>
            <p>تاريخ: ${new Date().toLocaleString('ar-SA')}</p>
          </div>
          <div class="detail">الجهاز: <strong>${inv.session.resource.name}</strong></div>
          <div class="detail">وقت اللعب: ${inv.timeAmount.toFixed(2)} ريال</div>
          <div class="detail">الطلبات (كوفي): ${inv.itemsAmount.toFixed(2)} ريال</div>
          <div class="total">المبلغ الإجمالي: ${inv.totalAmount.toFixed(2)} ريال</div>
          <div class="payment-badge">طريقة الدفع: ${inv.paymentMethod === 'NET' ? 'شبكة 💳' : 'كاش 💵'}</div>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">شكراً لزيارتكم</p>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center border-b pb-6">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">شاشة المتابعة والعمليات</h1>
        <Button onClick={fetchData} variant="outline" className="h-12 px-6 font-bold shadow-sm bg-white">
          <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="shadow-2xl border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="flex items-center gap-3 text-2xl font-black">
              <Timer className="h-8 w-8 text-blue-400" /> الجلسات النشطة (العدادات الحية)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-right">الجهاز/الغرفة</TableHead>
                  <TableHead className="font-black text-right">وقت البدء</TableHead>
                  <TableHead className="font-black text-right">طريقة الوقت</TableHead>
                  <TableHead className="font-black text-center">العداد (حي)</TableHead>
                  <TableHead className="font-black text-left px-6">التحكم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.length > 0 ? activeSessions.map((s: any) => (
                  <ActiveSessionRow
                    key={s.id}
                    session={s}
                    onExtend={(sess) => { setSelectedSession(sess); setShowExtend(true); }}
                    onStop={handleStopSession}
                  />
                )) : (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 font-bold italic">لا توجد جلسات تعمل حالياً</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-2xl border-none overflow-hidden border-t-8 border-t-emerald-500 bg-white">
          <CardHeader className="bg-emerald-50 p-6 border-b">
            <CardTitle className="flex items-center gap-3 text-2xl font-black text-emerald-900">
              <Wallet className="h-8 w-8 text-emerald-600" /> مبالغ بانتظار التحصيل
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {pendingInvoices.length > 0 ? pendingInvoices.map((inv: any) => (
                  <TableRow key={inv.id} className="hover:bg-emerald-50/30 transition-colors border-b">
                    <TableCell className="font-black text-2xl text-slate-700 py-6 pr-6">{inv.session.resource.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-4xl font-black text-emerald-700 bg-emerald-100/50 px-8 py-3 rounded-2xl border-2 border-emerald-200 shadow-sm inline-block">
                        {inv.totalAmount.toFixed(2)} <span className="text-xl">ريال</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-left space-x-3 space-x-reverse flex justify-end p-6">
                      <Button variant="outline" className="h-14 w-14 border-slate-200 shadow-sm" onClick={() => printInvoice(inv)}>
                        <Printer className="h-6 w-6 text-slate-500" />
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 h-14 px-12 font-black text-xl shadow-lg transition-all active:scale-95"
                        onClick={() => { setSelectedInvoice(inv); setShowInvoicePayment(true); }}
                      >
                        تأكيد الدفع
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center py-20 text-slate-300 italic font-bold">لا يوجد مبالغ للتحصيل حالياً ✅</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* حوار اختيار مدة التمديد */}
      <Dialog open={showExtend} onOpenChange={setShowExtend}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">تمديد وقت {selectedSession?.resourceName}</DialogTitle>
            <DialogDescription>اختر المدة التي تريد إضافتها للجلسة الحالية.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-6">
            {selectedSession?.prices?.filter((p:any) => p.durationMin > 0).map((p: any) => (
              <Button key={p.id} variant="outline" className="h-16 text-xl font-black hover:border-blue-500 hover:bg-blue-50" onClick={() => { setSelectedExtendPrice(p); setShowExtendPayment(true); }}>
                +{p.durationMin} دقيقة
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowExtend(false)} className="w-full h-12 font-bold">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الدفع للتمديد */}
      <Dialog open={showExtendPayment} onOpenChange={setShowExtendPayment}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-800">تأكيد دفع مبلغ التمديد</DialogTitle>
            <DialogDescription>سيتم إضافة {selectedExtendPrice?.durationMin} دقيقة لـ {selectedSession?.resourceName}.</DialogDescription>
          </DialogHeader>
          <div className="py-10 text-center">
            <p className="text-slate-500 font-bold">مبلغ التمديد المطلوب:</p>
            <div className="text-7xl font-black text-slate-900 mt-2">
              {selectedExtendPrice?.price} <span className="text-2xl">ريال</span>
            </div>
          </div>
          <DialogFooter className="gap-3 flex-row">
            <Button onClick={() => handleFinalExtend('CASH')} className="flex-1 h-20 text-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg flex flex-col gap-1">
              <Wallet className="h-8 w-8" />
              كاش
            </Button>
            <Button onClick={() => handleFinalExtend('NET')} className="flex-1 h-20 text-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg flex flex-col gap-1">
              <Landmark className="h-8 w-8" />
              شبكة
            </Button>
          </DialogFooter>
          <Button variant="ghost" onClick={() => setShowExtendPayment(false)} className="w-full mt-2">إلغاء</Button>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الدفع للفاتورة المعلقة */}
      <Dialog open={showInvoicePayment} onOpenChange={setShowInvoicePayment}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-emerald-800">تأكيد الدفع</DialogTitle>
            <DialogDescription>تحصيل مبلغ الفاتورة لـ {selectedInvoice?.session?.resource?.name}.</DialogDescription>
          </DialogHeader>
          <div className="py-10 text-center">
            <p className="text-slate-500 font-bold">المبلغ المطلوب:</p>
            <div className="text-7xl font-black text-emerald-700 mt-2">
              {selectedInvoice?.totalAmount.toFixed(2)} <span className="text-2xl">ريال</span>
            </div>
          </div>
          <DialogFooter className="gap-3 flex-row">
            <Button onClick={() => handlePay(selectedInvoice.id, 'CASH')} className="flex-1 h-20 text-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg flex flex-col gap-1">
              <Wallet className="h-8 w-8" />
              كاش
            </Button>
            <Button onClick={() => handlePay(selectedInvoice.id, 'NET')} className="flex-1 h-20 text-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg flex flex-col gap-1">
              <Landmark className="h-8 w-8" />
              شبكة
            </Button>
          </DialogFooter>
          <Button variant="ghost" onClick={() => setShowInvoicePayment(false)} className="w-full mt-2">إلغاء</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
