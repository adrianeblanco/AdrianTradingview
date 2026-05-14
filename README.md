# AdrianTV 📈

Fork de TradingView Gratis, **adaptado para forex, metales y futuros**. Sin crypto.

## ✨ Qué cambia respecto al original

- 🌍 **Datos de TwelveData** (forex, metales, futuros, índices). Crypto fuera.
- ⏱️ **31 timeframes** (3m, 5m, 10m, 15m, 30m, 45m, 90m, 144m / 1h..18h / 1D..3D / 1W..3W / 1M..12M).
- 🎯 **NY Killzone + London Killzone** marcadas en el chart con bandas verticales.
- ✏️ **Drawing tools**: línea de tendencia, línea horizontal, herramienta de medida, Fibonacci, órdenes Long/Short con SL y TP.
- 📚 **Backtest con histórico real** de Dukascopy (CSVs descargados manualmente, ver abajo).
- 💾 Todo persiste en localStorage (símbolo, timeframe, indicadores, dibujos, sesiones).

---

## 🚀 Instalación rápida

```bash
npm install
cp .env.example .env.local
# Editá .env.local y pegá tu API key de TwelveData
npm run dev
```

Abrí http://localhost:3000

### Conseguir API key gratis de TwelveData

1. Andá a https://twelvedata.com/
2. Sign up con email
3. En el dashboard, copiá la API key
4. Pegala en `.env.local` como `TWELVEDATA_API_KEY=...`

Plan gratis: **800 requests/día, 8 req/minuto**. Para uso personal alcanza sobradamente.

---

## 📚 Backtesting con histórico de Dukascopy

Dukascopy no tiene API pública gratis, pero podés descargar CSVs históricos a mano y subirlos al repo.

### Pasos:

1. Andá a https://www.dukascopy.com/swiss/english/marketwatch/historical/
2. Elegí el instrumento (ej. EUR/USD), el rango de fechas, y "Time period: 1 Minute"
3. Format = **CSV**, time zone = **GMT**, click en "Get the historical data"
4. Esperá que cargue y descargá el CSV
5. Renombralo siguiendo este patrón: `EURUSD_M1_2024.csv`
   - Símbolo sin slash: `EURUSD`, `XAUUSD`, `GBPUSD`
   - Timeframe: `M1`, `M5`, `M15`, `M30`, `H1`, `H4`, `D1`, `W1`, `MN`
   - Año: `2020`, `2021`, etc.
6. Copialo a `public/historical/`
7. En la app, activá el botón **"Backtest"** del header y elegí el rango de años

Si no tenés el CSV exacto, el sistema intenta agregar desde un timeframe menor automáticamente.

---

## 🌐 Deploy en Vercel — paso a paso

1. **Subí los cambios a GitHub** (instrucciones más abajo)
2. Andá a [vercel.com/new](https://vercel.com/new)
3. "Import Git Repository" → seleccioná `adrianeblanco/AdrianTradingview`
4. En **Environment Variables**, agregá:
   - Name: `TWELVEDATA_API_KEY`
   - Value: tu API key real
5. Click **Deploy**. Listo, en ~2 minutos está online.

---

## 🎮 Cómo usar

### Cambiar de timeframe
Botones rápidos en el header (1m, 5m, 15m, 1h, 4h, 1D). Para los demás, click en **"Más"** → menú agrupado.

### Activar la NY Killzone
Ya viene activada por defecto. Se ve como una banda amarilla vertical sobre el chart, de 12:00–15:00 UTC (que son las 7:00–10:00 EST en horario estándar). Para ocultarla, click en el botón **"NY Killzone"** del header.

### Dibujar
Toolbar izquierda:
- **Línea de tendencia** → 2 clicks sobre el chart
- **Línea horizontal** → 1 click al precio que querés marcar
- **Medida** → 2 clicks, te muestra Δ precio, % y Δ tiempo
- **Fibonacci** → 2 clicks (low → high)
- **Orden Long / Short** → 1 click al precio de entrada. Pone SL y TP automáticos con 1:2 RR. Click en la ✕ para borrar.

### Modo Backtest
Click en **"Backtest"** del header. Elegí rango de años. Si tenés los CSVs en `public/historical/`, los carga. Si no, queda vacío (no falla).

---

## 📂 Estructura

```
src/
├── app/
│   ├── api/twelvedata/route.ts   # Proxy que esconde la API key
│   ├── layout.tsx
│   ├── page.tsx                  # Layout principal
│   └── globals.css
├── components/
│   ├── chart/                    # PriceChart, SymbolSelector, TimeframeSelector, IndicatorMenu
│   ├── sessions/                 # SessionsOverlay (las bandas), SessionsPanel (toggles)
│   ├── drawing/                  # DrawingToolbar + DrawingsOverlay (SVG interactivo)
│   └── backtest/                 # BacktestPanel
└── lib/
    ├── timeframes.ts             # Las 31 temporalidades
    ├── sessions.ts               # Lógica de killzones
    ├── data/
    │   ├── types.ts
    │   ├── twelvedata.ts         # Provider para live
    │   ├── dukascopy-csv.ts      # Loader de CSVs históricos
    │   ├── aggregate.ts          # Agregar velas para tf no nativos
    │   └── default-symbols.ts    # EUR/USD, XAU/USD, ES=F, etc.
    ├── indicators/index.ts       # EMA, RSI, MACD
    ├── drawing/types.ts
    └── store/chart-store.ts      # Zustand state
public/
└── historical/                   # Acá van los CSVs de Dukascopy
```

---

## ⚠️ Limitaciones honestas

- **TwelveData free tier**: 8 req/min, 800/día. Si cambiás de símbolo o timeframe muy rápido vas a chocar contra el rate limit. Tomate 5 segundos entre cambios.
- **WebSocket live**: TwelveData free no incluye WebSocket. Las velas se cargan por polling cada vez que cambia el símbolo. Para "vivo en tiempo real", necesitás su plan pago. Para análisis técnico funciona bien igual.
- **Drawings no arrastrables**: una vez dibujados, no se pueden mover. Para corregir, borralos con la ✕ y dibujá de nuevo.
- **Sesiones en UTC fijo**: no ajustan automáticamente por horario de verano (DST). En invierno NY killzone = 12:00–15:00 UTC, en verano = 11:00–14:00 UTC. Si te molesta, abrí un issue.

---

## 📄 Licencia

MIT.  
`lightweight-charts` es Apache 2.0 — el footer mantiene la atribución a TradingView por requerimiento de licencia.
