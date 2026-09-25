"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppNavbar } from "../../components/app-navbar";
import { getStoredAccessToken } from "../../lib/api";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationStatus = "idle" | "requesting" | "ready" | "error";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY ?? "";

const marketCategories = [
  { label: "ตลาดสด", icon: "🥬" },
  { label: "ซูเปอร์มาร์เก็ต", icon: "🛒" },
  { label: "ร้านขายของชำ", icon: "🏪" },
  { label: "ร้านผักผลไม้", icon: "🍊" },
];

export default function NearbyMarketsPage() {
  const router = useRouter();
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState("");
  const [category, setCategory] = useState("ตลาดสด");
  const [areaInput, setAreaInput] = useState("");
  const [searchedArea, setSearchedArea] = useState("");

  const requestCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("error");
      setLocationError("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง กรุณาค้นหาด้วยชื่อพื้นที่แทน");
      return;
    }

    setLocationStatus("requesting");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setSearchedArea("");
        setLocationStatus("ready");
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "ยังไม่ได้รับอนุญาตให้ใช้ตำแหน่ง กรุณาอนุญาตจากเบราว์เซอร์หรือค้นหาด้วยชื่อพื้นที่"
          : "ไม่สามารถอ่านตำแหน่งปัจจุบันได้ กรุณาลองใหม่หรือค้นหาด้วยชื่อพื้นที่";
        setLocationStatus("error");
        setLocationError(message);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      if (!getStoredAccessToken()) {
        router.replace("/login");
        return;
      }

      setIsAuthorizing(false);
      requestCurrentLocation();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [requestCurrentLocation, router]);

  const searchQuery = searchedArea ? `${category} ${searchedArea}` : category;

  const embedUrl = useMemo(() => {
    if (!GOOGLE_MAPS_API_KEY || (!coordinates && !searchedArea)) return "";

    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      q: searchQuery,
      language: "th",
      region: "TH",
      zoom: "14",
    });

    if (coordinates && !searchedArea) {
      params.set("center", `${coordinates.latitude},${coordinates.longitude}`);
    }

    return `https://www.google.com/maps/embed/v1/search?${params.toString()}`;
  }, [coordinates, searchQuery, searchedArea]);

  const googleMapsUrl = useMemo(() => {
    const locationHint = coordinates && !searchedArea
      ? ` ใกล้ ${coordinates.latitude},${coordinates.longitude}`
      : searchedArea ? ` ${searchedArea}` : " ใกล้ฉัน";
    const params = new URLSearchParams({ api: "1", query: `${category}${locationHint}` });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }, [category, coordinates, searchedArea]);

  function searchArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextArea = areaInput.trim();
    if (!nextArea) return;
    setSearchedArea(nextArea);
    setCoordinates(null);
    setLocationStatus("ready");
    setLocationError("");
  }

  if (isAuthorizing) {
    return <main className="market-map-page"><div className="profile-loading">กำลังตรวจสอบการเข้าสู่ระบบ...</div></main>;
  }

  return (
    <main className="market-map-page">
      <AppNavbar actions={<Link className="market-back-link" href="/dashboard">← กลับหน้าหลัก</Link>} />

      <div className="market-map-wrap">
        <section className="market-map-heading">
          <div>
            <span className="market-map-kicker">GOOGLE MAPS</span>
            <h1>ตลาดใกล้ฉัน</h1>
            <p>ค้นหาตลาดสด ซูเปอร์มาร์เก็ต และร้านขายวัตถุดิบใกล้ตำแหน่งของคุณ</p>
          </div>
          <button
            className="market-location-button"
            disabled={locationStatus === "requesting"}
            onClick={requestCurrentLocation}
            type="button"
          >
            <span>⌖</span>
            {locationStatus === "requesting" ? "กำลังหาตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน"}
          </button>
        </section>

        <section className="market-search-card">
          <div className="market-category-list" aria-label="ประเภทสถานที่">
            {marketCategories.map((item) => (
              <button
                className={category === item.label ? "active" : ""}
                key={item.label}
                onClick={() => setCategory(item.label)}
                type="button"
              >
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>

          <form className="market-area-search" onSubmit={searchArea}>
            <label htmlFor="market-area">หรือค้นหาจากเขต จังหวัด หรือสถานที่</label>
            <div>
              <input
                id="market-area"
                onChange={(event) => setAreaInput(event.target.value)}
                placeholder="เช่น บางแค กรุงเทพฯ"
                value={areaInput}
              />
              <button type="submit">ค้นหา</button>
            </div>
          </form>
        </section>

        {locationError && <p className="market-location-error" role="alert">{locationError}</p>}

        <section className="market-map-card">
          <div className="market-map-card-heading">
            <div>
              <span className={locationStatus === "ready" ? "market-status-dot ready" : "market-status-dot"} />
              <div>
                <strong>{searchedArea ? `ผลการค้นหาใน ${searchedArea}` : coordinates ? "กำลังแสดงผลใกล้ตำแหน่งของคุณ" : "รอตำแหน่งสำหรับค้นหา"}</strong>
                <small>ประเภท: {category}</small>
              </div>
            </div>
            <a href={googleMapsUrl} rel="noreferrer" target="_blank">เปิดใน Google Maps ↗</a>
          </div>

          {embedUrl ? (
            <iframe
              allowFullScreen
              aria-label={`แผนที่ค้นหา${searchQuery}`}
              className="market-google-map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={embedUrl}
              title="Google Maps ตลาดใกล้ฉัน"
            />
          ) : (
            <div className="market-map-empty">
              <span>🗺️</span>
              {!GOOGLE_MAPS_API_KEY ? (
                <>
                  <h2>รอตั้งค่า Google Maps API Key</h2>
                  <p>เพิ่ม <code>NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY</code> ในไฟล์ <code>.env.local</code> แล้วเปิดเซิร์ฟเวอร์ใหม่</p>
                </>
              ) : (
                <>
                  <h2>อนุญาตตำแหน่งหรือค้นหาพื้นที่</h2>
                  <p>เราจะใช้ตำแหน่งเฉพาะสำหรับแสดงตลาดใกล้คุณบนแผนที่</p>
                </>
              )}
              <a href={googleMapsUrl} rel="noreferrer" target="_blank">ค้นหาผ่าน Google Maps ตอนนี้</a>
            </div>
          )}
        </section>

        <p className="market-privacy-note">ตำแหน่งของคุณใช้เพื่อค้นหาในหน้านี้เท่านั้น และไม่ได้ถูกบันทึกลงในระบบ</p>
      </div>
    </main>
  );
}
