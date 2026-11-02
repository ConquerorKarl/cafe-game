# 카페 달빛 · Café Dalbit — Hongdae café sim

A first-person café management sim set on Hongdae's walking street. Four seasons × 14 days,
weather, competitors, staff with skills, reputation levels, VIPs, rush hours and a full
kitchen/dish/EFTPOS loop. Built with React + Vite + Tailwind + three.js (all procedural).

## Run (web)
```
npm install
npm run dev      # play in the browser
```

## Build
```
npm run build    # → dist/index.html (single file)
```

## Windows .exe (and macOS/Linux)
```
npm install
npm run dist:win     # builds dist/ then packages a Windows installer + exe → release/
npm run pack         # quick local test with electron (needs a display)
```
The packaged game is `release/CaféDalbit-Hongdae-*-windows-x64.exe` (NSIS installer; the raw
unpacked app is `release/win-unpacked/Café Dalbit.exe`). On Windows the installer step runs
natively; on Linux/macOS electron-builder uses wine or the platform tools automatically.

Saves live in localStorage inside the app profile.
