class ItemRegistry {
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

    getItem(id) {
        return this.items[id];
    }

    getName(id) {
        return this.items[id] || `Unknown Item (${id})`;
    }

    getShortName(id) {
        return this.items[id]?.shortName || this.getName(id);
    }
}

module.exports = ItemRegistry; 