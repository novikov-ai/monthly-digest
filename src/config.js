/**
 * Digest configuration — edit this file to customise the tool for your club.
 *
 * After editing run:  node build.js
 * The result is a self-contained chess_digest.html ready to open in any browser.
 */
const CONFIG = {

  // ── App UI ──────────────────────────────────────────────────────────────────

  /** Main heading shown at the top of the page. */
  title: '♟ Шахматный дайджест',

  /** Secondary line below the heading. */
  subtitle: 'Настрой шаблоны — инструмент сам расставит даты по месяцу',

  // ── Digest text ─────────────────────────────────────────────────────────────

  /**
   * Header line of the generated digest.
   * @param {string} monthName  — e.g. "Апрель"
   * @param {number} year       — e.g. 2026
   */
  /** Heading shown above the calendar (in the output and in the PNG). */
  calendarTitle: (monthName, year) => `Шахматные активности на ${monthName} ${year}`,

  digestHeader: (monthName, year) => `♟️ *Шахматный дайджест — ${monthName} ${year}*`,

  /**
   * Footer line of the generated digest.
   * @param {number} count — total number of events
   */
  digestFooter: (count) => `Всего событий: ${count}`,

  // ── Event types ─────────────────────────────────────────────────────────────

  /**
   * Map of event type keys to their display settings.
   *
   * chipClass must match a CSS rule in style.css — add new ones there too.
   *
   * Order here determines the order in the type drop-downs.
   */
  eventTypes: {
    tasks:      { label: 'Задачи',       icon: '🧩', chipClass: 'chip-tasks'      },
    strategy:   { label: 'Стратегия',    icon: '♟️', chipClass: 'chip-strategy'   },
    gametime:   { label: 'Игровой день', icon: '🎮', chipClass: 'chip-gametime'   },
    lesson:     { label: 'Занятие',      icon: '📚', chipClass: 'chip-lesson'     },
    tournament: { label: 'Турнир',       icon: '🏆', chipClass: 'chip-tournament' },
  },

  /**
   * Order in which event-type sections appear in the generated digest text.
   * Must contain keys from eventTypes above.
   */
  eventTypeOrder: ['tasks', 'strategy', 'gametime', 'lesson', 'tournament'],

  /**
   * Default type assigned when adding a new event row.
   * Must be a key from eventTypes.
   */
  defaultNewEventType: 'lesson',

  // ── Pre-filled defaults for a new month ─────────────────────────────────────

  /**
   * Weekly recurring rules shown when opening a month for the first time.
   * weekday: JS day number — 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
   */
  defaultRules: [
    { weekday: 3, time: '19:00', duration: 60, name: 'Занятие (группа А)', type: 'lesson' },
    { weekday: 3, time: '20:30', duration: 60, name: 'Занятие (группа Б)', type: 'lesson' },
  ],

  /**
   * "Last weekday of the month" rules shown when opening a month for the first time.
   * These replace the matching regular rule on that day.
   */
  defaultLastWeekRules: [
    { weekday: 3, time: '19:00', duration: 60, name: 'Игровой турнир', type: 'gametime' },
  ],

  // ── Storage ──────────────────────────────────────────────────────────────────

  /**
   * Default description shown below the calendar.
   * The coordinator can overwrite it per-month in the UI.
   */
  defaultCalendarDescription: '',

  /**
   * localStorage key.  Change this if you run multiple independent digest
   * instances in the same browser (e.g. chess + another club).
   */
  storageKey: 'chess_digest_v2',

};
