import { LabelBuilder, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel, type CommandInteraction } from "discord.js";
import { Discord, ModalComponent, Slash } from "discordx";
import { getMatches, submitMatchResult } from "../database/db";

@Discord()
export class SubmitMatch {
    @Slash({
        description: "Submit match for round",
        name: "submit-match",
    })
    async submitmatch(interaction: CommandInteraction): Promise<void> {
        const playerId = interaction.user.id;
        const serverId = interaction.guild?.id;
        const matches = await getMatches(serverId, playerId);
        const members = await interaction.guild?.members.fetch({ user: matches.map(m => m.opponentid) });

        const opponents = matches.map(match => ({ ...match, opponentName: members?.find(m => m.id === match.opponentid)?.displayName }));
        const modal = new ModalBuilder().setCustomId('SubmissionForm').setTitle("Match submission");

        const opponentMenu = new LabelBuilder()
            .setLabel('Opponent')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('opponent')
                    .setPlaceholder('')
                    .addOptions(
                        opponents.map(player => (new StringSelectMenuOptionBuilder()
                            .setLabel(`${player.opponentName} [Week ${player.setname}]`)
                            .setValue(`${player.opponentid}||${player.setname}`)))
                    )
            );

        const winnerMenu = new LabelBuilder()
            .setLabel('Winner')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('winner')
                    .setPlaceholder('')
                    .addOptions(
                        [...opponents.map(player => (new StringSelectMenuOptionBuilder().setLabel(player?.opponentName).setValue(player.opponentid))),
                        new StringSelectMenuOptionBuilder().setLabel(interaction.user.displayName).setValue(playerId).setDefault()
                        ]
                    )
            );
        const winCountMenu = new LabelBuilder().setLabel('Your wins').setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId('winCount')
                .setPlaceholder('0')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('0').setValue('0').setDefault(),
                    new StringSelectMenuOptionBuilder().setLabel('1').setValue('1'),
                    new StringSelectMenuOptionBuilder().setLabel('2').setValue('2'),
                )
        );
        const loseCountMenu = new LabelBuilder().setLabel('Your losses').setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId('lossCount')
                .setPlaceholder('0')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('0').setValue('0').setDefault(),
                    new StringSelectMenuOptionBuilder().setLabel('1').setValue('1'),
                    new StringSelectMenuOptionBuilder().setLabel('2').setValue('2'),
                )
        );
        modal.addLabelComponents(opponentMenu, winnerMenu, winCountMenu, loseCountMenu);
        await interaction.showModal(modal);

    }

    @ModalComponent()
    async SubmissionForm(interaction: ModalSubmitInteraction): Promise<void> {
        const [opponent, setname] = interaction.fields.getStringSelectValues('opponent')[0].split("||");
        const winner = interaction.fields.getStringSelectValues('winner')[0];
        const wins = Number(interaction.fields.getStringSelectValues('winCount')[0]);
        const losses = Number(interaction.fields.getStringSelectValues('lossCount')[0]);
        //const currentChannel = await interaction.guild?.channels.fetch(interaction.channelId);
        // console.log("setname:", setname);
        // console.log('opponent:', opponent);
        // console.log('winner:', winner);
        // console.log('wins:', wins);
        // console.log('losses:', losses);
        //friendlies-results
        await submitMatchResult(interaction.guild?.id, setname, interaction.user.id, opponent, winner, wins, losses);
        await submitMatchResult(interaction.guild?.id, setname, opponent, interaction.user.id, winner, losses, wins);
        if (winner === opponent) {
            (interaction.guild?.channels.cache.find(c => c.name === 'friendlies-results') as TextChannel).send(`<@${winner}> won against <@${interaction.user.id}> with a score of ${losses}-${wins}`);
        } else {
            (interaction.guild?.channels.cache.find(c => c.name === 'friendlies-results') as TextChannel).send(`<@${winner}> won against <@${opponent}> with a score of ${wins}-${losses}`);
        }
        await interaction.reply("Your match has been recorded");
        return;
    }
}