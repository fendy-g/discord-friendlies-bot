import { CommandInteraction, TextChannel } from "discord.js";
import { Discord, Slash } from "discordx";
import { getOpenMatches, getPastRecords } from "../database/db";

@Discord()
export class Reminder {
    @Slash({
        description: "Signup reminders",
        name: "reminder",
    })
    async reminder(interaction: CommandInteraction) {
        await interaction.deferReply();
        const openMatches = await getOpenMatches(interaction.guild.id);
        const members = await interaction.guild?.members.fetch({ user: openMatches.map(m => m.playerid) });
        const matches: { playerid: string, opponentid: string, setname: string }[] = [];
        openMatches.forEach(match => {
            if (!matches.some(sm => (sm.playerid === match.playerid || sm.opponentid === match.playerid) && match.setname === sm.setname)) {
                matches.push(match);
            }
        });
        const formattedMatches = matches.map(match => {
            const p1 = members.find(member => match.playerid === member.id);
            const p2 = members.find(member => match.opponentid === member.id);
            return `<@${p1.id}> vs <@${p2.id}>`;
        });

        (interaction.guild?.channels.cache.find(c => c.name === 'friendlies-general') as TextChannel)
            .send(`@everyone next pairings will happen in the next day! Please give yourself (or remove) the role over in #friendlies-signup if you wish to partixcipate. If we do not have an even number of signups, then one person at random will be left out.` + (formattedMatches.length > 1 ? '\n\nReminder for the following matches to report your results:\n\n' + formattedMatches.join('\n') : ''));

        interaction.editReply("Reminder sent");
    }


};