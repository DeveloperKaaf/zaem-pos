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
  DialogFooter
} from "@/components/ui/dialog";
import { Timer, Play, Square, Receipt, CreditCard, Gamepad2, Utensils } from "lucide-react";
import { API_BASE_URL } from "@/config";

export function TableCard({ resource, onUpdate }: { resource: any; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [currentTimeAmount, setCurrentTimeAmount] = useState<number>(0);

  const activeSession = resource.sessions?.[0];
  const activeInvoice = activeSession?.invoice;

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
      if (res.ok) { setShowPayment(false); onUpdate(); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStopSession = async () => {
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
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl font-black text-slate-800">{resource.name}</CardTitle>
        <Badge variant={isAvailable ? "secondary" : "destructive"} className={`px-3 py-1 ${isAvailable ? "bg-emerald-500 text-white" : "animate-pulse"}`}>
          {isAvailable ? "متاح" : "مشغول"}
        </Badge>
      </CardHeader>

      <CardContent className="pt-6 text-center h-40 flex flex-col justify-center">
        {!isAvailable ? (
          <div className="space-y-2">
            <div className="text-5xl font-mono font-black text-red-600 drop-shadow-sm">{timeLeft}</div>
            <div className="flex flex-col gap-1">
                <div className="text-sm font-bold text-slate-500">حساب الوقت: {currentTimeAmount.toFixed(2)} ريال</div>
                {activeInvoice?.itemsAmount > 0 && (
                    <div className="text-sm font-bold text-blue-500">حساب الطلبات: {activeInvoice.itemsAmount.toFixed(2)} ريال</div>
                )}
                <div className="text-xl font-black text-slate-900 bg-yellow-400 rounded-lg px-4 py-1 border-2 border-slate-900 inline-block mt-1">
                  الإجمالي: {(currentTimeAmount + (activeInvoice?.itemsAmount || 0)).toFixed(2)} ريال
                </div>
            </div>
          </div>
        ) : (
          <div className="opacity-10 flex flex-col items-center">
            <Gamepad2 className="h-16 w-16 text-slate-900" />
          </div>
        )}
      </CardContent>

      <CardFooter className="grid grid-cols-1 gap-2 p-4 bg-slate-50 border-t-2">
        {isAvailable ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-black text-lg h-14">
                <Play className="ml-2 h-6 w-6" /> ابدأ اللعب
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]" dir="rtl">
              <DialogHeader><DialogTitle className="text-center text-3xl font-black">اختر الوقت</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-6">
                {resource.prices.map((p: any) => (
                  <Button key={p.id} variant="outline" className="h-20 text-2xl font-black hover:border-indigo-600" onClick={() => { setSelectedPrice(p); setShowPayment(true); }}>
                    {p.durationMin === 0 ? "🕒 وقت مفتوح (0.5 ر/د)" : `${p.durationMin} دقيقة - ${p.price} ريال`}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="destructive" className="font-black text-lg h-14" onClick={handleStopSession} disabled={loading}>
              <Square className="ml-2 h-5 w-5" /> إنهاء
            </Button>

            <Dialog open={showAddOrder} onOpenChange={(open) => { setShowAddOrder(open); if(open) fetchProducts(); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 font-black text-lg h-14 shadow-lg shadow-blue-900/20">
                  <Utensils className="ml-2 h-5 w-5" /> أضف طلب
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="sm:max-w-[500px]">
                <DialogHeader><DialogTitle className="text-2xl font-bold">منيو البوفيه - إضافة طلب لـ {resource.name}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-4 max-h-[400px] overflow-y-auto p-2">
                  {products.map((product: any) => (
                    <Button key={product.id} variant="outline" className="h-20 flex flex-col items-center justify-center gap-1 hover:border-blue-500 hover:bg-blue-50" onClick={() => handleAddProductToInvoice(product.id)}>
                      <span className="font-bold text-slate-800">{product.name}</span>
                      <span className="text-blue-600 font-black">{product.price.toFixed(2)} ريال</span>
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardFooter>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-2xl font-bold">تأكيد استلام المبلغ</DialogTitle></DialogHeader>
          <div className="py-10 text-center space-y-4">
            <div className="text-lg font-bold">المبلغ المطلوب من العميل:</div>
            <div className="text-7xl font-black text-emerald-600">
              {selectedPrice?.durationMin === 0 ? "0.00" : `${selectedPrice?.price}`} <span className="text-2xl">ريال</span>
            </div>
            <p className="text-slate-400">لن يبدأ الوقت ولن تعمل الكهرباء إلا بعد التأكيد.</p>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowPayment(false)} className="flex-1 h-14 text-lg">إلغاء</Button>
            <Button onClick={handleStartSession} className="flex-1 h-14 text-xl bg-emerald-600 hover:bg-emerald-700 font-black" disabled={loading}>
              <CreditCard className="ml-2 h-6 w-6" /> تم الاستلام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
