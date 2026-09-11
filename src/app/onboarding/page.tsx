"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "../auth-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const activityOptions = [
  ["SEDENTARY", "นั่งทำงานเป็นส่วนใหญ่"],
  ["LIGHT_1_3", "ออกกำลังกายเบา ๆ 1-3 วัน/สัปดาห์"],
  ["MODERATE_3_5", "ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์"],
  ["ACTIVE_6_7", "ออกกำลังกายหนัก 6-7 วัน/สัปดาห์"],
  ["VERY_ACTIVE", "เคลื่อนไหวหรือฝึกหนักเป็นประจำ"],
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("SEDENTARY");
  const [budgetDaily, setBudgetDaily] = useState("");
  const [dailyCalories, setDailyCalories] = useState("");
  const [likedFoods, setLikedFoods] = useState("");
  const [healthGoals, setHealthGoals] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getSessionValue(key: string) {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const token = getSessionValue("accessToken");
    const userId = getSessionValue("userId");

    if (!token || !userId) {
      setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age: Number(age),
          gender,
          height: Number(height),
          weight: Number(weight),
          activity_level: activityLevel,
          budget_daily: budgetDaily ? Number(budgetDaily) : undefined,
          daily_target_calories: dailyCalories ? Number(dailyCalories) : undefined,
          liked_foods: likedFoods.split(",").map((food) => food.trim()).filter(Boolean),
          health_goals_list: healthGoals.split(",").map((goal) => goal.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
        throw new Error(message ?? "บันทึกข้อมูลไม่สำเร็จ");
      }

      router.push("/dashboard");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  }

  function skipOnboarding() {
    router.push("/dashboard");
  }

  return (
    <AuthShell title="ตั้งค่าโปรไฟล์ของคุณ" description="ข้อมูลนี้ช่วยให้เราวางแผนอาหารได้เหมาะกับคุณมากขึ้น" footerText="ข้อมูลบางอย่างแก้ไขได้ภายหลัง" footerLink="/login" footerLabel="กลับเข้าสู่ระบบ">
      <form onSubmit={handleSubmit}>
        {error && <p className="error-note" role="alert">{error}</p>}
        <div className="field-grid">
          <label className="field"><span>อายุ</span><input required min={1} max={120} type="number" value={age} onChange={(event) => setAge(event.target.value)} placeholder="25" /></label>
          <label className="field"><span>เพศ</span><select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">ไม่ระบุ</option><option value="หญิง">หญิง</option><option value="ชาย">ชาย</option><option value="อื่น ๆ">อื่น ๆ</option></select></label>
        </div>
        <div className="field-grid">
          <label className="field"><span>ส่วนสูง (ซม.)</span><input required min={50} max={250} type="number" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="170" /></label>
          <label className="field"><span>น้ำหนัก (กก.)</span><input required min={10} max={400} type="number" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="65" /></label>
        </div>
        <label className="field"><span>ระดับกิจกรรม</span><select value={activityLevel} onChange={(event) => setActivityLevel(event.target.value)}>{activityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="field-grid">
          <label className="field"><span>งบอาหารต่อวัน (บาท)</span><input min={0} type="number" value={budgetDaily} onChange={(event) => setBudgetDaily(event.target.value)} placeholder="200" /></label>
          <label className="field"><span>แคลอรี่เป้าหมายต่อวัน</span><input min={0} type="number" value={dailyCalories} onChange={(event) => setDailyCalories(event.target.value)} placeholder="2000" /></label>
        </div>
        <label className="field"><span>อาหารที่ชอบ</span><input type="text" value={likedFoods} onChange={(event) => setLikedFoods(event.target.value)} placeholder="ข้าว, ไก่, ผัก" /></label>
        <label className="field"><span>เป้าหมายสุขภาพ</span><input type="text" value={healthGoals} onChange={(event) => setHealthGoals(event.target.value)} placeholder="ลดน้ำหนัก, สุขภาพดี" /></label>
        <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน"}</button>
        <button className="secondary-btn" type="button" onClick={skipOnboarding}>ไว้กรอกภายหลัง</button>
      </form>
    </AuthShell>
  );
}
