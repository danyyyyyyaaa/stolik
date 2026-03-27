import React, { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'

export type LangKey = 'pl' | 'en' | 'ru' | 'uk'

export interface Translations {
  // navigation
  all: string; polish: string; italian: string; japanese: string; french: string
  reserve: string; search_placeholder: string; search_label: string
  bookings_label: string; profile_label: string; home_label: string
  // home
  good_morning: string; find_table: string; find_your_table: string
  available_now: string; top_rated: string
  // booking flow
  book_table: string; select_date: string; select_time: string; select_guests: string
  guests: string; guest: string; confirm_booking: string
  booking_confirmed: string; booking_sub: string; view_booking: string; back_home: string
  // bookings list
  my_bookings: string; upcoming: string; past: string; no_bookings: string
  find_restaurant_btn: string
  // general
  cancel: string; details: string; rating: string; open_until: string
  about: string; menu: string; reviews: string; profile: string
  settings: string; language: string; theme: string; dark: string; light: string
  logout: string; tonight: string; tomorrow: string; this_weekend: string
  // booking summary
  date_label: string; time_label: string; summary: string; restaurant: string
  date: string; time: string; table_for: string; booking_id: string
  // slots
  loading_slots: string; no_slots: string; loading: string; save: string
  // contact form
  name_placeholder: string; phone_placeholder: string; contact_section: string
  booking_error: string
  // auth
  sign_in: string; email: string; password: string
  sign_in_btn: string; no_account: string; register: string
  // restaurant detail
  menu_soon: string; reviews_soon: string; district: string; address: string
  cuisine_label: string
  // profile
  first_name: string; last_name: string; fill_fields: string; user: string
  not_found: string; sign_in_required: string
  notifications: string; edit_profile: string; change_password: string; account: string
  current_password: string; new_password: string
  // search
  no_restaurants: string; try_another_filter: string; popular: string; clear_filters: string
  // filters
  filters: string; filter_price: string; filter_rating: string
  apply_filters: string; reset: string
  // map
  map_label: string
  map_search_placeholder: string
  // restaurant detail extras
  saved: string; open_badge: string; closed_badge: string
  info_label: string; tel: string; menu_note: string
  // booking statuses
  status_confirmed: string; status_pending: string; status_cancelled: string; status_completed: string
  // auth gate
  login_required_title: string; login_required_sub: string
  // onboarding
  onb_skip: string; onb_next: string; onb_start: string
  onb_title_1: string; onb_sub_1: string
  onb_title_2: string; onb_sub_2: string
  onb_title_3: string; onb_sub_3: string
}

const T: Record<LangKey, Translations> = {
  en: {
    all: 'All', polish: 'Polish', italian: 'Italian', japanese: 'Japanese', french: 'French',
    reserve: 'Reserve a table →',
    search_placeholder: 'Search restaurants...', search_label: 'Search',
    bookings_label: 'Bookings', profile_label: 'Profile', home_label: 'Home',
    good_morning: 'Good evening', find_table: 'Find your table',
    find_your_table: 'Find your table',
    available_now: 'Available now', top_rated: 'Top rated',
    book_table: 'Book a table', select_date: 'Select date',
    select_time: 'Select time', select_guests: 'Number of guests',
    guests: 'guests', guest: 'guest',
    confirm_booking: 'Confirm booking',
    booking_confirmed: 'Booking confirmed!',
    booking_sub: 'Confirmation has been sent to your phone',
    view_booking: 'View booking', back_home: 'Back to home',
    my_bookings: 'My bookings', upcoming: 'Upcoming', past: 'Past',
    no_bookings: 'No reservations yet', find_restaurant_btn: 'Find a restaurant',
    cancel: 'Cancel', details: 'Details',
    rating: 'rating', open_until: 'Open until',
    about: 'About', menu: 'Menu', reviews: 'Reviews',
    profile: 'Profile', settings: 'Settings', language: 'Language',
    theme: 'Theme', dark: 'Dark', light: 'Light', logout: 'Log out',
    tonight: 'Tonight', tomorrow: 'Tomorrow', this_weekend: 'This weekend',
    date_label: 'Date', time_label: 'Time', summary: 'Summary',
    restaurant: 'Restaurant', date: 'Date', time: 'Time',
    table_for: 'Table for', booking_id: 'Booking ID',
    loading_slots: 'Loading...', no_slots: 'No available slots',
    loading: 'Loading...', save: 'Save',
    name_placeholder: 'Full name',
    phone_placeholder: '+48 500 000 000', contact_section: 'Contact details',
    booking_error: 'Booking failed. Please try again.',
    sign_in: 'Sign in', email: 'Email', password: 'Password',
    sign_in_btn: 'Sign in', no_account: "Don't have an account?", register: 'Register',
    menu_soon: 'Menu coming soon...', reviews_soon: 'Reviews coming soon...',
    district: 'District', address: 'Address', cuisine_label: 'Cuisine',
    first_name: 'First name', last_name: 'Last name', fill_fields: 'Please fill in all fields',
    user: 'User', not_found: 'Not found', sign_in_required: 'Sign in to see your bookings',
    notifications: 'Notifications', edit_profile: 'Edit profile',
    change_password: 'Change password', account: 'Account',
    current_password: 'Current password', new_password: 'New password',
    no_restaurants: 'No restaurants', try_another_filter: 'Try another filter',
    popular: 'Popular', clear_filters: 'Clear filters',
    filters: 'Filters', filter_price: 'Price level', filter_rating: 'Min. rating',
    apply_filters: 'Apply filters', reset: 'Reset',
    map_label: 'Map',
    map_search_placeholder: 'Search by name or district…',
    saved: 'Saved',
    open_badge: '● Open', closed_badge: '● Closed',
    info_label: 'INFO', tel: 'Tel',
    menu_note: '* Menu may change. Ask our staff for current offerings.',
    status_confirmed: 'Confirmed', status_pending: 'Pending', status_cancelled: 'Cancelled', status_completed: 'Completed',
    login_required_title: 'Sign in to book',
    login_required_sub: 'Create a free account to reserve tables at the best restaurants in Warsaw.',
    onb_skip: 'Skip', onb_next: 'Next', onb_start: 'Get Started',
    onb_title_1: 'Find your table',
    onb_sub_1: 'Discover the best restaurants near you — Polish, Italian, Japanese and more.',
    onb_title_2: 'Book in 30 seconds',
    onb_sub_2: 'No calls, no waiting. Pick a date, time and guests — done.',
    onb_title_3: 'Get instant confirmation',
    onb_sub_3: "We'll send you an SMS confirmation and reminder before your reservation.",
  },
  pl: {
    all: 'Wszystkie', polish: 'Polska', italian: 'Włoska', japanese: 'Japońska', french: 'Francuska',
    reserve: 'Zarezerwuj stolik →',
    search_placeholder: 'Szukaj restauracji...', search_label: 'Szukaj',
    bookings_label: 'Rezerwacje', profile_label: 'Profil', home_label: 'Start',
    good_morning: 'Dzień dobry', find_table: 'Znajdź swój stolik',
    find_your_table: 'Znajdź swój stolik',
    available_now: 'Dostępne teraz', top_rated: 'Najwyżej oceniane',
    book_table: 'Rezerwuj stolik', select_date: 'Wybierz datę',
    select_time: 'Wybierz godzinę', select_guests: 'Liczba gości',
    guests: 'gości', guest: 'gość',
    confirm_booking: 'Potwierdź rezerwację',
    booking_confirmed: 'Rezerwacja potwierdzona!',
    booking_sub: 'Potwierdzenie zostało wysłane na Twój telefon',
    view_booking: 'Zobacz rezerwację', back_home: 'Wróć do głównej',
    my_bookings: 'Moje rezerwacje', upcoming: 'Nadchodzące', past: 'Poprzednie',
    no_bookings: 'Brak rezerwacji', find_restaurant_btn: 'Znajdź restaurację',
    cancel: 'Anuluj', details: 'Szczegóły',
    rating: 'ocena', open_until: 'Czynne do',
    about: 'O restauracji', menu: 'Menu', reviews: 'Opinie',
    profile: 'Profil', settings: 'Ustawienia', language: 'Język',
    theme: 'Motyw', dark: 'Ciemny', light: 'Jasny', logout: 'Wyloguj',
    tonight: 'Dziś wieczór', tomorrow: 'Jutro', this_weekend: 'Ten weekend',
    date_label: 'Data', time_label: 'Godzina', summary: 'Podsumowanie',
    restaurant: 'Restauracja', date: 'Data', time: 'Godzina',
    table_for: 'Stolik dla', booking_id: 'Nr rezerwacji',
    loading_slots: 'Ładowanie...', no_slots: 'Brak wolnych terminów',
    loading: 'Ładowanie...', save: 'Zapisz',
    name_placeholder: 'Imię i nazwisko',
    phone_placeholder: '+48 500 000 000', contact_section: 'Dane kontaktowe',
    booking_error: 'Błąd rezerwacji. Spróbuj ponownie.',
    sign_in: 'Zaloguj się', email: 'E-mail', password: 'Hasło',
    sign_in_btn: 'Zaloguj', no_account: 'Nie masz konta?', register: 'Zarejestruj się',
    menu_soon: 'Menu wkrótce...', reviews_soon: 'Opinie wkrótce...',
    district: 'Dzielnica', address: 'Adres', cuisine_label: 'Kuchnia',
    first_name: 'Imię', last_name: 'Nazwisko', fill_fields: 'Wypełnij wszystkie pola',
    user: 'Użytkownik', not_found: 'Nie znaleziono', sign_in_required: 'Zaloguj się, aby zobaczyć rezerwacje',
    notifications: 'Powiadomienia', edit_profile: 'Edytuj profil',
    change_password: 'Zmień hasło', account: 'Konto',
    current_password: 'Obecne hasło', new_password: 'Nowe hasło',
    no_restaurants: 'Brak restauracji', try_another_filter: 'Spróbuj innego filtra',
    popular: 'Popularne', clear_filters: 'Wyczyść filtry',
    filters: 'Filtry', filter_price: 'Poziom cen', filter_rating: 'Min. ocena',
    apply_filters: 'Zastosuj filtry', reset: 'Resetuj',
    map_label: 'Mapa',
    map_search_placeholder: 'Szukaj po nazwie lub dzielnicy…',
    saved: 'Zapisano',
    open_badge: '● Otwarte', closed_badge: '● Zamknięte',
    info_label: 'INFO', tel: 'Tel',
    menu_note: '* Menu może ulec zmianie. Zapytaj obsługę o aktualne propozycje.',
    status_confirmed: 'Potwierdzona', status_pending: 'Oczekująca', status_cancelled: 'Anulowana', status_completed: 'Zakończona',
    login_required_title: 'Zaloguj się, aby zarezerwować',
    login_required_sub: 'Utwórz darmowe konto, aby rezerwować stoliki w najlepszych restauracjach Warszawy.',
    onb_skip: 'Pomiń', onb_next: 'Dalej', onb_start: 'Rozpocznij',
    onb_title_1: 'Znajdź swój stolik',
    onb_sub_1: 'Odkryj najlepsze restauracje w okolicy — polska, włoska, japońska i więcej.',
    onb_title_2: 'Zarezerwuj w 30 sekund',
    onb_sub_2: 'Bez dzwonienia i czekania. Wybierz datę, godzinę, gości — gotowe.',
    onb_title_3: 'Natychmiastowe potwierdzenie',
    onb_sub_3: 'Dostaniesz SMS z potwierdzeniem i przypomnieniem przed rezerwacją.',
  },
  ru: {
    all: 'Все', polish: 'Польская', italian: 'Итальянская', japanese: 'Японская', french: 'Французская',
    reserve: 'Забронировать столик →',
    search_placeholder: 'Поиск ресторанов...', search_label: 'Поиск',
    bookings_label: 'Брони', profile_label: 'Профиль', home_label: 'Главная',
    good_morning: 'Добрый вечер', find_table: 'Найди свой столик',
    find_your_table: 'Найди свой столик',
    available_now: 'Доступно сейчас', top_rated: 'Лучшие',
    book_table: 'Забронировать', select_date: 'Выберите дату',
    select_time: 'Выберите время', select_guests: 'Количество гостей',
    guests: 'гостей', guest: 'гость',
    confirm_booking: 'Подтвердить бронь',
    booking_confirmed: 'Бронь подтверждена!',
    booking_sub: 'Подтверждение отправлено на ваш телефон',
    view_booking: 'Посмотреть бронь', back_home: 'На главную',
    my_bookings: 'Мои брони', upcoming: 'Предстоящие', past: 'Прошедшие',
    no_bookings: 'Броней пока нет', find_restaurant_btn: 'Найти ресторан',
    cancel: 'Отмена', details: 'Подробнее',
    rating: 'рейтинг', open_until: 'Открыто до',
    about: 'О ресторане', menu: 'Меню', reviews: 'Отзывы',
    profile: 'Профиль', settings: 'Настройки', language: 'Язык',
    theme: 'Тема', dark: 'Тёмная', light: 'Светлая', logout: 'Выйти',
    tonight: 'Сегодня вечером', tomorrow: 'Завтра', this_weekend: 'На выходных',
    date_label: 'Дата', time_label: 'Время', summary: 'Сводка',
    restaurant: 'Ресторан', date: 'Дата', time: 'Время',
    table_for: 'Столик на', booking_id: '№ брони',
    loading_slots: 'Загрузка...', no_slots: 'Нет свободных мест',
    loading: 'Загрузка...', save: 'Сохранить',
    name_placeholder: 'Имя и фамилия',
    phone_placeholder: '+48 500 000 000', contact_section: 'Контактные данные',
    booking_error: 'Ошибка бронирования. Попробуйте ещё раз.',
    sign_in: 'Войти', email: 'Email', password: 'Пароль',
    sign_in_btn: 'Войти', no_account: 'Нет аккаунта?', register: 'Зарегистрироваться',
    menu_soon: 'Меню скоро...', reviews_soon: 'Отзывы скоро...',
    district: 'Район', address: 'Адрес', cuisine_label: 'Кухня',
    first_name: 'Имя', last_name: 'Фамилия', fill_fields: 'Заполните все поля',
    user: 'Пользователь', not_found: 'Не найдено', sign_in_required: 'Войдите, чтобы увидеть брони',
    notifications: 'Уведомления', edit_profile: 'Редактировать профиль',
    change_password: 'Сменить пароль', account: 'Аккаунт',
    current_password: 'Текущий пароль', new_password: 'Новый пароль',
    no_restaurants: 'Нет ресторанов', try_another_filter: 'Попробуйте другой фильтр',
    popular: 'Популярные', clear_filters: 'Сбросить фильтры',
    filters: 'Фильтры', filter_price: 'Уровень цен', filter_rating: 'Мин. рейтинг',
    apply_filters: 'Применить фильтры', reset: 'Сбросить',
    map_label: 'Карта',
    map_search_placeholder: 'Поиск по названию или району…',
    saved: 'Сохранено',
    open_badge: '● Открыто', closed_badge: '● Закрыто',
    info_label: 'INFO', tel: 'Тел.',
    menu_note: '* Меню может меняться. Уточняйте у персонала актуальные предложения.',
    status_confirmed: 'Подтверждена', status_pending: 'Ожидает', status_cancelled: 'Отменена', status_completed: 'Завершена',
    login_required_title: 'Войдите, чтобы забронировать',
    login_required_sub: 'Создайте бесплатный аккаунт, чтобы бронировать столики в лучших ресторанах Варшавы.',
    onb_skip: 'Пропустить', onb_next: 'Далее', onb_start: 'Начать',
    onb_title_1: 'Найди свой столик',
    onb_sub_1: 'Открой лучшие рестораны рядом — польская, итальянская, японская кухня и не только.',
    onb_title_2: 'Забронируй за 30 секунд',
    onb_sub_2: 'Без звонков и ожидания. Выбери дату, время и гостей — готово.',
    onb_title_3: 'Мгновенное подтверждение',
    onb_sub_3: 'Мы отправим SMS с подтверждением и напомним тебе перед бронированием.',
  },
  uk: {
    all: 'Всі', polish: 'Польська', italian: 'Італійська', japanese: 'Японська', french: 'Французька',
    reserve: 'Забронювати столик →',
    search_placeholder: 'Пошук ресторанів...', search_label: 'Пошук',
    bookings_label: 'Брони', profile_label: 'Профіль', home_label: 'Головна',
    good_morning: 'Добрий вечір', find_table: 'Знайди свій столик',
    find_your_table: 'Знайди свій столик',
    available_now: 'Доступно зараз', top_rated: 'Найкращі',
    book_table: 'Забронювати', select_date: 'Оберіть дату',
    select_time: 'Оберіть час', select_guests: 'Кількість гостей',
    guests: 'гостей', guest: 'гість',
    confirm_booking: 'Підтвердити бронь',
    booking_confirmed: 'Бронь підтверджена!',
    booking_sub: 'Підтвердження надіслано на ваш телефон',
    view_booking: 'Переглянути бронь', back_home: 'На головну',
    my_bookings: 'Мої брони', upcoming: 'Майбутні', past: 'Минулі',
    no_bookings: 'Броней поки немає', find_restaurant_btn: 'Знайди ресторан',
    cancel: 'Скасувати', details: 'Детальніше',
    rating: 'рейтинг', open_until: 'Відчинено до',
    about: 'Про ресторан', menu: 'Меню', reviews: 'Відгуки',
    profile: 'Профіль', settings: 'Налаштування', language: 'Мова',
    theme: 'Тема', dark: 'Темна', light: 'Світла', logout: 'Вийти',
    tonight: 'Сьогодні ввечері', tomorrow: 'Завтра', this_weekend: 'На вихідних',
    date_label: 'Дата', time_label: 'Час', summary: 'Підсумок',
    restaurant: 'Ресторан', date: 'Дата', time: 'Час',
    table_for: 'Столик на', booking_id: '№ брон.',
    loading_slots: 'Завантаження...', no_slots: 'Немає вільних місць',
    loading: 'Завантаження...', save: 'Зберегти',
    name_placeholder: "Ім'я та прізвище",
    phone_placeholder: '+48 500 000 000', contact_section: 'Контактні дані',
    booking_error: 'Помилка бронювання. Спробуйте ще раз.',
    sign_in: 'Увійти', email: 'Email', password: 'Пароль',
    sign_in_btn: 'Увійти', no_account: 'Немає акаунту?', register: 'Зареєструватись',
    menu_soon: 'Меню скоро...', reviews_soon: 'Відгуки скоро...',
    district: 'Район', address: 'Адреса', cuisine_label: 'Кухня',
    first_name: "Ім'я", last_name: 'Прізвище', fill_fields: 'Заповніть усі поля',
    user: 'Користувач', not_found: 'Не знайдено', sign_in_required: 'Увійдіть, щоб побачити бронювання',
    notifications: 'Сповіщення', edit_profile: 'Редагувати профіль',
    change_password: 'Змінити пароль', account: 'Акаунт',
    current_password: 'Поточний пароль', new_password: 'Новий пароль',
    no_restaurants: 'Немає ресторанів', try_another_filter: 'Спробуйте інший фільтр',
    popular: 'Популярні', clear_filters: 'Скинути фільтри',
    filters: 'Фільтри', filter_price: 'Рівень цін', filter_rating: 'Мін. рейтинг',
    apply_filters: 'Застосувати фільтри', reset: 'Скинути',
    map_label: 'Карта',
    map_search_placeholder: 'Пошук за назвою або районом…',
    saved: 'Збережено',
    open_badge: '● Відкрито', closed_badge: '● Зачинено',
    info_label: 'INFO', tel: 'Тел.',
    menu_note: '* Меню може змінюватись. Уточнюйте у персоналу актуальні пропозиції.',
    status_confirmed: 'Підтверджена', status_pending: 'Очікує', status_cancelled: 'Скасована', status_completed: 'Завершена',
    login_required_title: 'Увійдіть, щоб забронювати',
    login_required_sub: 'Створіть безкоштовний акаунт, щоб бронювати столики в найкращих ресторанах Варшави.',
    onb_skip: 'Пропустити', onb_next: 'Далі', onb_start: 'Почати',
    onb_title_1: 'Знайди свій столик',
    onb_sub_1: 'Відкрий найкращі ресторани поруч — польська, італійська, японська та інші кухні.',
    onb_title_2: 'Забронюй за 30 секунд',
    onb_sub_2: 'Без дзвінків і очікування. Обери дату, час і гостей — готово.',
    onb_title_3: 'Миттєве підтвердження',
    onb_sub_3: 'Ми надішлемо SMS з підтвердженням і нагадаємо перед бронюванням.',
  },
}

interface LangCtx {
  lang:    LangKey
  t:       Translations
  setLang: (lang: LangKey) => void
}

const LangContext = createContext<LangCtx>({
  lang:    'en',
  t:       T.en,
  setLang: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangKey>('en')   // default = English

  useEffect(() => {
    SecureStore.getItemAsync('stolik_lang').then(v => {
      if (v && v in T) setLangState(v as LangKey)
    }).catch(() => {})
  }, [])

  function setLang(l: LangKey) {
    setLangState(l)
    SecureStore.setItemAsync('stolik_lang', l).catch(() => {})
  }

  return (
    <LangContext.Provider value={{ lang, t: T[lang], setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
