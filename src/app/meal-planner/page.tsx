"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteMealPlan, fetchMealPlansByRange, fetchRecipes, saveMealPlan } from "../../lib/api";
import { addDays, getMonday, MEAL_LABELS, type MealPlan, type MealPlanRange, type MealRecipe, toDateKey } from "../../lib/meal-plan-types";

const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const dayIcons = ["🌙", "🧡", "🔥", "🌿", "💗", "🍲", "☀️"];

export default function MealPlannerPage() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<MealRecipe[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const from = toDateKey(weekDays[0]);
  const to = toDateKey(weekDays[6]);
  const plansByDate = useMemo(() => new Map(plans.map((plan) => [plan.date, plan])), [plans]);

  const loadPlanner = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [range, recipeList] = await Promise.all([
        fetchMealPlansByRange<MealPlanRange>(from, to),
        fetchRecipes<MealRecipe[]>(),
      ]);
      setPlans(range.plans);
      setRecipes(recipeList);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === "AUTH_REQUIRED") {
        router.replace("/login");
        return;
      }
      setError(loadError instanceof Error ? loadError.message : "โหลดแผนอาหารไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [from, router, to]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadPlanner();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [loadPlanner, refreshKey]);

  const weekMeals = plans.reduce((sum, plan) => sum + plan.items.length, 0);
  const weekCalories = plans.reduce((sum, plan) => sum + plan.totalCalories, 0);
  const weekCost = plans.reduce((sum, plan) => sum + plan.totalCost, 0);
  const averageCost = weekMeals > 0 ? weekCost / weekMeals : 0;

  function shiftWeek(amount: number) {
    const next = addDays(weekStart, amount * 7);
    setWeekStart(next);
    setSelectedDate(toDateKey(next));
  }

  async function addRecipe(date: string, recipe: MealRecipe) {
    const currentPlan = plansByDate.get(date);
    const items = (currentPlan?.items ?? [])
      .filter((item) => item.mealType !== recipe.mealType)
      .map((item) => ({ recipe_id: item.recipe.id, meal_type: item.mealType, servings: item.servings }));
    items.push({ recipe_id: recipe.id, meal_type: recipe.mealType, servings: 1 });

    setIsSaving(true);
    setError("");
    try {
      await saveMealPlan(date, items);
      setPickerDate(null);
      setSelectedDate(date);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกมื้ออาหารไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMeal(plan: MealPlan, itemId: string) {
    const remaining = plan.items.filter((item) => item.id !== itemId);
    setIsSaving(true);
    try {
      if (remaining.length === 0) {
        await deleteMealPlan(plan.id);
      } else {
        await saveMealPlan(plan.date, remaining.map((item) => ({ recipe_id: item.recipe.id, meal_type: item.mealType, servings: item.servings })));
      }
      setRefreshKey((value) => value + 1);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "ลบมื้ออาหารไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function generateWeek() {
    const grouped = ["BREAKFAST", "LUNCH", "DINNER"].map((mealType) => ({ mealType, recipes: recipes.filter((recipe) => recipe.mealType === mealType) }));
    if (grouped.some((group) => group.recipes.length === 0)) {
      setError("ต้องมีเมนูอย่างน้อยหนึ่งรายการสำหรับมื้อเช้า กลางวัน และเย็น");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await Promise.all(weekDays.map((date, dayIndex) => saveMealPlan(toDateKey(date), grouped.map((group) => {
        const recipe = group.recipes[dayIndex % group.recipes.length];
        return { recipe_id: recipe.id, meal_type: group.mealType, servings: 1 };
      }))));
      setRefreshKey((value) => value + 1);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "สร้างแผนรายสัปดาห์ไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function clearWeek() {
    if (plans.length === 0 || !window.confirm("ลบแผนอาหารทั้งหมดในสัปดาห์นี้ใช่หรือไม่?")) return;
    setIsSaving(true);
    try {
      await Promise.all(plans.map((plan) => deleteMealPlan(plan.id)));
      setRefreshKey((value) => value + 1);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "ล้างแผนอาหารไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  const rangeLabel = `${weekDays[0].toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <main className="planner-page">
      <header className="home-nav">
        <Link className="home-brand" href="/dashboard"><span className="home-brand-mark">🍽</span><strong>กินดี</strong></Link>
        <nav className="home-links" aria-label="เมนูหลัก"><Link href="/dashboard">หน้าหลัก</Link><Link href="/ai-recommend">AI แนะนำเมนู</Link><Link className="active" href="/meal-planner">วางแผนมื้ออาหาร</Link><Link href="/reports">รายงาน</Link><Link href="/nearby-markets">ตลาดใกล้ฉัน</Link></nav>
        <Link className="market-back-link" href="/dashboard">← กลับหน้าหลัก</Link>
      </header>

      <div className="planner-wrap">
        <section className="planner-hero">
          <div className="planner-title"><span>▣</span><div><h1>วางแผนมื้ออาหาร</h1><p>จัดการแผนอาหารรายสัปดาห์ พร้อมควบคุมงบประมาณ</p></div></div>
          <div className="planner-hero-actions"><button disabled={isSaving || recipes.length === 0} onClick={() => void generateWeek()} type="button">▣ สร้างแผนอัตโนมัติ</button><button className="danger" disabled={isSaving || plans.length === 0} onClick={() => void clearWeek()} type="button">♲ ลบเมนูทั้งหมด</button></div>
        </section>

        {error && <p className="planner-error" role="alert">{error}</p>}

        <section className="planner-calendar-card">
          <div className="planner-week-nav"><button onClick={() => shiftWeek(-1)} type="button">‹</button><div><strong>{rangeLabel}</strong><small>แตะวันที่เพื่อเลือกวันสำหรับเพิ่มเมนู</small></div><button onClick={() => shiftWeek(1)} type="button">›</button><button className="planner-today" onClick={() => { const monday = getMonday(new Date()); setWeekStart(monday); setSelectedDate(toDateKey(new Date())); }} type="button">วันนี้</button></div>

          {isLoading ? <div className="planner-loading">กำลังโหลดแผนอาหาร...</div> : (
            <div className="planner-week-grid">
              {weekDays.map((date, index) => {
                const dateKey = toDateKey(date);
                const plan = plansByDate.get(dateKey);
                return <article className={selectedDate === dateKey ? "planner-day selected" : "planner-day"} key={dateKey} onClick={() => setSelectedDate(dateKey)}><header><span>{dayIcons[index]} {dayNames[index]}</span><small>{date.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" })}</small></header><div className="planner-day-meals">{plan?.items.map((item) => <div className={`planner-meal ${item.mealType.toLowerCase()}`} key={item.id}><button aria-label={`ลบ ${item.recipe.name}`} disabled={isSaving} onClick={(event) => { event.stopPropagation(); void removeMeal(plan, item.id); }} type="button">×</button><span>{item.recipe.emoji ?? "🍽"} {MEAL_LABELS[item.mealType]}</span><strong>{item.recipe.name}</strong><small>{item.calories.toLocaleString()} kcal</small><b>{item.cost.toLocaleString()} บาท</b></div>)}<button className="planner-add-meal" onClick={(event) => { event.stopPropagation(); setPickerDate(dateKey); setSelectedDate(dateKey); }} type="button"><span>＋</span>เพิ่มมื้ออาหาร</button></div></article>;
              })}
            </div>
          )}

          <div className="planner-summary"><strong>สรุปประจำสัปดาห์</strong><div><span><b>{weekMeals}</b>มื้ออาหารทั้งหมด</span><span><b>{weekCalories.toLocaleString()}</b>แคลอรี่ทั้งหมด</span><span><b>{weekCost.toLocaleString()}</b>ค่าใช้จ่าย (บาท)</span><span><b>{averageCost.toFixed(0)}</b>เฉลี่ยต่อมื้อ (บาท)</span></div></div>
        </section>

        <section className="planner-suggestions">
          <div className="planner-section-heading"><div><h2>เมนูแนะนำสำหรับคุณ</h2><p>เลือกเพิ่มลงในวันที่ {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}</p></div><Link href="/ai-recommend">ให้ AI แนะนำ →</Link></div>
          <div className="planner-recipe-grid">{recipes.slice(0, 4).map((recipe, index) => <article key={recipe.id}><div className={`planner-recipe-cover tone-${index % 4}`}><span>{recipe.emoji ?? "🍽"}</span></div><div className="planner-recipe-copy"><small>{MEAL_LABELS[recipe.mealType]}</small><h3>{recipe.name}</h3><p>{recipe.calories} kcal · {recipe.estimatedCost} บาท</p><button disabled={isSaving} onClick={() => void addRecipe(selectedDate, recipe)} type="button">เพิ่ม</button></div></article>)}</div>
        </section>
      </div>

      {pickerDate && <div className="meal-picker-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPickerDate(null); }} role="presentation"><section aria-labelledby="meal-picker-title" aria-modal="true" className="meal-picker" role="dialog"><div className="meal-picker-heading"><div><h2 id="meal-picker-title">เลือกเมนูอาหาร</h2><p>{new Date(`${pickerDate}T12:00:00`).toLocaleDateString("th-TH", { dateStyle: "long" })}</p></div><button onClick={() => setPickerDate(null)} type="button">×</button></div><div className="meal-picker-list">{recipes.map((recipe) => <button disabled={isSaving} key={recipe.id} onClick={() => void addRecipe(pickerDate, recipe)} type="button"><span>{recipe.emoji ?? "🍽"}</span><div><strong>{recipe.name}</strong><small>{MEAL_LABELS[recipe.mealType]} · {recipe.calories} kcal · {recipe.estimatedCost} บาท</small></div><b>＋</b></button>)}</div></section></div>}
    </main>
  );
}
