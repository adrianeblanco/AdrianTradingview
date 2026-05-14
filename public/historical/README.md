# Carpeta para histórico de Dukascopy

Bajá los CSVs de https://www.dukascopy.com/swiss/english/marketwatch/historical/
y guardalos acá con este patrón de nombre:

```
EURUSD_M1_2024.csv
EURUSD_M15_2024.csv
XAUUSD_M5_2023.csv
GBPUSD_H1_2022.csv
```

Patrón: `SIMBOLOSINSLASH_TIMEFRAME_AÑO.csv`

Timeframes válidos: `M1, M5, M15, M30, H1, H4, D1, W1, MN`

Cuanto más bajo el timeframe (M1) más pesados son los archivos pero más completos.
M1 de un año de EUR/USD pesa unos 25 MB.

> ⚠️ Estos archivos NO se suben a git por defecto (ver .gitignore).
> Si querés deployarlos en Vercel, sacá el ignore.
