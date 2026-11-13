import { useState } from "react";
import { Animated } from "react-native";

/**
 * A stable `Animated.Value`.
 *
 * `useRef(new Animated.Value(x)).current` reads a ref during render, which the
 * project's React rules reject (and which is genuinely unsafe under concurrent
 * rendering). Lazy state initialisation gives the same single instance without
 * touching a ref in render.
 */
export function useAnimatedValue(initial = 0): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
