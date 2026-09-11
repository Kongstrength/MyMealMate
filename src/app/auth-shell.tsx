import Link from "next/link";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footerText: string;
  footerLink: string;
  footerLabel: string;
};

export function AuthShell({ title, description, children, footerText, footerLink, footerLabel }: AuthShellProps) {
  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-intro" aria-label="เกี่ยวกับกินดี">
          <Link className="brand" href="/login">
            <span className="brand-mark" aria-hidden="true">🍽</span>
            <span className="brand-name">กินดี</span>
          </Link>
          <p className="eyebrow">กินดีขึ้น ทุกวัน</p>
          <h1>มื้อที่ดี<br /><span>เริ่มจากเรา</span></h1>
          <p>วางแผนอาหารให้เหมาะกับคุณ คุมงบง่าย และใช้ชีวิตได้เบาสบายขึ้น</p>
        </section>
        <section className="auth-card">
          <h2>{title}</h2>
          <p className="subhead">{description}</p>
          {children}
          <p className="switch-copy">{footerText} <Link className="text-link" href={footerLink}>{footerLabel}</Link></p>
        </section>
      </div>
    </main>
  );
}