import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SiteMetadata {
  name: string;
  logo: string | null;
  favicon: string | null;
  description: string | null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // تنظيف الرابط
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // جلب محتوى الصفحة
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const baseUrl = new URL(cleanUrl);

    // استخراج البيانات
    const metadata: SiteMetadata = {
      name: extractSiteName(html, baseUrl.hostname),
      logo: extractLogo(html, baseUrl.origin),
      favicon: extractFavicon(html, baseUrl.origin),
      description: extractDescription(html),
    };

    return NextResponse.json(metadata);
  } catch (error) {
    
    // إرجاع بيانات افتراضية في حالة الخطأ
    const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    const name = domain.split('.')[0];
    
    return NextResponse.json({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      logo: null,
      favicon: `https://${domain}/favicon.ico`,
      description: null,
    });
  }
}

function extractSiteName(html: string, hostname: string): string {
  // محاولة استخراج الاسم من og:site_name
  const ogSiteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogSiteName?.[1]) return ogSiteName[1];

  // محاولة استخراج الاسم من og:title
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) {
    // تنظيف العنوان من الأجزاء الإضافية
    const title = ogTitle[1].split(/[|\-–—]/)[0].trim();
    if (title.length > 0 && title.length < 50) return title;
  }

  // محاولة استخراج الاسم من title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    const title = titleMatch[1].split(/[|\-–—]/)[0].trim();
    if (title.length > 0 && title.length < 50) return title;
  }

  // استخدام اسم الدومين كـ fallback
  const domain = hostname.replace(/^www\./, '');
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function extractLogo(html: string, baseUrl: string): string | null {
  // محاولة استخراج الشعار من og:image
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImage?.[1]) {
    return resolveUrl(ogImage[1], baseUrl);
  }

  // محاولة استخراج الشعار من logo في الـ HTML
  const logoPatterns = [
    /<img[^>]*class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*logo[^"']*["']/i,
    /<img[^>]*id=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /<img[^>]*alt=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /<a[^>]*class=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i,
  ];

  for (const pattern of logoPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return resolveUrl(match[1], baseUrl);
    }
  }

  // محاولة استخراج apple-touch-icon
  const appleTouchIcon = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
  if (appleTouchIcon?.[1]) {
    return resolveUrl(appleTouchIcon[1], baseUrl);
  }

  return null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  // محاولة استخراج الـ favicon
  const faviconPatterns = [
    /<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']icon["']/i,
  ];

  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return resolveUrl(match[1], baseUrl);
    }
  }

  // استخدام favicon.ico الافتراضي
  return `${baseUrl}/favicon.ico`;
}

function extractDescription(html: string): string | null {
  // محاولة استخراج الوصف من og:description
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDesc?.[1]) return ogDesc[1];

  // محاولة استخراج الوصف من meta description
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaDesc?.[1]) return metaDesc[1];

  return null;
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  return `${baseUrl}/${url}`;
}
