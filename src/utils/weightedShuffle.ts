import { WeightedPlayer } from "../commands/pairing";

export const weightedShuffle = (arr: WeightedPlayer[]) => {
    for (let i = 0; i < arr.length; i++) {
        const v = weightedIndexChoice(arr.slice(i));
        [arr[i + v], arr[i]] = [arr[i], arr[i + v]];
    }
}

const weightedIndexChoice = (arr: WeightedPlayer[]): number => {
    const totalWeight = arr.map(v => v.weight).reduce((x, y) => x + y);
    const val = Math.random() * totalWeight;
    for (let i = 0, cur = 0; ; i++) {
        cur += arr[i].weight;
        if (val <= cur) return i;
    }
}