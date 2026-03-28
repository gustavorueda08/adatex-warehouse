/**
 * @fileoverview Date helpers for the Colombian timezone (America/Bogota).
 *
 * All timestamps stored in the backend use America/Bogota time.
 * Use these helpers instead of writing raw `moment()` calls throughout
 * the app to keep timezone handling consistent.
 *
 * @example
 * import { nowBogota, toDateString, fromDatePicker } from "@/lib/utils/dateHelpers";
 *
 * // Current timestamp for confirmedDate / completedDate fields
 * const ts = nowBogota();
 *
 * // Format a DB date for a date-picker input
 * const str = toDateString(document.createdDate); // "2026-03-27"
 *
 * // Convert a date-picker value back to a native Date
 * const date = fromDatePicker(pickerValue);
 */
import moment from "moment-timezone";

const TIMEZONE = "America/Bogota";

/**
 * Returns the current date/time as a native `Date` in the Bogota timezone.
 * Use this for `confirmedDate`, `completedDate`, and `actualDispatchDate` fields.
 *
 * @returns {Date}
 */
export function nowBogota() {
  return moment.tz(TIMEZONE).toDate();
}

/**
 * Formats any date value as a `"YYYY-MM-DD"` string suitable for date-picker
 * `defaultValue` / `value` props (e.g. with `@internationalized/date`).
 *
 * @param {Date|string|null|undefined} date
 * @returns {string} e.g. `"2026-03-27"`, or `""` when the input is falsy.
 */
export function toDateString(date) {
  if (!date) return "";
  return moment(date).format("YYYY-MM-DD");
}

/**
 * Converts the string or CalendarDate object emitted by a date-picker
 * back to a native `Date` anchored to the Bogota timezone.
 *
 * @param {string|Object} value - e.g. `"2026-03-27"` or a CalendarDate object.
 * @returns {Date}
 */
export function fromDatePicker(value) {
  return moment.tz(String(value), TIMEZONE).toDate();
}
