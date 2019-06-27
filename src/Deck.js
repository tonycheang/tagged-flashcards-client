class Card {
    // Can expand to approximate matching later if desired
    constructor(front, back, tags) {
        this.front = front;
        this.back = back;
        this.tags = tags || [];
    }

    isTagged(check) {
        for (let tag of this.tags) {
            if (tag === check)
                return true;
        }
        return false;
    }

    appendTag(tag) {
        this.tags.push(tag);
    }

    matchesAnswer(input) {
        return input === this.back;
    }

    matchesBeginning(input) {
        return input === this.back.slice(0, input.length);
    }
}

export class Deck {
    constructor(cards) {
        this.cards = cards || [];
        this.usedInActive = this.cards.map(() => { return false });
        // Check correctness of empty array here
        this.active = [];
        this.tags = {};
        // Deck keeps track of all active (true) and non-active (false) tags
        for (let card of this.cards) {
            for (let tag of card.tags) {
                this.tags[tag] = false;
            }
        }
    }

    combineDeck(other) {
        let allCards = this.cards.concat(other.cards);
        return new Deck(allCards);
    }

    append(card) {
        this.cards.push(card);
        card.tags.forEach((tag) => {this.tags[tag] = true})
        this.usedInActive.push(false);
    }

    remove(card) {
        // to do
    }

    rebuildActive(activeTags) {
        // Reset active cards, tags, and usedInActive flags
        this.active = [];
        Object.keys(this.tags).map((tag)=>{this.tags[tag] = false})
        this.usedInActive = this.cards.map(() => { return false });
        
        activeTags.map((tag)=>{this.tags[tag] = true})
        // Add all cards with selected tags
        for (let cardID in this.cards) {
            let card = this.cards[cardID];
            for (let tag of activeTags) {
                // Avoid appedning duplicate cards
                if (card.isTagged(tag) && !this.usedInActive[cardID]) {
                    this.active.push(this.cards[cardID]);
                    this.usedInActive[cardID] = true;
                }
            }
        }
    }

    getNextCard() {
        if (this.active.length === 0) {
            return new Card("No active cards!");
        }
        // Can add SRS system here with heap later or generate a exhaust a full ordering
        return this.active[Math.floor(this.active.length * Math.random())];
    }
}

export function buildDefaultDeck(activeTags) {
    const hiraganaSeiOnPhonetic = ['a', 'i', 'u', 'e', 'o',
        'ka', 'ki', 'ku', 'ke', 'ko',
        'sa', 'shi', 'su', 'se', 'so',
        'ta', 'chi', 'tsu', 'te', 'to',
        'na', 'ni', 'nu', 'ne', 'no',
        'ha', 'hi', 'fu', 'he', 'ho',
        'ma', 'mi', 'mu', 'me', 'mo',
        'ya', 'yu', 'yo',
        'ra', 'ri', 'ru', 're', 'ro',
        'wa', 'wo', 'n'
    ];
    const hiraganaSeiOn = ['あ', 'い', 'う', 'え', 'お',
        'か', 'き', 'く', 'け', 'こ',
        'さ', 'し', 'す', 'せ', 'そ',
        'た', 'ち', 'つ', 'て', 'と',
        'な', 'に', 'ぬ', 'ね', 'の',
        'は', 'ひ', 'ふ', 'へ', 'ほ',
        'ま', 'み', 'む', 'め', 'も',
        'や', 'ゆ', 'よ',
        'ら', 'り', 'る', 'れ', 'ろ',
        'わ', 'を', 'ん'
    ];
    let basicHiragana = hiraganaSeiOn.map((char, i) => new Card(char, hiraganaSeiOnPhonetic[i], ["basic hiragana"]));

    const hiraganaDakuOnPhonetic = ["ga", "gi", "gu", "ge", "go",
        "za", "ji", "zu", "ze", "zo",
        "da", "ji", "zu", "de", "do",
        "ba", "bi", "bu", "be", "bo",
        "pa", "pi", "pu", "pe", "po",
    ];
    const hiraganaDakuOn = ["が", "ぎ", "ぐ", "げ", "ご",
        "ざ", "じ", "ず", "ぜ", "ぞ",
        "だ", "ぢ", "づ", "で", "ど",
        "ば", "び", "ぶ", "べ", "ぼ",
        "ぱ", "ぴ", "ぷ", "ぺ", "ぽ",
    ];
    let voicedHiragana = hiraganaDakuOn.map((char, i) => new Card(char, hiraganaDakuOnPhonetic[i], ["voiced hiragana"]));

    let defaultDeck = new Deck(basicHiragana);
    voicedHiragana.forEach((card) => { defaultDeck.append(card) });
    defaultDeck.rebuildActive(activeTags);
    return defaultDeck;
}

// const yoOnPhoenetic;
// const yoOn;
// let contractedHiragana;

// const katakanaSeiOnPhonetic;
// const katakanaSeiOn;
// let basicKatakana;

// Insert katakanaDakuOn, katakanaYoOn, katakanaForeign