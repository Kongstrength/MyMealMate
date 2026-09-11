"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthShell } from "../auth-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "ส่งลิงก์ไม่สำเร็จ");
      }

      setMessage(data.message ?? "ถ้ามีอีเมลนี้ในระบบ เราจะส่งลิงก์ให้คุณ");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="ลืมรหัสผ่าน?" description="กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ" footerText="นึกออกแล้ว?" footerLink="/login" footerLabel="กลับเข้าสู่ระบบ">
      <form onSubmit={handleSubmit}>
        {message && <p className="success-note" role="status">{message}</p>}
        {error && <p className="error-note" role="alert">{error}</p>}
        <label className="field"><span>อีเมล</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
        <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังส่งลิงก์..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
      </form>
      <Link className="back-link" href="/login">← กลับไปหน้าเข้าสู่ระบบ</Link>
    </AuthShell>
  );
}