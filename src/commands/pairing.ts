import { Pagination } from "@discordx/pagination";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageActionRowComponentBuilder, type CommandInteraction } from "discord.js";
import { Discord, MetadataStorage, Slash } from "discordx";

@Discord()
export class Pairings {
    @Slash({
        description: "Get pairings for friendlies",
        name: "pairings",
    })
    async pairings(interaction: CommandInteraction): Promise<void> {
        // await interaction.guild?.roles.fetch();
        const roles = await interaction.guild?.roles.fetch(undefined, {force: true});
        const friendliesRole = roles?.find(r => r.name === "Friendlies");
        if(!friendliesRole) {
            interaction.reply("Found nothing");
            return;
        }
        console.log("members:", friendliesRole?.members.map(m => m.displayName));

        if(!friendliesRole?.members.size || friendliesRole?.members.size < 2) {
            interaction.reply("Please have more than 2 users on the role before running pairings");
            return;
             
        }
        console.log("size: ", friendliesRole?.members.size);
        console.log("mod:", friendliesRole?.members.size % 2);
        console.log("even?: ", friendliesRole?.members.size % 2 === 0);
        if(friendliesRole?.members.size % 2 !== 0){
            // interaction.deferReply();
            // interaction.reply("Odd number of players");
            const confirm = new ButtonBuilder().setCustomId('confirm').setLabel('Yes').setStyle(ButtonStyle.Primary);
		    const cancel = new ButtonBuilder().setCustomId('cancel').setLabel('No').setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(cancel, confirm);
            
            interaction.reply({
                content: `Are you sure you want to proceed?`,
                components: [row],
                withResponse: true,
            });
            // console.log(response);
        } 
        // else {

        //     const channels = await interaction.guild?.channels.fetch();
        //     // interaction.reply("Okay doing stuff");
        //     await interaction.deferReply();
        //     await interaction.editReply("Waaaaaaaaaaaait");
        //     channels.find(c => c?.name === "general")?.send(`<@id> ping`);
        // }
        
    }
}