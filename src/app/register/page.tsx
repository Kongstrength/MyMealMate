"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "../auth-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!accepted) {
      setError("กรุณายอมรับข้อกำหนดการใช้งานก่อนสมัครสมาชิก");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, full_name: fullName || username }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "สมัครสมาชิกไม่สำเร็จ");
      }

      router.replace("/login");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="สร้างบัญชีใหม่" description="เริ่มต้นวางแผนมื้ออาหารในแบบของคุณ" footerText="มีบัญชีอยู่แล้ว?" footerLink="/login" footerLabel="เข้าสู่ระบบ">
      <form onSubmit={handleSubmit}>
        {message && <p className="success-note" role="status">{message}</p>}
        {error && <p className="error-note" role="alert">{error}</p>}
        <label className="field"><span>ชื่อผู้ใช้</span><input required type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" autoComplete="username" /></label>
        <label className="field"><span>ชื่อที่แสดง</span><input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="ชื่อของคุณ" autoComplete="name" /></label>
        <label className="field"><span>อีเมล</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
        <label className="field"><span>รหัสผ่าน</span><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete="new-password" /></label>
        <label className="check" style={{ margin: "18px 0 22px" }}><input required type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> ฉันยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว</label>
        <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"}</button>
      </form>
      <Link className="back-link" href="/login">← กลับไปหน้าเข้าสู่ระบบ</Link>
    </AuthShell>
  );
}