"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthShell } from "../auth-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("กำลังยืนยันอีเมล...");
  const [error, setError] = useState("");
  const verificationAttempted = useRef(false);

  useEffect(() => {
    if (verificationAttempted.current) {
      return;
    }

    verificationAttempted.current = true;
    const token = searchParams.get("token");

    if (!token) {
      setError("ลิงก์ยืนยันอีเมลไม่ถูกต้อง");
      setMessage("");
      return;
    }

    fetch(`${API_URL}/users/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "ยืนยันอีเมลไม่สำเร็จ");
        }
        setMessage(data.message ?? "ยืนยันอีเมลสำเร็จ");
      })
      .catch((verificationError: unknown) => {
        setMessage("");
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "ยืนยันอีเมลไม่สำเร็จ",
        );
      });
  }, [searchParams]);

  return (
    <AuthShell
      title={error ? "ยืนยันอีเมลไม่สำเร็จ" : "ยืนยันอีเมลสำเร็จ"}
      description="สถานะบัญชีของคุณได้รับการอัปเดตแล้ว"
      footerText="พร้อมเข้าสู่ระบบแล้ว?"
      footerLink="/login"
      footerLabel="เข้าสู่ระบบ"
    >
      {message && <p className="success-note" role="status">{message}</p>}
      {error && <p className="error-note" role="alert">{error}</p>}
      <Link className="primary-btn back-button" href="/login">ไปหน้าเข้าสู่ระบบ</Link>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="auth-page">กำลังโหลด...</main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
