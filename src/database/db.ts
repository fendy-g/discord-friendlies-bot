import { Client } from "pg";
import { format } from '@scaleleap/pg-format'
import { GuildMember } from "discord.js";

export const getPlayers = async (serverId: number) => {
    const client = await new Client().connect();
    const res = await client.query("select * from player");
    await client.end();
};

type MatchRecord = {
    setname: string, player: string, opponent: string
};

const createClient = () => {
    const client = new Client({
        user: process.env.user,
        password: process.env.password,
        host: process.env.host,
        port: Number(process.env.port),
        database: process.env.database,
    });
    return client;
}

export const updatePlayerbase = async (serverId: string, players: GuildMember[]) => {
    const insert = players.map(player => [serverId, player.id, player.user.username]);
    const client = await createClient().connect();
    const query = format(`
        INSERT INTO PLAYER (serverId, playerId, playerName)
        VALUES %L
        ON CONFLICT (serverId, playerId) 
        DO NOTHING
        `, insert);
    await client.query(query)
    await client.end();
}

export const getMatches = async (serverId: string, playerId: string) => {
    const client = await createClient().connect();
    const res = await client.query<{ playerid: string, opponentid: string, setname: string }>(`
        SELECT player as playerId, opponent as opponentId, ss.setname
        FROM matchRecord mr
        JOIN seasonset ss ON mr.seasonsetid = ss.id
        where mr.serverId = $1 and player = $2 and winner is null`, [serverId, playerId])
    await client.end();
    return res.rows;
};

export const getOpenMatches = async (serverId: string) => {
    const client = await createClient().connect();
    const res = await client.query<{ playerid: string, opponentid: string, setname: string }>(`
        SELECT player as playerid, opponent as opponentid, ss.setname
        FROM matchRecord mr
        JOIN seasonset ss ON mr.seasonsetid = ss.id
        where mr.serverId = $1 and winner is null`, [serverId])
    await client.end();
    return res.rows;
}

export const submitMatchResult = async (serverId: string, setNumber: string, playerId: string, opponentId: string, winner: string, wins: number, losses: number) => {
    const client = await createClient().connect();
    await client.query(`
        UPDATE matchRecord AS mr
        SET wins = $1, losses = $2, winner = $3
        FROM seasonSet AS ss
        WHERE ss.id = mr.seasonSetId
        and ss.serverId = $4 and ss.setName = $5
        and mr.player = $6 and mr.opponent = $7 `, [wins, losses, winner, serverId, setNumber, playerId, opponentId]);
    await client.end();
};

export const getAllPlayerMatches = async (serverId: string): Promise<MatchRecord[]> => {
    const client = await createClient().connect();
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
};

export const closePreviousSeasonSet = async (serverId: string, seasonRound: number) => {
    const client = await createClient().connect();
    const result = await client.query('update seasonset set activeSet = false where serverId = $1 and setName = $2', [serverId, String(seasonRound - 1)]);
    await client.end();
}
export const createSeasonSet = async (serverId: string, seasonRound: number): Promise<number> => {
    const client = await createClient().connect();
    const result = await client.query("insert into seasonset (serverId, seasonId, setName, activeSet) select serverId, id, $1, true from season where serverId = $2 ON CONFLICT (seasonId, setName) DO UPDATE SET activeSet = true RETURNING id", [seasonRound, serverId]);
    await client.end();
    return result.rows[0].id;
};

export const createMatches = async (serverId: string, seasonSetId: number, matches: GuildMember[][]) => {
    const client = await createClient().connect();
    // client.executeBulkInsertion([], [], '');
    const batchData = matches.map(match =>
        [
            [serverId, seasonSetId, match[0].id, match[1].id],
            [serverId, seasonSetId, match[1].id, match[0].id]
        ]
    ).reduce((a, b) => [...a, ...b]);
    const query = format("INSERT INTO matchRecord (serverId, seasonSetId, player, opponent) values %L", batchData);
    await client.query(query);
    await client.end();

};

export const getLeaderboard = async (serverId: string) => {
    const client = await createClient().connect();
    const result = await client.query(`
    select player, points, wins, losses, 
        rank() over (order by points desc, wins desc, losses asc) rank,
    from (
        select player, 
        sum(case when winner = player then 3 else 1 end) as points, 
        sum(wins) as wins,
        sum(losses) as losses
        from matchRecord 
        where winner is not null
        group by player
    )`);
    await client.end();
    return result.rows;
}

export const getPastRecords = async (serverId: string, playerId: string) => {
    const client = await createClient().connect();
    const result = await client.query<{ setname: string, opponent: string, winner: string, wins: number, losses: number }>(`        
        select ss.setname, mr.opponent, mr.winner, mr.wins, mr.losses
        from season s
        join seasonset ss on s.id = ss.seasonid
        join matchRecord mr on ss.id = mr.seasonsetid
        where s.activeSeason = true and s.serverid = $1 and mr.player = $2;
    `, [serverId, playerId]);
    await client.end();
    return result.rows;
}