import { LabelBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel, type CommandInteraction } from "discord.js";
import { Discord, ModalComponent, Slash } from "discordx";
import { getOpenMatches, submitMatchResult } from "../database/db";

@Discord()
export class ManualSubmission {
    @Slash({
        description: "Submit match manually",
        name: "manual-submit-match",
    })
    async manualsubmitmatch(interaction: CommandInteraction): Promise<void> {
        const playerId = interaction.user.id;
        const serverId = interaction.guild?.id;
        const matches = await getOpenMatches(serverId);
        const members = await interaction.guild?.members.fetch({ user: matches.map(m => m.playerid) });

        const modal = new ModalBuilder().setCustomId('ManualSubmissionForm').setTitle("Match submission");
        const test = matches.map(match => (new StringSelectMenuOptionBuilder()
            .setLabel(`${members?.find(m => m.id === match.playerid)?.displayName} - ${members?.find(m => m.id === match.opponentid)?.displayName} [Week ${match.setname}]`)
            .setValue(`${match.playerid}||${match.opponentid}||${match.setname}`)));
        // console.log(test);

        const setMatches: { playerid: string, opponentid: string, setname: string }[] = [];
        matches.forEach(match => {
            if (!setMatches.some(sm => (sm.playerid === match.playerid || sm.opponentid === match.playerid) && match.setname === sm.setname)) {
                setMatches.push(match);
            }
        });

        const matchMenu = new LabelBuilder()
            .setLabel('Match')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('match')
                    .setPlaceholder('')
                    .addOptions(
                        setMatches.map(match => (new StringSelectMenuOptionBuilder()
                            .setLabel(`${members?.find(m => m.id === match.playerid)?.displayName} - ${members?.find(m => m.id === match.opponentid)?.displayName} [Week ${match.setname}]`)
                            .setValue(`${match.playerid}||${match.opponentid}||${match.setname}`)))
                    )
            );

        const winnerMenu = new LabelBuilder()
            .setLabel('Winner')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('winner')
                    .setPlaceholder('')
                    .addOptions(
                        matches.map(match => (new StringSelectMenuOptionBuilder()
                            .setLabel(members?.find(m => m.id === match.playerid)?.displayName)
                            .setValue(match.playerid))).slice(0, 25),
                    )
            );
        const winCountMenu = new LabelBuilder().setLabel('Wins').setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId('winCount')
                .setPlaceholder('0')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('0').setValue('0').setDefault(),
                    new StringSelectMenuOptionBuilder().setLabel('1').setValue('1'),
                    new StringSelectMenuOptionBuilder().setLabel('2').setValue('2'),
                )
        );
        const loseCountMenu = new LabelBuilder().setLabel('Losses').setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId('lossCount')
                .setPlaceholder('0')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('0').setValue('0').setDefault(),
                    new StringSelectMenuOptionBuilder().setLabel('1').setValue('1'),
                    new StringSelectMenuOptionBuilder().setLabel('2').setValue('2'),
                )
        );
        modal.addLabelComponents(matchMenu, winnerMenu, winCountMenu, loseCountMenu);
        await interaction.showModal(modal);

    }

    @ModalComponent()
    async ManualSubmissionForm(interaction: ModalSubmitInteraction): Promise<void> {
        const [player1, player2, setname] = interaction.fields.getStringSelectValues('match')[0].split("||");
        const winner = interaction.fields.getStringSelectValues('winner')[0];
        const wins = Number(interaction.fields.getStringSelectValues('winCount')[0]);
        const losses = Number(interaction.fields.getStringSelectValues('lossCount')[0]);
        //const currentChannel = await interaction.guild?.channels.fetch(interaction.channelId);
        console.log("setname:", setname);
        console.log('player1:', player1);
        console.log('player2:', player2);
        console.log('winner:', winner);
        console.log('wins:', wins);
        console.log('losses:', losses);
        //friendlies-results
        await submitMatchResult(interaction.guild?.id, setname, interaction.user.id, player1, winner, wins, losses);
        await submitMatchResult(interaction.guild?.id, setname, player1, interaction.user.id, winner, losses, wins);
        if (winner === player1) {
            await submitMatchResult(interaction.guild?.id, setname, player1, player2, winner, wins, losses);
            await submitMatchResult(interaction.guild?.id, setname, player2, player1, winner, losses, wins);
            // (interaction.guild?.channels.cache.find(c => c.name === 'bot-testing') as TextChannel).send(`<@${winner}> won against <@${interaction.user.id}> with a score of ${losses}-${wins}`);
        } else {
            await submitMatchResult(interaction.guild?.id, setname, player2, player1, winner, wins, losses);
            await submitMatchResult(interaction.guild?.id, setname, player1, player2, winner, losses, wins);
            // (interaction.guild?.channels.cache.find(c => c.name === 'bot-testing') as TextChannel).send(`<@${winner}> won against <@${player1}> with a score of ${wins}-${losses}`);
        }
        await interaction.reply("Your match has been recorded");
        return;
    }
}