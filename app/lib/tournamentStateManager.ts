
import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  Timestamp 
} from "firebase/firestore";
import { Tournament, TournamentStatus } from "./types";

/**
 * Updates tournament states based on time:
 * - upcoming → ongoing (when current time passes start time)
 * - ongoing → completed (when current time passes end time)
 */
export const updateTournamentStates = async (): Promise<{ 
  updated: number,
  startedCount: number,
  completedCount: number 
}> => {
  const now = new Date();
  const currentTimestamp = Timestamp.fromDate(now);
  let startedCount = 0;
  let completedCount = 0;

  try {
    // Find upcoming tournaments that should be ongoing
    const upcomingQuery = query(
      collection(db, "tournaments"),
      where("status", "==", "upcoming"),
      where("startTime", "<=", currentTimestamp)
    );
    
    const upcomingSnapshot = await getDocs(upcomingQuery);
    
    // Update each tournament that should be ongoing
    const upcomingPromises = upcomingSnapshot.docs.map(async (docSnapshot) => {
      await updateDoc(doc(db, "tournaments", docSnapshot.id), {
        status: "ongoing"
      });
      startedCount++;
    });
    
    // Find all non-completed tournaments that have passed their end time
    // This broader query catches any tournament that should be completed
    const ongoingQuery = query(
      collection(db, "tournaments"),
      where("status", "in", ["upcoming", "ongoing"]),
      where("endTime", "<=", currentTimestamp)
    );
    
    const ongoingSnapshot = await getDocs(ongoingQuery);
    
    // Update each tournament that should be completed
    const ongoingPromises = ongoingSnapshot.docs.map(async (docSnapshot) => {
      await updateDoc(doc(db, "tournaments", docSnapshot.id), {
        status: "completed"
      });
      completedCount++;
    });
    
    // Wait for all updates to complete
    await Promise.all([...upcomingPromises, ...ongoingPromises]);
    
    return {
      updated: startedCount + completedCount,
      startedCount,
      completedCount
    };
  } catch (error) {
    console.error("Error updating tournament states:", error);
    throw error;
  }
};

/**
 * Utility function to check if a tournament needs a state update
 * Returns the new state if update is needed, null otherwise
 */
export const checkTournamentState = (tournament: Tournament): TournamentStatus | null => {
  const now = new Date();
  
  // First priority: Check if end time has passed for any non-completed tournament
  // This ensures tournaments move to completed even if they somehow missed the ongoing state
  if (tournament.status !== "completed" && tournament.status !== "cancelled" && 
      tournament.endTime && tournament.endTime <= now) {
    console.log(`Tournament ${tournament.id} end time reached: ${tournament.endTime.toISOString()}, current time: ${now.toISOString()}`);
    return "completed";
  }
  
  // Second priority: Move from upcoming to ongoing
  if (tournament.status === "upcoming" && tournament.startTime <= now) {
    console.log(`Tournament ${tournament.id} start time reached: ${tournament.startTime.toISOString()}, current time: ${now.toISOString()}`);
    return "ongoing";
  }
  
  // No state change needed
  return null;
};
