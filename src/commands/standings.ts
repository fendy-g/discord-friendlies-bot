import { CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";
import { getPastRecords } from "../database/db";

@Discord()
export class Standings {
    @Slash({
        description: "Get match records",
        name: "match-records",
    })
    async matchRecords(interaction: CommandInteraction) {
        await interaction.deferReply();
        const playerId = interaction.user.id;
        const records = await getPastRecords(interaction.guild.id, interaction.user.id);
        const opponentInfo = await interaction.guild?.members.fetch({ user: records.map(r => r.opponent) });
        const results = records.sort((r1, r2) => Number(r1.setname) - Number(r2.setname)).map(r => {
            const opponent = opponentInfo.find(o => o.id === r.opponent);
            return `${opponent.displayName} [${r.winner === playerId ? 'W' : 'L'}] - ${r.wins}-${r.losses}`
        });
        interaction.editReply(results.join('\n'));
    }

    // @Slash({
    //     description: "Get current standings",
    //     name: "current-standings",
    // })
    async currentStandings(interaction: CommandInteraction) {

    }

    // @Slash({
    //     description: "Get the leaderboard",
    //     name: "leaderboard",
    // })
    async leaderboard(interaction: CommandInteraction) {

    }
};