import { testOpenAIProvider } from '@/app/(chat)/actions';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await testOpenAIProvider();
  return NextResponse.json({ result });
}

