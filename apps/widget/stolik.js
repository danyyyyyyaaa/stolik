/**
 * Stolik Booking Widget
 * 
 * Embed on any restaurant website:
 * <script src="https://widget.stolik.pl/stolik.js" data-restaurant="nazwa-restauracji"></script>
 */
;(function() {
  'use strict'

  const API_URL = 'https://api.stolik.pl'
  const ACCENT = '#2D6A35'

  const script = document.currentScript
  const restaurantSlug = script?.getAttribute('data-restaurant')
  const lang = script?.getAttribute('data-lang') || 'pl'

  if (!restaurantSlug) {
    console.error('[Stolik] Missing data-restaurant attribute')
    return
  }

  const LABELS = {
    pl: { btn: 'Zarezerwuj stolik →', title: 'Zarezerwuj stolik', guests: 'Gości', date: 'Data', time: 'Godzina', name: 'Imię i nazwisko', phone: 'Telefon', confirm: 'Potwierdź rezerwację', success: '✓ Rezerwacja potwierdzona!', close: '✕' },
    en: { btn: 'Reserve a table →', title: 'Reserve a table', guests: 'Guests', date: 'Date', time: 'Time', name: 'Full name', phone: 'Phone', confirm: 'Confirm booking', success: '✓ Booking confirmed!', close: '✕' },
    ru: { btn: 'Забронировать столик →', title: 'Забронировать столик', guests: 'Гостей', date: 'Дата', time: 'Время', name: 'Имя и фамилия', phone: 'Телефон', confirm: 'Подтвердить', success: '✓ Бронь подтверждена!', close: '✕' },
    uk: { btn: 'Забронювати столик →', title: 'Забронювати столик', guests: 'Гостей', date: 'Дата', time: 'Час', name: "Ім'я та прізвище", phone: 'Телефон', confirm: 'Підтвердити', success: '✓ Бронь підтверджена!', close: '✕' },
  }
  const L = LABELS[lang] || LABELS.pl

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const css = `
    #stolik-btn { background: ${ACCENT}; color: #fff; border: none; border-radius: 12px; padding: 14px 24px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity .15s; }
    #stolik-btn:hover { opacity: .88; }
    #stolik-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 99998; display: none; align-items: flex-end; justify-content: center; }
    #stolik-overlay.open { display: flex; }
    #stolik-modal { background: #fff; border-radius: 24px 24px 0 0; padding: 28px 24px 40px; width: 100%; max-width: 480px; font-family: -apple-system, sans-serif; }
    #stolik-modal h2 { font-size: 20px; font-weight: 700; margin: 0 0 20px; }
    .stolik-field { margin-bottom: 14px; }
    .stolik-field label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; }
    .stolik-field input, .stolik-field select { width: 100%; padding: 12px 14px; border: 1.5px solid #e0e0e0; border-radius: 12px; font-size: 15px; font-family: inherit; outline: none; box-sizing: border-box; }
    .stolik-field input:focus, .stolik-field select:focus { border-color: ${ACCENT}; }
    .stolik-slots { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
    .stolik-slot { padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e0e0e0; background: none; font-size: 13px; cursor: pointer; font-family: inherit; }
    .stolik-slot.active { background: ${ACCENT}; color: #fff; border-color: transparent; }
    #stolik-confirm-btn { width: 100%; padding: 16px; background: ${ACCENT}; color: #fff; border: none; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 20px; font-family: inherit; }
    #stolik-success { text-align: center; padding: 20px 0; color: ${ACCENT}; font-size: 18px; font-weight: 600; }
    #stolik-close { position: absolute; top: 28px; right: 24px; background: none; border: none; font-size: 18px; cursor: pointer; color: #888; }
    #stolik-modal { position: relative; }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // ─── HTML ─────────────────────────────────────────────────────────────────
  const overlay = document.createElement('div')
  overlay.id = 'stolik-overlay'
  overlay.innerHTML = `
    <div id="stolik-modal">
      <button id="stolik-close">${L.close}</button>
      <h2>${L.title}</h2>
      <div id="stolik-form">
        <div class="stolik-field">
          <label>${L.date}</label>
          <input type="date" id="stolik-date" min="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="stolik-field">
          <label>${L.time}</label>
          <div class="stolik-slots" id="stolik-slots"></div>
        </div>
        <div class="stolik-field">
          <label>${L.guests}</label>
          <select id="stolik-guests">${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}"${n===2?' selected':''}>${n}</option>`).join('')}</select>
        </div>
        <div class="stolik-field">
          <label>${L.name}</label>
          <input type="text" id="stolik-name" placeholder="Jan Kowalski">
        </div>
        <div class="stolik-field">
          <label>${L.phone}</label>
          <input type="tel" id="stolik-phone" placeholder="+48 500 000 000">
        </div>
        <button id="stolik-confirm-btn">${L.confirm}</button>
      </div>
      <div id="stolik-success" style="display:none">${L.success}</div>
    </div>
  `
  document.body.appendChild(overlay)

  // ─── TRIGGER BUTTON ────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.id = 'stolik-btn'
  btn.textContent = L.btn
  script.parentNode.insertBefore(btn, script.nextSibling)

  // ─── LOGIC ────────────────────────────────────────────────────────────────
  let selectedTime = null

  function loadSlots(date) {
    const slotsEl = document.getElementById('stolik-slots')
    slotsEl.innerHTML = '<span style="color:#aaa;font-size:13px">Ładowanie...</span>'
    fetch(`${API_URL}/api/widget/${restaurantSlug}/slots?date=${date}`)
      .then(r => r.json())
      .then(data => {
        slotsEl.innerHTML = ''
        data.slots.forEach(time => {
          const b = document.createElement('button')
          b.className = 'stolik-slot'
          b.textContent = time
          b.onclick = () => {
            selectedTime = time
            document.querySelectorAll('.stolik-slot').forEach(s => s.classList.remove('active'))
            b.classList.add('active')
          }
          slotsEl.appendChild(b)
        })
      })
  }

  document.getElementById('stolik-date').addEventListener('change', e => loadSlots(e.target.value))
  btn.addEventListener('click', () => { overlay.classList.add('open'); loadSlots(new Date().toISOString().split('T')[0]) })
  document.getElementById('stolik-close').addEventListener('click', () => overlay.classList.remove('open'))
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open') })

  document.getElementById('stolik-confirm-btn').addEventListener('click', () => {
    const name = document.getElementById('stolik-name').value
    const phone = document.getElementById('stolik-phone').value
    const date = document.getElementById('stolik-date').value
    const guests = document.getElementById('stolik-guests').value

    if (!name || !phone || !date || !selectedTime) return alert('Wypełnij wszystkie pola')

    fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantSlug: restaurantSlug, guestName: name, guestPhone: phone, date, time: selectedTime, guestCount: parseInt(guests), source: 'widget' })
    })
    .then(r => r.json())
    .then(() => {
      document.getElementById('stolik-form').style.display = 'none'
      document.getElementById('stolik-success').style.display = 'block'
      setTimeout(() => { overlay.classList.remove('open'); document.getElementById('stolik-form').style.display = ''; document.getElementById('stolik-success').style.display = 'none' }, 3000)
    })
  })
})()
