import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
    const mql = typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
    const onChange = () => {
      setIsMobile(mql ? mql.matches : window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Safari/iOS versions before MediaQueryList.addEventListener only expose
    // addListener/removeListener. Keep both paths so the hook cannot crash
    // while the application is mounting on older mobile browsers.
    if (mql?.addEventListener) {
      mql.addEventListener("change", onChange);
    } else {
      mql?.addListener(onChange);
    }

    onChange();

    return () => {
      if (mql?.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else {
        mql?.removeListener(onChange);
      }
    };
  }, []);

  return !!isMobile;
}
