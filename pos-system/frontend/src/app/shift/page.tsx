"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Lock, RefreshCw, Calculator, DollarSign, Wallet } from "lucide-react";
import { useRouter } from 'next/navigation';
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { API_BASE_URL } from "@/config";

export default function ShiftPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchShiftData = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/reports/shift`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { router.push('/login'); return; }
      const report = await res.json();
      setData(report);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchShiftData(); }, []);

  const handlePrintAndClose = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !data) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>تقرير تقفيل الشفت - ${data.cashierName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; }
            .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #ccc; }
            .total { font-size: 24px; font-weight: bold; margin-top: 20px; text-align: center; background: #eee; padding: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>مركز الزعيم للترفيه</h1>
            <h2>تقرير تسليم عهدة (تقفيل شفت)</h2>
            <p>تاريخ التقرير: ${format(new Date(), 'PPP p', { locale: ar })}</p>
          </div>
          <div class="stat-row"><span>اسم الموظف:</span> <strong>${data.cashierName}</strong></div>
          <div class="stat-row"><span>عدد الفواتير المحصلة:</span> <strong>${data.ordersCount}</strong></div>
          <div class="stat-row"><span>إجمالي دخل الألعاب:</span> <strong>${data.timeTotal?.toFixed(2)} ريال</strong></div>
          <div class="stat-row"><span>إجمالي دخل البوفيه:</span> <strong>${data.itemsTotal?.toFixed(2)} ريال</strong></div>
          <div class="total">المبلغ الإجمالي للتسليم: ${data.grandTotal?.toFixed(2)} ريال</div>

          <h3>تفاصيل الفواتير:</h3>
          <table>
            <thead>
              <tr><th>رقم الفاتورة</th><th>الجهاز</th><th>المبلغ</th><th>الوقت</th></tr>
            </thead>
            <tbody>
              ${data.invoices?.map((inv: any) => `
                <tr>
                  <td>#${inv.id}</td>
                  <td>${inv.resource}</td>
                  <td>${inv.amount?.toFixed(2)} ريال</td>
                  <td>${format(new Date(inv.date), 'hh:mm a', { locale: ar })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">توقيع المستلم: ............................</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-2xl text-slate-400">جاري مراجعة الحسابات المالية...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">تقفيل الشفت والعهدة</h1>
          <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">Shift Closure & Fund Transfer</p>
        </div>
        <Button onClick={fetchShiftData} variant="outline" className="bg-white border-2 border-slate-200 font-bold h-12 px-6">
          <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-2xl border-none bg-slate-900 text-white overflow-hidden transform transition-all hover:scale-[1.01]">
            <CardHeader className="border-b border-white/10 p-6 bg-slate-800/50">
              <CardTitle className="flex items-center gap-3 text-blue-400 text-xl">
                <Calculator className="h-6 w-6" /> ملخص العهدة النقدية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <span className="text-slate-400 font-bold">دخل الألعاب:</span>
                <span className="text-2xl font-black text-white">{data?.timeTotal?.toFixed(2)} ريال</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <span className="text-slate-400 font-bold">دخل البوفيه:</span>
                <span className="text-2xl font-black text-emerald-400">{data?.itemsTotal?.toFixed(2)} ريال</span>
              </div>
              <div className="pt-8 border-t border-white/10 mt-4">
                <p className="text-center text-blue-300 text-sm font-black uppercase mb-3 tracking-widest">إجمالي المبلغ للتسليم</p>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-inner border border-white/20">
                    <h2 className="text-6xl font-black text-center text-white tracking-tighter">
                        {data?.grandTotal?.toFixed(2)} <span className="text-xl">ريال</span>
                    </h2>
                </div>
              </div>
              <Button onClick={handlePrintAndClose} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-xl font-black mt-6 shadow-2xl shadow-blue-900/50 rounded-2xl transition-all active:scale-95">
                <Printer className="ml-2 h-7 w-7" /> طباعة تقرير التسليم
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none bg-white p-2">
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black">
                        {data?.cashierName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">أمين الصندوق الحالي</p>
                        <p className="text-lg font-black text-slate-800 leading-none">{data?.cashierName}</p>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2 shadow-2xl border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Wallet className="h-8 w-8 text-blue-600" /> كشف مبيعات الشفت
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-black text-slate-500 text-lg">رقم الفاتورة</TableHead>
                  <TableHead className="font-black text-slate-500 text-lg">البند / الجهاز</TableHead>
                  <TableHead className="font-black text-slate-500 text-lg text-center">المبلغ المستلم</TableHead>
                  <TableHead className="font-black text-slate-500 text-lg text-left">الوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.invoices?.map((inv: any) => (
                  <TableRow key={inv.id} className="hover:bg-blue-50/30 border-b border-slate-100 transition-colors">
                    <TableCell className="font-mono font-black text-slate-300 text-lg">#{inv.id}</TableCell>
                    <TableCell className="font-black text-slate-800 text-xl">{inv.resource}</TableCell>
                    <TableCell className="text-center">
                        <span className="font-black text-emerald-600 text-2xl bg-emerald-50 px-4 py-1 rounded-xl border border-emerald-100">
                            {inv.amount?.toFixed(2)} ريال
                        </span>
                    </TableCell>
                    <TableCell className="text-left text-slate-400 font-black text-sm uppercase">
                        {format(new Date(inv.date), 'hh:mm a', { locale: ar })}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.invoices || data.invoices.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-32">
                            <div className="flex flex-col items-center gap-4 opacity-10">
                                <RefreshCw className="h-24 w-24" />
                                <p className="text-3xl font-black">لم يتم تحصيل أي مبالغ حتى الآن</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
