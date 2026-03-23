/**
 * Stolik Booking Widget
 *
 * Embed on any restaurant website:
 * <script src="https://widget.stolik.pl/stolik.js" data-restaurant="nazwa-restauracji"></script>
 */
;(function () {
  'use strict'

  const API_URL = 'https://stolik-production.up.railway.app'
  const ACCENT  = '#2D6A35'

  const script         = document.currentScript
  const restaurantSlug = script?.getAttribute('data-restaurant')
  const lang           = script?.getAttribute('data-lang') || 'pl'

  if (!restaurantSlug) {
    console.error('[Stolik] Missing data-restaurant attribute')
    return
  }

  const LABELS = {
    pl: {
      btn:     'Zarezerwuj stolik →',
      title:   'Zarezerwuj stolik',
      guests:  'Liczba gości',
      date:    'Data',
      time:    'Godzina',
      name:    'Imię i nazwisko',
      phone:   'Telefon',
      confirm: 'Potwierdź rezerwację',
      success: 'Rezerwacja potwierdzona!',
      close:   '✕',
      loading: 'Ładowanie…',
      noSlots: 'Brak wolnych stolików w tym dniu',
      error:   'Przepraszamy, spróbuj później',
      fillAll: 'Wypełnij wszystkie pola',
      booking: 'Numer rezerwacji',
      see_you: 'Do zobaczenia!',
    },
    en: {
      btn:     'Reserve a table →',
      title:   'Reserve a table',
      guests:  'Guests',
      date:    'Date',
      time:    'Time',
      name:    'Full name',
      phone:   'Phone',
      confirm: 'Confirm booking',
      success: 'Booking confirmed!',
      close:   '✕',
      loading: 'Loading…',
      noSlots: 'No available tables on this day',
      error:   'Sorry, please try again later',
      fillAll: 'Please fill in all fields',
      booking: 'Booking number',
      see_you: 'See you soon!',
    },
  }
  const L = LABELS[lang] || LABELS.pl

  // ─── STYLES ─────────────────────────────────────────────────────────────────
  const css = `
    #stolik-btn {
      background: ${ACCENT}; color: #fff; border: none; border-radius: 12px;
      padding: 14px 24px; font-size: 15px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: opacity .15s;
    }
    #stolik-btn:hover { opacity: .88; }
    #stolik-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      z-index: 99998; display: none; align-items: flex-end; justify-content: center;
    }
    #stolik-overlay.open { display: flex; }
    #stolik-modal {
      position: relative; background: #fff; border-radius: 24px 24px 0 0;
      padding: 28px 24px 40px; width: 100%; max-width: 480px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      max-height: 92vh; overflow-y: auto;
    }
    #stolik-modal h2 { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
    #stolik-restaurant-name { font-size: 13px; color: #888; margin: 0 0 20px; }
    .stolik-field { margin-bottom: 14px; }
    .stolik-field label {
      display: block; font-size: 12px; color: #888; margin-bottom: 6px;
      font-weight: 500; text-transform: uppercase; letter-spacing: .04em;
    }
    .stolik-field input, .stolik-field select {
      width: 100%; padding: 12px 14px; border: 1.5px solid #e0e0e0;
      border-radius: 12px; font-size: 15px; font-family: inherit;
      outline: none; box-sizing: border-box; transition: border-color .15s;
    }
    .stolik-field input:focus, .stolik-field select:focus { border-color: ${ACCENT}; }
    .stolik-slots { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; min-height: 38px; }
    .stolik-slot {
      padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e0e0e0;
      background: none; font-size: 13px; cursor: pointer; font-family: inherit;
      transition: border-color .15s, background .15s, color .15s;
    }
    .stolik-slot:hover { border-color: ${ACCENT}; }
    .stolik-slot.active { background: ${ACCENT}; color: #fff; border-color: transparent; }
    .stolik-slots-msg { font-size: 13px; color: #aaa; align-self: center; }
    #stolik-confirm-btn {
      width: 100%; padding: 16px; background: ${ACCENT}; color: #fff; border: none;
      border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer;
      margin-top: 20px; font-family: inherit; transition: opacity .15s;
    }
    #stolik-confirm-btn:hover { opacity: .88; }
    #stolik-confirm-btn:disabled { opacity: .5; cursor: not-allowed; }
    #stolik-error-bar {
      display: none; background: #fff0f0; border: 1.5px solid #ffcccc;
      border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #cc3333;
      margin-top: 14px;
    }
    #stolik-success {
      display: none; text-align: center; padding: 32px 16px;
    }
    #stolik-success .stolik-check {
      width: 56px; height: 56px; background: ${ACCENT}; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 26px; color: #fff;
    }
    #stolik-success h3 { font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px; }
    #stolik-success .stolik-ref {
      display: inline-block; background: #f3faf4; border: 1.5px solid ${ACCENT};
      border-radius: 10px; padding: 8px 20px; font-size: 20px; font-weight: 700;
      color: ${ACCENT}; letter-spacing: .06em; margin: 8px 0 12px;
    }
    #stolik-success p { font-size: 14px; color: #888; margin: 0; }
    #stolik-close {
      position: absolute; top: 22px; right: 20px; background: none; border: none;
      font-size: 18px; cursor: pointer; color: #aaa; line-height: 1;
      padding: 4px 8px; border-radius: 8px; transition: background .15s;
    }
    #stolik-close:hover { background: #f5f5f5; }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // ─── HTML ──────────────────────────────────────────────────────────────────
  const overlay = document.createElement('div')
  overlay.id = 'stolik-overlay'
  overlay.innerHTML = `
    <div id="stolik-modal">
      <button id="stolik-close">${L.close}</button>
      <h2>${L.title}</h2>
      <p id="stolik-restaurant-name"></p>

      <div id="stolik-form">
        <div class="stolik-field">
          <label>${L.guests}</label>
          <select id="stolik-guests">
            ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}"${n===2?' selected':''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="stolik-field">
          <label>${L.date}</label>
          <input type="date" id="stolik-date" min="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="stolik-field">
          <label>${L.time}</label>
          <div class="stolik-slots" id="stolik-slots">
            <span class="stolik-slots-msg">${L.loading}</span>
          </div>
        </div>
        <div class="stolik-field">
          <label>${L.name}</label>
          <input type="text" id="stolik-name" placeholder="Jan Kowalski">
        </div>
        <div class="stolik-field">
          <label>${L.phone}</label>
          <input type="tel" id="stolik-phone" placeholder="+48 500 000 000">
        </div>
        <div id="stolik-error-bar"></div>
        <button id="stolik-confirm-btn">${L.confirm}</button>
      </div>

      <div id="stolik-success">
        <div class="stolik-check">✓</div>
        <h3>${L.success}</h3>
        <div class="stolik-ref" id="stolik-ref"></div>
        <p>${L.see_you}</p>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  // ─── TRIGGER BUTTON ────────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.id = 'stolik-btn'
  btn.textContent = L.btn
  script.parentNode.insertBefore(btn, script.nextSibling)

  // ─── STATE ─────────────────────────────────────────────────────────────────
  let selectedTime   = null
  let restaurantId   = null
  let loadingSlotsAc = null  // AbortController for in-flight slot requests

  // ─── HELPERS ───────────────────────────────────────────────────────────────
  function showError(msg) {
    const bar = document.getElementById('stolik-error-bar')
    bar.textContent = msg
    bar.style.display = 'block'
  }

  function hideError() {
    const bar = document.getElementById('stolik-error-bar')
    bar.style.display = 'none'
    bar.textContent = ''
  }

  function setConfirmLoading(on) {
    const b = document.getElementById('stolik-confirm-btn')
    b.disabled = on
    b.textContent = on ? L.loading : L.confirm
  }

  function today() {
    return new Date().toISOString().split('T')[0]
  }

  // ─── LOAD RESTAURANT INFO ──────────────────────────────────────────────────
  async function loadRestaurantInfo() {
    try {
      const res  = await fetch(`${API_URL}/api/widget/${restaurantSlug}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      restaurantId = data.id || data.restaurantId || null
      const nameEl = document.getElementById('stolik-restaurant-name')
      if (data.name) nameEl.textContent = data.name
    } catch (err) {
      console.error('[Stolik] Failed to load restaurant info:', err)
      // non-fatal — widget still works, but restaurantId may be null
    }
  }

  // ─── LOAD SLOTS ────────────────────────────────────────────────────────────
  async function loadSlots(date) {
    selectedTime = null
    const slotsEl = document.getElementById('stolik-slots')
    const guests  = document.getElementById('stolik-guests').value

    // Cancel previous in-flight request
    if (loadingSlotsAc) loadingSlotsAc.abort()
    loadingSlotsAc = new AbortController()

    slotsEl.innerHTML = `<span class="stolik-slots-msg">${L.loading}</span>`

    try {
      const res = await fetch(
        `${API_URL}/api/widget/${restaurantSlug}/slots?date=${date}&guests=${guests}`,
        { signal: loadingSlotsAc.signal }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      slotsEl.innerHTML = ''
      const slots = data.slots || []

      if (slots.length === 0) {
        slotsEl.innerHTML = `<span class="stolik-slots-msg">${L.noSlots}</span>`
        return
      }

      slots.forEach(time => {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'stolik-slot'
        b.textContent = time
        b.addEventListener('click', () => {
          selectedTime = time
          slotsEl.querySelectorAll('.stolik-slot').forEach(s => s.classList.remove('active'))
          b.classList.add('active')
          hideError()
        })
        slotsEl.appendChild(b)
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('[Stolik] Failed to load slots:', err)
      slotsEl.innerHTML = `<span class="stolik-slots-msg">${L.error}</span>`
    }
  }

  // ─── SUBMIT BOOKING ────────────────────────────────────────────────────────
  async function submitBooking() {
    hideError()
    const name   = document.getElementById('stolik-name').value.trim()
    const phone  = document.getElementById('stolik-phone').value.trim()
    const date   = document.getElementById('stolik-date').value
    const guests = parseInt(document.getElementById('stolik-guests').value, 10)

    if (!name || !phone || !date || !selectedTime) {
      showError(L.fillAll)
      return
    }

    setConfirmLoading(true)

    try {
      const payload = {
        restaurantId,
        restaurantSlug,
        guestName:  name,
        guestPhone: phone,
        date,
        time:       selectedTime,
        guestCount: guests,
        source:     'widget',
      }

      const res = await fetch(`${API_URL}/api/bookings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        showError(data.error || L.error)
        return
      }

      // Show success screen with booking ref
      const ref = data.booking?.bookingRef || data.bookingRef || ''
      document.getElementById('stolik-ref').textContent = ref
      document.getElementById('stolik-form').style.display    = 'none'
      document.getElementById('stolik-success').style.display = 'block'

      // Auto-close after 4 seconds and reset
      setTimeout(() => {
        overlay.classList.remove('open')
        setTimeout(resetModal, 400)
      }, 4000)
    } catch (err) {
      console.error('[Stolik] Booking failed:', err)
      showError(L.error)
    } finally {
      setConfirmLoading(false)
    }
  }

  // ─── RESET MODAL ───────────────────────────────────────────────────────────
  function resetModal() {
    document.getElementById('stolik-form').style.display    = ''
    document.getElementById('stolik-success').style.display = 'none'
    document.getElementById('stolik-name').value  = ''
    document.getElementById('stolik-phone').value = ''
    document.getElementById('stolik-date').value  = ''
    document.getElementById('stolik-slots').innerHTML =
      `<span class="stolik-slots-msg">${L.loading}</span>`
    selectedTime = null
    hideError()
  }

  // ─── EVENT LISTENERS ───────────────────────────────────────────────────────
  document.getElementById('stolik-date').addEventListener('change', e => {
    loadSlots(e.target.value)
  })

  document.getElementById('stolik-guests').addEventListener('change', () => {
    const date = document.getElementById('stolik-date').value
    if (date) loadSlots(date)
  })

  document.getElementById('stolik-confirm-btn').addEventListener('click', submitBooking)

  document.getElementById('stolik-close').addEventListener('click', () => {
    overlay.classList.remove('open')
  })

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open')
  })

  btn.addEventListener('click', async () => {
    resetModal()
    overlay.classList.add('open')

    // Load restaurant info once (restaurantId needed for booking)
    if (!restaurantId) await loadRestaurantInfo()

    // Pre-load today's slots
    const dateInput = document.getElementById('stolik-date')
    dateInput.value = today()
    loadSlots(today())
  })
})()
