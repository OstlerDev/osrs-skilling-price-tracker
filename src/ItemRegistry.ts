interface ItemDictionary {
    [key: number]: string;
}

export class ItemRegistry {
    private items: ItemDictionary;

    constructor() {
        this.items = {
            21967: "Ruby Dragon Bolts",
            21944: "Ruby Dragon Bolts (e)",
            564: "Cosmic Rune",
            565: "Blood Rune",
            21969: 'Diamond Dragon Bolts',
            21946: 'Diamond Dragon Bolts (e)',
            563: 'Law Rune'
        };
    }

    getItem(id: number): string | undefined {
        return this.items[id];
    }

    getName(id: number): string {
        return this.items[id] || `Unknown Item (${id})`;
    }

    getShortName(id: number): string {
        return this.items[id] || this.getName(id);
    }
} 