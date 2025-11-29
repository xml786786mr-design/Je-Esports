export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'awaiting_payout' | 'paid';

export type TournamentMode = 'solo' | 'duo' | 'squad' | 'clash-squad';

export type TournamentType = 'per-kill' | 'survival' | 'clash-squad' | 'lone-wolf' | 'top-kill'; // Include top-kill for backwards compatibility

export interface Tournament {
  id: string;
  name: string;
  description: string;
  prizeDistribution?: string;
  mode: TournamentMode;
  type: TournamentType;
  entryFee: number;
  prizePool: number;
  maxSlots: number;
  registeredSlots: number;
  status: TournamentStatus;
  startTime: Date;
  endTime?: Date;
  roomId?: string;
  roomPassword?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerRegistration {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tournamentId: string;
  teamName?: string;
  slotNumber?: number;
  registrationTime: Date;
  position?: number;
  kills?: number;
  prizeWon?: number;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  position: number;
  kills: number;
  prize: number;
}