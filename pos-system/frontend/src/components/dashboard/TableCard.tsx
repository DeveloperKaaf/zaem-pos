"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Timer, Play, Square, Receipt, CreditCard, Gamepad2, Utensils, PlusCircle, Target, Trophy, Laptop, Zap } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export function TableCard({ resource, onUpdate }: { resource: any; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showExtendPayment, setShowExtendPayment] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState<any>(null);
  const [selectedExtendPrice, setSelectedExtendPrice] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("00:00:00");
  const [currentTimeAmount, setCurrentTimeAmount] = useState<number>(0);

  const router = useRouter();

  const activeSession = resource.sessions?.find((s: any) => s.status === 'ACTIVE');
  const activeInvoice = activeSession?.invoice;

  // دالة لاختيار الأيقونة المناسبة للصنف
  const getResourceIcon = () => {
    const type = (resource.type || "").toLowerCase();
    if (type.includes('بلاي ستيشن')) return <Gamepad2 className="h-20 w-20 text-blue-500/20" />;
    if (type.includes('بلياردو')) return <Target className="h-20 w-20 text-emerald-500/20" />;
    if (type.includes('تنس طاولة')) return <Trophy className="h-20 w-20 text-orange-500/20" />;
    if (type.includes('فرفيرة') || type.includes('فرفيره')) return <Zap className="h-20 w-20 text-purple-500/20" />;
    return <Laptop className="h-20 w-20 text-slate-500/20" />;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        const start = new Date(activeSession.startTime).getTime();
        const now = Date.now();

        if (activeSession.durationMin > 0) {
          const end = start + activeSession.durationMin * 60 * 1000;
          const diff = end - now;
          if (diff <= 0) {
            setTimeLeft("انتهى الوقت");
            setCurrentTimeAmount(activeInvoice?.timeAmount || 0);
          } else {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            setCurrentTimeAmount(activeInvoice?.timeAmount || 0);
          }
        } else {
          const diff = now - start;
          const diffMin = Math.ceil(diff / 60000);
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
          setCurrentTimeAmount(diffMin * 0.5);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession, activeInvoice]);

  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setProducts(data);
  };

  const handleAddProductToInvoice = async (productId: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_BASE_URL}/invoices/${activeInvoice.id}/add-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, quantity: 1 })
      });
      onUpdate();
      setShowAddOrder(false);
    } catch (e) { console.error(e); }
  };

  const handleStartSession = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resourceId: resource.id, durationMin: selectedPrice.durationMin })
      });
      if (res.ok) {
        setShowPayment(false);
        onUpdate();
        router.push('/invoices');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleExtendSession = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: activeSession.id,
          extraMin: selectedExtendPrice.durationMin
        })
      });
      if (res.ok) {
        setShowExtendPayment(false);
        setShowExtend(false);
        onUpdate();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStopSession = async () => {
    if (!confirm("هل تريد إنهاء الجلسة وإصدار الفاتورة؟")) return;
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/stop/${activeSession.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) onUpdate();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const isAvailable = resource.status === 'AVAILABLE';

  return (
    <Card className={`relative overflow-hidden border-2 shadow-xl transition-all ${!isAvailable ? 'border-red-600 bg-red-50/30 scale-[1.02]' : 'border-emerald-400 bg-white'}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
        <CardTitle className="text-xl font-black text-slate-800">{resource.name}</CardTitle>
        <Badge variant={isAvailable ? "secondary" : "destructive"} className={`px-3 py-1 font-bold ${isAvailable ? "bg-emerald-500 text-white" : "bg-red-600 text-white animate-pulse"}`}>
          {isAvailable ? "متاح" : "مشغول"}
        </Badge>
      </CardHeader>

      <CardContent className="pt-8 text-center h-48 flex flex-col justify-center bg-white relative">
        {!isAvailable ? (
          <div className="space-y-3 z-10">
            <div className={`text-5xl font-mono font-black ${timeLeft === "انتهى الوقت" ? "text-red-600 animate-bounce" : "text-slate-900"}`}>
              {timeLeft}
            </div>
            <div className="bg-slate-100 rounded-xl p-3 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-1">المبلغ الحالي</p>
                <div className="text-2xl font-black text-emerald-700">
                  {(currentTimeAmount + (activeInvoice?.itemsAmount || 0)).toFixed(2)} <span className="text-sm">ريال</span>
                </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="mb-2">{getResourceIcon()}</div>
            <p className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
              {resource.type}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="grid grid-cols-1 gap-2 p-4 bg-slate-50 border-t">
        {isAvailable ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-black text-lg h-14 shadow-lg">
                <Play className="ml-2 h-6 w-6" /> بدء اللعب
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">اختر الوقت لـ {resource.name}</DialogTitle>
                <DialogDescription>سيتم تشغيل الجهاز والعداد فور التأكيد.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 py-4">
                {resource.prices.map((p: any) => (
                  <Button key={p.id} variant="outline" className="h-16 text-xl font-bold hover:bg-emerald-50" onClick={() => { setSelectedPrice(p); setShowPayment(true); }}>
                    {p.durationMin === 0 ? "🕒 وقت مفتوح (0.5 ر/د)" : `${p.durationMin} دقيقة - ${p.price} ريال`}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex flex-col gap-2 w-full z-20">
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12 font-bold border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => setShowExtend(true)}>
                  <PlusCircle className="ml-2 h-4 w-4" /> تمديد
                </Button>
                <Button variant="outline" className="h-12 font-bold" onClick={() => { setShowAddOrder(true); fetchProducts(); }}>
                  <Utensils className="ml-2 h-4 w-4" /> طلبات
                </Button>
            </div>
            <Button variant="destructive" className="font-black text-lg h-14 shadow-md" onClick={handleStopSession} disabled={loading}>
              <Square className="ml-2 h-6 w-6" /> إنهاء الجلسة
            </Button>
          </div>
        )}
      </CardFooter>

      {/* حوار تأكيد الدفع لبدء الجلسة */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-emerald-800">تأكيد استلام المبلغ</DialogTitle>
            <DialogDescription>لن يبدأ الوقت إلا بعد التأكيد.</DialogDescription>
          </DialogHeader>
          <div className="py-10 text-center">
            <p className="text-slate-500 font-bold">المبلغ المطلوب:</p>
            <div className="text-7xl font-black text-slate-900 mt-2">
              {selectedPrice?.durationMin === 0 ? "0.00" : `${selectedPrice?.price}`} <span className="text-2xl">ريال</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowPayment(false)} className="flex-1 h-14">إلغاء</Button>
            <Button onClick={handleStartSession} className="flex-1 h-14 text-xl bg-emerald-600 hover:bg-emerald-700 font-black shadow-lg" disabled={loading}>
              <CreditCard className="ml-2 h-6 w-6" /> تم الاستلام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار اختيار مدة التمديد */}
      <Dialog open={showExtend} onOpenChange={setShowExtend}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">تمديد وقت {resource.name}</DialogTitle>
            <DialogDescription>اختر المدة الإضافية.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-6">
            {resource.prices?.filter((p:any) => p.durationMin > 0).map((p: any) => (
              <Button key={p.id} variant="outline" className="h-16 font-bold" onClick={() => { setSelectedExtendPrice(p); setShowExtendPayment(true); }}>
                +{p.durationMin} دقيقة
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الدفع للتمديد */}
      <Dialog open={showExtendPayment} onOpenChange={setShowExtendPayment}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-800">تأكيد استلام مبلغ التمديد</DialogTitle>
            <DialogDescription>سيتم إضافة {selectedExtendPrice?.durationMin} دقيقة للجلسة.</DialogDescription>
          </DialogHeader>
          <div className="py-10 text-center">
            <p className="text-slate-500 font-bold">مبلغ التمديد المطلوب:</p>
            <div className="text-7xl font-black text-slate-900 mt-2">
              {selectedExtendPrice?.price} <span className="text-2xl">ريال</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowExtendPayment(false)} className="flex-1 h-14">إلغاء</Button>
            <Button onClick={handleExtendSession} className="flex-1 h-14 text-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg" disabled={loading}>
              <CreditCard className="ml-2 h-6 w-6" /> تأكيد الاستلام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
        <DialogContent dir="rtl" className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">منيو البوفيه</DialogTitle>
            <DialogDescription>إضافة طلبات لـ {resource.name}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4 max-h-[400px] overflow-y-auto">
            {products.map((product: any) => (
              <Button key={product.id} variant="outline" className="h-20 flex flex-col items-center justify-center gap-1" onClick={() => handleAddProductToInvoice(product.id)}>
                <span className="font-bold text-slate-800">{product.name}</span>
                <span className="text-blue-600 font-black">{product.price.toFixed(2)} ريال</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
