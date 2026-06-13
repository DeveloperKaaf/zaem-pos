"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { FileDown, TrendingUp, Users, Clock, DollarSign, Utensils, Gamepad2, Landmark, TrendingDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function ReportsPage() {
  const [range, setRange] = useState('daily');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchReport = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/reports?range=${range}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reportData = await res.json();
      setData(reportData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [range]);

  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !data) return;

    const rangeLabel = range === 'daily' ? 'يومي' : range === 'weekly' ? 'أسبوعي' : range === 'monthly' ? 'شهري' : 'سنوي';

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>التقرير المالي - مركز زعيم الكرة</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 40px; }
            .header h1 { font-size: 32px; margin: 0; }
            .info-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .info-card { border: 2px solid #eee; padding: 20px; border-radius: 12px; text-align: center; }
            .info-card h3 { margin: 0 0 10px 0; color: #666; font-size: 16px; }
            .info-card p { margin: 0; font-size: 24px; font-weight: bold; }
            .profit { color: #10b981; }
            .expense { color: #ef4444; }
            table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            th { background: #f8fafc; padding: 15px; text-align: right; border: 1px solid #ddd; }
            td { padding: 12px; border: 1px solid #ddd; }
            .footer { margin-top: 60px; text-align: center; color: #999; font-size: 12px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <h1>مركز زعيم الكرة للترفية</h1>
            <h2>التقرير المالي (${rangeLabel})</h2>
            <p>تاريخ الاستخراج: ${format(new Date(), 'PPP p', { locale: ar })}</p>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h3>إجمالي الدخل</h3>
              <p>${data.totalRevenue?.toFixed(2)} ريال</p>
            </div>
            <div class="info-card">
              <h3>إجمالي المصروفات</h3>
              <p class="expense">${data.totalExpenses?.toFixed(2)} ريال</p>
            </div>
            <div class="info-card" style="background: #f0fdf4;">
              <h3>صافي الربح</h3>
              <p class="profit">${data.netProfit?.toFixed(2)} ريال</p>
            </div>
          </div>

          <h3>تفصيل مصادر الدخل:</h3>
          <table>
            <thead>
              <tr><th>المصدر</th><th>المبلغ</th></tr>
            </thead>
            <tbody>
              <tr><td>دخل الألعاب</td><td>${data.gamesRevenue?.toFixed(2)} ريال</td></tr>
              <tr><td>دخل الكوفي شوب</td><td>${data.buffetRevenue?.toFixed(2)} ريال</td></tr>
            </tbody>
          </table>

          <h3>سجل العمليات في هذه الفترة:</h3>
          <table>
            <thead>
              <tr><th>التاريخ</th><th>البيان / الجهاز</th><th>النوع</th><th>المبلغ</th></tr>
            </thead>
            <tbody>
              ${data.sessions?.map((s: any) => `
                <tr>
                  <td>${format(new Date(s.date), 'yyyy-MM-dd HH:mm', { locale: ar })}</td>
                  <td>${s.resource}</td>
                  <td>${s.type}</td>
                  <td>${s.amount?.toFixed(2)} ريال</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">طبع بواسطة نظام زعيم الكرة POS</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading && !data) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">جاري تحليل البيانات المالية...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center border-b pb-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">التحليل المالي والأداء</h1>
          <p className="text-slate-500 font-bold">متابعة الإيرادات والمصروفات وصافي الأرباح</p>
        </div>
        <div className="flex gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[200px] h-12 bg-white font-bold border-2 border-slate-200">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">إحصائيات اليوم</SelectItem>
              <SelectItem value="weekly">إحصائيات الأسبوع</SelectItem>
              <SelectItem value="monthly">إحصائيات الشهر</SelectItem>
              <SelectItem value="yearly">إحصائيات السنة</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-12 px-6 border-2 border-slate-200 font-bold bg-white" onClick={handlePrint}>
            <FileDown className="ml-2 h-5 w-5" /> طباعة تقرير مرتب
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard
          title="إجمالي الدخل"
          value={`${data?.totalRevenue?.toFixed(2)} ريال`}
          icon={<DollarSign className="text-white" />}
          bgColor="bg-indigo-600"
        />
        <SummaryCard
          title="إجمالي المصروفات"
          value={`${data?.totalExpenses?.toFixed(2)} ريال`}
          icon={<TrendingDown className="text-white" />}
          bgColor="bg-rose-600"
        />
        <SummaryCard
          title="صافي الربح"
          value={`${data?.netProfit?.toFixed(2)} ريال`}
          icon={<Landmark className="text-white" />}
          bgColor="bg-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xl border-none">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-xl font-bold text-slate-800">مقارنة الإيراد بالمصروفات</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={60}>
                    {data?.chartData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'إجمالي المصاريف' ? '#ef4444' : '#3b82f6'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-none">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-xl font-bold text-slate-800">تحليل مصادر الدخل</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {data?.pieData?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-none no-print">
        <CardHeader className="bg-white border-b">
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" /> إحصائيات إضافية
            </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-center gap-4 bg-slate-100 p-6 rounded-2xl">
                    <div className="h-14 w-14 bg-blue-500 rounded-full flex items-center justify-center text-white">
                        <Users className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-slate-500 font-bold">عدد الجلسات المنفذة</p>
                        <p className="text-3xl font-black">{data?.sessionCount}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-100 p-6 rounded-2xl">
                    <div className="h-14 w-14 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                        <Gamepad2 className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-slate-500 font-bold">المورد الأكثر طلباً</p>
                        <p className="text-3xl font-black">{data?.topResource}</p>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon, bgColor }: any) {
  return (
    <Card className={`${bgColor} border-none shadow-xl overflow-hidden`}>
      <CardContent className="p-8">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/70">{title}</p>
            <h3 className="text-4xl font-black text-white">{value}</h3>
          </div>
          <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-xl border border-white/10 shadow-inner">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
