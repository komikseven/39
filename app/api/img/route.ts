import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  if (!url) return new NextResponse("Missing url", { status: 400 })

  let target: URL
  try {
    target = new URL(url)
  } catch {
    return new NextResponse("Invalid url", { status: 400 })
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new NextResponse("Invalid protocol", { status: 400 })
  }

  const hostname = target.hostname

  // Tentukan Referer berdasarkan domain gambar
  // i0/i1/i2.wp.com = Jetpack CDN untuk WordPress (komik7 pakai ini)
  // komik7.my.id/wp-content = langsung dari WordPress
  // img.komiku.org / cdn lain = CDN komiku
  let referer: string
  if (
    hostname.includes("komik7.my.id") ||
    hostname.match(/^i\d+\.wp\.com$/) // Jetpack CDN: i0.wp.com, i1.wp.com, i2.wp.com
  ) {
    referer = "https://komik7.my.id/"
  } else {
    referer = "https://komiku.org/"
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Referer": referer,
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    })

    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Upstream error", { status: upstream.status || 502 })
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg"

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    })
  } catch {
    return new NextResponse("Fetch failed", { status: 502 })
  }
}
