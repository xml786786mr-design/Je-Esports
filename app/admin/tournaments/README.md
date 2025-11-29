# Tournament Status Management

The tournament system now automatically manages tournament statuses based on time:

## Automatic Status Changes

- **Upcoming → Ongoing**: Automatically changes when the start time is reached
- **Ongoing → Completed**: Automatically changes when the end time is reached

## How It Works

1. The `tournamentStateManager.ts` utility handles all automatic status updates
2. The status is checked:
   - When tournaments are loaded in browse page
   - Every minute in the client UI
   - On individual tournament pages
   - Via a scheduled API route

## API Route

- `/api/update-tournament-states`: Updates all tournament states based on the current time
- Can be called by a CRON job for reliable server-side updates

## Notes for Admins

- You no longer need to manually change tournament states
- When creating tournaments, make sure to set accurate start and end times
- The system will handle the rest automatically

This system ensures players always see the correct tournament status based on time.
