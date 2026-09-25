export type MealRecipe = {
  id: string;
  name: string;
  description: string | null;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  estimatedCost: number;
  emoji: string | null;
};

export type MealPlanItem = {
  id: string;
  mealType: string;
  servings: number;
  calories: number;
  cost: number;
  recipe: MealRecipe;
};

export type MealPlan = {
  id: string;
  date: string;
  totalCalories: number;
  totalCost: number;
  items: MealPlanItem[];
};

export type MealPlanRange = {
  from: string;
  to: string;
  plans: MealPlan[];
};

export const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "มื้อเช้า",
  LUNCH: "มื้อกลางวัน",
  DINNER: "มื้อเย็น",
};

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function getMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(12, 0, 0, 0);
  return result;
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}
