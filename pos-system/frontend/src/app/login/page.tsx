"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config";

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || 'خطأ في اسم المستخدم أو كلمة المرور');
      }
    } catch (err) {
      setError('لا يمكن الوصول للسيرفر. تأكد من رفعه وتشغيله أونلاين.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-blue-600">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">الزعيم POS</CardTitle>
          <CardDescription>نظام الإدارة - نسخة سحابية</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded text-center font-bold">{error}</div>}
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input placeholder="admin" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input type="password" placeholder="admin123" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 font-bold" disabled={loading}>
              {loading ? 'جاري التحقق...' : 'دخول للنظام'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
