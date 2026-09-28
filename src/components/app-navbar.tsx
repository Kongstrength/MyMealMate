"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigationItems = [
  { href: "/dashboard", label: "หน้าหลัก" },
  { href: "/ai-recommend", label: "AI แนะนำเมนู" },
  { href: "/meal-planner", label: "วางแผนมื้ออาหาร" },
  { href: "/menu-search", label: "ค้นหาเมนู" },
  { href: "/reports", label: "รายงาน" },
  { href: "/nearby-markets", label: "ตลาดใกล้ฉัน" },
];

export function AppNavbar({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname();

  return (
    <header className="home-nav">
      <Link className="home-brand" href="/dashboard">
        <span className="home-brand-mark">🍽</span>
        <strong>กินดี</strong>
      </Link>
      <nav className="home-links" aria-label="เมนูหลัก">
        {navigationItems.map((item) => {
          const path = item.href.split("#")[0];
          const isActive = item.href.includes("#") ? false : pathname === path;
          return <Link className={isActive ? "active" : undefined} href={item.href} key={item.href}>{item.label}</Link>;
        })}
      </nav>
      {actions ? <div className="app-nav-actions">{actions}</div> : null}
    </header>
  );
}
