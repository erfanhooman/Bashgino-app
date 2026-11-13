import {
  formatJalaliDate,
  gregorianToJalali,
  isJalaliLeapYear,
  isoFromJalali,
  jalaliFromIso,
  jalaliToGregorian,
  relativeDayLabel,
  toAsciiDigits,
  toPersianDigits,
  weekdayNameFa,
} from "@bashgino/domain";

/**
 * The Jalali conversions are the only date logic in the app, and a wrong day
 * puts a workout on the wrong date. These tests pin the known anchor (Nowruz
 * 1403 = 20 March 2024), prove the round trip across four years, and cover the
 * Persian-digit layer the UI depends on.
 */
describe("jalali calendar", () => {
  it("anchors Nowruz 1403 on 20 March 2024", () => {
    expect(jalaliToGregorian(1403, 1, 1)).toEqual({ gy: 2024, gm: 3, gd: 20 });
    expect(gregorianToJalali(2024, 3, 20)).toEqual({ jy: 1403, jm: 1, jd: 1 });
    // The day before Nowruz is the last day of the previous year, and 1403 is
    // leap, so its own last day is Esfand 30.
    expect(gregorianToJalali(2024, 3, 19)).toEqual({ jy: 1402, jm: 12, jd: 29 });
    expect(gregorianToJalali(2025, 3, 20)).toEqual({ jy: 1403, jm: 12, jd: 30 });
    expect(gregorianToJalali(2025, 3, 21)).toEqual({ jy: 1404, jm: 1, jd: 1 });
  });

  it("round-trips every day for four years", () => {
    const start = new Date(Date.UTC(2023, 0, 1));
    for (let offset = 0; offset < 365 * 4; offset += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + offset);
      const gy = date.getUTCFullYear();
      const gm = date.getUTCMonth() + 1;
      const gd = date.getUTCDate();
      const jalali = gregorianToJalali(gy, gm, gd);
      const back = jalaliToGregorian(jalali.jy, jalali.jm, jalali.jd);
      expect(back).toEqual({ gy, gm, gd });
    }
  });

  it("keeps Jalali years inside the plausible range for modern dates", () => {
    const jalali = gregorianToJalali(2026, 11, 6);
    expect(jalali.jy).toBe(1405);
    expect(isoFromJalali(jalali.jy, jalali.jm, jalali.jd)).toMatch(/^2026-1[01]-\d{2}$/);
  });

  it("knows which Jalali years are leap", () => {
    // The 33-year cycle rule: 1403 is leap, 1404 is not.
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
  });

  it("formats a date in Persian with Persian digits", () => {
    expect(formatJalaliDate("2024-03-20", { format: "medium" })).toBe("۱ فروردین ۱۴۰۳");
    expect(formatJalaliDate("2024-03-20", { format: "medium", persianDigits: false })).toBe(
      "1 فروردین 1403",
    );
  });

  it("accepts an already-Jalali value without double-converting", () => {
    expect(formatJalaliDate("1403-01-01", { format: "medium" })).toBe("۱ فروردین ۱۴۰۳");
    expect(jalaliFromIso("2024-03-20")).toEqual({ jy: 1403, jm: 1, jd: 1 });
  });

  it("converts digits in both directions, including Arabic forms", () => {
    expect(toPersianDigits("1403-01-01")).toBe("۱۴۰۳-۰۱-۰۱");
    expect(toAsciiDigits("۱۴۰۳/۰۱/۰۱")).toBe("1403/01/01");
    expect(toAsciiDigits("١٤٠٣")).toBe("1403");
  });

  it("names weekdays Saturday-first", () => {
    expect(weekdayNameFa(0)).toBe("شنبه");
    expect(weekdayNameFa(6)).toBe("جمعه");
    expect(weekdayNameFa(7)).toBe("شنبه");
  });

  it("labels recent days relatively and falls back to a date", () => {
    const now = new Date("2026-11-06T10:00:00Z");
    expect(relativeDayLabel("2026-11-06T08:00:00Z", now)).toBe("امروز");
    expect(relativeDayLabel("2026-11-05T08:00:00Z", now)).toBe("دیروز");
    expect(relativeDayLabel("2026-10-01T08:00:00Z", now)).not.toBe("امروز");
  });
});
