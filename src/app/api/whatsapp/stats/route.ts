import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { fetchInstances } from '@/lib/evolution-service';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch instances
    const instancesResult = await fetchInstances();

    if (!instancesResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch instances' },
        { status: 500 }
      );
    }

    const instances = instancesResult.data;

    // Calculate stats
    const total_instances = instances.length;

    const statusCounts: { connected: number; disconnected: number; connecting: number; pending: number } = instances.reduce(
      (acc: { connected: number; disconnected: number; connecting: number; pending: number }, inst: any) => {
        const status = inst.status || 'pending';
        if (status === 'open') acc.connected++;
        else if (status === 'close') acc.disconnected++;
        else if (status === 'connecting') acc.connecting++;
        else acc.pending++;
        return acc;
      },
      { connected: 0, disconnected: 0, connecting: 0, pending: 0 }
    );

    // Calculate total messages from all instances
    const totalMessages = instances.reduce(
      (sum: number, inst: any) => sum + (inst.messagesCount || 0),
      0
    );

    // Calculate uptime percentage
    const uptime_percentage = total_instances > 0
      ? ((statusCounts.connected / total_instances) * 100).toFixed(2)
      : '0.00';

    return NextResponse.json({
      success: true,
      data: {
        total_instances,
        connected: statusCounts.connected,
        disconnected: statusCounts.disconnected,
        connecting: statusCounts.connecting,
        pending: statusCounts.pending,
        totalMessages,
        avg_response_time: '1.2s',
        uptime_percentage: `${uptime_percentage}%`
      }
    });
  } catch (error) {
    console.error('Error fetching WhatsApp stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch WhatsApp stats' },
      { status: 500 }
    );
  }
}
