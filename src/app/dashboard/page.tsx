"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchDashboard, fetchMocSeafoodPrices, getStoredAccessToken } from "../../lib/api";
import { ProfileEditor, type ProfileTab } from "../profile/profile-editor";

type DashboardData = {
  date: string;
  user: {
    full_name: string;
    username: string;
    budget_daily: number;
    budget_monthly: number;
    daily_target_calories: number;
    liked_foods: string[] | null;
    health_goals_list: string[] | null;
  };
  mealPlan: {
    totalCalories: number;
    totalCost: number;
    items: Array<{
      id: string;
      mealType: string;
      calories: number;
      cost: number;
      recipe: { name: string; emoji: string | null };
    }>;
  } | null;
};

type MarketPriceData = {
  items: Array<{
    id: string;
    name: string;
    average_price: number;
    unit: string;
  }>;
};

const MEAL_TYPE_LABEL: Record<string, string> = {
  BREAKFAST: "มื้อเช้า",
  LUNCH: "มื้อกลางวัน",
  DINNER: "มื้อเย็น",
  SNACK: "ของว่าง",
};

const quickActions = [
  { icon: "✨", label: "AI แนะนำเมนู", detail: "ให้ AI จัดเมนูในงบ", href: "/ai-recommend" },
  { icon: "⌕", label: "ค้นหาเมนู", detail: "จากวัตถุดิบที่มี", href: "#menu-search" },
  { icon: "▣", label: "วางแผนรายสัปดาห์", detail: "จัดมื้ออาหารล่วงหน้า", href: "/meal-planner" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [marketPrices, setMarketPrices] = useState<MarketPriceData | null>(null);
  const [marketError, setMarketError] = useState("");
  const [profileModalTab, setProfileModalTab] = useState<ProfileTab | null>(null);
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  useEffect(() => {
    if (!getStoredAccessToken()) {
      router.replace("/login");
      return;
    }
    fetchDashboard(today)
      .then((data) => {
        setDashboard(data);
        setIsAuthorizing(false);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.message === "AUTH_REQUIRED") {
          router.replace("/login");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ");
        setIsAuthorizing(false);
      });

    fetchMocSeafoodPrices(today)
      .then(setMarketPrices)
      .catch((loadError: unknown) => {
        setMarketError(loadError instanceof Error ? loadError.message : "โหลดราคาสินค้าไม่สำเร็จ");
      });
  }, [router, today, dashboardRefresh]);

  useEffect(() => {
    if (!profileModalTab) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileModalTab(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileModalTab]);

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userId");
    router.replace("/login");
  }

  // Derived values
  const budgetDaily = dashboard?.user.budget_daily ?? 0;
  const totalCost = dashboard?.mealPlan?.totalCost ?? 0;
  const totalCalories = dashboard?.mealPlan?.totalCalories ?? 0;
  const caloriesTarget = dashboard?.user.daily_target_calories ?? 0;
  const budgetUsedPct = budgetDaily > 0 ? Math.min(100, Math.round((totalCost / budgetDaily) * 100)) : 0;
  const caloriesPct = caloriesTarget > 0 ? Math.min(100, Math.round((totalCalories / caloriesTarget) * 100)) : 0;
  const budgetLeft = Math.max(0, budgetDaily - totalCost);
  const likedFoods: string[] = dashboard?.user.liked_foods ?? [];
  const healthGoals: string[] = dashboard?.user.health_goals_list ?? [];

  if (isAuthorizing) return <main className="home-page"><div className="profile-loading">กำลังตรวจสอบการเข้าสู่ระบบ...</div></main>;

  return (
    <main className="home-page">
      <header className="home-nav">
        <Link className="home-brand" href="/dashboard"><span className="home-brand-mark">🍽</span><strong>กินดี</strong></Link>
        <nav className="home-links" aria-label="เมนูหลัก">
          <Link className="active" href="/dashboard">หน้าหลัก</Link>
          <Link href="/ai-recommend">AI แนะนำเมนู</Link>
          <Link href="/meal-planner">วางแผนมื้ออาหาร</Link>
          <a href="#menu-search">ค้นหาเมนู</a>
          <Link href="/reports">รายงาน</Link>
          <Link href="/nearby-markets">ตลาดใกล้ฉัน</Link>
        </nav>
        <div className="home-user">
          <button className="home-user-profile" type="button" onClick={() => setProfileModalTab("personal")} aria-label="แก้ไขโปรไฟล์">
            <div className="home-avatar">{dashboard?.user.full_name?.charAt(0) ?? "ผ"}</div>
            <div className="home-user-copy"><strong>{dashboard?.user.full_name ?? "กำลังโหลด..."}</strong><span>@{dashboard?.user.username ?? ""}</span></div>
            <span className="home-edit-icon" aria-hidden="true">✎</span>
          </button>
          <button className="icon-button" type="button" aria-label="ออกจากระบบ" onClick={logout}>↗</button>
        </div>
      </header>

      <div className="home-wrap">
        {/* Sidebar */}
        <aside className="home-sidebar">
          <section className="profile-panel">
            <div className="profile-avatar">{dashboard?.user.full_name?.charAt(0) ?? "ผ"}</div>
            <h2>สวัสดี, {dashboard?.user.full_name ?? "ผู้ใช้งาน"}</h2>
            <p>@{dashboard?.user.username ?? ""}</p>
            <div className="profile-divider" />

            {/* Budget */}
            <div className="budget-mini">
              <div className="section-label">
                <span>งบประมาณวันนี้</span>
                <span>฿</span>
              </div>
              <div className="budget-numbers">
                <strong>฿{budgetLeft.toLocaleString()}</strong>
                <span>คงเหลือ / ฿{budgetDaily.toLocaleString()}</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${budgetUsedPct}%` }} />
              </div>
              <small>
                {budgetDaily > 0
                  ? `ใช้ไปแล้ว ฿${totalCost.toLocaleString()} (${budgetUsedPct}%)`
                  : "ตั้งงบประมาณในหน้า Profile"}
              </small>
            </div>

            {/* Calories */}
            <div className="nutrition-mini">
              <div className="section-label">
                <span>แคลอรี่วันนี้</span>
                <span>{caloriesPct}%</span>
              </div>
              <div className="nutrition-grid">
                <div>
                  <strong>{totalCalories > 0 ? totalCalories.toLocaleString() : "-"}</strong>
                  <span>ทานแล้ว</span>
                  <i className="bar calories" style={{ width: `${caloriesPct}%` }} />
                </div>
                <div>
                  <strong>{caloriesTarget > 0 ? caloriesTarget.toLocaleString() : "-"}</strong>
                  <span>เป้าหมาย</span>
                  <i className="bar calories" style={{ width: "100%", background: "#e4e4e4" }} />
                </div>
              </div>
            </div>
          </section>

          {/* Preferences from API */}
          <section className="preference-panel">
            <div className="section-label">
              <span>ความชอบของคุณ</span>
              <button type="button" onClick={() => setProfileModalTab("preferences")}>แก้ไข</button>
            </div>
            <div className="tag-list">
              {likedFoods.length > 0
                ? likedFoods.map((food) => <span key={food}>{food}</span>)
                : <span style={{ color: "#a0afa7", fontSize: 11 }}>ยังไม่ได้ตั้งค่า</span>}
            </div>
          </section>
        </aside>

        {/* Main Content */}
        <section className="home-content">
          <div className="welcome-row">
            <div>
              <p className="date-label">{dashboard?.date ?? today}</p>
              <h1>มื้ออาหารของคุณวันนี้</h1>
              <p className="muted">เริ่มต้นวันดีๆ ด้วยเมนูที่เหมาะกับคุณ</p>
            </div>
            <button className="outline-button" type="button">วันนี้ ▾</button>
          </div>

          {error && <p className="error-note" role="alert">{error}</p>}

          {/* Today Summary — now fully dynamic */}
          <section className="today-summary">
            <div>
              <span className="summary-kicker">งบคงเหลือวันนี้</span>
              <strong>
                {budgetDaily > 0 ? `฿${budgetLeft.toLocaleString()}` : "—"}
              </strong>
              <small>
                {budgetDaily > 0
                  ? `จากงบ ฿${budgetDaily.toLocaleString()} · ใช้ไปแล้ว ฿${totalCost.toLocaleString()}`
                  : "ยังไม่ได้ตั้งงบประมาณ"}
              </small>
            </div>
            <div className="summary-ring">
              <span>{budgetUsedPct}%</span>
              <small>ใช้ไปแล้ว</small>
            </div>
            <div className="summary-message">
              {budgetDaily === 0 ? (
                <>
                  <span>ตั้งงบก่อนนะ!</span>
                  <p><Link href="/onboarding">ตั้งค่างบประมาณ</Link> เพื่อให้ AI วางแผนได้แม่นขึ้น</p>
                </>
              ) : budgetUsedPct < 70 ? (
                <>
                  <span>เยี่ยมมาก!</span>
                  <p>วันนี้คุณประหยัดงบได้ดี<br />เหลือไว้สำหรับของว่างมื้อเย็น</p>
                </>
              ) : budgetUsedPct < 100 ? (
                <>
                  <span>ใกล้เต็มงบแล้ว!</span>
                  <p>ใช้งบไปแล้ว {budgetUsedPct}%<br />ระวังอย่าเกินนะ</p>
                </>
              ) : (
                <>
                  <span>เกินงบแล้ว!</span>
                  <p>วันนี้ใช้เกินงบ ฿{(totalCost - budgetDaily).toFixed(0)}<br />ลองปรับลดมื้อถัดไปดูนะ</p>
                </>
              )}
            </div>
          </section>

          <div className="home-grid">
            {/* Meal Plan Card */}
            <section className="content-card meal-card" id="meal-plan">
              <div className="card-heading">
                <div>
                  <h2>เมนูวันนี้</h2>
                  <p>
                    {dashboard?.mealPlan
                      ? `${dashboard.mealPlan.items.length} มื้อ · ${dashboard.mealPlan.totalCalories.toLocaleString()} kcal · ฿${dashboard.mealPlan.totalCost.toLocaleString()}`
                      : "ยังไม่มีแผนอาหาร"}
                  </p>
                </div>
                <Link href="/ai-recommend" className="text-button">✨ AI แนะนำ</Link>
              </div>
              <div className="meal-list">
                {dashboard?.mealPlan?.items.map((meal) => (
                  <article className="meal-row green" key={meal.id}>
                    <div className="meal-icon">{meal.recipe.emoji ?? "🍽"}</div>
                    <div className="meal-info">
                      <span>{MEAL_TYPE_LABEL[meal.mealType] ?? meal.mealType}</span>
                      <strong>{meal.recipe.name}</strong>
                      <small>{meal.calories.toLocaleString()} kcal <b>·</b> ฿{meal.cost}</small>
                    </div>
                    <button className="change-button" type="button"
                      onClick={() => setSelectedMeal(meal.mealType)}>
                      {selectedMeal === meal.mealType ? "เลือกแล้ว" : "เปลี่ยน"}
                    </button>
                  </article>
                ))}
                {!dashboard?.mealPlan && (
                  <div className="dash-empty-state">
                    <span>🍽</span>
                    <p>ยังไม่มีเมนูสำหรับวันนี้</p>
                    <Link href="/ai-recommend" className="primary-btn" style={{ display: "inline-block", padding: "10px 20px", fontSize: 13, width: "auto" }}>
                      ✨ ให้ AI แนะนำเมนู
                    </Link>
                  </div>
                )}
              </div>
              {dashboard?.mealPlan && (
                <Link className="full-link" href="/meal-planner">ดูแผนมื้ออาหารทั้งหมด <span>→</span></Link>
              )}
            </section>

            {/* Health Goals Card — dynamic */}
            <section className="content-card checklist-card">
              <div className="card-heading">
                <div>
                  <h2>เป้าหมายสุขภาพ</h2>
                  <p>{healthGoals.length > 0 ? `${healthGoals.length} เป้าหมาย` : "ยังไม่ได้ตั้งค่า"}</p>
                </div>
                <button type="button" onClick={() => setProfileModalTab("health")} className="text-button">แก้ไข</button>
              </div>
              <div className="checklist">
                {healthGoals.length > 0
                  ? healthGoals.map((goal) => (
                      <label key={goal}>
                        <input type="checkbox" />
                        <span>{goal}</span>
                      </label>
                    ))
                  : (
                    <p className="muted" style={{ marginTop: 12 }}>
                      <button className="inline-profile-button" type="button" onClick={() => setProfileModalTab("health")}>ตั้งค่าเป้าหมายสุขภาพ</button> เพื่อติดตามความก้าวหน้า
                    </p>
                  )}
              </div>
            </section>
          </div>

          {/* Quick Actions — with AI link */}
          <div className="quick-actions" id="menu-search">
            {quickActions.map((action) => (
              <Link href={action.href} key={action.label} style={{ textDecoration: "none" }}>
                <button type="button">
                  <span>{action.icon}</span>
                  <div>
                    <strong>{action.label}</strong>
                    <small>{action.detail}</small>
                  </div>
                  <b>→</b>
                </button>
              </Link>
            ))}
          </div>

          {/* Market Prices */}
          <section className="market-strip" id="market">
            <div className="market-copy">
              <span className="market-pin">฿</span>
              <div>
                <h2>ราคาสัตว์น้ำวันนี้</h2>
                <p>ข้อมูลค้าปลีกจากกรมการค้าภายใน กระทรวงพาณิชย์</p>
              </div>
            </div>
            {marketError && <p className="error-note" role="alert">{marketError}</p>}
            {!marketPrices && !marketError && <p className="muted">กำลังโหลดราคา...</p>}
            {marketPrices && (
              <div className="market-price-list">
                {marketPrices.items.slice(0, 3).map((item) => (
                  <div className="market-price-item" key={item.id}>
                    <strong>{item.name}</strong>
                    <span>฿{item.average_price.toLocaleString()} {item.unit}</span>
                  </div>
                ))}
              </div>
            )}
            <Link className="outline-button market-map-link" href="/nearby-markets">ดูตลาดใกล้ฉัน →</Link>
          </section>

          <footer className="home-footer">
            <span>กินดี · วางแผนอาหารให้พอดีกับคุณ</span>
            <span>© 2569 กินดี</span>
          </footer>
        </section>
      </div>
      {profileModalTab && (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setProfileModalTab(null);
        }}>
          <section className="profile-modal-shell" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
            <ProfileEditor
              embedded
              initialTab={profileModalTab}
              onClose={() => setProfileModalTab(null)}
              onSaved={() => setDashboardRefresh((current) => current + 1)}
            />
          </section>
        </div>
      )}
    </main>
  );
}
