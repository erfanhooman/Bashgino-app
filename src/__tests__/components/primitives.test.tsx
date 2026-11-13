import { fireEvent, render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/surface";
import { ThemeProvider } from "@/theme";

/**
 * Render through the real theme provider — the primitives read every colour and
 * size from it, so a test that mocks the theme proves nothing about what ships.
 *
 * `render` is asynchronous in Testing Library 14 (concurrent React), so every
 * case awaits it; forgetting the await is what makes both the queries and the
 * global `screen` look undefined.
 */
const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe("Button", () => {
  it("renders its label and fires onPress", async () => {
    const onPress = jest.fn();
    const view = await wrap(<Button label="ذخیره" onPress={onPress} />);
    fireEvent.press(view.getByRole("button", { name: "ذخیره" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not fire while disabled", async () => {
    const onPress = jest.fn();
    const view = await wrap(<Button label="ذخیره" onPress={onPress} disabled />);
    const button = view.getByRole("button", { name: "ذخیره" });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it("exposes a busy state while loading", async () => {
    const view = await wrap(<Button label="در حال ذخیره" loading onPress={() => undefined} />);
    const button = view.getByRole("button", { name: "در حال ذخیره" });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });

  it("keeps the destructive variant a button with its own label", async () => {
    const view = await wrap(<Button label="حذف" variant="destructive" onPress={() => undefined} />);
    expect(view.getByRole("button", { name: "حذف" })).toBeTruthy();
  });
});

describe("Input", () => {
  it("shows its label, value and error text", async () => {
    const view = await wrap(
      <Input label="شماره موبایل" value="0912" onChangeText={() => undefined} error="شماره نامعتبر" />,
    );
    expect(view.getByText("شماره موبایل")).toBeTruthy();
    expect(view.getByText("شماره نامعتبر")).toBeTruthy();
    expect(view.getByDisplayValue("0912")).toBeTruthy();
  });

  it("hides the hint when an error is present", async () => {
    const view = await wrap(
      <Input
        label="رمز"
        value=""
        onChangeText={() => undefined}
        hint="حداقل ۸ کاراکتر"
        error="رمز کوتاه است"
      />,
    );
    expect(view.queryByText("حداقل ۸ کاراکتر")).toBeNull();
    expect(view.getByText("رمز کوتاه است")).toBeTruthy();
  });

  it("calls onChangeText as the user types", async () => {
    const onChangeText = jest.fn();
    const view = await wrap(<Input label="نام" value="" onChangeText={onChangeText} />);
    fireEvent.changeText(view.getByDisplayValue(""), "علی");
    expect(onChangeText).toHaveBeenCalledWith("علی");
  });
});

describe("Badge", () => {
  it("renders its status label", async () => {
    const view = await wrap(<Badge label="فعال" tone="success" />);
    expect(view.getByText("فعال")).toBeTruthy();
  });
});
