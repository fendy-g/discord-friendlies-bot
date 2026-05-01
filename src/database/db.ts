import { Client } from "pg";

// Get players
// Players with historic pairs (to prevent consecutive repeats)
// Leaderboard
// Add season
// Add week
// Add user weekly record

export const getPlayers = async (serverId: number) => {
    const client = await new Client().connect();
    const res = await client.query("select * from player");
    await client.end();
}