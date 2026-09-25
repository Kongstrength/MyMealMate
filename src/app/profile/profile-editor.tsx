"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
export type ProfileTab = "personal" | "health" | "preferences";
type ProfileForm = {
  fullName: string; username: string; email: string; phone: string; birthday: string; age: string; gender: string;
  height: string; weight: string; activityLevel: string; dailyCalories: string; budgetDaily: string; budgetWeekly: string;
  budgetMonthly: string; likedFoods: string; dislikedFoods: string; foodAllergies: string;
  preferredFoodTypes: string[]; healthGoals: string[];
};

const emptyProfile: ProfileForm = {
  fullName: "", username: "", email: "", phone: "", birthday: "", age: "", gender: "", height: "", weight: "",
  activityLevel: "SEDENTARY", dailyCalories: "", budgetDaily: "", budgetWeekly: "", budgetMonthly: "", likedFoods: "",
  dislikedFoods: "", foodAllergies: "", preferredFoodTypes: [], healthGoals: [],
};
const healthGoalOptions = [["ลดน้ำหนัก", "↘"], ["เพิ่มน้ำหนัก", "↗"], ["คงน้ำหนัก", "⚖"], ["เพิ่มกล้ามเนื้อ", "💪"], ["ลดไขมัน", "🔥"], ["สุขภาพทั่วไป", "♥"], ["ควบคุมเบาหวาน", "♦"], ["เสริมภูมิคุ้มกัน", "✦"]] as const;
const foodTypeOptions = [["อาหารไทย", "🍲"], ["อาหารจีน", "🥢"], ["อาหารญี่ปุ่น", "🍣"], ["อาหารตะวันตก", "🍝"], ["อาหารเกาหลี", "🍚"], ["อาหารคลีน", "🥗"], ["มังสวิรัติ", "🥬"], ["ขนมหวาน", "🍰"]] as const;
const activityOptions = [["SEDENTARY", "นั่งทำงานเป็นส่วนใหญ่"], ["LIGHT_1_3", "ออกกำลังกายเบา ๆ 1-3 วัน/สัปดาห์"], ["MODERATE_3_5", "ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์"], ["ACTIVE_6_7", "ออกกำลังกายหนัก 6-7 วัน/สัปดาห์"], ["VERY_ACTIVE", "เคลื่อนไหวหรือฝึกหนักเป็นประจำ"]] as const;

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

type ProfileEditorProps = {
  initialTab?: ProfileTab;
  embedded?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
};

export function ProfileEditor({ initialTab = "personal", embedded = false, onClose, onSaved }: ProfileEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId") ?? sessionStorage.getItem("userId");
    if (!token || !userId) { router.replace("/login"); return; }
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/users/${userId}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401) { router.replace("/login"); return; }
          throw new Error(data.message ?? "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
        }
        setProfile({
          fullName: data.full_name ?? "", username: data.username ?? "", email: data.email ?? "", phone: data.phone ?? "",
          birthday: data.birthday ? String(data.birthday).slice(0, 10) : "", age: data.age ? String(data.age) : "", gender: data.gender ?? "",
          height: data.height ? String(data.height) : "", weight: data.weight ? String(data.weight) : "", activityLevel: data.activity_level ?? "SEDENTARY",
          dailyCalories: data.daily_target_calories ? String(data.daily_target_calories) : "", budgetDaily: Number(data.budget_daily) > 0 ? String(data.budget_daily) : "",
          budgetWeekly: Number(data.budget_weekly) > 0 ? String(data.budget_weekly) : "", budgetMonthly: Number(data.budget_monthly) > 0 ? String(data.budget_monthly) : "",
          likedFoods: asList(data.liked_foods).join(", "), dislikedFoods: asList(data.disliked_foods).join(", "), foodAllergies: asList(data.food_allergies).join(", "),
          preferredFoodTypes: asList(data.preferred_food_types), healthGoals: asList(data.health_goals_list),
        });
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, [router]);

  const bmi = useMemo(() => {
    const heightInMeters = Number(profile.height) / 100;
    return heightInMeters && Number(profile.weight) ? Number(profile.weight) / (heightInMeters ** 2) : 0;
  }, [profile.height, profile.weight]);

  function setField<Key extends keyof ProfileForm>(key: Key, value: ProfileForm[Key]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }
  function toggleListItem(key: "healthGoals" | "preferredFoodTypes", value: string) {
    setProfile((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    const token = localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId") ?? sessionStorage.getItem("userId");
    if (!token || !userId) { router.replace("/login"); return; }
    const age = Number(profile.age);
    const height = Number(profile.height);
    const weight = Number(profile.weight);
    const calories = Number(profile.dailyCalories);
    const budgets = [profile.budgetDaily, profile.budgetWeekly, profile.budgetMonthly].filter(Boolean).map(Number);
    if (!profile.fullName.trim()) { setError("กรุณากรอกชื่อ–นามสกุล"); return; }
    if (profile.age && (age < 1 || age > 120)) { setError("อายุต้องอยู่ระหว่าง 1–120 ปี"); return; }
    if (profile.height && (height < 50 || height > 250)) { setError("ส่วนสูงต้องอยู่ระหว่าง 50–250 ซม."); return; }
    if (profile.weight && (weight < 10 || weight > 400)) { setError("น้ำหนักต้องอยู่ระหว่าง 10–400 กก."); return; }
    if (profile.dailyCalories && (calories < 500 || calories > 10000)) { setError("แคลอรีเป้าหมายต้องอยู่ระหว่าง 500–10,000 kcal"); return; }
    if (budgets.some((budget) => !Number.isFinite(budget) || budget < 0)) { setError("งบประมาณต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป"); return; }
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: profile.fullName, phone: profile.phone, birthday: profile.birthday ? new Date(profile.birthday).toISOString() : undefined,
          age: profile.age ? Number(profile.age) : undefined, gender: profile.gender, height: profile.height ? Number(profile.height) : undefined,
          weight: profile.weight ? Number(profile.weight) : undefined, bmi: Number(bmi.toFixed(2)), activity_level: profile.activityLevel,
          daily_target_calories: profile.dailyCalories ? Number(profile.dailyCalories) : undefined,
          budget_daily: profile.budgetDaily ? Number(profile.budgetDaily) : undefined, budget_weekly: profile.budgetWeekly ? Number(profile.budgetWeekly) : undefined,
          budget_monthly: profile.budgetMonthly ? Number(profile.budgetMonthly) : undefined, liked_foods: splitList(profile.likedFoods),
          disliked_foods: splitList(profile.dislikedFoods), food_allergies: splitList(profile.foodAllergies),
          preferred_food_types: profile.preferredFoodTypes, health_goals_list: profile.healthGoals,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(", ") : data.message ?? "บันทึกข้อมูลไม่สำเร็จ");
      setSuccess("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว");
      onSaved?.();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "เกิดข้อผิดพลาด"); }
    finally { setIsSaving(false); }
  }

  if (isLoading) return <main className={`edit-profile-page${embedded ? " edit-profile-embedded" : ""}`}><div className="profile-loading">กำลังโหลดโปรไฟล์...</div></main>;

  return <main className={`edit-profile-page${embedded ? " edit-profile-embedded" : ""}`}>
    <header className="edit-profile-header"><div><span>บัญชีของฉัน</span><h1 id="profile-editor-title">แก้ไขโปรไฟล์</h1><p>จัดการข้อมูลส่วนตัว สุขภาพ และความชอบของคุณ</p></div>{embedded ? <button className="profile-close-button" type="button" onClick={onClose} aria-label="ปิดหน้าต่างแก้ไขโปรไฟล์">×</button> : <Link href="/dashboard">← กลับหน้าหลัก</Link>}</header>
    <form className="edit-profile-layout" onSubmit={handleSubmit}>
      <aside className="edit-profile-sidebar">
        <div className="edit-profile-avatar">{profile.fullName.charAt(0) || profile.username.charAt(0) || "ผ"}<span>✎</span></div>
        <h2>{profile.fullName || profile.username || "ผู้ใช้งาน"}</h2><p>{profile.email}</p>
        <nav aria-label="หมวดหมู่โปรไฟล์">
          <button className={activeTab === "personal" ? "active" : ""} type="button" onClick={() => setActiveTab("personal")}><span>♙</span>ข้อมูลส่วนตัว</button>
          <button className={activeTab === "health" ? "active" : ""} type="button" onClick={() => setActiveTab("health")}><span>♡</span>ข้อมูลสุขภาพ</button>
          <button className={activeTab === "preferences" ? "active" : ""} type="button" onClick={() => setActiveTab("preferences")}><span>⚙</span>ความชอบ</button>
        </nav>
      </aside>
      <section className="edit-profile-content">
        {error && <p className="error-note" role="alert">{error}</p>}{success && <p className="success-note" role="status">{success}</p>}
        {activeTab === "personal" && <div className="profile-tab-panel">
          <div className="profile-panel-heading"><span>♙</span><div><h2>ข้อมูลส่วนตัว</h2><p>ข้อมูลพื้นฐานสำหรับบัญชีของคุณ</p></div></div>
          <div className="profile-form-grid">
            <label><span>ชื่อ–นามสกุล</span><input required maxLength={120} value={profile.fullName} onChange={(event) => setField("fullName", event.target.value)} /></label>
            <label><span>ชื่อผู้ใช้</span><input value={profile.username} disabled /></label>
            <label><span>เบอร์โทรศัพท์</span><input maxLength={20} value={profile.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="081-234-5678" /></label>
            <label><span>อีเมล</span><input value={profile.email} disabled /></label>
            <label><span>วันเกิด</span><input type="date" value={profile.birthday} onChange={(event) => setField("birthday", event.target.value)} /></label>
            <label><span>อายุ</span><input min={1} max={120} type="number" value={profile.age} onChange={(event) => setField("age", event.target.value)} /></label>
            <label><span>เพศ</span><select value={profile.gender} onChange={(event) => setField("gender", event.target.value)}><option value="">ไม่ระบุ</option><option value="หญิง">หญิง</option><option value="ชาย">ชาย</option><option value="อื่น ๆ">อื่น ๆ</option></select></label>
          </div>
        </div>}
        {activeTab === "health" && <div className="profile-tab-panel">
          <div className="profile-panel-heading"><span>♡</span><div><h2>ข้อมูลสุขภาพ</h2><p>ใช้คำนวณ BMI และวางแผนพลังงานประจำวัน</p></div></div>
          <h3 className="profile-subheading">เป้าหมายสุขภาพ</h3>
          <div className="profile-choice-grid">{healthGoalOptions.map(([goal, icon]) => <button key={goal} className={profile.healthGoals.includes(goal) ? "selected" : ""} type="button" onClick={() => toggleListItem("healthGoals", goal)}><span>{icon}</span>{goal}</button>)}</div>
          <div className="profile-form-grid profile-health-fields">
            <label><span>น้ำหนัก (กก.)</span><input min={10} type="number" value={profile.weight} onChange={(event) => setField("weight", event.target.value)} /></label>
            <label><span>ส่วนสูง (ซม.)</span><input min={50} type="number" value={profile.height} onChange={(event) => setField("height", event.target.value)} /></label>
            <label className="profile-field-wide"><span>ระดับการออกกำลังกาย</span><select value={profile.activityLevel} onChange={(event) => setField("activityLevel", event.target.value)}>{activityOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          </div>
          <div className="profile-health-summary"><div><span>BMI ปัจจุบัน</span><strong>{bmi ? bmi.toFixed(1) : "—"}</strong><small>{bmi && bmi < 23 ? "อยู่ในเกณฑ์ปกติ" : "ค่าประเมินเบื้องต้น"}</small></div><label><span>แคลอรีเป้าหมาย/วัน</span><input min={500} max={10000} type="number" value={profile.dailyCalories} onChange={(event) => setField("dailyCalories", event.target.value)} /><small>kcal</small></label></div>
          <h3 className="profile-subheading">งบประมาณอาหาร</h3>
          <div className="profile-form-grid profile-budget-fields">
            <label><span>รายวัน (บาท)</span><input min={0} type="number" value={profile.budgetDaily} onChange={(event) => setField("budgetDaily", event.target.value)} /></label>
            <label><span>รายสัปดาห์ (บาท)</span><input min={0} type="number" value={profile.budgetWeekly} onChange={(event) => setField("budgetWeekly", event.target.value)} /></label>
            <label><span>รายเดือน (บาท)</span><input min={0} type="number" value={profile.budgetMonthly} onChange={(event) => setField("budgetMonthly", event.target.value)} /></label>
          </div>
        </div>}
        {activeTab === "preferences" && <div className="profile-tab-panel">
          <div className="profile-panel-heading"><span>⚙</span><div><h2>ความชอบด้านอาหาร</h2><p>ช่วยให้ AI เลือกเมนูที่เหมาะกับคุณมากขึ้น</p></div></div>
          <div className="profile-list-fields">
            <label className="like"><span>อาหารที่ชอบ</span><input value={profile.likedFoods} onChange={(event) => setField("likedFoods", event.target.value)} placeholder="ข้าวผัด, สลัด, กะเพรา" /><small>คั่นแต่ละรายการด้วยเครื่องหมายจุลภาค (,)</small></label>
            <label className="avoid"><span>อาหารที่ไม่ชอบ</span><input value={profile.dislikedFoods} onChange={(event) => setField("dislikedFoods", event.target.value)} placeholder="เครื่องใน, อาหารรสจัด" /></label>
            <label className="allergy"><span>อาหารที่แพ้</span><input value={profile.foodAllergies} onChange={(event) => setField("foodAllergies", event.target.value)} placeholder="กุ้ง, ถั่ว, นม" /></label>
          </div>
          <h3 className="profile-subheading">ประเภทอาหารที่ชอบ</h3>
          <div className="profile-choice-grid food-types">{foodTypeOptions.map(([type, icon]) => <button key={type} className={profile.preferredFoodTypes.includes(type) ? "selected" : ""} type="button" onClick={() => toggleListItem("preferredFoodTypes", type)}><span>{icon}</span>{type}</button>)}</div>
        </div>}
        <div className="profile-save-row">{embedded ? <button className="profile-cancel-button" type="button" onClick={onClose}>ยกเลิก</button> : <Link href="/dashboard">ยกเลิก</Link>}<button type="submit" disabled={isSaving}>{isSaving ? "กำลังบันทึก..." : "▣ บันทึกข้อมูล"}</button></div>
      </section>
    </form>
  </main>;
}


