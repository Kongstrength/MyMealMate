"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppNavbar } from "../../components/app-navbar";
import { fetchDashboard, fetchMealPlansByRange, fetchRecipes, saveMealPlan } from "../../lib/api";
import { getBangkokDateKey, MEAL_LABELS, type MealPlan, type MealPlanRange, type MealRecipe } from "../../lib/meal-plan-types";

type DashboardPreferences = {
  user: {
    liked_foods: string[] | null;
    disliked_foods: string[] | null;
    food_allergies: string[] | null;
    budget_daily: number;
    daily_target_calories: number;
  };
};

const mealFilters = [
  { value: "ALL", label: "ทุกมื้อ", icon: "🍽" },
  { value: "BREAKFAST", label: "มื้อเช้า", icon: "🌅" },
  { value: "LUNCH", label: "มื้อกลางวัน", icon: "☀️" },
  { value: "DINNER", label: "มื้อเย็น", icon: "🌙" },
];

function getRecipeSearchText(recipe: MealRecipe) {
  return [
    recipe.name,
    recipe.description ?? "",
    ...(recipe.ingredients?.map((ingredient) => ingredient.name) ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase("th-TH");
}

export default function MenuSearchPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => getBangkokDateKey());
  const [recipes, setRecipes] = useState<MealRecipe[]>([]);
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [preferences, setPreferences] = useState<DashboardPreferences["user"] | null>(null);
  const [query, setQuery] = useState("");
  const [mealType, setMealType] = useState("ALL");
  const [maxBudget, setMaxBudget] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [hideRestricted, setHideRestricted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [recipeList, dashboard, planRange] = await Promise.all([
        fetchRecipes<MealRecipe[]>(),
        fetchDashboard(selectedDate) as Promise<DashboardPreferences>,
        fetchMealPlansByRange<MealPlanRange>(selectedDate, selectedDate),
      ]);
      setRecipes(recipeList.filter((recipe) => ["BREAKFAST", "LUNCH", "DINNER"].includes(recipe.mealType)));
      setPreferences(dashboard.user);
      setCurrentPlan(planRange.plans[0] ?? null);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === "AUTH_REQUIRED") {
        router.replace("/login");
        return;
      }
      setError(loadError instanceof Error ? loadError.message : "โหลดรายการอาหารไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [router, selectedDate]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadData();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [loadData]);

  const dislikedFoods = useMemo(() => preferences?.disliked_foods ?? [], [preferences?.disliked_foods]);
  const foodAllergies = useMemo(() => preferences?.food_allergies ?? [], [preferences?.food_allergies]);
  const likedFoods = useMemo(() => preferences?.liked_foods ?? [], [preferences?.liked_foods]);

  const getRestriction = useCallback((recipe: MealRecipe) => {
    const searchable = getRecipeSearchText(recipe);
    const allergy = foodAllergies.find((food) => {
      const term = food.trim().toLocaleLowerCase("th-TH");
      return Boolean(term) && searchable.includes(term);
    });
    if (allergy) return `มีอาหารที่แพ้: ${allergy}`;
    if (recipe.source === "AI" && !recipe.ingredients?.length) {
      return "สูตร AI เดิมยังไม่มีข้อมูลวัตถุดิบ";
    }
    const disliked = dislikedFoods.find((food) => {
      const term = food.trim().toLocaleLowerCase("th-TH");
      return Boolean(term) && searchable.includes(term);
    });
    return disliked ? `มีอาหารที่ไม่ชอบ: ${disliked}` : "";
  }, [dislikedFoods, foodAllergies]);

  const isLiked = useCallback((recipe: MealRecipe) => {
    const searchable = getRecipeSearchText(recipe);
    return likedFoods.some((food) => {
      const term = food.trim().toLocaleLowerCase("th-TH");
      return Boolean(term) && searchable.includes(term);
    });
  }, [likedFoods]);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
    const budgetLimit = Number(maxBudget);
    const calorieLimit = Number(maxCalories);
    return recipes
      .filter((recipe) => mealType === "ALL" || recipe.mealType === mealType)
      .filter((recipe) => !normalizedQuery || getRecipeSearchText(recipe).includes(normalizedQuery))
      .filter((recipe) => !maxBudget || recipe.estimatedCost <= budgetLimit)
      .filter((recipe) => !maxCalories || recipe.calories <= calorieLimit)
      .filter((recipe) => !hideRestricted || !getRestriction(recipe))
      .sort((left, right) => Number(isLiked(right)) - Number(isLiked(left)) || left.estimatedCost - right.estimatedCost);
  }, [getRestriction, hideRestricted, isLiked, maxBudget, maxCalories, mealType, query, recipes]);

  async function addToPlan(recipe: MealRecipe) {
    const restriction = getRestriction(recipe);
    if (restriction) return;

    setSavingRecipeId(recipe.id);
    setError("");
    setSuccess("");
    const existingItems = (currentPlan?.items ?? [])
      .filter((item) => item.mealType !== recipe.mealType)
      .map((item) => ({ recipe_id: item.recipe.id, meal_type: item.mealType, servings: item.servings }));
    existingItems.push({ recipe_id: recipe.id, meal_type: recipe.mealType, servings: 1 });

    try {
      await saveMealPlan(selectedDate, existingItems);
      const updatedRange = await fetchMealPlansByRange<MealPlanRange>(selectedDate, selectedDate);
      setCurrentPlan(updatedRange.plans[0] ?? null);
      setSuccess(`เพิ่ม “${recipe.name}” เป็น${MEAL_LABELS[recipe.mealType]}ของวันที่เลือกแล้ว`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "เพิ่มเมนูลงแผนไม่สำเร็จ");
    } finally {
      setSavingRecipeId(null);
    }
  }

  return (
    <main className="menu-search-page">
      <AppNavbar actions={<Link className="market-back-link" href="/dashboard">← กลับหน้าหลัก</Link>} />
      <div className="menu-search-wrap">
        <section className="menu-search-heading">
          <div><span>ค้นหาจากรายการอาหาร</span><h1>ค้นหาเมนูที่เหมาะกับคุณ</h1><p>เลือกตามมื้อ งบประมาณ และพลังงาน ระบบจะช่วยซ่อนอาหารที่ไม่เหมาะกับโปรไฟล์</p></div>
          <label><span>เพิ่มลงวันที่</span><input onChange={(event) => setSelectedDate(event.target.value)} type="date" value={selectedDate} /></label>
        </section>

        <section className="menu-filter-card">
          <label className="menu-search-input"><span>⌕</span><input autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่ออาหารหรือวัตถุดิบ เช่น ข้าว ไก่ เต้าหู้" value={query} /></label>
          <div className="menu-meal-filters">{mealFilters.map((filter) => <button className={mealType === filter.value ? "active" : ""} key={filter.value} onClick={() => setMealType(filter.value)} type="button"><span>{filter.icon}</span>{filter.label}</button>)}</div>
          <div className="menu-number-filters">
            <label><span>งบไม่เกิน (บาท)</span><input min="0" onChange={(event) => setMaxBudget(event.target.value)} placeholder={String(preferences?.budget_daily || 200)} type="number" value={maxBudget} /></label>
            <label><span>แคลอรี่ไม่เกิน</span><input min="0" onChange={(event) => setMaxCalories(event.target.value)} placeholder={String(preferences?.daily_target_calories || 600)} type="number" value={maxCalories} /></label>
            <label className="menu-safe-toggle"><input checked={hideRestricted} onChange={(event) => setHideRestricted(event.target.checked)} type="checkbox" /><span><strong>ซ่อนอาหารที่ไม่เหมาะกับฉัน</strong><small>อาหารที่ไม่ชอบและอาหารที่แพ้</small></span></label>
          </div>
        </section>

        {error && <p className="planner-error" role="alert">{error}</p>}
        {success && <p className="menu-search-success" role="status">✓ {success}</p>}

        <div className="menu-results-heading"><div><h2>เมนูทั้งหมด</h2><p>พบ {filteredRecipes.length} รายการ</p></div><button onClick={() => { setQuery(""); setMealType("ALL"); setMaxBudget(""); setMaxCalories(""); }} type="button">ล้างตัวกรอง</button></div>

        {isLoading ? <div className="reports-loading">กำลังโหลดรายการอาหาร...</div> : filteredRecipes.length > 0 ? (
          <section className="menu-result-grid">
            {filteredRecipes.map((recipe, index) => {
              const restriction = getRestriction(recipe);
              const currentMeal = currentPlan?.items.find((item) => item.mealType === recipe.mealType);
              const isCurrent = currentMeal?.recipe.id === recipe.id;
              return <article className={restriction ? "restricted" : ""} key={recipe.id}>
                <div className={`menu-result-cover tone-${index % 4}`}><span>{recipe.emoji ?? "🍽"}</span><b>{MEAL_LABELS[recipe.mealType]}</b></div>
                <div className="menu-result-copy">
                  <div className="menu-result-title"><h3>{recipe.name}</h3>{isLiked(recipe) && <span>♥ เมนูที่ชอบ</span>}</div>
                  <span className={`menu-recipe-source ${recipe.source === "AI" ? "ai" : "curated"}`}>{recipe.source === "AI" ? "✨ สร้างโดย AI" : "✓ สูตรพื้นฐาน"}</span>
                  <p>{recipe.description || "เมนูอาหารสำหรับแผนของคุณ"}</p>
                  {Boolean(recipe.ingredients?.length) && <div className="menu-ingredient-list">{recipe.ingredients?.slice(0, 4).map((ingredient) => <span key={`${recipe.id}-${ingredient.name}`}>{ingredient.name}{ingredient.amount ? ` ${ingredient.amount}` : ""}</span>)}</div>}
                  <div className="menu-nutrition"><span><b>{recipe.calories}</b>kcal</span><span><b>{recipe.protein}</b>โปรตีน</span><span><b>{recipe.carbs}</b>คาร์บ</span><span><b>{recipe.fat}</b>ไขมัน</span></div>
                  {Boolean(recipe.steps?.length) && <details className="menu-recipe-details"><summary>ดูวิธีทำ</summary><ol>{recipe.steps?.map((step, stepIndex) => <li key={`${recipe.id}-step-${stepIndex}`}>{step}</li>)}</ol>{recipe.cookingTips && <p>💡 {recipe.cookingTips}</p>}</details>}
                  {restriction && <small className="menu-restriction">⚠ {restriction}</small>}
                  <div className="menu-result-footer"><strong>฿{recipe.estimatedCost.toLocaleString()}</strong><button disabled={Boolean(restriction) || isCurrent || savingRecipeId === recipe.id} onClick={() => void addToPlan(recipe)} type="button">{savingRecipeId === recipe.id ? "กำลังเพิ่ม..." : isCurrent ? "อยู่ในแผนแล้ว" : currentMeal ? "เปลี่ยนมื้อนี้" : "เพิ่มลงแผน"}</button></div>
                </div>
              </article>;
            })}
          </section>
        ) : <section className="menu-search-empty"><span>⌕</span><h2>ไม่พบเมนูตามตัวกรอง</h2><p>ลองเปลี่ยนคำค้นหา เพิ่มงบ หรือเพิ่มจำนวนแคลอรี่</p></section>}
      </div>
    </main>
  );
}
