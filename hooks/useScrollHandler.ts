import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useTabBarStore } from "../store/tabBarStore";
import { useRef } from "react";

export function useScrollHandler() {
  const lastY = useRef(0);
  const setVisible = useTabBarStore((s) => s.setVisible);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastY.current;
    
    if (Math.abs(diff) > 15) {
      if (currentY <= 10) {
        setVisible(true);
      } else if (diff > 0) {
        setVisible(false); // scrolling down
      } else {
        setVisible(true); // scrolling up
      }
      lastY.current = currentY;
    }
  };

  return onScroll;
}
