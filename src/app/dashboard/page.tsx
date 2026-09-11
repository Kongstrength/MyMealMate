"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const meals = [
  { type: "มื้อเช้า", name: "โจ๊กหมูใส่ไข่", emoji: "🍲", calories: 385, cost: 45, tone: "amber" },
  { type: "มื้อกลางวัน", name: "ข้าวกะเพราไก่", emoji: "🍛", calories: 520, cost: 55, tone: "blue" },
  { type: "มื้อเย็น", name: "สลัดอกไก่อะโวคาโด", emoji: "🥗", calories: 420, cost: 72, tone: "green" },
];

const quickActions = [
  { icon: "＋", label: "วางแผนมื้ออาหาร", detail: "จัดเมนูทั้งสัปดาห์" },
  { icon: "⌕", label: "ค้นหาเมนู", detail: "จากวัตถุดิบที่มี" },
  { icon: "฿", label: "ตั้งงบประมาณ", detail: "คุมค่าใช้จ่ายง่ายขึ้น" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userId");
    router.replace("/login");
  }

  return (
    <main className="home-page">
      <header className="home-nav">
        <Link className="home-brand" href="/dashboard"><span className="home-brand-mark">🍽</span><strong>กินดี</strong></Link>
        <nav className="home-links" aria-label="เมนูหลัก">
          <Link className="active" href="/dashboard">หน้าหลัก</Link><a href="#meal-plan">วางแผนมื้ออาหาร</a><a href="#menu-search">ค้นหาเมนู</a><a href="#report">รายงาน</a><a href="#market">ตลาดใกล้บ้าน</a>
        </nav>
        <div className="home-user"><div className="home-avatar">ผ</div><div><strong>ผู้ใช้งาน</strong><span>พร้อมกินดีขึ้น</span></div><button className="icon-button" type="button" aria-label="ออกจากระบบ" onClick={logout}>↗</button></div>
      </header>

      <div className="home-wrap">
        <aside className="home-sidebar">
          <section className="profile-panel">
            <div className="profile-avatar">ผ</div><h2>สวัสดี, ผู้ใช้งาน</h2><p>@กินดีทุกวัน</p><div className="profile-divider" />
            <div className="budget-mini"><div className="section-label"><span>งบประมาณประจำเดือน</span><span>฿</span></div><div className="budget-numbers"><strong>฿4,500</strong><span>จาก ฿6,000</span></div><div className="progress-track"><span style={{ width: "75%" }} /></div><small>เหลือ ฿1,500 · อีก 18 วัน</small></div>
            <div className="nutrition-mini"><div className="section-label"><span>เป้าหมายวันนี้</span><span>ดูทั้งหมด →</span></div><div className="nutrition-grid"><div><strong>1,325</strong><span>แคลอรี่</span><i className="bar calories" /></div><div><strong>62g</strong><span>โปรตีน</span><i className="bar protein" /></div><div><strong>145g</strong><span>คาร์บ</span><i className="bar carbs" /></div><div><strong>38g</strong><span>ไขมัน</span><i className="bar fat" /></div></div></div>
          </section>
          <section className="preference-panel"><div className="section-label"><span>ความชอบของคุณ</span><Link href="/onboarding">แก้ไข</Link></div><div className="tag-list"><span>อาหารไทย</span><span>ทำง่าย</span><span>โปรตีนสูง</span><span className="avoid">ไม่ทานถั่ว</span></div></section>
        </aside>

        <section className="home-content">
          <div className="welcome-row"><div><p className="date-label">วันจันทร์ที่ 7 กันยายน 2569</p><h1>มื้ออาหารของคุณวันนี้</h1><p className="muted">เริ่มต้นวันดีๆ ด้วยเมนูที่เหมาะกับคุณ</p></div><button className="outline-button" type="button">วันนี้ ▾</button></div>
          <section className="today-summary"><div><span className="summary-kicker">งบคงเหลือวันนี้</span><strong>฿128</strong><small>จากงบ ฿200 · ใช้ไปแล้ว ฿72</small></div><div className="summary-ring"><span>64%</span><small>ใช้ไปแล้ว</small></div><div className="summary-message"><span>เยี่ยมมาก!</span><p>วันนี้คุณประหยัดงบได้ดี<br />เหลือไว้สำหรับของว่างมื้อเย็น</p></div></section>

          <div className="home-grid">
            <section className="content-card meal-card" id="meal-plan"><div className="card-heading"><div><h2>เมนูวันนี้</h2><p>ครบ 3 มื้อ · 1,325 kcal</p></div><button className="text-button" type="button">＋ เพิ่มเมนู</button></div><div className="meal-list">{meals.map((meal) => <article className={`meal-row ${meal.tone}`} key={meal.type}><div className="meal-icon">{meal.emoji}</div><div className="meal-info"><span>{meal.type}</span><strong>{meal.name}</strong><small>{meal.calories} kcal <b>·</b> ฿{meal.cost}</small></div><button className="change-button" type="button" onClick={() => setSelectedMeal(meal.type)}>{selectedMeal === meal.type ? "เลือกแล้ว" : "เปลี่ยน"}</button></article>)}</div><button className="full-link" type="button">ดูแผนมื้ออาหารทั้งหมด <span>→</span></button></section>
            <section className="content-card checklist-card"><div className="card-heading"><div><h2>เช็กลิสต์วันนี้</h2><p>2 จาก 4 รายการ</p></div><span className="check-count">50%</span></div><div className="checklist"><label><input type="checkbox" defaultChecked /><span>ดื่มน้ำ 2 แก้วตอนเช้า</span></label><label><input type="checkbox" defaultChecked /><span>เตรียมวัตถุดิบมื้อเย็น</span></label><label><input type="checkbox" /><span>ทานผักผลไม้ 5 ชนิด</span></label><label><input type="checkbox" /><span>บันทึกค่าใช้จ่ายวันนี้</span></label></div><button className="full-link" type="button">ดูเช็กลิสต์ทั้งหมด <span>→</span></button></section>
          </div>

          <section className="content-card goal-card" id="report"><div className="card-heading"><div><h2>ความคืบหน้าเป้าหมาย</h2><p>ทำได้ดีมาก เหลืออีกนิดเดียว</p></div><button className="text-button" type="button">จัดการเป้าหมาย</button></div><div className="goal-items"><div className="goal-item"><div className="goal-icon orange">⚖</div><div><strong>ควบคุมน้ำหนัก</strong><span>2.5 จาก 5 กก.</span><div className="progress-track"><span style={{ width: "50%" }} /></div></div><b>50%</b></div><div className="goal-item"><div className="goal-icon teal">🥗</div><div><strong>ทานผักผลไม้</strong><span>3 จาก 5 ชนิด / วัน</span><div className="progress-track"><span style={{ width: "60%" }} /></div></div><b>60%</b></div><div className="goal-item"><div className="goal-icon blue">💧</div><div><strong>ดื่มน้ำให้เพียงพอ</strong><span>1.5 จาก 2 ลิตร / วัน</span><div className="progress-track"><span style={{ width: "75%" }} /></div></div><b>75%</b></div></div></section>
          <div className="quick-actions" id="menu-search">{quickActions.map((action) => <button type="button" key={action.label}><span>{action.icon}</span><div><strong>{action.label}</strong><small>{action.detail}</small></div><b>→</b></button>)}</div>
          <section className="market-strip" id="market"><div className="market-copy"><span className="market-pin">⌖</span><div><h2>ตลาดใกล้บ้านคุณ</h2><p>วัตถุดิบสดใหม่ อยู่ห่างจากคุณเพียง 1.2 กม.</p></div></div><button className="outline-button" type="button">ดูแผนที่ →</button></section>
          <footer className="home-footer"><span>กินดี · วางแผนอาหารให้พอดีกับคุณ</span><span>© 2569 กินดี</span></footer>
        </section>
      </div>
    </main>
  );
}
