"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppNavbar } from "../../components/app-navbar";
import { getStoredAccessToken } from "../../lib/api";

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type LocationStatus = "idle" | "requesting" | "ready" | "error";
type PlacesStatus = "idle" | "loading" | "ready" | "error";

type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  googleMapsUri: string;
  distanceKm: number | null;
  category: "ตลาดสด" | "ซูเปอร์มาร์เก็ต" | "ร้านขายของชำ" | "ร้านผักผลไม้";
  icon: string;
  rating: number | null;
  userRatingCount: number;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY ?? "";
let mapsApiConfigured = false;

const marketCategories = [
  { label: "ทั้งหมด", icon: "⌕", types: [] },
  { label: "ตลาดสด", icon: "🥬", types: ["market", "farmers_market"] },
  { label: "ซูเปอร์มาร์เก็ต", icon: "🛒", types: ["supermarket", "hypermarket", "discount_supermarket"] },
  { label: "ร้านขายของชำ", icon: "🏪", types: ["grocery_store", "convenience_store", "general_store"] },
  { label: "ร้านผักผลไม้", icon: "🍊", types: [] },
];

const allNearbyTypes = marketCategories.flatMap((item) => item.types);

function getPlaceCategory(types: string[], primaryType: string | null) {
  const placeTypes = new Set(primaryType ? [...types, primaryType] : types);
  if (["supermarket", "hypermarket", "discount_supermarket"].some((type) => placeTypes.has(type))) {
    return { category: "ซูเปอร์มาร์เก็ต" as const, icon: "🛒" };
  }
  if (["grocery_store", "convenience_store", "general_store"].some((type) => placeTypes.has(type))) {
    return { category: "ร้านขายของชำ" as const, icon: "🏪" };
  }
  return { category: "ตลาดสด" as const, icon: "🥬" };
}

function distanceInKm(origin: Coordinates, destination?: google.maps.LatLng | null) {
  if (!destination) return null;
  const earthRadiusKm = 6_371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(destination.lat() - origin.latitude);
  const longitudeDelta = toRadians(destination.lng() - origin.longitude);
  const startLatitude = toRadians(origin.latitude);
  const endLatitude = toRadians(destination.lat());
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export default function NearbyMarketsPage() {
  const router = useRouter();
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [radiusKm, setRadiusKm] = useState(5);
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");
  const [areaInput, setAreaInput] = useState("");
  const [searchedArea, setSearchedArea] = useState("");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [placesStatus, setPlacesStatus] = useState<PlacesStatus>("idle");
  const [placesError, setPlacesError] = useState("");

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
          accuracy: position.coords.accuracy,
        });
        setAreaInput("");
        setSearchedArea("");
        setLocationStatus("ready");
        if (position.coords.accuracy > 1_000) {
          setLocationError(`ตำแหน่งจากอุปกรณ์มีความคลาดเคลื่อนประมาณ ${Math.round(position.coords.accuracy).toLocaleString()} เมตร กรุณาค้นหาด้วยชื่อเขตหรือจังหวัดหากแผนที่ไม่ตรง`);
        }
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "ยังไม่ได้รับอนุญาตให้ใช้ตำแหน่ง กรุณาอนุญาตจากเบราว์เซอร์หรือค้นหาด้วยชื่อพื้นที่"
          : "ไม่สามารถอ่านตำแหน่งปัจจุบันได้ กรุณาลองใหม่หรือค้นหาด้วยชื่อพื้นที่";
        setLocationStatus("error");
        setLocationError(message);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
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

  const categorySearchTerm = category === "ทั้งหมด"
    ? "ตลาดสด ซูเปอร์มาร์เก็ต ร้านขายของชำ"
    : category;
  const searchQuery = searchedArea
    ? `${categorySearchTerm} in ${searchedArea}`
    : coordinates
      ? `${categorySearchTerm} near ${coordinates.latitude},${coordinates.longitude}`
      : categorySearchTerm;

  const googleMapsUrl = useMemo(() => {
    const params = new URLSearchParams({ api: "1", query: searchQuery });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }, [searchQuery]);

  const selectedCategory = useMemo(
    () => marketCategories.find((item) => item.label === category) ?? marketCategories[0],
    [category],
  );

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || (!coordinates && !searchedArea)) {
      return;
    }

    let cancelled = false;

    async function searchPlaces() {
      setPlacesStatus("loading");
      setPlacesError("");

      try {
        const mapsLoader = await import("@googlemaps/js-api-loader");
        if (!mapsApiConfigured) {
          mapsLoader.setOptions({
            key: GOOGLE_MAPS_API_KEY,
            v: "weekly",
            language: "th",
            region: "TH",
          });
          mapsApiConfigured = true;
        }
        const { Place, SearchNearbyRankPreference } = await mapsLoader.importLibrary("places");
        const fields = ["id", "displayName", "formattedAddress", "location", "googleMapsURI", "types", "primaryType", "rating", "userRatingCount"];
        let results: google.maps.places.Place[];

        if (coordinates && !searchedArea && category !== "ร้านผักผลไม้") {
          const response = await Place.searchNearby({
            fields,
            includedTypes: allNearbyTypes,
            locationRestriction: {
              center: { lat: coordinates.latitude, lng: coordinates.longitude },
              radius: radiusKm * 1_000,
            },
            maxResultCount: 20,
            rankPreference: SearchNearbyRankPreference.DISTANCE,
            language: "th",
            region: "TH",
          });
          results = response.places;
        } else {
          const response = await Place.searchByText({
            fields,
            textQuery: searchedArea ? `${categorySearchTerm} ${searchedArea}` : categorySearchTerm,
            ...(coordinates && !searchedArea ? {
              locationBias: {
                center: { lat: coordinates.latitude, lng: coordinates.longitude },
                radius: radiusKm * 1_000,
              },
            } : {}),
            maxResultCount: 20,
            language: "th",
            region: "TH",
          });
          results = response.places;
        }

        if (cancelled) return;
        setPlaces(results.map((place, index) => {
          const placeCategory = category === "ร้านผักผลไม้"
            ? { category: "ร้านผักผลไม้" as const, icon: "🍊" }
            : getPlaceCategory(place.types ?? [], place.primaryType ?? null);
          return {
            id: place.id || `${place.displayName ?? "place"}-${index}`,
            name: place.displayName || "สถานที่ไม่มีชื่อ",
            address: place.formattedAddress || "ไม่มีข้อมูลที่อยู่",
            googleMapsUri: place.googleMapsURI || googleMapsUrl,
            distanceKm: coordinates && !searchedArea ? distanceInKm(coordinates, place.location) : null,
            ...placeCategory,
            rating: place.rating ?? null,
            userRatingCount: place.userRatingCount ?? 0,
          };
        }));
        setPlacesStatus("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("Google Places search failed", error);
        setPlaces([]);
        setPlacesStatus("error");
        setPlacesError("ยังโหลดรายชื่อสถานที่ไม่ได้ กรุณาเปิด Maps JavaScript API และ Places API (New) ให้กับ API key นี้");
      }
    }

    void searchPlaces();
    return () => {
      cancelled = true;
    };
  }, [category, categorySearchTerm, coordinates, googleMapsUrl, radiusKm, searchedArea]);

  const visiblePlaces = useMemo(() => places
    .filter((place) => category === "ทั้งหมด" || place.category === category)
    .sort((left, right) => sortBy === "rating"
      ? (right.rating ?? 0) - (left.rating ?? 0)
      : (left.distanceKm ?? Number.MAX_SAFE_INTEGER) - (right.distanceKm ?? Number.MAX_SAFE_INTEGER)), [category, places, sortBy]);

  const placeCounts = useMemo(() => ({
    markets: places.filter((place) => place.category === "ตลาดสด").length,
    supermarkets: places.filter((place) => place.category === "ซูเปอร์มาร์เก็ต").length,
    groceries: places.filter((place) => place.category === "ร้านขายของชำ").length,
  }), [places]);

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

        <section className="market-search-card market-search-redesign">
          <div className="market-search-options">
            <label><span>รัศมี</span><select onChange={(event) => setRadiusKm(Number(event.target.value))} value={radiusKm}><option value="3">3 กม.</option><option value="5">5 กม.</option><option value="10">10 กม.</option><option value="20">20 กม.</option></select></label>
            <label><span>เรียงลำดับ</span><select onChange={(event) => setSortBy(event.target.value as "distance" | "rating")} value={sortBy}><option value="distance">ระยะทางใกล้สุด</option><option value="rating">คะแนนสูงสุด</option></select></label>
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
            <small className="market-area-help">ถ้าตำแหน่งอุปกรณ์ไม่ตรง ให้ระบุเขต อำเภอ จังหวัด หรือชื่อสถานที่ใกล้เคียง</small>
          </form>

          <div className="market-category-list" aria-label="ประเภทสถานที่">
            {marketCategories.map((item) => (
              <button
                className={category === item.label ? "active" : ""}
                key={item.label}
                onClick={() => setCategory(item.label)}
                type="button"
              >
                <span>{item.icon}</span>{item.label}{item.label !== "ทั้งหมด" && placesStatus === "ready" ? ` (${places.filter((place) => place.category === item.label).length})` : ""}
              </button>
            ))}
          </div>
        </section>

        {locationError && <p className="market-location-error" role="alert">{locationError}</p>}

        <section className="market-map-card market-map-compact">
          <div className="market-map-card-heading">
            <div>
              <span className={locationStatus === "ready" ? "market-status-dot ready" : "market-status-dot"} />
              <div>
                <strong>{searchedArea ? `ผลการค้นหาใน ${searchedArea}` : coordinates ? "กำลังแสดงผลใกล้ตำแหน่งของคุณ" : "รอตำแหน่งสำหรับค้นหา"}</strong>
                <small>ประเภท: {category} · รัศมี {radiusKm} กม.</small>
                {coordinates && !searchedArea && <small className="market-coordinate-detail">พิกัด {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)} · แม่นยำประมาณ ±{Math.round(coordinates.accuracy).toLocaleString()} ม.</small>}
              </div>
            </div>
            <a href={googleMapsUrl} rel="noreferrer" target="_blank">เปิดใน Google Maps ↗</a>
          </div>

          {embedUrl ? (
            <iframe key={embedUrl} allowFullScreen aria-label={`แผนที่ค้นหา${searchQuery}`} className="market-google-map" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" src={embedUrl} title="Google Maps ตลาดใกล้ฉัน" />
          ) : (
            <div className="market-map-empty">
              <span>🗺️</span>
              <h2>{GOOGLE_MAPS_API_KEY ? "อนุญาตตำแหน่งหรือค้นหาพื้นที่" : "รอตั้งค่า Google Maps API Key"}</h2>
              <p>{GOOGLE_MAPS_API_KEY ? "เราจะใช้ตำแหน่งเฉพาะสำหรับแสดงตลาดใกล้คุณบนแผนที่" : "เพิ่ม API key ในไฟล์ .env.local แล้วเปิดเซิร์ฟเวอร์ใหม่"}</p>
              <a href={googleMapsUrl} rel="noreferrer" target="_blank">ค้นหาผ่าน Google Maps ตอนนี้</a>
            </div>
          )}
        </section>

        <section className="market-stat-grid">
          <article className="green"><span>🥬</span><div><small>ตลาดสด</small><strong>{placeCounts.markets}</strong><p>แห่ง</p></div></article>
          <article className="blue"><span>🛒</span><div><small>ซูเปอร์มาร์เก็ต</small><strong>{placeCounts.supermarkets}</strong><p>แห่ง</p></div></article>
          <article className="gray"><span>🏪</span><div><small>ร้านขายของชำ</small><strong>{placeCounts.groceries}</strong><p>แห่ง</p></div></article>
        </section>

        <section className="market-grid-section">
          <header><div><h2>{selectedCategory.icon} {category === "ทั้งหมด" ? "สถานที่ใกล้คุณ" : `${category}ใกล้คุณ`}</h2><p>{placesStatus === "ready" ? `แสดง ${visiblePlaces.length} จาก ${places.length} แห่ง` : "ผลลัพธ์ตามตัวกรองที่เลือก"}</p></div><span>ข้อมูลสถานที่โดย Google Maps</span></header>
          {placesStatus === "loading" ? <div className="market-place-message">กำลังค้นหาสถานที่...</div>
            : placesStatus === "error" ? <div className="market-place-message error"><strong>โหลดรายชื่อไม่ได้</strong><p>{placesError}</p><a href={googleMapsUrl} rel="noreferrer" target="_blank">ดูผลลัพธ์ใน Google Maps ↗</a></div>
              : placesStatus === "ready" && visiblePlaces.length === 0 ? <div className="market-place-message"><strong>ไม่พบสถานที่ตามตัวกรอง</strong><p>ลองเพิ่มรัศมี เปลี่ยนประเภท หรือค้นหาด้วยชื่อพื้นที่ใกล้เคียง</p></div>
                : visiblePlaces.length > 0 ? <div className="market-place-grid">{visiblePlaces.map((place) => <article className={place.category === "ซูเปอร์มาร์เก็ต" ? "blue" : place.category === "ร้านขายของชำ" ? "gray" : "green"} key={place.id}><div className="market-place-icon">{place.icon}</div><div className="market-place-copy"><div className="market-place-title"><h3>{place.name}</h3><span>เปิดดู</span></div><p>📍 {place.distanceKm !== null ? place.distanceKm < 1 ? `${Math.round(place.distanceKm * 1_000)} เมตร` : `${place.distanceKm.toFixed(1)} กม.` : place.address}</p>{place.rating !== null && <p>⭐ {place.rating.toFixed(1)} <small>({place.userRatingCount.toLocaleString()} รีวิว)</small></p>}<span className="market-place-tag">{place.category}</span><a href={place.googleMapsUri} rel="noreferrer" target="_blank">ดูรายละเอียด ↗</a></div></article>)}</div>
                  : <div className="market-place-message"><strong>เลือกตำแหน่งเพื่อเริ่มค้นหา</strong><p>กดใช้ตำแหน่งปัจจุบันหรือค้นหาด้วยชื่อพื้นที่</p></div>}
        </section>

        <p className="market-privacy-note">ตำแหน่งของคุณใช้เพื่อค้นหาในหน้านี้เท่านั้น และไม่ได้ถูกบันทึกลงในระบบ</p>
      </div>
    </main>
  );
}
