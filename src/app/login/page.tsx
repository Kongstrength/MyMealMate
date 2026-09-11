"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "../auth-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export default function LoginPage() {
  return (
    <LoginForm />
  );
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      }

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("accessToken", data.accessToken);
      storage.setItem("userId", data.user.user_id);
      router.push("/onboarding");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="ยินดีต้อนรับกลับ" description="เข้าสู่ระบบเพื่อดูแผนมื้ออาหารของคุณ" footerText="ยังไม่มีบัญชีใช่ไหม?" footerLink="/register" footerLabel="สมัครสมาชิก">
      <form onSubmit={handleSubmit}>
        {message && <p className="success-note" role="status">{message}</p>}
        {error && <p className="error-note" role="alert">{error}</p>}
        <label className="field"><span>อีเมล</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
        <label className="field"><span>รหัสผ่าน</span><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete="current-password" /></label>
        <div className="form-row"><label className="check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> จดจำฉันไว้</label><Link className="text-link" href="/forgot-password">ลืมรหัสผ่าน?</Link></div>
        <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
      </form>
      <div className="divider">หรือ</div>
      <button className="primary-btn" type="button" style={{ background: "#f3f8f5", color: "#315448", boxShadow: "none" }} disabled>เข้าสู่ระบบด้วย Google</button>
    </AuthShell>
  );
}