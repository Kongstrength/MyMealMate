const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export function getStoredAccessToken() {
  return localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken");
}

export async function fetchDashboard(date: string) {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const response = await fetch(`${API_URL}/dashboard?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("AUTH_REQUIRED");
    }
    throw new Error(data.message ?? "โหลดข้อมูล dashboard ไม่สำเร็จ");
  }

  return data;
}

export async function fetchMocSeafoodPrices(date: string) {
  const response = await fetch(
    `${API_URL}/market-prices/moc?date=${encodeURIComponent(date)}&categoryId=2&type=R`,
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "โหลดราคาสินค้าไม่สำเร็จ");
  }

  return data;
}

async function authorizedJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getStoredAccessToken();
  if (!token) throw new Error("AUTH_REQUIRED");

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) throw new Error("AUTH_REQUIRED");
    throw new Error(data.message ?? "ไม่สามารถโหลดข้อมูลได้");
  }

  return data as T;
}

export function fetchMealPlansByRange<T>(from: string, to: string) {
  return authorizedJson<T>(
    `${API_URL}/meal-plans/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export function fetchRecipes<T>() {
  return authorizedJson<T>(`${API_URL}/recipes`);
}

export function saveMealPlan<T>(
  date: string,
  items: Array<{ recipe_id: string; meal_type: string; servings?: number }>,
) {
  return authorizedJson<T>(`${API_URL}/meal-plans?date=${encodeURIComponent(date)}`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export function deleteMealPlan(planId: string) {
  return authorizedJson<{ message: string }>(`${API_URL}/meal-plans/${encodeURIComponent(planId)}`, {
    method: "DELETE",
  });
}

export async function fetchAiRecommendMenu(body: {
  budget?: number;
  meals_count?: number;
  preferences?: string;
}) {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const response = await fetch(`${API_URL}/ai/recommend-menu`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("AUTH_REQUIRED");
    }
    throw new Error(data.message ?? "AI แนะนำเมนูไม่สำเร็จ");
  }

  return data;
}

export async function saveAiMealPlan(
  meals: Array<{
    meal_type: string;
    menu_name: string;
    estimated_cost: number;
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  }>,
  date?: string,
) {
  const token = getStoredAccessToken();
  if (!token) throw new Error("AUTH_REQUIRED");

  const response = await fetch(`${API_URL}/ai/save-meal-plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ meals, date }),
  });
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) throw new Error("AUTH_REQUIRED");
    throw new Error(data.message ?? "บันทึกแผนอาหารไม่สำเร็จ");
  }

  return data;
}
