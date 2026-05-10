import { GuildMember, PermissionsBitField, type CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";
import { closePreviousSeasonSet, createMatches, createSeasonSet, getAllPlayerMatches } from "../database/db";
import { weightedShuffle } from "../utils/weightedShuffle";
import { arrayShuffle } from 'array-shuffle';

type History = {
    setname: string,
    opponentid: string;
};

type Eligible = {
    player: GuildMember;
    matches: {
        setname: string;
        opponentid: string;
    }[];
};

export type WeightedPlayer = Eligible & {
    weight: number;
};

const generateWeights = (currentSet: number, eligiblePlayers: Eligible[], history: History[]): WeightedPlayer[] => {
    const weightedArray = eligiblePlayers.map(e => {
        if (!history.some(h => h.opponentid === e.player.id)) {
            return { ...e, weight: currentSet };
        }
        const opponentMatches = history.filter(h => h.opponentid === e.player.id).sort((a, b) => Number(b.setname) - Number(a.setname));
        const lastOccuringMatch = Number(opponentMatches[0].setname);
        if (currentSet - lastOccuringMatch === 1) {
            return { ...e, weight: 1 };
        }
        return { ...e, weight: (currentSet - lastOccuringMatch) / opponentMatches.length };
    });
    return weightedArray;
};

@Discord()
export class Pairings {
    @Slash({
        description: "Get pairings for friendlies",
        name: "pairings",
    })
    async pairings(interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply();
        await interaction.editReply("Calculating...");
        await interaction.guild?.roles.fetch();
        const serverId = interaction.guild?.id;
        const historicMatchRecords = await getAllPlayerMatches(interaction.guildId!);
        const roles = await interaction.guild?.roles.fetch(undefined, { force: true });
        const friendliesRole = roles?.find(r => r.name === "Friendlies");
        if (!friendliesRole) {
            // console.log("Please create the necessary role");
            interaction.editReply("Please create the necessary 'Friendlies' role");
            return;
        }
        else if (!friendliesRole?.members.size || friendliesRole?.members.size < 2) {
            interaction.editReply("Please have more than 2 members in the role");
            return;
        }
        const nextWeekNumber = Number(historicMatchRecords.sort((r1, r2) => r1.setname < r2.setname ? -1 : r1.setname > r2.setname ? 1 : 0)?.pop()?.setname ?? 0) + 1;
        await closePreviousSeasonSet(serverId, nextWeekNumber);
        const eligiblePlayers = friendliesRole?.members.map(m => {
            return {
                player: m,
                matches: historicMatchRecords.filter(mr => mr.player === m.id).map(mr => {
                    return {
                        setname: mr.setname,
                        opponentid: mr.opponent,
                    }
                })
            }
        });
        arrayShuffle(eligiblePlayers);
        const nextPairings: { player: string, opponent: string }[] = [];
        console.log("players to pair:", eligiblePlayers.length);
        const pairingsSet: GuildMember[][] = [];
        let user;
        do {
            user = eligiblePlayers.pop();
            if (nextPairings.some(np => np.player === user.player.id || np.opponent === user.player.id)) {
                continue;
            }
            let weights = generateWeights(nextWeekNumber, eligiblePlayers, user.matches);
            weightedShuffle(weights);
            let pairing = weights.pop();
            // Make sure to pair into someone that hasn't been paired yet.
            while (!nextPairings.some(np => np.player === pairing.player.id || np.opponent === pairing.player.id) && weights.length > 1) {
                let index = weights.indexOf(pairing);
                weights.splice(index, 1);
                weightedShuffle(weights);
                pairing = weights.pop();
            }
            const pairedIndex = eligiblePlayers.findIndex(ep => ep.player.id === pairing.player.id);
            const paired = eligiblePlayers[pairedIndex];
            eligiblePlayers.splice(pairedIndex, 1);
            pairingsSet.push([user?.player, paired.player]);

            arrayShuffle(eligiblePlayers);
        } while (eligiblePlayers.length > 1);

        if (eligiblePlayers.length === 1) {
            pairingsSet.push([eligiblePlayers.pop()?.player]);
        }

        //create new season round
        const seasonRoundId = await createSeasonSet(serverId, nextWeekNumber);

        const category = (await interaction.guild?.channels.fetch())?.find(c => c.name === "friendlies-matchmaking");
        interaction.editReply(pairingsSet.map((p) => p.length === 2 ? `<@${p[0].id}> vs <@${p[1].id}>` : `<@${p[0].id}> will have a bye due to no pairing.`).join("\n"));
        await createMatches(serverId, seasonRoundId, pairingsSet.filter(ps => ps.length === 2));
        // pairingsSet.forEach(async ps => {
        //     if (ps.length === 2) {
        //         await interaction.guild?.channels.create({
        //             parent: category?.id,
        //             name: `${ps[0].user.username}-${ps[1].user.username}---${nextWeekNumber}`,
        //             permissionOverwrites: [{ // disallow everyone to see the channel
        //                 id: interaction.guild.id,
        //                 deny: [PermissionsBitField.Flags.ViewChannel],
        //             },
        //             { // allow the user to see the channel
        //                 id: ps[0].id,
        //                 allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        //             },
        //             { // allow the user to see the channel
        //                 id: ps[1].id,
        //                 allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        //             },
        //             ]
        //         });
        //     }
        // });
    }
}