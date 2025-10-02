import { NextRequest, NextResponse } from 'next/server';
import { Inngest } from 'inngest';

const inngest = new Inngest({
  id: 'manthan-os',
  eventKey: process.env.INNGEST_EVENT_KEY!
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json({ error: 'Missing event or data' }, { status: 400 });
    }

    await inngest.send({ name: event, data });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Inngest trigger error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}