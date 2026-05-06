import { Pagination } from "@discordx/pagination";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, GuildMember, MessageActionRowComponentBuilder, type CommandInteraction } from "discord.js";
import { Discord, MetadataStorage, Slash } from "discordx";
import { getAllPlayerMatches } from "../database/db";
import { weightedShuffle } from "../utils/weightedShuffle";
import {arrayShuffle} from 'array-shuffle';

// const mockUsers = {
// "genesis_1349": "394923448029151232",
// "sroxs": "97080877875466240",
// "ninjacop_": "247434336461127681",
// "leafeon.is.cute": "919805706092286013",
// "airinhater": "358658529525235722",
// ".christhewizard": "424723585970470914",
// "tempest9": "204390481654841345",
// "lsmewtwo": "135504446967775232",
// "christianfinity": "586730862826094611",
// "lordtentacle69": "183033448603189257",
// "spicycigar": "746823917238353942",
// "hisuiandylan": "680178838780510223",
// "misogi": "146431600463314944",
// "teybutter": "206470651874115595",
// "thenamesnap": "332649941543419915",
// "ultrog": "431656619080810516",
// "purplepiglis": "581888458600087564",
// "jaythahomie": "622876654154416170",
// "taccat": "209102896740958208",
// "clazziks": "177568576474054656",
// "lurgrumm": "428399095682564098",
// "cynicallie": "442781093628739605",
// "bacon122": "565856985505857537",
// "slowsunflower": "298314089690824715",
// "_nelux": "552673580442189825",
// "mountainman19": "421066568118829056",
// "espybrave": "407364681687105541",
// "heatherrrpppppp": "1212220645748776963",
// "theonlyhunt": "305556527576514561",
// "papashuckle": "759622454582312997",
// "tcampvgc": "852649164541263942",
// "trash_panda": "795099064349622272",
// "voltdb": "206268172398100481",
// "biratebyran": "440314042494746639",
// "hayaats_alternate_account": "1240785331209506821"
// }

// const swap = (obj: object) => {
//   var ret = {};
//   for(var key in obj){
//     ret[obj[key]] = key;
//   }
//   return ret;
// }

// const mockUsersById = swap(mockUsers);

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

export  type WeightedPlayer = Eligible & {
    weight: number;
};

const generateWeights = (currentSet: number, eligiblePlayers: Eligible[], history: History[]): WeightedPlayer[] => {
    const weightedArray = eligiblePlayers.map(e => {
        if (!history.some(h => h.opponentid === e.player.id)) {
            return {...e, weight: currentSet};
        }
        const opponentMatches = history.filter(h => h.opponentid === e.player.id).sort((a, b) => Number(b.setname) - Number(a.setname));
        const lastOccuringMatch = Number(opponentMatches[0].setname);
        if(currentSet - lastOccuringMatch === 1){
            return {...e, weight: 1};
        }
        return {...e, weight: (currentSet - lastOccuringMatch)/opponentMatches.length};
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
        const historicMatchRecords = await getAllPlayerMatches(interaction.guildId!);
        const roles = await interaction.guild?.roles.fetch(undefined, {force: true});
        const friendliesRole = roles?.find(r => r.name === "Friendlies");
        if(!friendliesRole){
            // console.log("Please create the necessary role");
            interaction.editReply("Please create the necessary role");
            return;
        }
        else if(!friendliesRole?.members.size || friendliesRole?.members.size < 2) {
            // console.log("Please have more than 2 members");
            interaction.editReply("Please have more than 2 members in the role");
            return;
        }
        const nextWeekNumber = Number(historicMatchRecords.sort((r1, r2) => r1.setname < r2.setname ? -1 : r1.setname > r2.setname ? 1 : 0 )?.pop()?.setname ?? 0) + 1;       
        // console.log("nextWeekNumber:", nextWeekNumber);
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
        // console.log("eligiblePlayers:", eligiblePlayers);
        const nextPairings: {player: string, opponent: string}[] = [];
        console.log("players to pair:", eligiblePlayers.length);
        const pairingMessages: string[] = [];
        let user; 
        do {
            user= eligiblePlayers.pop();
            // console.log("Pairing user", user.player.displayName);
            // console.log("eligiblePlayer.length", eligiblePlayers.length);
            if(nextPairings.some(np => np.player === user.player.id || np.opponent === user.player.id)){ 
                // console.log("already paired this player");                
                continue;
            }
            let weights = generateWeights(nextWeekNumber, eligiblePlayers, user.matches);
            weightedShuffle(weights);
            let pairing = weights.pop();
            // Make sure to pair into someone that hasn't been paired yet.
            while(!nextPairings.some(np => np.player === pairing.player.id || np.opponent === pairing.player.id) && weights.length > 1) {
                let index = weights.indexOf(pairing);
                weights.splice(index, 1);
                weightedShuffle(weights);
                pairing = weights.pop();
            }
            const pairedIndex = eligiblePlayers.findIndex(ep => ep.player.id === pairing.player.id);
            const paired = eligiblePlayers[pairedIndex];
            eligiblePlayers.splice(pairedIndex, 1);
            pairingMessages.push(`<@${user?.player.id}> vs <@${paired.player.id}>`);
            // nextPairings.push({player: user.player.id, opponent: pairing.player});
            // nextPairings.push({player: pairing.player, opponent: user.player.id});
            // pairingMessages.push(`<@${user?.player.displayName}> vs <@${paired.player.displayName}>`);
            nextPairings.push({player: user.player.displayName, opponent: paired.player.displayName});
            nextPairings.push({player: paired.player.displayName, opponent: user.player.displayName});
            
            arrayShuffle(eligiblePlayers);
        } while(eligiblePlayers.length > 1) 
        
        console.log("nextPairing:", nextPairings);
        console.log("players not paired:", eligiblePlayers);
        console.log("messages:", pairingMessages);
        // build message
        interaction.editReply(pairingMessages.join("\n"));

        
    }
}