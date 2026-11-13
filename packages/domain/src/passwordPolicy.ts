/**
 * Password policy shown in the client — mirrors the server.
 *
 * Rules stay few on purpose: 8+ characters, a letter and a number, and not one
 * of the passwords everybody already uses. Weak-but-valid passwords are allowed;
 * the meter guides, it never blocks.
 *
 * Source: `frontend/src/lib/passwordPolicy.ts`, which in turn mirrors
 * `backend/core/utils/passwords.py`. Change all three together or the client
 * starts promising something the API rejects.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** Long keyboard rows and counting sequences the server rejects outright. */
const PREDICTABLE_RUNS = [
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "1234567890",
  "0987654321",
  "12345678",
  "87654321",
  "abcdefgh",
  "1234567",
  "123456",
];

/** The handful of passwords worth blocking before the request is sent. */
const COMMON = [
  "password",
  "passw0rd",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "fitness",
  "gym",
  "coach",
  "boxing",
  "bashgino",
  "hello",
  "123456",
];

const hasLetter = (value: string) => /[a-zA-Z\u0600-\u06FF]/.test(value);
const hasDigit = (value: string) => /[0-9\u06F0-\u06F9\u0660-\u0669]/.test(value);

function looksCommon(value: string): boolean {
  const folded = value.toLowerCase();
  if (COMMON.includes(folded)) return true;
  const stem = folded.replace(/[^a-z0-9\u0600-\u06FF]+$/g, "").replace(/\d+$/g, "");
  return stem.length > 0 && COMMON.includes(stem);
}

function hasPredictableRun(value: string): boolean {
  const folded = value.toLowerCase();
  if (PREDICTABLE_RUNS.some((run) => folded.includes(run))) return true;
  if (/^(.)\1+$/.test(value)) return true;
  return /^\d+$/.test(value);
}

export interface PasswordAssessment {
  /** Every hard rule is satisfied — the form may submit. */
  ok: boolean;
  /** 0 = blocked, 1 = weak, 2 = fair, 3 = strong. Display only. */
  level: 0 | 1 | 2 | 3;
  /** What is wrong, for the submit-time error only. Null whenever acceptable. */
  hint: string | null;
  hasLength: boolean;
  hasWordAndNumber: boolean;
}

export function assessPassword(password: string, locale: "fa" | "en" = "fa"): PasswordAssessment {
  const fa = locale === "fa";
  const value = password || "";
  const hasLength = value.length >= MIN_PASSWORD_LENGTH;
  const hasWordAndNumber = hasLetter(value) && hasDigit(value);

  if (value.length === 0) {
    return {
      ok: false,
      level: 0,
      hint: fa ? "یک کلمه و یک عدد، حداقل ۸ کاراکتر." : "A word and a number, at least 8 characters.",
      hasLength: false,
      hasWordAndNumber: false,
    };
  }

  if (!hasLength) {
    const missing = MIN_PASSWORD_LENGTH - value.length;
    return {
      ok: false,
      level: 0,
      hint: fa
        ? `${missing} کاراکتر دیگر (حداقل ۸).`
        : `${missing} more character${missing === 1 ? "" : "s"} (minimum 8).`,
      hasLength,
      hasWordAndNumber,
    };
  }

  if (!hasLetter(value)) {
    return { ok: false, level: 0, hint: fa ? "یک حرف هم اضافه کنید." : "Add a letter too.", hasLength, hasWordAndNumber };
  }

  if (!hasDigit(value)) {
    return { ok: false, level: 0, hint: fa ? "یک عدد هم اضافه کنید." : "Add a number too.", hasLength, hasWordAndNumber };
  }

  if (looksCommon(value) || hasPredictableRun(value)) {
    return {
      ok: false,
      level: 0,
      hint: fa ? "این یکی خیلی رایج است؛ یک کلمه دیگر اضافه کنید." : "This one is too common — add another word.",
      hasLength,
      hasWordAndNumber,
    };
  }

  let level: 1 | 2 | 3 = 1;
  if (value.length >= 12) level = 2;
  if (value.length >= 16) level = 3;

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  if (variety >= 3 && value.length >= 10) level = 3;

  // No hint on a valid password — the meter shows the level and two checks, and
  // nothing is said under the field.
  return { ok: true, level, hint: null, hasLength, hasWordAndNumber };
}
