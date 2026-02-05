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
  
  // Even without server key, users can use their own keys
  // So we report as "available" if API infrastructure is up
  if (!apiKey) {
    return NextResponse.json({
      connected: true, // Changed: users can still use their own keys
      model: 'gemini-2.5-flash',
      provider: 'Google AI (User Keys)',
      message: 'Using user-provided API keys',
      limits: {
        requestsPerMinute: 15,
        requestsPerDay: 1500,
      },
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
        model: 'gemini-2.5-flash',
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
      
      // Even if server key is exhausted, users can use their own keys
      return NextResponse.json({
        connected: true, // Changed: users can still use their own keys
        model: 'gemini-2.5-flash',
        provider: 'Google AI (User Keys)',
        serverKeyStatus: isQuotaError ? 'quota_exceeded' : 'error',
        message: isQuotaError ? 'Server quota exceeded. Use your own API key.' : 'Using user API keys',
        isQuotaError,
        limits: {
          requestsPerMinute: 15,
          requestsPerDay: 1500,
        },
      });
    }
  } catch (error: any) {
    // Network errors still mean service might be available with user keys
    return NextResponse.json({
      connected: true, // Users can still use their own keys
      model: 'gemini-2.5-flash',
      provider: 'Google AI (User Keys)',
      message: 'Use your own API key for best results',
    });
  }
}
