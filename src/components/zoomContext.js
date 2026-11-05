import { createContext, useContext, useRef } from 'react';

// 長押しで拡大表示するための共有部品（表示本体は CardZoomOverlay.jsx）
export const ZoomContext = createContext({ show: () => {}, hide: () => {} });

// 長押し直後のクリック（指を離した時に出る）を無視するための時刻
let suppressUntil = 0;
export const clickSuppressed = () => performance.now() < suppressUntil;

// 要素に {...useZoomPress(() => ({ card, image, skin }))} を付けると、長押しで拡大される
export function useZoomPress(getItem, ms = 420) {
  const { show, hide } = useContext(ZoomContext);
  const st = useRef({ timer: null, x: 0, y: 0, fired: false });

  const cancel = () => { clearTimeout(st.current.timer); st.current.timer = null; };
  const end = () => {
    cancel();
    if (st.current.fired) {
      st.current.fired = false;
      suppressUntil = performance.now() + 350;
      hide();
    }
  };

  return {
    onPointerDown: e => {
      suppressUntil = 0;
      st.current.x = e.clientX;
      st.current.y = e.clientY;
      st.current.fired = false;
      cancel();
      st.current.timer = setTimeout(() => {
        st.current.timer = null;
        st.current.fired = true;
        show(getItem());
      }, ms);
    },
    onPointerMove: e => {
      if (!st.current.timer && !st.current.fired) return;
      if (Math.hypot(e.clientX - st.current.x, e.clientY - st.current.y) > 12) {
        cancel();
        if (st.current.fired) { st.current.fired = false; hide(); } // 動かしたら拡大を閉じる
      }
    },
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
    onContextMenu: e => e.preventDefault(),
  };
}
