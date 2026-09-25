"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const activityOptions = [
  ["SEDENTARY", "นั่งทำงานเป็นส่วนใหญ่"],
  ["LIGHT_1_3", "ออกกำลังกายเบา ๆ 1-3 วัน/สัปดาห์"],
  ["MODERATE_3_5", "ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์"],
  ["ACTIVE_6_7", "ออกกำลังกายหนัก 6-7 วัน/สัปดาห์"],
  ["VERY_ACTIVE", "เคลื่อนไหวหรือฝึกหนักเป็นประจำ"],
] as const;
const goalOptions = [
  { value: "ลดน้ำหนัก", icon: "↘", label: "ลดน้ำหนัก" },
  { value: "เพิ่มน้ำหนัก", icon: "↗", label: "เพิ่มน้ำหนัก" },
  { value: "คงน้ำหนัก", icon: "⚖", label: "คงน้ำหนัก" },
  { value: "เพิ่มกล้ามเนื้อ", icon: "💪", label: "เพิ่มกล้ามเนื้อ" },
  { value: "ลดไขมัน", icon: "🔥", label: "ลดไขมัน" },
  { value: "สุขภาพทั่วไป", icon: "♥", label: "สุขภาพทั่วไป" },
  { value: "ควบคุมเบาหวาน", icon: "♧", label: "ควบคุมเบาหวาน" },
  { value: "เสริมภูมิคุ้มกัน", icon: "✦", label: "เสริมภูมิคุ้มกัน" },
] as const;

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("SEDENTARY");
  const [budgetDaily, setBudgetDaily] = useState("");
  const [budgetWeekly, setBudgetWeekly] = useState("");
  const [budgetMonthly, setBudgetMonthly] = useState("");
  const [dailyCalories, setDailyCalories] = useState("");
  const [likedFoods, setLikedFoods] = useState("");
  const [dislikedFoods, setDislikedFoods] = useState("");
  const [foodAllergies, setFoodAllergies] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoals, setCustomGoals] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  const bmi = useMemo(() => {
    const heightInMeters = Number(height) / 100;
    const currentWeight = Number(weight);
    if (!heightInMeters || !currentWeight) return null;
    return currentWeight / (heightInMeters * heightInMeters);
  }, [height, weight]);
  const bmiSummary = bmi === null
    ? { label: "รอข้อมูล", position: 0 }
    : bmi < 18.5 ? { label: "น้ำหนักน้อย", position: 18 }
      : bmi < 23 ? { label: "อยู่ในเกณฑ์ปกติ", position: 43 }
        : bmi < 25 ? { label: "น้ำหนักเกิน", position: 68 }
          : { label: "ควรดูแลน้ำหนัก", position: 88 };
  const completedFields = [age, gender, height, weight, activityLevel, budgetDaily, dailyCalories, likedFoods, selectedGoals.length || customGoals].filter(Boolean).length;
  const completeness = Math.round((completedFields / 9) * 100);

  useEffect(() => {
    const token = localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId") ?? sessionStorage.getItem("userId");
    if (!token || !userId) {
      router.replace("/login");
      return;
    }
    const authorizationTimer = window.setTimeout(() => setIsAuthorizing(false), 0);
    return () => window.clearTimeout(authorizationTimer);
  }, [router]);

  function getSessionValue(key: string) {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]);
  }

  function handleDailyBudgetChange(value: string) {
    setBudgetDaily(value);
    const dailyBudget = Number(value);
    setBudgetWeekly(value && Number.isFinite(dailyBudget) ? String(dailyBudget * 7) : "");
    setBudgetMonthly(value && Number.isFinite(dailyBudget) ? String(dailyBudget * 30) : "");
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
    const numericAge = Number(age);
    const numericHeight = Number(height);
    const numericWeight = Number(weight);
    const numericDailyBudget = Number(budgetDaily);
    const numericWeeklyBudget = Number(budgetWeekly);
    const numericMonthlyBudget = Number(budgetMonthly);
    const numericCalories = Number(dailyCalories);
    if (!age || !Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) { setError("กรุณากรอกอายุเป็นจำนวนเต็มระหว่าง 1–120 ปี"); return; }
    if (!height || !Number.isFinite(numericHeight) || numericHeight < 50 || numericHeight > 250) { setError("กรุณากรอกส่วนสูงระหว่าง 50–250 ซม."); return; }
    if (!weight || !Number.isFinite(numericWeight) || numericWeight < 10 || numericWeight > 400) { setError("กรุณากรอกน้ำหนักระหว่าง 10–400 กก."); return; }
    if (!budgetDaily || !Number.isFinite(numericDailyBudget) || numericDailyBudget < 1 || numericDailyBudget > 1000000) { setError("กรุณากรอกงบรายวันระหว่าง 1–1,000,000 บาท"); return; }
    if (!budgetWeekly || !Number.isFinite(numericWeeklyBudget) || numericWeeklyBudget < 1 || numericWeeklyBudget > 7000000) { setError("กรุณากรอกงบรายสัปดาห์ระหว่าง 1–7,000,000 บาท"); return; }
    if (!budgetMonthly || !Number.isFinite(numericMonthlyBudget) || numericMonthlyBudget < 1 || numericMonthlyBudget > 30000000) { setError("กรุณากรอกงบรายเดือนระหว่าง 1–30,000,000 บาท"); return; }
    if (!dailyCalories || !Number.isInteger(numericCalories) || numericCalories < 500 || numericCalories > 10000) { setError("กรุณากรอกแคลอรีเป้าหมายระหว่าง 500–10,000 kcal"); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          age: Number(age), gender, height: Number(height), weight: Number(weight), activity_level: activityLevel,
          budget_daily: budgetDaily ? Number(budgetDaily) : undefined,
          budget_weekly: budgetWeekly ? Number(budgetWeekly) : undefined,
          budget_monthly: budgetMonthly ? Number(budgetMonthly) : undefined,
          daily_target_calories: dailyCalories ? Number(dailyCalories) : undefined,
          liked_foods: splitList(likedFoods), disliked_foods: splitList(dislikedFoods), food_allergies: splitList(foodAllergies),
          health_goals_list: [...selectedGoals, ...splitList(customGoals)],
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

  if (isAuthorizing) return <main className="onboarding-page"><div className="profile-loading">กำลังตรวจสอบการเข้าสู่ระบบ...</div></main>;

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <div><span className="onboarding-kicker">FOOD PLAN</span><h1>ตั้งค่าโปรไฟล์ของคุณ</h1><p>เติมข้อมูลให้ครบ เพื่อให้เราวางแผนอาหารที่เหมาะกับสุขภาพและงบประมาณของคุณ</p></div>
        <button className="onboarding-skip" type="button" onClick={() => router.push("/dashboard")}>ไว้กรอกภายหลัง</button>
      </header>

      <form className="onboarding-layout" onSubmit={handleSubmit} noValidate>
        <div className="onboarding-main">
          {error && <p className="error-note" role="alert">{error}</p>}
          <section className="onboarding-section">
            <div className="onboarding-section-title"><span className="section-icon">◉</span><div><h2>ข้อมูลพื้นฐาน</h2><p>ใช้สำหรับคำนวณพลังงานที่เหมาะกับร่างกายของคุณ</p></div></div>
            <div className="onboarding-field-grid">
              <label className="onboarding-field"><span>อายุ</span><input required min={1} max={120} type="number" value={age} onChange={(event) => setAge(event.target.value)} placeholder="25" /></label>
              <label className="onboarding-field"><span>เพศ</span><select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">ไม่ระบุ</option><option value="หญิง">หญิง</option><option value="ชาย">ชาย</option><option value="อื่น ๆ">อื่น ๆ</option></select></label>
              <label className="onboarding-field"><span>ส่วนสูง (เซนติเมตร)</span><input required min={50} max={250} type="number" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="170" /></label>
              <label className="onboarding-field"><span>น้ำหนัก (กิโลกรัม)</span><input required min={10} max={400} type="number" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="65" /></label>
              <label className="onboarding-field onboarding-field-wide"><span>ระดับการออกกำลังกาย</span><select value={activityLevel} onChange={(event) => setActivityLevel(event.target.value)}>{activityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
          </section>

          <section className="onboarding-section">
            <div className="onboarding-section-title"><span className="section-icon">◎</span><div><h2>เป้าหมายด้านสุขภาพ</h2><p>เลือกได้มากกว่าหนึ่งข้อ</p></div></div>
            <div className="goal-selector">{goalOptions.map((goal) => { const active = selectedGoals.includes(goal.value); return <button key={goal.value} className={active ? "goal-option active" : "goal-option"} type="button" aria-pressed={active} onClick={() => toggleGoal(goal.value)}><span>{goal.icon}</span>{goal.label}</button>; })}</div>
            <label className="onboarding-field custom-goal"><span>เป้าหมายอื่น ๆ (ถ้ามี)</span><input type="text" value={customGoals} onChange={(event) => setCustomGoals(event.target.value)} placeholder="เช่น ลดโซเดียม, ดูแลหัวใจ" /></label>
          </section>

          <section className="onboarding-section">
            <div className="onboarding-section-title"><span className="section-icon">♡</span><div><h2>ความชอบด้านอาหาร</h2><p>คั่นอาหารแต่ละอย่างด้วยเครื่องหมายจุลภาค (,)</p></div></div>
            <div className="food-preference-grid">
              <label className="onboarding-field preference-like"><span>อาหารที่ชอบ</span><input type="text" value={likedFoods} onChange={(event) => setLikedFoods(event.target.value)} placeholder="ข้าวกะเพรา, สลัด, ข้าวผัด" /></label>
              <label className="onboarding-field preference-dislike"><span>อาหารที่ไม่ชอบ</span><input type="text" value={dislikedFoods} onChange={(event) => setDislikedFoods(event.target.value)} placeholder="เครื่องใน, อาหารรสจัด" /></label>
              <label className="onboarding-field preference-allergy"><span>อาหารที่แพ้</span><input type="text" value={foodAllergies} onChange={(event) => setFoodAllergies(event.target.value)} placeholder="กุ้ง, ถั่ว, นม" /></label>
            </div>
          </section>

          <section className="onboarding-section">
            <div className="onboarding-section-title"><span className="section-icon">฿</span><div><h2>งบประมาณและพลังงาน</h2><p>กำหนดขอบเขตเพื่อให้แผนอาหารทำตามได้จริง</p></div></div>
            <div className="budget-grid">
              <label className="onboarding-field"><span>งบประมาณรายวัน (บาท)</span><input required min={1} max={1000000} type="number" value={budgetDaily} onChange={(event) => handleDailyBudgetChange(event.target.value)} placeholder="200" /></label>
              <label className="onboarding-field"><span>งบประมาณรายสัปดาห์ (บาท)</span><input required min={1} max={7000000} type="number" value={budgetWeekly} onChange={(event) => setBudgetWeekly(event.target.value)} placeholder="1400" /></label>
              <label className="onboarding-field"><span>งบประมาณรายเดือน (บาท)</span><input required min={1} max={30000000} type="number" value={budgetMonthly} onChange={(event) => setBudgetMonthly(event.target.value)} placeholder="6000" /></label>
              <label className="onboarding-field"><span>แคลอรีเป้าหมายต่อวัน</span><input required min={500} max={10000} type="number" value={dailyCalories} onChange={(event) => setDailyCalories(event.target.value)} placeholder="2000" /></label>
            </div>
          </section>

          <div className="onboarding-bottom-actions"><button className="onboarding-reset" type="button" onClick={() => router.push("/login")}>กลับเข้าสู่ระบบ</button><button className="onboarding-save" type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลและเริ่มใช้งาน"}</button></div>
        </div>

        <aside className="onboarding-summary">
          <section className="summary-card bmi-card"><span className="summary-label">ดัชนีมวลกาย (BMI)</span><strong className="bmi-number">{bmi ? bmi.toFixed(1) : "—"}</strong><p>{bmiSummary.label}</p><div className="bmi-scale"><i style={{ left: `${bmiSummary.position}%` }} /></div><div className="bmi-scale-labels"><span>ผอม</span><span>ปกติ</span><span>อ้วน</span></div></section>
          <section className="summary-card calorie-card"><span className="summary-label">แคลอรีต่อวัน</span><strong>{dailyCalories ? Number(dailyCalories).toLocaleString() : "—"}</strong><p>แคลอรี/วัน</p><small>ระบบจะใช้ค่านี้เป็นเป้าหมายในการจัดเมนู</small></section>
          <section className="summary-card completeness-card"><div><span className="summary-label">ความสมบูรณ์โปรไฟล์</span><b>{completeness}%</b></div><div className="completeness-track"><span style={{ width: `${completeness}%` }} /></div><p>{completeness === 100 ? "พร้อมสร้างแผนอาหารแล้ว" : "กรอกข้อมูลอีกนิดเพื่อผลลัพธ์ที่แม่นยำขึ้น"}</p></section>
          <section className="summary-card action-card"><span className="summary-label">การดำเนินการต่อ</span><button type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button><button type="button" onClick={() => router.push("/dashboard")}>ข้ามไปหน้าหลัก</button></section>
          <p className="privacy-note">🔒 ข้อมูลของคุณจะถูกใช้เพื่อปรับแผนอาหารเท่านั้น</p>
        </aside>
      </form>
    </main>
  );
}
