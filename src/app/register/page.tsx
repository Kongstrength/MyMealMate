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
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRules = [
    { label: "8–64 ตัวอักษร", valid: password.length >= 8 && password.length <= 64 },
    { label: "ตัวพิมพ์เล็ก (a-z)", valid: /[a-z]/.test(password) },
    { label: "ตัวพิมพ์ใหญ่ (A-Z)", valid: /[A-Z]/.test(password) },
    { label: "ตัวเลข (0-9)", valid: /\d/.test(password) },
    { label: "อักขระพิเศษ เช่น !@#$", valid: /[^\p{L}\p{N}\s]/u.test(password) },
  ];
  const passwordIsValid = passwordRules.every((rule) => rule.valid);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const maxBirthday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!username.trim()) { setError("กรุณากรอกชื่อผู้ใช้"); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("กรุณากรอกอีเมลให้ถูกต้อง"); return; }
    if (!birthday) { setError("กรุณากรอกวันเกิด"); return; }
    if (birthday > maxBirthday) { setError("วันเกิดต้องไม่เป็นวันที่ในอนาคต"); return; }
    if (!passwordIsValid) { setError("รหัสผ่านยังไม่ครบตามเงื่อนไขที่กำหนด"); return; }
    if (!passwordsMatch) { setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน"); return; }
    if (!accepted) {
      setError("กรุณายอมรับข้อกำหนดการใช้งานก่อนสมัครสมาชิก");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim() || username.trim(),
          birthday: new Date(`${birthday}T00:00:00.000Z`).toISOString(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(Array.isArray(data.message) ? data.message.join(", ") : data.message ?? "สมัครสมาชิกไม่สำเร็จ");
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
      <form onSubmit={handleSubmit} noValidate>
        {message && <p className="success-note" role="status">{message}</p>}
        {error && <p className="error-note" role="alert">{error}</p>}
        <label className="field"><span>ชื่อผู้ใช้</span><input required type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" autoComplete="username" /></label>
        <label className="field"><span>ชื่อที่แสดง</span><input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="ชื่อของคุณ" autoComplete="name" /></label>
        <label className="field"><span>อีเมล</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
        <label className="field"><span>วันเกิด</span><input required max={maxBirthday} type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} autoComplete="bday" /></label>
        <label className="field"><span>รหัสผ่าน</span><input required minLength={8} maxLength={64} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete="new-password" aria-describedby="password-requirements" /></label>
        <div className="password-rules" id="password-requirements" aria-live="polite">
          {passwordRules.map((rule) => <span className={rule.valid ? "valid" : ""} key={rule.label}>{rule.valid ? "✓" : "○"} {rule.label}</span>)}
        </div>
        <label className="field"><span>ยืนยันรหัสผ่าน</span><input required minLength={8} maxLength={64} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" autoComplete="new-password" aria-describedby="password-match-status" /></label>
        {confirmPassword && <p className={`password-match ${passwordsMatch ? "valid" : "invalid"}`} id="password-match-status" role="status">{passwordsMatch ? "✓ รหัสผ่านตรงกัน" : "✕ รหัสผ่านไม่ตรงกัน"}</p>}
        <label className="check" style={{ margin: "18px 0 22px" }}><input required type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> ฉันยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว</label>
        <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"}</button>
      </form>
      <Link className="back-link" href="/login">← กลับไปหน้าเข้าสู่ระบบ</Link>
    </AuthShell>
  );
}
