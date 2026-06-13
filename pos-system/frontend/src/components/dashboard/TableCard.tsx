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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square, CreditCard, Gamepad2, Utensils, PlusCircle, Target, Trophy, Laptop, Zap, Pause, PlayCircle, Plus, Minus, ShoppingCart, Wallet, Landmark, Split } from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from "@/config";

export function TableCard({ resource, onUpdate }: { resource: any; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showExtendPayment, setShowExtendPayment] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showConfirmOrder, setShowConfirmOrder] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState<any>(null);
  const [selectedExtendPrice, setSelectedExtendPrice] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("00:00:00");
  const [currentTimeAmount, setCurrentTimeAmount] = useState<number>(0);

  // حالات التقسيم (Split Payment)
  const [isSplit, setIsSplit] = useState(false);
  const [cashPart, setCashPart] = useState<string>("");
  const [netPart, setNetPart] = useState<string>("");

  // سلة الطلبات المؤقتة
  const [cart, setCart] = useState<Record<string, { product: any, quantity: number }>>({});

  // حالات جديدة للتحكم في الوقت المفتوح والإيقاف المؤقت
  const [isStoppingOpen, setIsStoppingOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);

  const router = useRouter();

  const activeSession = resource.sessions?.find((s: any) => s.status === 'ACTIVE');
  const activeInvoice = activeSession?.invoice;

  useEffect(() => {
    setTotalPausedMs(0);
    setPauseStartTime(null);
    setIsPaused(false);
    setIsStoppingOpen(false);
    setCart({});
    setIsSplit(false);
    setCashPart("");
    setNetPart("");
  }, [activeSession?.id]);

  // تحديث الجزء الشبكة تلقائياً عند تغيير الكاش والعكس
  const handleCashChange = (val: string, total: number) => {
    setCashPart(val);
    const cash = parseFloat(val) || 0;
    if (cash <= total) {
      setNetPart((total - cash).toFixed(2));
    } else {
      setNetPart("0");
    }
  };

  const handleTogglePause = () => {
    if (!isPaused) {
      setPauseStartTime(Date.now());
    } else {
      if (pauseStartTime) {
        const pausedDuration = Date.now() - pauseStartTime;
        setTotalPausedMs(prev => prev + pausedDuration);
      }
      setPauseStartTime(null);
    }
    setIsPaused(!isPaused);
  };

  const getResourceIcon = () => {
    const type = (resource.type || "").toLowerCase();
    if (type.includes('بلاي ستيشن')) return <Gamepad2 className="h-16 w-16 text-blue-500/20" />;
    if (type.includes('بلياردو')) return <Target className="h-16 w-16 text-emerald-500/20" />;
    if (type.includes('تنس طاولة')) return <Trophy className="h-16 w-16 text-orange-500/20" />;
    if (type.includes('فرفيرة') || type.includes('فرفيره')) return <Zap className="h-16 w-16 text-purple-500/20" />;
    return <Laptop className="h-16 w-16 text-slate-500/20" />;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && !isPaused) {
      interval = setInterval(() => {
        const start = new Date(activeSession.startTime).getTime();
        const now = Date.now();

        if (activeSession.durationMin > 0) {
          const end = start + activeSession.durationMin * 60 * 1000;
          const diff = (end + totalPausedMs) - now;

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
          const diff = (now - start) - totalPausedMs;
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
  }, [activeSession, activeInvoice, isPaused, totalPausedMs]);

  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setProducts(data);
  };

  const updateCart = (product: any, delta: number) => {
    setCart(prev => {
      const current = prev[product.id] || { product, quantity: 0 };
      const newQty = current.quantity + delta;
      if (newQty <= 0) {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [product.id]: { product, quantity: newQty } };
    });
  };

  const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleConfirmOrders = async (paymentMethod: string) => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const splitData = paymentMethod === 'SPLIT' ? { cash: parseFloat(cashPart), net: parseFloat(netPart) } : null;

      for (const item of Object.values(cart)) {
        await fetch(`${API_BASE_URL}/invoices/${activeInvoice.id}/add-item`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productId: item.product.id, quantity: item.quantity })
        });
      }

      // إذا كانت الطلبات مدفوعة فورياً (مثل الكاش والشبكة)
      if (paymentMethod !== 'LATER') {
          // يمكن هنا استدعاء دفع الفاتورة جزئياً أو كلياً إذا تطلب النظام ذلك
          // حالياً النظام يضيف الطلبات للفاتورة الأساسية
      }

      onUpdate();
      setCart({});
      setShowConfirmOrder(false);
      setShowAddOrder(false);
      setIsSplit(false);
    } catch (e) {
      console.error(e);
      alert("خطأ في إضافة الطلبات");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (paymentMethod: string, forcedDuration?: number) => {
    const duration = forcedDuration !== undefined ? forcedDuration : selectedPrice?.durationMin;
    if (duration === undefined) return;

    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const splitData = paymentMethod === 'SPLIT' ? { cash: parseFloat(cashPart), net: parseFloat(netPart) } : null;

      const res = await fetch(`${API_BASE_URL}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            resourceId: resource.id,
            durationMin: duration,
            paymentMethod,
            splitData
        })
      });
      if (res.ok) {
        setShowPayment(false);
        setIsSplit(false);
        onUpdate();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleExtendSession = async (paymentMethod: string) => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const splitData = paymentMethod === 'SPLIT' ? { cash: parseFloat(cashPart), net: parseFloat(netPart) } : null;
      const res = await fetch(`${API_BASE_URL}/sessions/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: activeSession.id,
          extraMin: selectedExtendPrice.durationMin,
          paymentMethod,
          splitData
        })
      });
      if (res.ok) {
        setShowExtendPayment(false);
        setShowExtend(false);
        setIsSplit(false);
        onUpdate();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStopSession = async (paymentMethod: string = 'CASH') => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const splitData = paymentMethod === 'SPLIT' ? { cash: parseFloat(cashPart), net: parseFloat(netPart) } : null;
      const res = await fetch(`${API_BASE_URL}/sessions/stop/${activeSession.id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod, splitData })
      });
      if (res.ok) {
        setIsStoppingOpen(false);
        setIsSplit(false);
        onUpdate();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const isAvailable = resource.status === 'AVAILABLE';
  const isOpenTime = activeSession && activeSession.durationMin === 0;

  return (
    <Card className={`relative overflow-hidden border-2 shadow-lg transition-all ${!isAvailable ? 'border-red-600 bg-red-50/30' : 'border-emerald-400 bg-white'}`}>
      <CardHeader className="flex flex-row items-center justify-between py-1.5 px-3 bg-slate-50/50 border-b">
        <CardTitle className="text-sm font-black text-slate-800">{resource.name}</CardTitle>
        <Badge variant={isAvailable ? "secondary" : "destructive"} className={`px-2 py-0.5 text-[9px] font-bold ${isAvailable ? "bg-emerald-500 text-white" : "bg-red-600 text-white animate-pulse"}`}>
          {isAvailable ? "متاح" : "مشغول"}
        </Badge>
      </CardHeader>

      <CardContent className="py-3 text-center h-32 flex flex-col justify-center bg-white relative">
        {!isAvailable ? (
          <div className="space-y-1 z-10">
            {isStoppingOpen && <p className="text-red-600 text-[10px] font-black animate-pulse">تأكيد إنهاء الحساب</p>}
            <div className={`text-2xl font-mono font-black ${timeLeft === "انتهى الوقت" || isStoppingOpen ? "text-red-600" : "text-slate-900"} ${isPaused ? "opacity-30" : ""}`}>
              {timeLeft}
            </div>
            <div className="bg-slate-100 rounded-lg p-1 border border-slate-200 inline-block mx-auto min-w-[120px]">
                <p className="text-[8px] font-bold text-slate-500 mb-0.5">المبلغ الحالي</p>
                <div className="text-base font-black text-emerald-700">
                  {(currentTimeAmount + (activeInvoice?.itemsAmount || 0)).toFixed(2)} <span className="text-[9px]">ريال</span>
                </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="mb-0.5 scale-50">{getResourceIcon()}</div>
            <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">
              {resource.type}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="grid grid-cols-1 gap-1 p-1.5 bg-slate-50 border-t">
        {isAvailable ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-black text-xs h-9 shadow-md">
                <Play className="ml-1.5 h-3.5 w-3.5" /> بدء اللعب
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">اختر الوقت لـ {resource.name}</DialogTitle>
                <DialogDescription>سيتم تشغيل الجهاز والعداد فور الاختيار.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 py-4">
                {resource.prices.map((p: any) => (
                  <Button key={p.id} variant="outline" className="h-16 text-xl font-bold hover:bg-emerald-50" onClick={() => {
                    if (p.durationMin === 0) {
                      handleStartSession('CASH', 0);
                    } else {
                      setSelectedPrice(p);
                      setShowPayment(true);
                    }
                  }}>
                    {p.durationMin === 0 ? "🕒 وقت مفتوح (0.5 ر/د)" : `${p.durationMin} دقيقة - ${p.price} ريال`}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex flex-col gap-1.5 w-full z-20">
            {isStoppingOpen ? (
              <div className="grid grid-cols-2 gap-1">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 font-black h-10 text-[10px]">
                            <CreditCard className="ml-1 h-3.5 w-3.5" /> إنهاء ودفع
                        </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">إنهاء الحساب - {resource.name}</DialogTitle>
                        </DialogHeader>
                        <div className="py-6 text-center">
                            <p className="text-slate-500 font-bold">المبلغ الإجمالي المستحق:</p>
                            <div className="text-6xl font-black text-slate-900 mt-2">
                                {(currentTimeAmount + (activeInvoice?.itemsAmount || 0)).toFixed(2)} <span className="text-xl">ريال</span>
                            </div>
                        </div>

                        {isSplit && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 mb-4">
                                <div className="space-y-2">
                                    <Label>مبلغ الكاش</Label>
                                    <Input
                                        type="number"
                                        value={cashPart}
                                        onChange={(e) => handleCashChange(e.target.value, (currentTimeAmount + (activeInvoice?.itemsAmount || 0)))}
                                        placeholder="0.00"
                                        className="text-center font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>مبلغ الشبكة</Label>
                                    <Input
                                        type="number"
                                        value={netPart}
                                        readOnly
                                        className="text-center font-bold bg-slate-100"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 flex-col">
                            <div className="flex gap-2 w-full">
                                <Button onClick={() => handleStopSession('CASH')} className="flex-1 h-16 bg-emerald-600 font-black" disabled={loading}>كاش</Button>
                                <Button onClick={() => handleStopSession('NET')} className="flex-1 h-16 bg-blue-600 font-black" disabled={loading}>شبكة</Button>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsSplit(!isSplit);
                                    if(!isSplit) handleCashChange("0", (currentTimeAmount + (activeInvoice?.itemsAmount || 0)));
                                }}
                                className={`w-full h-12 font-bold ${isSplit ? 'bg-amber-50 border-amber-500 text-amber-700' : ''}`}
                            >
                                <Split className="ml-2 h-4 w-4" /> {isSplit ? 'إلغاء التقسيم' : 'تقسيم (كاش + شبكة)'}
                            </Button>
                            {isSplit && (
                                <Button onClick={() => handleStopSession('SPLIT')} className="w-full h-14 bg-slate-900 text-white font-black text-lg mt-2" disabled={loading}>
                                    تأكيد الدفع المختلط
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>

                <Button variant="outline" className="font-bold h-10 text-[10px]" onClick={() => setIsStoppingOpen(false)}>
                  <PlayCircle className="ml-1 h-3.5 w-3.5" /> استمرار
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1">
                    {isOpenTime ? (
                      <Button
                        variant="outline"
                        className={`h-9 text-[10px] font-bold ${isPaused ? "bg-amber-100 border-amber-400 text-amber-900" : "border-blue-200 text-blue-700"}`}
                        onClick={handleTogglePause}
                      >
                        {isPaused ? <><PlayCircle className="ml-1 h-3 w-3" /> استمرار</> : <><Pause className="ml-1 h-3 w-3" /> مؤقت</>}
                      </Button>
                    ) : (
                      <Button variant="outline" className="h-9 text-[10px] font-bold border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => setShowExtend(true)}>
                        <PlusCircle className="ml-1 h-3 w-3" /> تمديد
                      </Button>
                    )}
                    <Button variant="outline" className="h-9 text-[10px] font-bold" onClick={() => { setShowAddOrder(true); fetchProducts(); }}>
                      <Utensils className="ml-1 h-3 w-3" /> طلبات
                    </Button>
                </div>
                <Button variant="destructive" className="font-black text-xs h-9 shadow-sm" onClick={() => isOpenTime ? setIsStoppingOpen(true) : handleStopSession()} disabled={loading}>
                  <Square className="ml-1 h-3.5 w-3.5" /> إنهاء الجلسة
                </Button>
              </>
            )}
          </div>
        )}
      </CardFooter>

      {/* حوار تأكيد الدفع لبدء الجلسة */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-emerald-800">تأكيد الدفع</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-slate-500 font-bold">المبلغ المطلوب:</p>
            <div className="text-6xl font-black text-slate-900 mt-2">
              {selectedPrice?.price} <span className="text-xl">ريال</span>
            </div>
          </div>

          {isSplit && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 mb-4">
                <div className="space-y-2">
                    <Label>مبلغ الكاش</Label>
                    <Input type="number" value={cashPart} onChange={(e) => handleCashChange(e.target.value, selectedPrice?.price)} placeholder="0.00" className="text-center font-bold" />
                </div>
                <div className="space-y-2">
                    <Label>مبلغ الشبكة</Label>
                    <Input type="number" value={netPart} readOnly className="text-center font-bold bg-slate-100" />
                </div>
            </div>
          )}

          <DialogFooter className="gap-3 flex-col">
            <div className="flex gap-3 w-full">
                <Button onClick={() => handleStartSession('CASH')} className="flex-1 h-20 text-xl bg-emerald-600 hover:bg-emerald-700 font-black shadow-lg flex flex-col gap-1" disabled={loading}>
                <Wallet className="h-8 w-8" /> كاش
                </Button>
                <Button onClick={() => handleStartSession('NET')} className="flex-1 h-20 text-xl bg-blue-600 hover:bg-blue-700 font-black shadow-lg flex flex-col gap-1" disabled={loading}>
                <Landmark className="h-8 w-8" /> شبكة
                </Button>
            </div>

            <Button variant="outline" onClick={() => { setIsSplit(!isSplit); if(!isSplit) handleCashChange("0", selectedPrice?.price); }} className={`w-full h-12 font-bold ${isSplit ? 'bg-amber-50 border-amber-500 text-amber-700' : ''}`}>
                <Split className="ml-2 h-4 w-4" /> {isSplit ? 'إلغاء التقسيم' : 'تقسيم (كاش + شبكة)'}
            </Button>

            {isSplit && (
                <Button onClick={() => handleStartSession('SPLIT')} className="w-full h-14 bg-slate-900 text-white font-black text-lg" disabled={loading}>
                    تأكيد الدفع المختلط
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الدفع للتمديد */}
      <Dialog open={showExtendPayment} onOpenChange={setShowExtendPayment}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-800">تأكيد دفع مبلغ التمديد</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-slate-500 font-bold">مبلغ التمديد المطلوب:</p>
            <div className="text-6xl font-black text-slate-900 mt-2">
              {selectedExtendPrice?.price} <span className="text-xl">ريال</span>
            </div>
          </div>

          {isSplit && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 mb-4">
                <div className="space-y-2">
                    <Label>مبلغ الكاش</Label>
                    <Input type="number" value={cashPart} onChange={(e) => handleCashChange(e.target.value, selectedExtendPrice?.price)} placeholder="0.00" className="text-center font-bold" />
                </div>
                <div className="space-y-2">
                    <Label>مبلغ الشبكة</Label>
                    <Input type="number" value={netPart} readOnly className="text-center font-bold bg-slate-100" />
                </div>
            </div>
          )}

          <DialogFooter className="gap-3 flex-col">
            <div className="flex gap-3 w-full">
                <Button onClick={() => handleExtendSession('CASH')} className="flex-1 h-20 text-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg flex flex-col gap-1" disabled={loading}>
                <Wallet className="h-8 w-8" /> كاش
                </Button>
                <Button onClick={() => handleExtendSession('NET')} className="flex-1 h-20 text-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg flex flex-col gap-1" disabled={loading}>
                <Landmark className="h-8 w-8" /> شبكة
                </Button>
            </div>

            <Button variant="outline" onClick={() => { setIsSplit(!isSplit); if(!isSplit) handleCashChange("0", selectedExtendPrice?.price); }} className={`w-full h-12 font-bold ${isSplit ? 'bg-amber-50 border-amber-500 text-amber-700' : ''}`}>
                <Split className="ml-2 h-4 w-4" /> {isSplit ? 'إلغاء التقسيم' : 'تقسيم (كاش + شبكة)'}
            </Button>

            {isSplit && (
                <Button onClick={() => handleExtendSession('SPLIT')} className="w-full h-14 bg-slate-900 text-white font-black text-lg" disabled={loading}>
                    تأكيد الدفع المختلط
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار المنيو */}
      <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
        <DialogContent dir="rtl" className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Utensils className="text-blue-600" /> منيو الكوفي - {resource.name}
            </DialogTitle>
            <DialogDescription>يمكنك اختيار عدة أصناف وتعديل الكميات قبل الحفظ.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4 max-h-[400px] overflow-y-auto px-1">
            {products.map((product: any) => {
              const itemInCart = cart[product.id];
              return (
                <div key={product.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${itemInCart ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{product.name}</span>
                    <span className="text-xs font-black text-blue-600">{product.price.toFixed(2)} ريال</span>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-1 rounded-lg border">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => updateCart(product, -1)} disabled={!itemInCart}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-black text-lg min-w-[24px] text-center">{itemInCart?.quantity || 0}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={() => updateCart(product, 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-500">إجمالي الطلبات:</p>
              <p className="text-2xl font-black text-slate-900">{cartTotal.toFixed(2)} ريال</p>
            </div>
            <Button
              className="h-14 px-8 bg-blue-600 hover:bg-blue-700 font-black text-lg shadow-lg"
              disabled={cartTotal === 0}
              onClick={() => setShowConfirmOrder(true)}
            >
              استمرار <ShoppingCart className="mr-2 h-5 w-5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد دفع طلبات الكوفي */}
      <Dialog open={showConfirmOrder} onOpenChange={setShowConfirmOrder}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-emerald-800">تأكيد الدفع</DialogTitle>
            <DialogDescription>سيتم إضافة الطلبات لفاتورة {resource.name} بعد التأكيد.</DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border">
              {Object.values(cart).map((item: any) => (
                <div key={item.product.id} className="flex justify-between text-sm font-bold">
                  <span>{item.product.name} × {item.quantity}</span>
                  <span>{(item.product.price * item.quantity).toFixed(2)} ريال</span>
                </div>
              ))}
            </div>
            <div className="text-center py-4">
              <p className="text-slate-500 font-bold text-sm">المجموع المطلوب تحصيله:</p>
              <p className="text-5xl font-black text-slate-900">{cartTotal.toFixed(2)} <span className="text-xl">ريال</span></p>
            </div>
          </div>

          {isSplit && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 mb-4">
                <div className="space-y-2">
                    <Label>مبلغ الكاش</Label>
                    <Input type="number" value={cashPart} onChange={(e) => handleCashChange(e.target.value, cartTotal)} placeholder="0.00" className="text-center font-bold" />
                </div>
                <div className="space-y-2">
                    <Label>مبلغ الشبكة</Label>
                    <Input type="number" value={netPart} readOnly className="text-center font-bold bg-slate-100" />
                </div>
            </div>
          )}

          <DialogFooter className="gap-3 flex-row">
            <div className="flex gap-3 w-full">
                <Button onClick={() => handleConfirmOrders('CASH')} className="flex-1 h-20 text-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg flex flex-col gap-1" disabled={loading}>
                <Wallet className="h-8 w-8" /> كاش
                </Button>
                <Button onClick={() => handleConfirmOrders('NET')} className="flex-1 h-20 text-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg flex flex-col gap-1" disabled={loading}>
                <Landmark className="h-8 w-8" /> شبكة
                </Button>
            </div>

            <Button variant="outline" onClick={() => { setIsSplit(!isSplit); if(!isSplit) handleCashChange("0", cartTotal); }} className={`w-full h-12 font-bold ${isSplit ? 'bg-amber-50 border-amber-500 text-amber-700' : ''}`}>
                <Split className="ml-2 h-4 w-4" /> {isSplit ? 'إلغاء التقسيم' : 'تقسيم (كاش + شبكة)'}
            </Button>

            {isSplit && (
                <Button onClick={() => handleConfirmOrders('SPLIT')} className="w-full h-14 bg-slate-900 text-white font-black text-lg" disabled={loading}>
                    تأكيد الدفع المختلط
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
