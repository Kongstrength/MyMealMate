"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDashboard, fetchMealPlansByRange } from "../../lib/api";
import { addDays, type MealPlanRange, toDateKey } from "../../lib/meal-plan-types";

type DashboardProfile = {
  user: {
    budget_daily: number;
    daily_target_calories: number;
    health_goals_list: string[] | null;
  };
};

const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export default function ReportsPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(() => toDateKey(new Date()).slice(0, 7));
  const [range, setRange] = useState<MealPlanRange>({ from: "", to: "", plans: [] });
  const [profile, setProfile] = useState<DashboardProfile["user"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const monthRange = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const first = new Date(year, month - 1, 1, 12);
    const last = new Date(year, month, 0, 12);
    return { first, last, from: toDateKey(first), to: toDateKey(last), days: last.getDate() };
  }, [selectedMonth]);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [mealPlans, dashboard] = await Promise.all([
        fetchMealPlansByRange<MealPlanRange>(monthRange.from, monthRange.to),
        fetchDashboard(monthRange.from) as Promise<DashboardProfile>,
      ]);
      setRange(mealPlans);
      setProfile(dashboard.user);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === "AUTH_REQUIRED") {
        router.replace("/login");
        return;
      }
      setError(loadError instanceof Error ? loadError.message : "โหลดรายงานไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [monthRange.from, monthRange.to, router]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadReport();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [loadReport]);

  const totals = useMemo(() => {
    const meals = range.plans.flatMap((plan) => plan.items);
    return {
      meals: meals.length,
      calories: range.plans.reduce((sum, plan) => sum + plan.totalCalories, 0),
      cost: range.plans.reduce((sum, plan) => sum + plan.totalCost, 0),
      protein: meals.reduce((sum, item) => sum + item.recipe.protein * item.servings, 0),
      carbs: meals.reduce((sum, item) => sum + item.recipe.carbs * item.servings, 0),
      fat: meals.reduce((sum, item) => sum + item.recipe.fat * item.servings, 0),
    };
  }, [range.plans]);

  const activeDays = range.plans.length;
  const averageCalories = activeDays > 0 ? totals.calories / activeDays : 0;
  const averageCost = activeDays > 0 ? totals.cost / activeDays : 0;
  const targetCalories = profile?.daily_target_calories ?? 0;
  const targetBudget = profile?.budget_daily ?? 0;
  const averageProtein = activeDays > 0 ? totals.protein / activeDays : 0;
  const averageCarbs = activeDays > 0 ? totals.carbs / activeDays : 0;
  const averageFat = activeDays > 0 ? totals.fat / activeDays : 0;

  const chartDays = useMemo(() => {
    const byDate = new Map(range.plans.map((plan) => [plan.date, plan.totalCalories]));
    return Array.from({ length: monthRange.days }, (_, index) => {
      const date = addDays(monthRange.first, index);
      return { date, value: byDate.get(toDateKey(date)) ?? 0 };
    });
  }, [monthRange.days, monthRange.first, range.plans]);

  const chartPoints = useMemo(() => {
    const max = Math.max(targetCalories, ...chartDays.map((day) => day.value), 1);
    return chartDays.map((day, index) => ({
      x: chartDays.length === 1 ? 20 : 20 + (index / (chartDays.length - 1)) * 560,
      y: 180 - (day.value / max) * 145,
    }));
  }, [chartDays, targetCalories]);
  const chartPath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  const macroTotal = averageCarbs + averageProtein + averageFat;
  const macroEnergy = averageCarbs * 4 + averageProtein * 4 + averageFat * 9;
  const carbPct = macroEnergy > 0 ? ((averageCarbs * 4) / macroEnergy) * 100 : 0;
  const proteinPct = macroEnergy > 0 ? ((averageProtein * 4) / macroEnergy) * 100 : 0;
  const fatPct = Math.max(0, 100 - carbPct - proteinPct);

  const calorieGoal = targetCalories > 0 ? Math.min(100, (averageCalories / targetCalories) * 100) : 0;
  const budgetGoal = targetBudget > 0 ? Math.min(100, (averageCost / targetBudget) * 100) : 0;
  const proteinGoal = Math.min(100, (averageProtein / 75) * 100);
  const planningGoal = Math.min(100, (totals.meals / (monthRange.days * 3)) * 100);

  function exportCsv() {
    const rows = [
      ["วันที่", "จำนวนมื้อ", "แคลอรี่", "ค่าใช้จ่าย"],
      ...range.plans.map((plan) => [plan.date, plan.items.length, plan.totalCalories, plan.totalCost]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `food-report-${selectedMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const monthLabel = `${thaiMonths[monthRange.first.getMonth()]} ${monthRange.first.getFullYear() + 543}`;
  const nutritionRows = [
    { name: "คาร์โบไฮเดรต", actual: averageCarbs, target: 250, color: "blue" },
    { name: "โปรตีน", actual: averageProtein, target: 75, color: "green" },
    { name: "ไขมัน", actual: averageFat, target: 65, color: "yellow" },
    { name: "แคลอรี่", actual: averageCalories, target: targetCalories, color: "purple" },
    { name: "ค่าอาหาร", actual: averageCost, target: targetBudget, color: "orange" },
  ];

  return (
    <main className="reports-page">
      <header className="home-nav">
        <Link className="home-brand" href="/dashboard"><span className="home-brand-mark">🍽</span><strong>กินดี</strong></Link>
        <nav className="home-links" aria-label="เมนูหลัก"><Link href="/dashboard">หน้าหลัก</Link><Link href="/ai-recommend">AI แนะนำเมนู</Link><Link href="/meal-planner">วางแผนมื้ออาหาร</Link><Link className="active" href="/reports">รายงาน</Link><Link href="/nearby-markets">ตลาดใกล้ฉัน</Link></nav>
        <Link className="market-back-link" href="/dashboard">← กลับหน้าหลัก</Link>
      </header>

      <div className="reports-wrap">
        <section className="reports-heading"><div><h1>รายงานและสถิติ</h1><p>ติดตามการรับประทาน งบประมาณ และความคืบหน้าเป้าหมายของคุณ</p></div><div><input aria-label="เลือกเดือน" onChange={(event) => setSelectedMonth(event.target.value)} type="month" value={selectedMonth} /><button disabled={range.plans.length === 0} onClick={exportCsv} type="button">ส่งออกรายงาน</button></div></section>
        {error && <p className="planner-error" role="alert">{error}</p>}

        {isLoading ? <div className="reports-loading">กำลังประมวลผลรายงาน...</div> : <>
          <section className="report-kpis">
            <article><small>แคลอรี่เฉลี่ย</small><strong>{averageCalories.toFixed(0)} <span>kcal/วัน</span></strong><p>เป้าหมาย {targetCalories.toLocaleString()} kcal</p><i><b style={{ width: `${calorieGoal}%` }} /></i></article>
            <article><small>โปรตีน</small><strong>{averageProtein.toFixed(0)} <span>กรัม/วัน</span></strong><p>เป้าหมาย 75 กรัม</p><i className="blue"><b style={{ width: `${proteinGoal}%` }} /></i></article>
            <article><small>งบประมาณ</small><strong>{averageCost.toFixed(0)} <span>บาท/วัน</span></strong><p>เป้าหมาย {targetBudget.toLocaleString()} บาท</p><i className="teal"><b style={{ width: `${budgetGoal}%` }} /></i></article>
            <article><small>แผนอาหารเดือนนี้</small><strong>{totals.meals} <span>มื้อ</span></strong><p>วางแผนแล้ว {planningGoal.toFixed(0)}%</p><i className="purple"><b style={{ width: `${planningGoal}%` }} /></i></article>
          </section>

          <section className="report-chart-card">
            <div className="calorie-chart"><h2>แคลอรี่รายวัน</h2><svg aria-label="กราฟแคลอรี่รายวัน" role="img" viewBox="0 0 600 210"><line x1="20" x2="580" y1="180" y2="180" /><line x1="20" x2="580" y1="35" y2="35" /><path className="chart-area" d={`${chartPath} L${chartPoints.at(-1)?.x ?? 580},180 L20,180 Z`} /><path className="chart-line" d={chartPath} />{chartPoints.filter((_, index) => index % Math.max(1, Math.floor(chartPoints.length / 8)) === 0).map((point, index) => <circle cx={point.x} cy={point.y} key={index} r="3" />)}</svg><div className="chart-labels"><span>1 {thaiMonths[monthRange.first.getMonth()].slice(0, 3)}</span><span>{monthRange.days} {thaiMonths[monthRange.first.getMonth()].slice(0, 3)}</span></div></div>
            <div className="macro-chart"><h2>สัดส่วนสารอาหาร</h2><div className="macro-donut" style={{ background: `conic-gradient(#f4a30b 0 ${carbPct}%, #3b82f6 ${carbPct}% ${carbPct + proteinPct}%, #ef4444 ${carbPct + proteinPct}% 100%)` }}><span><b>{macroTotal.toFixed(0)}</b>กรัม/วัน</span></div><div className="macro-legend"><span><i className="carb" />คาร์โบไฮเดรต {carbPct.toFixed(0)}%</span><span><i className="protein" />โปรตีน {proteinPct.toFixed(0)}%</span><span><i className="fat" />ไขมัน {fatPct.toFixed(0)}%</span></div></div>
          </section>

          <section className="nutrition-table-card"><h2>รายละเอียดสารอาหาร</h2><div className="nutrition-table"><div className="nutrition-row head"><span>รายการ</span><span>บริโภคเฉลี่ย</span><span>เป้าหมาย</span><span>% ของเป้าหมาย</span></div>{nutritionRows.map((row) => { const pct = row.target > 0 ? Math.round((row.actual / row.target) * 100) : 0; const unit = row.name === "แคลอรี่" ? "kcal" : row.name === "ค่าอาหาร" ? "บาท" : "กรัม"; return <div className="nutrition-row" key={row.name}><strong>{row.name}</strong><span>{row.actual.toFixed(1)} {unit}</span><span>{row.target.toLocaleString()} {unit}</span><span><b className={row.color}>{pct}%</b></span></div>; })}</div></section>

          <section className="report-goals"><div className="report-goals-heading"><div><h2>ความคืบหน้าเป้าหมาย</h2><p>{profile?.health_goals_list?.join(" · ") || "เป้าหมายประจำเดือนของคุณ"}</p></div><Link href="/dashboard">แก้ไขเป้าหมาย</Link></div><div className="report-goal-grid"><GoalCard title="ควบคุมแคลอรี่รายวัน" detail={`เฉลี่ย ${averageCalories.toFixed(0)} จาก ${targetCalories} kcal`} progress={calorieGoal} /><GoalCard title="ควบคุมค่าใช้จ่ายอาหาร" detail={`เฉลี่ย ${averageCost.toFixed(0)} จาก ${targetBudget} บาท/วัน`} progress={targetBudget > 0 ? Math.max(0, 100 - Math.max(0, budgetGoal - 100)) : 0} /><GoalCard title="เพิ่มการบริโภคโปรตีน" detail={`เฉลี่ย ${averageProtein.toFixed(0)} จาก 75 กรัม/วัน`} progress={proteinGoal} /><GoalCard title="วางแผนมื้ออาหาร" detail={`${totals.meals} จาก ${monthRange.days * 3} มื้อ`} progress={planningGoal} /></div></section>
        </>}
        <p className="report-period-note">รายงานประจำเดือน{monthLabel} · มีข้อมูล {activeDays} วัน</p>
      </div>
    </main>
  );
}

function GoalCard({ title, detail, progress }: { title: string; detail: string; progress: number }) {
  const safeProgress = Math.min(100, Math.max(0, progress));
  return <article><strong>{title}</strong><p>{detail}</p><div><span style={{ width: `${safeProgress}%` }} /></div><small>{safeProgress >= 100 ? "สำเร็จแล้ว" : "กำลังดำเนินการ"}<b>{safeProgress.toFixed(0)}%</b></small></article>;
}
