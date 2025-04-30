export const RUNE_NAMES: { [key: number]: string } = {
    564: 'Cosmic Rune',
    565: 'Blood Rune',
    563: 'Law Rune'
};

export const BOLT_CONFIGS = {
    ruby: {
        baseItemId: 21967,      // Ruby Dragon Bolts
        enchantedItemId: 21944, // Ruby Dragon Bolts (e)
        BOLT_BATCH_SIZE: 11000,
        targetMargin: 75,
        runes: [
            { id: 564, price: 130, quantity: 1100 },  // Cosmic Runes
            { id: 565, price: 240, quantity: 1100 }   // Blood Runes
        ]
    },
    diamond: {
        baseItemId: 21969,      // Diamond Dragon Bolts
        enchantedItemId: 21946, // Diamond Dragon Bolts (e)
        BOLT_BATCH_SIZE: 11000,
        targetMargin: 75,
        runes: [
            { id: 564, price: 130, quantity: 1100 },  // Cosmic Runes
            { id: 563, price: 128, quantity: 2200 }   // Law Runes
        ]
    }
} as const;

export const ITEM_NAMES: { [key: number]: string } = {
    21967: "Ruby Dragon Bolts",
    21944: "Ruby Dragon Bolts (e)",
    21969: 'Diamond Dragon Bolts',
    21946: 'Diamond Dragon Bolts (e)',
    564: "Cosmic Rune",
    565: "Blood Rune",
    563: 'Law Rune'
} as const; 