// src/app/api/twelvedata/route.ts
// Proxy server-side a TwelveData. Esconde la API key del cliente.
// Se llama así desde el front:
//   GET /api/twelvedata?path=time_series&symbol=EUR/USD&interval=15min&outputsize=500

import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.twelvedata.com";

export async function GET(req: NextRequest) {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TWELVEDATA_API_KEY no está configurada en el servidor" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path) return NextResponse.json({ error: "falta ?path=" }, { status: 400 });

  // Pasamos todos los demás params tal cual
  const passthrough = new URLSearchParams(searchParams);
  passthrough.delete("path");
  passthrough.set("apikey", apiKey);

  const url = `${BASE}/${path}?${passthrough.toString()}`;
  try {
    const r = await fetch(url, { next: { revalidate: 0 } });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: "fallo de fetch", detail: String(err) },
      { status: 502 },
    );
  }
}
