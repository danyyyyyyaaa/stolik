import { useState, useEffect } from "react";

// ─── TRANSLATIONS ────────────────────────────────────────────────────────────
const T = {
  pl: {
    all: "Wszystkie", polish: "Polska", italian: "Włoska", japanese: "Japońska", french: "Francuska",
    reserve: "Zarezerwuj stolik →",
    search_placeholder: "Szukaj restauracji...",
    search_label: "Szukaj",
    bookings_label: "Rezerwacje",
    profile_label: "Profil",
    home_label: "Start",
    explore_label: "Odkryj",
    good_morning: "Dzień dobry",
    find_table: "Znajdź swój stolik",
    available_now: "Dostępne teraz",
    top_rated: "Najwyżej oceniane",
    book_table: "Rezerwuj stolik",
    select_date: "Wybierz datę",
    select_time: "Wybierz godzinę",
    select_guests: "Liczba gości",
    guests: "gości",
    guest: "gość",
    confirm_booking: "Potwierdź rezerwację",
    booking_confirmed: "Rezerwacja potwierdzona!",
    booking_sub: "Potwierdzenie zostało wysłane na Twój telefon",
    view_booking: "Zobacz rezerwację",
    back_home: "Wróć do głównej",
    my_bookings: "Moje rezerwacje",
    upcoming: "Nadchodzące",
    past: "Poprzednie",
    no_bookings: "Brak rezerwacji",
    cancel: "Anuluj",
    details: "Szczegóły",
    rating: "ocena",
    open_until: "Czynne do",
    about: "O restauracji",
    menu: "Menu",
    reviews: "Opinie",
    photos: "Zdjęcia",
    profile: "Profil",
    settings: "Ustawienia",
    language: "Język",
    theme: "Motyw",
    dark: "Ciemny",
    light: "Jasny",
    logout: "Wyloguj",
    person: "MK",
    tonight: "Dziś wieczór",
    tomorrow: "Jutro",
    this_weekend: "Ten weekend",
    date_label: "Data",
    time_label: "Godzina",
    summary: "Podsumowanie",
    restaurant: "Restauracja",
    date: "Data",
    time: "Godzina",
    table_for: "Stolik dla",
    booking_id: "Nr rezerwacji",
  },
  en: {
    all: "All", polish: "Polish", italian: "Italian", japanese: "Japanese", french: "French",
    reserve: "Reserve a table →",
    search_placeholder: "Search restaurants...",
    search_label: "Search",
    bookings_label: "Bookings",
    profile_label: "Profile",
    home_label: "Home",
    explore_label: "Explore",
    good_morning: "Good evening",
    find_table: "Find your table",
    available_now: "Available now",
    top_rated: "Top rated",
    book_table: "Book a table",
    select_date: "Select date",
    select_time: "Select time",
    select_guests: "Number of guests",
    guests: "guests",
    guest: "guest",
    confirm_booking: "Confirm booking",
    booking_confirmed: "Booking confirmed!",
    booking_sub: "Confirmation has been sent to your phone",
    view_booking: "View booking",
    back_home: "Back to home",
    my_bookings: "My bookings",
    upcoming: "Upcoming",
    past: "Past",
    no_bookings: "No bookings yet",
    cancel: "Cancel",
    details: "Details",
    rating: "rating",
    open_until: "Open until",
    about: "About",
    menu: "Menu",
    reviews: "Reviews",
    photos: "Photos",
    profile: "Profile",
    settings: "Settings",
    language: "Language",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    logout: "Log out",
    person: "MK",
    tonight: "Tonight",
    tomorrow: "Tomorrow",
    this_weekend: "This weekend",
    date_label: "Date",
    time_label: "Time",
    summary: "Summary",
    restaurant: "Restaurant",
    date: "Date",
    time: "Time",
    table_for: "Table for",
    booking_id: "Booking ID",
  },
  ru: {
    all: "Все", polish: "Польская", italian: "Итальянская", japanese: "Японская", french: "Французская",
    reserve: "Забронировать столик →",
    search_placeholder: "Поиск ресторанов...",
    search_label: "Поиск",
    bookings_label: "Брони",
    profile_label: "Профиль",
    home_label: "Главная",
    explore_label: "Обзор",
    good_morning: "Добрый вечер",
    find_table: "Найди свой столик",
    available_now: "Доступно сейчас",
    top_rated: "Лучшие",
    book_table: "Забронировать",
    select_date: "Выберите дату",
    select_time: "Выберите время",
    select_guests: "Количество гостей",
    guests: "гостей",
    guest: "гость",
    confirm_booking: "Подтвердить бронь",
    booking_confirmed: "Бронь подтверждена!",
    booking_sub: "Подтверждение отправлено на ваш телефон",
    view_booking: "Посмотреть бронь",
    back_home: "На главную",
    my_bookings: "Мои брони",
    upcoming: "Предстоящие",
    past: "Прошедшие",
    no_bookings: "Броней пока нет",
    cancel: "Отмена",
    details: "Подробнее",
    rating: "рейтинг",
    open_until: "Открыто до",
    about: "О ресторане",
    menu: "Меню",
    reviews: "Отзывы",
    photos: "Фото",
    profile: "Профиль",
    settings: "Настройки",
    language: "Язык",
    theme: "Тема",
    dark: "Тёмная",
    light: "Светлая",
    logout: "Выйти",
    person: "МК",
    tonight: "Сегодня вечером",
    tomorrow: "Завтра",
    this_weekend: "На выходных",
    date_label: "Дата",
    time_label: "Время",
    summary: "Сводка",
    restaurant: "Ресторан",
    date: "Дата",
    time: "Время",
    table_for: "Столик на",
    booking_id: "№ брони",
  },
  uk: {
    all: "Всі", polish: "Польська", italian: "Італійська", japanese: "Японська", french: "Французька",
    reserve: "Забронювати столик →",
    search_placeholder: "Пошук ресторанів...",
    search_label: "Пошук",
    bookings_label: "Брони",
    profile_label: "Профіль",
    home_label: "Головна",
    explore_label: "Огляд",
    good_morning: "Добрий вечір",
    find_table: "Знайди свій столик",
    available_now: "Доступно зараз",
    top_rated: "Найкращі",
    book_table: "Забронювати",
    select_date: "Оберіть дату",
    select_time: "Оберіть час",
    select_guests: "Кількість гостей",
    guests: "гостей",
    guest: "гість",
    confirm_booking: "Підтвердити бронь",
    booking_confirmed: "Бронь підтверджена!",
    booking_sub: "Підтвердження надіслано на ваш телефон",
    view_booking: "Переглянути бронь",
    back_home: "На головну",
    my_bookings: "Мої брони",
    upcoming: "Майбутні",
    past: "Минулі",
    no_bookings: "Броней поки немає",
    cancel: "Скасувати",
    details: "Детальніше",
    rating: "рейтинг",
    open_until: "Відчинено до",
    about: "Про ресторан",
    menu: "Меню",
    reviews: "Відгуки",
    photos: "Фото",
    profile: "Профіль",
    settings: "Налаштування",
    language: "Мова",
    theme: "Тема",
    dark: "Темна",
    light: "Світла",
    logout: "Вийти",
    person: "МК",
    tonight: "Сьогодні ввечері",
    tomorrow: "Завтра",
    this_weekend: "На вихідних",
    date_label: "Дата",
    time_label: "Час",
    summary: "Підсумок",
    restaurant: "Ресторан",
    date: "Дата",
    time: "Час",
    table_for: "Столик на",
    booking_id: "№ брон.",
  },
};

// ─── DATA ────────────────────────────────────────────────────────────────────
const RESTAURANTS = [
  { id: 1, name: "Różana", district: "Mokotów", cuisine: "italian", rating: 4.9, price: "$$$", emoji: "🍝", color: "#C84B31", open: "23:00", desc: "Klasyczna włoska kuchnia w sercu Mokotowa. Domowe makarony, świeże składniki i wyjątkowa atmosfera." },
  { id: 2, name: "Sowa & Przyjaciele", district: "Śródmieście", cuisine: "polish", rating: 4.7, price: "$$", emoji: "🦉", color: "#2D6A35", open: "22:00", desc: "Nowoczesna kuchnia polska z tradycyjnymi akcentami. Sezonowe menu zmienia się co miesiąc." },
  { id: 3, name: "Tamka 43", district: "Powiśle", cuisine: "french", rating: 4.8, price: "$$$$", emoji: "🥂", color: "#8B5A2B", open: "23:30", desc: "Wysublimowana kuchnia francuska z widokiem na Wisłę. Obowiązkowa rezerwacja." },
  { id: 4, name: "Koku Sushi", district: "Żoliborz", cuisine: "japanese", rating: 4.6, price: "$$$", emoji: "🍱", color: "#C0392B", open: "22:30", desc: "Autentyczne sushi od japońskiego szefa kuchni. Świeże ryby dostępne każdego dnia." },
  { id: 5, name: "Zoni", district: "Praga", cuisine: "polish", rating: 4.5, price: "$$", emoji: "🥘", color: "#1A6B5A", open: "21:00", desc: "Kuchnia polska w industrialnym klimacie Pragi. Lokalne produkty, duże porcje." },
  { id: 6, name: "Osteria Rossa", district: "Wilanów", cuisine: "italian", rating: 4.8, price: "$$$", emoji: "🫕", color: "#9B2335", open: "23:00", desc: "Rodzinna osteria z Sycylii. Autentyczne przepisy, lokalne wino, ciepła atmosfera." },
];

const TIMES = ["17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30"];

// ─── THEME ───────────────────────────────────────────────────────────────────
const themes = {
  dark: {
    bg: "#131A14",
    bgCard: "#1E2620",
    bgCardAlt: "#252D26",
    border: "rgba(255,255,255,0.07)",
    text: "#F0F4F0",
    textSub: "#8A9E8C",
    textMuted: "#5A6E5C",
    accent: "#3D8B4E",
    accentText: "#5DBF72",
    accentBg: "rgba(61,139,78,0.15)",
    pill: "#1E2620",
    pillActive: "#3D8B4E",
    pillActiveText: "#fff",
    navBg: "#131A14",
    navBorder: "rgba(255,255,255,0.06)",
    inputBg: "#1E2620",
    overlayBg: "rgba(0,0,0,0.6)",
    success: "#3D8B4E",
    shadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  light: {
    bg: "#F4F7F4",
    bgCard: "#FFFFFF",
    bgCardAlt: "#EDF2ED",
    border: "rgba(0,0,0,0.08)",
    text: "#1A2B1C",
    textSub: "#5A7A5C",
    textMuted: "#8FA88F",
    accent: "#2D6A35",
    accentText: "#2D6A35",
    accentBg: "rgba(45,106,53,0.1)",
    pill: "#E8EFE8",
    pillActive: "#2D6A35",
    pillActiveText: "#fff",
    navBg: "#FFFFFF",
    navBorder: "rgba(0,0,0,0.06)",
    inputBg: "#FFFFFF",
    overlayBg: "rgba(0,0,0,0.4)",
    success: "#2D6A35",
    shadow: "0 8px 32px rgba(0,0,0,0.1)",
  }
};

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    bookmark: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
    chevronLeft: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    minus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    mapPin: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    globe: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  };
  return icons[name] || null;
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("pl");
  const [screen, setScreen] = useState("home"); // home | restaurant | booking | confirmed | bookings | profile | search
  const [activeTab, setActiveTab] = useState("home");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [bookingDate, setBookingDate] = useState(null);
  const [bookingTime, setBookingTime] = useState(null);
  const [bookingGuests, setBookingGuests] = useState(2);
  const [myBookings, setMyBookings] = useState([]);
  const [restaurantTab, setRestaurantTab] = useState("about");
  const [searchQuery, setSearchQuery] = useState("");

  const t = T[lang];
  const th = themes[theme];

  const cuisines = ["all", "italian", "polish", "french", "japanese"];
  const cuisineLabels = { all: t.all, italian: t.italian, polish: t.polish, french: t.french, japanese: t.japanese };

  const filteredRestaurants = RESTAURANTS.filter(r =>
    (cuisineFilter === "all" || r.cuisine === cuisineFilter) &&
    (searchQuery === "" || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.district.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const dates = [
    { label: t.tonight, value: "Dziś, 20 mar" },
    { label: t.tomorrow, value: "Jutro, 21 mar" },
    { label: t.this_weekend, value: "Sob, 22 mar" },
    { label: "22 mar", value: "22 mar" },
    { label: "23 mar", value: "23 mar" },
  ];

  function goTo(s, tab) {
    setScreen(s);
    if (tab) setActiveTab(tab);
  }

  function openRestaurant(r) {
    setSelectedRestaurant(r);
    setRestaurantTab("about");
    setBookingDate(null);
    setBookingTime(null);
    setBookingGuests(2);
    setScreen("restaurant");
  }

  function confirmBooking() {
    const newBooking = {
      id: `#ST${Math.floor(Math.random()*9000+1000)}`,
      restaurant: selectedRestaurant,
      date: bookingDate || dates[0].value,
      time: bookingTime || TIMES[4],
      guests: bookingGuests,
    };
    setMyBookings(prev => [newBooking, ...prev]);
    setScreen("confirmed");
  }

  const s = {
    phone: { width: 390, minHeight: 780, background: th.bg, color: th.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", overflow: "hidden", transition: "background 0.3s, color 0.3s" },
    nav: { position: "sticky", bottom: 0, background: th.navBg, borderTop: `1px solid ${th.navBorder}`, display: "flex", justifyContent: "space-around", padding: "10px 0 16px", backdropFilter: "blur(20px)" },
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh", background: theme === "dark" ? "#0A0F0B" : "#DCE8DC", padding: "24px 0", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        .stolik-btn { transition: transform 0.12s, opacity 0.12s; cursor: pointer; }
        .stolik-btn:active { transform: scale(0.97); opacity: 0.85; }
        .card-hover { transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
        .card-hover:hover { transform: translateY(-2px); }
        .pill-btn { transition: all 0.2s; cursor: pointer; border: none; }
        .fade-in { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .check-anim { animation: checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes checkPop { from { transform: scale(0); } to { transform: scale(1); } }
      `}</style>

      <div style={{ ...s.phone, borderRadius: 44, boxShadow: "0 32px 80px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>

        {/* STATUS BAR */}
        <div style={{ padding: "14px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>9:41</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill={th.text}><rect x="0" y="3" width="3" height="7" rx="1"/><rect x="4.5" y="2" width="3" height="8" rx="1"/><rect x="9" y="0" width="3" height="10" rx="1"/><rect x="13.5" y="1" width="2.5" height="9" rx="1" opacity="0.3"/></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke={th.text} strokeWidth="1.5"><path d="M8 3C9.5 3 10.9 3.6 12 4.5"/><path d="M4 4.5C5.1 3.6 6.5 3 8 3"/><path d="M6 6c.6-.5 1.3-.8 2-.8s1.4.3 2 .8"/><circle cx="8" cy="9" r="1.2" fill={th.text} stroke="none"/></svg>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <div style={{ width: 22, height: 11, borderRadius: 3, border: `1.5px solid ${th.text}`, padding: 2, display: "flex", alignItems: "center" }}>
                <div style={{ width: "80%", height: "100%", background: th.text, borderRadius: 1.5 }}/>
              </div>
            </div>
          </div>
        </div>

        {/* SCREENS */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 4 }}>
          {screen === "home" && <HomeScreen {...{t, th, cuisines, cuisineLabels, cuisineFilter, setCuisineFilter, filteredRestaurants, openRestaurant, theme, setTheme, lang, setLang}} />}
          {screen === "search" && <SearchScreen {...{t, th, searchQuery, setSearchQuery, filteredRestaurants, openRestaurant}} />}
          {screen === "restaurant" && <RestaurantScreen {...{t, th, selectedRestaurant, restaurantTab, setRestaurantTab, bookingDate, setBookingDate, bookingTime, setBookingTime, bookingGuests, setBookingGuests, dates, TIMES, goTo, confirmBooking}} />}
          {screen === "booking" && <BookingScreen {...{t, th, selectedRestaurant, bookingDate, setBookingDate, bookingTime, setBookingTime, bookingGuests, setBookingGuests, dates, TIMES, goTo, confirmBooking}} />}
          {screen === "confirmed" && <ConfirmedScreen {...{t, th, myBookings, goTo}} />}
          {screen === "bookings" && <BookingsScreen {...{t, th, myBookings, openRestaurant}} />}
          {screen === "profile" && <ProfileScreen {...{t, th, theme, setTheme, lang, setLang, goTo}} />}
        </div>

        {/* BOTTOM NAV */}
        {!["booking","confirmed","restaurant"].includes(screen) && (
          <div style={s.nav}>
            {[
              { id: "home", icon: "home", label: t.home_label },
              { id: "search", icon: "search", label: t.search_label },
              { id: "bookings", icon: "bookmark", label: t.bookings_label },
              { id: "profile", icon: "user", label: t.profile_label },
            ].map(item => {
              const active = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => { setActiveTab(item.id); goTo(item.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "2px 12px" }}>
                  <Icon name={item.icon} size={22} color={active ? th.accent : th.textMuted} />
                  <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? th.accent : th.textMuted }}>{item.label}</span>
                  {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: th.accent, marginTop: -2 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen({ t, th, cuisines, cuisineLabels, cuisineFilter, setCuisineFilter, filteredRestaurants, openRestaurant, theme, setTheme, lang, setLang }) {
  return (
    <div className="fade-in" style={{ padding: "16px 0 20px" }}>
      {/* Header */}
      <div style={{ padding: "0 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: th.textSub, marginBottom: 2 }}>{t.good_morning} 👋</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
            Stol<span style={{ fontStyle: "italic", color: th.accent }}>ik</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Lang switcher */}
          <div style={{ display: "flex", gap: 4 }}>
            {["pl","en","ru","uk"].map(l => (
              <button key={l} onClick={() => setLang(l)} className="pill-btn"
                style={{ padding: "4px 7px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: lang === l ? th.accent : th.bgCard, color: lang === l ? "#fff" : th.textSub, border: `1px solid ${th.border}` }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="stolik-btn"
            style={{ width: 36, height: 36, borderRadius: 12, background: th.bgCard, border: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} color={th.textSub} />
          </button>
          {/* Avatar */}
          <div style={{ width: 36, height: 36, borderRadius: 12, background: th.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
            {t.person}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ background: th.bgCard, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, border: `1px solid ${th.border}` }}>
          <Icon name="search" size={16} color={th.textMuted} />
          <span style={{ fontSize: 14, color: th.textMuted }}>{t.search_placeholder}</span>
        </div>
      </div>

      {/* Cuisine filters */}
      <div style={{ display: "flex", gap: 8, padding: "0 20px 20px", overflowX: "auto" }}>
        {cuisines.map(c => (
          <button key={c} onClick={() => setCuisineFilter(c)} className="pill-btn"
            style={{ padding: "8px 16px", borderRadius: 999, whiteSpace: "nowrap", fontSize: 13, fontWeight: 500, background: cuisineFilter === c ? th.pillActive : th.pill, color: cuisineFilter === c ? th.pillActiveText : th.textSub, border: `1px solid ${cuisineFilter === c ? "transparent" : th.border}` }}>
            {cuisineLabels[c]}
          </button>
        ))}
      </div>

      {/* Section title */}
      <div style={{ padding: "0 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{t.available_now}</span>
        <span style={{ fontSize: 12, color: th.accent }}>{filteredRestaurants.length}</span>
      </div>

      {/* Restaurant cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 20px" }}>
        {filteredRestaurants.map((r, i) => (
          <RestaurantCard key={r.id} r={r} t={t} th={th} onClick={() => openRestaurant(r)} index={i} />
        ))}
      </div>
    </div>
  );
}

function RestaurantCard({ r, t, th, onClick, index }) {
  return (
    <div onClick={onClick} className="card-hover fade-in"
      style={{ background: th.bgCard, borderRadius: 20, overflow: "hidden", border: `1px solid ${th.border}`, animationDelay: `${index * 0.05}s` }}>
      {/* Visual area */}
      <div style={{ height: 120, background: `linear-gradient(135deg, ${r.color}22, ${r.color}44)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: `1px solid ${th.border}` }}>
        <span style={{ fontSize: 52 }}>{r.emoji}</span>
        <div style={{ position: "absolute", top: 12, right: 12, background: th.accentBg, borderRadius: 10, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="star" size={11} color={th.accentText} />
          <span style={{ fontSize: 12, fontWeight: 600, color: th.accentText }}>{r.rating}</span>
        </div>
        <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "3px 8px" }}>
          <span style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>{t.open_until} {r.open}</span>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{r.name}</div>
          <div style={{ fontSize: 13, color: th.textMuted, fontWeight: 500 }}>{r.price}</div>
        </div>
        <div style={{ fontSize: 12, color: th.textSub, marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="mapPin" size={11} color={th.textMuted} />
          {r.district}
          <span style={{ color: th.border }}>·</span>
          <span style={{ textTransform: "capitalize" }}>{r.cuisine}</span>
        </div>
        <button className="stolik-btn"
          style={{ width: "100%", padding: "13px 0", borderRadius: 14, background: th.accent, color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", letterSpacing: 0.2 }}>
          {t.reserve}
        </button>
      </div>
    </div>
  );
}

// ─── SEARCH SCREEN ────────────────────────────────────────────────────────────
function SearchScreen({ t, th, searchQuery, setSearchQuery, filteredRestaurants, openRestaurant }) {
  return (
    <div className="fade-in" style={{ padding: "20px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{t.search_label}</div>
      <div style={{ background: th.bgCard, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, border: `1px solid ${th.border}`, marginBottom: 20 }}>
        <Icon name="search" size={16} color={th.textMuted} />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t.search_placeholder}
          style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: th.text, fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredRestaurants.map(r => (
          <div key={r.id} onClick={() => openRestaurant(r)} className="card-hover"
            style={{ background: th.bgCard, borderRadius: 16, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center", border: `1px solid ${th.border}`, cursor: "pointer" }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: `${r.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{r.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: th.textSub }}>{r.district} · {r.price}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Icon name="star" size={12} color={th.accentText} />
              <span style={{ fontSize: 13, fontWeight: 600, color: th.accentText }}>{r.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESTAURANT SCREEN ────────────────────────────────────────────────────────
function RestaurantScreen({ t, th, selectedRestaurant: r, restaurantTab, setRestaurantTab, bookingDate, setBookingDate, bookingTime, setBookingTime, bookingGuests, setBookingGuests, dates, TIMES, goTo, confirmBooking }) {
  if (!r) return null;
  const tabs = ["about","menu","reviews"];

  return (
    <div className="fade-in">
      {/* Hero */}
      <div style={{ height: 220, background: `linear-gradient(135deg, ${r.color}33, ${r.color}66)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <span style={{ fontSize: 80 }}>{r.emoji}</span>
        <button onClick={() => goTo("home", "home")} className="stolik-btn"
          style={{ position: "absolute", top: 20, left: 20, width: 38, height: 38, borderRadius: 12, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="chevronLeft" size={18} color="#fff" />
        </button>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 20px 20px", background: `linear-gradient(transparent, ${th.bg})` }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{r.name}</div>
          <div style={{ fontSize: 13, color: th.textSub, display: "flex", gap: 8, marginTop: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon name="star" size={12} color={th.accentText} /><span style={{ color: th.accentText, fontWeight: 600 }}>{r.rating}</span></span>
            <span>·</span><span>{r.district}</span><span>·</span><span>{r.price}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 20px", gap: 4, borderBottom: `1px solid ${th.border}`, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setRestaurantTab(tab)} className="pill-btn"
            style={{ padding: "12px 16px", fontSize: 13, fontWeight: restaurantTab === tab ? 600 : 400, color: restaurantTab === tab ? th.accent : th.textSub, background: "none", border: "none", borderBottom: restaurantTab === tab ? `2px solid ${th.accent}` : "2px solid transparent", cursor: "pointer", textTransform: "capitalize" }}>
            {t[tab]}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 20px" }}>
        {restaurantTab === "about" && (
          <div>
            <p style={{ fontSize: 14, color: th.textSub, lineHeight: 1.7, marginBottom: 20 }}>{r.desc}</p>
            <div style={{ background: th.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${th.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: th.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>Info</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${th.border}` }}>
                <span style={{ fontSize: 13, color: th.textSub }}>{t.open_until}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{r.open}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: 13, color: th.textSub }}>{t.district || "Dzielnica"}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{r.district}</span>
              </div>
            </div>
          </div>
        )}
        {restaurantTab === "menu" && (
          <div style={{ color: th.textSub, fontSize: 14, textAlign: "center", padding: "40px 0" }}>🍽️<br/>Menu coming soon...</div>
        )}
        {restaurantTab === "reviews" && (
          <div style={{ color: th.textSub, fontSize: 14, textAlign: "center", padding: "40px 0" }}>⭐<br/>Reviews coming soon...</div>
        )}
      </div>

      {/* Quick booking at bottom */}
      <div style={{ padding: "16px 20px 20px" }}>
        <div style={{ background: th.bgCard, borderRadius: 20, padding: 16, border: `1px solid ${th.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t.book_table}</div>
          {/* Date */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
            {dates.slice(0,4).map(d => (
              <button key={d.value} onClick={() => setBookingDate(d.value)} className="pill-btn"
                style={{ padding: "7px 12px", borderRadius: 10, whiteSpace: "nowrap", fontSize: 12, fontWeight: 500, background: bookingDate === d.value ? th.accent : th.bgCardAlt, color: bookingDate === d.value ? "#fff" : th.textSub, border: `1px solid ${bookingDate === d.value ? "transparent" : th.border}` }}>
                {d.label}
              </button>
            ))}
          </div>
          {/* Time */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
            {TIMES.slice(2,8).map(ti => (
              <button key={ti} onClick={() => setBookingTime(ti)} className="pill-btn"
                style={{ padding: "7px 12px", borderRadius: 10, whiteSpace: "nowrap", fontSize: 12, fontWeight: 500, background: bookingTime === ti ? th.accent : th.bgCardAlt, color: bookingTime === ti ? "#fff" : th.textSub, border: `1px solid ${bookingTime === ti ? "transparent" : th.border}` }}>
                {ti}
              </button>
            ))}
          </div>
          {/* Guests */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: th.textSub }}>{t.select_guests}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setBookingGuests(g => Math.max(1,g-1))} className="stolik-btn"
                style={{ width: 28, height: 28, borderRadius: 8, background: th.bgCardAlt, border: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon name="minus" size={14} color={th.text} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{bookingGuests}</span>
              <button onClick={() => setBookingGuests(g => Math.min(12,g+1))} className="stolik-btn"
                style={{ width: 28, height: 28, borderRadius: 8, background: th.bgCardAlt, border: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon name="plus" size={14} color={th.text} />
              </button>
            </div>
          </div>
          <button onClick={confirmBooking} className="stolik-btn"
            style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: th.accent, color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>
            {t.confirm_booking}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING SCREEN ───────────────────────────────────────────────────────────
function BookingScreen({ t, th, selectedRestaurant: r, bookingDate, setBookingDate, bookingTime, setBookingTime, bookingGuests, setBookingGuests, dates, TIMES, goTo, confirmBooking }) {
  if (!r) return null;
  return (
    <div className="fade-in" style={{ padding: "20px 20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => goTo("restaurant")} className="stolik-btn"
          style={{ width: 36, height: 36, borderRadius: 12, background: th.bgCard, border: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="chevronLeft" size={18} color={th.text} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{t.book_table}</div>
      </div>

      {/* Restaurant mini */}
      <div style={{ background: th.bgCard, borderRadius: 16, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", marginBottom: 20, border: `1px solid ${th.border}` }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${r.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{r.emoji}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: th.textSub }}>{r.district} · {r.price}</div>
        </div>
      </div>

      {/* Date */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: th.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="calendar" size={13} color={th.textMuted} />{t.select_date}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dates.map(d => (
            <button key={d.value} onClick={() => setBookingDate(d.value)} className="pill-btn"
              style={{ padding: "9px 14px", borderRadius: 12, fontSize: 13, fontWeight: 500, background: bookingDate === d.value ? th.accent : th.bgCard, color: bookingDate === d.value ? "#fff" : th.textSub, border: `1px solid ${bookingDate === d.value ? "transparent" : th.border}` }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: th.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="clock" size={13} color={th.textMuted} />{t.select_time}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {TIMES.map(ti => (
            <button key={ti} onClick={() => setBookingTime(ti)} className="pill-btn"
              style={{ padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 500, textAlign: "center", background: bookingTime === ti ? th.accent : th.bgCard, color: bookingTime === ti ? "#fff" : th.textSub, border: `1px solid ${bookingTime === ti ? "transparent" : th.border}` }}>
              {ti}
            </button>
          ))}
        </div>
      </div>

      {/* Guests */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: th.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="users" size={13} color={th.textMuted} />{t.select_guests}
        </div>
        <div style={{ background: th.bgCard, borderRadius: 16, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${th.border}` }}>
          <button onClick={() => setBookingGuests(g => Math.max(1,g-1))} className="stolik-btn"
            style={{ width: 36, height: 36, borderRadius: 10, background: th.bgCardAlt, border: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="minus" size={16} color={th.text} />
          </button>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{bookingGuests} <span style={{ fontSize: 14, fontWeight: 400, color: th.textSub }}>{bookingGuests === 1 ? t.guest : t.guests}</span></span>
          <button onClick={() => setBookingGuests(g => Math.min(12,g+1))} className="stolik-btn"
            style={{ width: 36, height: 36, borderRadius: 10, background: th.bgCardAlt, border: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="plus" size={16} color={th.text} />
          </button>
        </div>
      </div>

      <button onClick={confirmBooking} className="stolik-btn"
        style={{ width: "100%", padding: "16px 0", borderRadius: 16, background: th.accent, color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: 0.3 }}>
        {t.confirm_booking}
      </button>
    </div>
  );
}

// ─── CONFIRMED SCREEN ─────────────────────────────────────────────────────────
function ConfirmedScreen({ t, th, myBookings, goTo }) {
  const b = myBookings[0];
  return (
    <div className="fade-in" style={{ padding: "40px 24px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Check circle */}
      <div className="check-anim" style={{ width: 80, height: 80, borderRadius: "50%", background: `${th.accent}22`, border: `2px solid ${th.accent}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Icon name="check" size={36} color={th.accent} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>{t.booking_confirmed}</div>
      <div style={{ fontSize: 13, color: th.textSub, textAlign: "center", marginBottom: 28, lineHeight: 1.6 }}>{t.booking_sub}</div>

      {b && (
        <div style={{ background: th.bgCard, borderRadius: 20, padding: 20, width: "100%", border: `1px solid ${th.border}`, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${th.border}` }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${b.restaurant.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{b.restaurant.emoji}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{b.restaurant.name}</div>
              <div style={{ fontSize: 12, color: th.textSub }}>{b.restaurant.district}</div>
            </div>
          </div>
          {[
            [t.date, b.date || "Dziś, 20 mar"],
            [t.time, b.time || "19:00"],
            [t.table_for, `${b.guests} ${b.guests === 1 ? t.guest : t.guests}`],
            [t.booking_id, b.id],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 13, color: th.textSub }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => { goTo("bookings", "bookings"); }} className="stolik-btn"
        style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: th.accent, color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", marginBottom: 10 }}>
        {t.view_booking}
      </button>
      <button onClick={() => goTo("home","home")} className="stolik-btn"
        style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: th.bgCard, color: th.textSub, fontSize: 14, fontWeight: 500, border: `1px solid ${th.border}`, cursor: "pointer" }}>
        {t.back_home}
      </button>
    </div>
  );
}

// ─── BOOKINGS SCREEN ──────────────────────────────────────────────────────────
function BookingsScreen({ t, th, myBookings, openRestaurant }) {
  return (
    <div className="fade-in" style={{ padding: "20px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t.my_bookings}</div>
      {myBookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: th.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{t.no_bookings}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {myBookings.map(b => (
            <div key={b.id} onClick={() => openRestaurant(b.restaurant)} className="card-hover"
              style={{ background: th.bgCard, borderRadius: 18, padding: 16, border: `1px solid ${th.border}`, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: `${b.restaurant.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{b.restaurant.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.restaurant.name}</div>
                  <div style={{ fontSize: 12, color: th.textSub }}>{b.restaurant.district}</div>
                </div>
                <div style={{ background: th.accentBg, borderRadius: 8, padding: "4px 10px" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: th.accentText }}>✓</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 12, color: th.textSub, display: "flex", alignItems: "center", gap: 4 }}><Icon name="calendar" size={11} color={th.textMuted} />{b.date || "Dziś"}</span>
                <span style={{ fontSize: 12, color: th.textSub, display: "flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={11} color={th.textMuted} />{b.time || "19:00"}</span>
                <span style={{ fontSize: 12, color: th.textSub, display: "flex", alignItems: "center", gap: 4 }}><Icon name="users" size={11} color={th.textMuted} />{b.guests}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: th.textMuted }}>{b.id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
function ProfileScreen({ t, th, theme, setTheme, lang, setLang, goTo }) {
  const langs = [
    { code: "pl", label: "Polski", flag: "🇵🇱" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "uk", label: "Українська", flag: "🇺🇦" },
  ];
  return (
    <div className="fade-in" style={{ padding: "20px 20px 24px" }}>
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 60, height: 60, borderRadius: 20, background: th.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>{t.person}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Marek Kowalski</div>
          <div style={{ fontSize: 13, color: th.textSub }}>marek@stolik.pl</div>
        </div>
      </div>

      {/* Theme */}
      <div style={{ background: th.bgCard, borderRadius: 18, padding: "4px 16px", border: `1px solid ${th.border}`, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${th.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name={theme === "dark" ? "moon" : "sun"} size={16} color={th.textSub} />
            <span style={{ fontSize: 14 }}>{t.theme}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["dark","light"].map(tm => (
              <button key={tm} onClick={() => setTheme(tm)} className="pill-btn"
                style={{ padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: theme === tm ? th.accent : th.bgCardAlt, color: theme === tm ? "#fff" : th.textSub, border: `1px solid ${theme === tm ? "transparent" : th.border}` }}>
                {tm === "dark" ? t.dark : t.light}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Icon name="globe" size={16} color={th.textSub} />
            <span style={{ fontSize: 14 }}>{t.language}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {langs.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)} className="pill-btn"
                style={{ padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 500, background: lang === l.code ? th.accentBg : th.bgCardAlt, color: lang === l.code ? th.accentText : th.textSub, border: `1.5px solid ${lang === l.code ? th.accent : th.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{l.flag}</span><span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="stolik-btn"
        style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: th.bgCard, color: "#E05C5C", fontSize: 14, fontWeight: 500, border: `1px solid ${th.border}`, cursor: "pointer", marginTop: 8 }}>
        {t.logout}
      </button>
    </div>
  );
}
