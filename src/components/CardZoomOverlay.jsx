import { useState, useMemo } from 'react';
import { ZoomContext } from './zoomContext.js';
import { CardLayout } from './CardDesign.jsx';

// アプリ全体を包む。長押ししている間、カードを大きく表示する
export function ZoomProvider({ children }) {
  const [item, setItem] = useState(null);
  const api = useMemo(() => ({ show: setItem, hide: () => setItem(null) }), []);

  return (
    <ZoomContext.Provider value={api}>
      {children}
      {item && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 pointer-events-none">
          <div style={{ width: 252, height: 367 }}>
            <CardLayout
              card={item.card}
              image={item.image}
              skin={item.skin}
              w={252} h={367}
              zoom={false}
            />
          </div>
        </div>
      )}
    </ZoomContext.Provider>
  );
}
