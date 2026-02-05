import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limiting for status checks
  const clientIP = getClientIP(request);
  const rateLimitResult = rateLimit(`status:${clientIP}`, RATE_LIMITS.statusCheck);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { connected: false, error: 'Too many requests' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({
      connected: false,
      model: null,
      error: 'API key not configured',
    });
  }

  try {
    // Test the API key with a simple request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );

    if (response.ok) {
      return NextResponse.json({
        connected: true,
        model: 'gemini-2.0-flash',
        provider: 'Google AI',
        limits: {
          requestsPerMinute: 15,
          requestsPerDay: 1500,
        },
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'API connection failed';
      const isQuotaError = errorMessage.includes('quota') || 
                           errorMessage.includes('exceeded') ||
                           response.status === 429;
      
      return NextResponse.json({
        connected: false,
        model: null,
        error: isQuotaError ? 'API quota exceeded. Please upgrade to a paid plan.' : errorMessage,
        isQuotaError,
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      model: null,
      error: error.message || 'Connection error',
    });
  }
}
