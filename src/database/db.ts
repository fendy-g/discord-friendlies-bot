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
};

type MatchRecord = {
     setname: string, player: string, opponent: string 
};

export const getAllPlayerMatches = async (serverId: string): Promise<MatchRecord[]> => {
    const client = await new Client().connect();
    const res = await client.query<MatchRecord>(`
                SELECT 
            ss.setName,
            mr.player,
            mr.opponent
        FROM matchRecord mr
        LEFT JOIN player p1 on mr.player = p1.playerId
        LEFT JOIN player p2 on mr.opponent = p2.playerId
        LEFT OUTER JOIN player p3 on mr.winner = p3.playerId
        LEFT JOIN seasonSet ss on ss.id = mr.seasonSetId
        WHERE mr.serverId = $1
        ORDER BY ss.setName;`, [serverId]);

    await client.end();
    return res.rows;
}