"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { fetchAiRecommendMenu, getStoredAccessToken, saveAiMealPlan } from "../../lib/api";

type Ingredient = {
  name: string;
  amount: string;
  estimated_price: number;
};

type Meal = {
  meal_type: string;
  menu_name: string;
  description: string;
  ingredients: Ingredient[];
  estimated_cost: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  cooking_tips: string;
};

type AiResult = {
  daily_budget: number;
  total_estimated_cost: number;
  total_calories: number;
  meals: Meal[];
  market_summary: string;
};

const MEAL_TYPE_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  BREAKFAST: { label: "มื้อเช้า", emoji: "🌅", color: "sunrise" },
  LUNCH: { label: "มื้อกลางวัน", emoji: "☀️", color: "midday" },
  DINNER: { label: "มื้อเย็น", emoji: "🌙", color: "evening" },
  SNACK: { label: "ของว่าง", emoji: "🍪", color: "snack" },
};

export default function AiRecommendPage() {
  const router = useRouter();
  const [budget, setBudget] = useState("200");
  const [mealsCount, setMealsCount] = useState("3");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  useEffect(() => {
    if (!getStoredAccessToken()) router.replace("/login");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSaved(false);
    setSaveError("");
    setLoading(true);

    try {
      const data = await fetchAiRecommendMenu({
        budget: Number(budget),
        meals_count: Number(mealsCount),
        preferences: preferences || undefined,
      });
      setResult(data);
    } catch (submitError: unknown) {
      if (submitError instanceof Error && submitError.message === "AUTH_REQUIRED") {
        router.replace("/login");
        return;
      }
      setError(submitError instanceof Error ? submitError.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaveError("");
    setSaving(true);
    try {
      await saveAiMealPlan(
        result.meals.map((meal) => ({
          meal_type: meal.meal_type,
          menu_name: meal.menu_name,
          estimated_cost: meal.estimated_cost,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
        })),
        today,
      );
      setSaved(true);
    } catch (saveErr: unknown) {
      if (saveErr instanceof Error && saveErr.message === "AUTH_REQUIRED") {
        router.replace("/login");
        return;
      }
      setSaveError(saveErr instanceof Error ? saveErr.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="home-page">
      <header className="home-nav">
        <Link className="home-brand" href="/dashboard"><span className="home-brand-mark">🍽</span><strong>กินดี</strong></Link>
        <nav className="home-links" aria-label="เมนูหลัก">
          <Link href="/dashboard">หน้าหลัก</Link>
          <Link className="active" href="/ai-recommend">AI แนะนำเมนู</Link>
        </nav>
        <div className="home-user">
          <Link href="/dashboard" className="outline-button" style={{ fontSize: 12 }}>← กลับ Dashboard</Link>
        </div>
      </header>

      <div className="ai-page-wrap">
        {/* Input Form */}
        <section className="ai-form-card">
          <div className="ai-form-header">
            <span className="ai-icon">✨</span>
            <div>
              <h1>AI แนะนำเมนูอาหาร</h1>
              <p>วางแผนมื้ออาหารด้วย AI พร้อมราคาวัตถุดิบจริงจากกระทรวงพาณิชย์</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="ai-form">
            <div className="ai-field-grid">
              <label className="field">
                <span>💰 งบประมาณต่อวัน (บาท)</span>
                <input type="number" min={50} max={10000} value={budget}
                  onChange={(e) => setBudget(e.target.value)} placeholder="200" required />
              </label>
              <label className="field">
                <span>🍽 จำนวนมื้อ</span>
                <select value={mealsCount} onChange={(e) => setMealsCount(e.target.value)}>
                  <option value="1">1 มื้อ</option>
                  <option value="2">2 มื้อ</option>
                  <option value="3">3 มื้อ</option>
                  <option value="4">4 มื้อ</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>📝 ความต้องการเพิ่มเติม (ถ้ามี)</span>
              <input type="text" value={preferences} onChange={(e) => setPreferences(e.target.value)}
                placeholder="เช่น ไม่ทานเผ็ด, อาหารคลีน, มังสวิรัติ" />
            </label>
            <button className="ai-submit-btn" type="submit" disabled={loading}>
              {loading ? (<><span className="ai-spinner" />กำลังคิดเมนูให้คุณ...</>) : (<>✨ ให้ AI แนะนำเมนู</>)}
            </button>
          </form>
          {error && <p className="error-note" role="alert">{error}</p>}
        </section>

        {/* Loading State */}
        {loading && (
          <section className="ai-loading-card">
            <div className="ai-loading-animation">
              <span className="ai-pulse-dot" /><span className="ai-pulse-dot" /><span className="ai-pulse-dot" />
            </div>
            <h2>AI กำลังวิเคราะห์ราคาตลาดและจัดเมนูให้คุณ</h2>
            <p>กำลังดึงราคาวัตถุดิบจากกระทรวงพาณิชย์ + วิเคราะห์โภชนาการ...</p>
          </section>
        )}

        {/* Results */}
        {result && (
          <div className="ai-results">
            {/* Save Success Banner */}
            {saved && (
              <div className="ai-save-banner">
                <span>🎉</span>
                <div>
                  <strong>บันทึกแผนอาหารสำเร็จ!</strong>
                  <p>เมนูวันนี้ถูกบันทึกแล้ว ไปดูที่ Dashboard ได้เลย</p>
                </div>
                <Link href="/dashboard" className="ai-banner-link">ไป Dashboard →</Link>
              </div>
            )}

            {/* Summary Strip */}
            <section className="ai-summary-strip">
              <div className="ai-summary-item">
                <span className="ai-summary-label">งบประมาณ</span>
                <strong>฿{result.daily_budget}</strong>
              </div>
              <div className="ai-summary-divider" />
              <div className="ai-summary-item">
                <span className="ai-summary-label">ค่าใช้จ่ายรวม</span>
                <strong className="cost">฿{result.total_estimated_cost}</strong>
              </div>
              <div className="ai-summary-divider" />
              <div className="ai-summary-item">
                <span className="ai-summary-label">แคลอรี่รวม</span>
                <strong>{result.total_calories?.toLocaleString()} kcal</strong>
              </div>
              <div className="ai-summary-divider" />
              <div className="ai-summary-item">
                <span className="ai-summary-label">ประหยัดได้</span>
                <strong className="saved">฿{Math.max(0, result.daily_budget - result.total_estimated_cost)}</strong>
              </div>
            </section>

            {/* Meal Cards */}
            <div className="ai-meals-grid">
              {result.meals.map((meal, index) => {
                const meta = MEAL_TYPE_MAP[meal.meal_type] ?? { label: meal.meal_type, emoji: "🍽", color: "midday" };
                return (
                  <article className={`ai-meal-card ${meta.color}`} key={index}>
                    <div className="ai-meal-header">
                      <span className="ai-meal-emoji">{meta.emoji}</span>
                      <div>
                        <span className="ai-meal-type">{meta.label}</span>
                        <h3>{meal.menu_name}</h3>
                      </div>
                      <span className="ai-meal-price">฿{meal.estimated_cost}</span>
                    </div>
                    {meal.description && <p className="ai-meal-desc">{meal.description}</p>}
                    <div className="ai-nutrition-pills">
                      <span className="pill cal">{meal.calories} kcal</span>
                      <span className="pill pro">P {meal.protein_g}g</span>
                      <span className="pill carb">C {meal.carbs_g}g</span>
                      <span className="pill fat">F {meal.fat_g}g</span>
                    </div>
                    <div className="ai-ingredients">
                      <span className="ai-ingredients-label">วัตถุดิบ</span>
                      {meal.ingredients.map((ing, i) => (
                        <div className="ai-ingredient-row" key={i}>
                          <span>{ing.name}</span>
                          <span className="ai-ing-amount">{ing.amount}</span>
                          <span className="ai-ing-price">฿{ing.estimated_price}</span>
                        </div>
                      ))}
                    </div>
                    {meal.cooking_tips && (
                      <div className="ai-tips"><span>💡</span><p>{meal.cooking_tips}</p></div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Market Summary */}
            {result.market_summary && (
              <section className="ai-market-summary">
                <span className="ai-market-icon">📊</span>
                <div>
                  <strong>สรุปราคาตลาดวันนี้</strong>
                  <p>{result.market_summary}</p>
                </div>
              </section>
            )}

            {/* Action Buttons */}
            {saveError && <p className="error-note" role="alert" style={{ marginTop: 14 }}>{saveError}</p>}
            <div className="ai-actions-row">
              {!saved && (
                <button className="ai-save-btn" type="button" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="ai-spinner" />กำลังบันทึก...</> : <>💾 บันทึกเมนูวันนี้</>}
                </button>
              )}
              <button className="ai-reset-btn" type="button" onClick={() => { setResult(null); setError(""); setSaved(false); setSaveError(""); }}>
                🔄 สร้างเมนูใหม่
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
