import { NextResponse } from "next/server";
import { updateTournamentStates } from "../../lib/tournamentStateManager";

export const dynamic = 'force-dynamic'; // No caching for this route

/**
 * API Route handler to update tournament states automatically
 * This can be called via a CRON job or manually triggered
 * 
 * @route GET /api/update-tournament-states
 */
export async function GET(request: Request) {
  try {
    // Optional API key check for security (implement in production)
    // const apiKey = request.headers.get('x-api-key');
    // if (!apiKey || apiKey !== process.env.TOURNAMENT_UPDATE_API_KEY) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const result = await updateTournamentStates();
    
    return NextResponse.json({
      success: true,
      message: `Tournament states updated. Started: ${result.startedCount}, Completed: ${result.completedCount}`,
      ...result
    });
  } catch (error) {
    console.error('Error updating tournament states:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament states' },
      { status: 500 }
    );
  }
}
