export class FlashCard {
    // Can expand to approximate matching later if desired
    constructor(front, back, prompt, tags, key) {
        this.front = front;
        this.back = back;
        this.prompt = prompt || "";
        this.tags = tags || [];
        this.key = key;
    }

    isTagged(check) {
        for (let tag of this.tags) {
            if (tag === check)
                return true;
        }
        return false;
    }

    hasAnswer(input) {
        return input === this.back;
    }

    answerStartsWith(input) {
        return input === this.back.slice(0, input.length);
    }

    includes(substring) {
        return this.front.toLowerCase().includes(substring.toLowerCase()) ||
            this.back.toLowerCase().includes(substring.toLowerCase()) ||
            this.prompt.toLowerCase().includes(substring.toLowerCase());
    }
}

export class Deck {
    constructor() {
        this.appendCard = this.appendCard.bind(this);
        this.deleteCard = this.deleteCard.bind(this);
        this.editCard = this.editCard.bind(this);
        this.getListOfCards = this.getListOfCards.bind(this);
        this.getListOfTags = this.getListOfTags.bind(this);
        this.getCardFromKey = this.getCardFromKey.bind(this);

        this.cards = {};
        this.nextKey = 0;
        this.active = [];
        this.uniqueCycleOfCards = [];
        this.tagCounts = {};
        this.activeTags = [];
    }

    get deckOps() {
        return {
            getListOfTags: this.getListOfTags,
            getCardFromKey: this.getCardFromKey,
            getListOfCards: this.getListOfCards,
            appendCard: this.appendCard,
            editCard: this.editCard,
            deleteCard: this.deleteCard
        }
    }

    getListOfTags() {
        return Object.keys(this.tagCounts).reverse();
    }

    getListOfCards() {
        // Getter would evaluate when passed as a prop, so we use a regular 
        // Reverse to show new cards on top
        return Object.values(this.cards).reverse();
    }

    getListOfActiveCards() {
        return this.active.slice();
    }

    getCardFromKey(key) {
        return this.cards[key];
    }

    appendCard(card) {
        // Next key always increases, despite deletions. Ensures newly added cards to end by default.
        card.key = this.nextKey;
        this.nextKey++;
        this.cards[card.key] = card;
        // Keep count of all tags
        card.tags.forEach((tag) => { this.tagCounts.hasOwnProperty(tag) ? this.tagCounts[tag] += 1 : this.tagCounts[tag] = 1 });
    }

    deleteCard(key) {
        this.cards[key].tags.forEach((tag) => { this.tagCounts[tag] -= 1 });
        this._cleanEmptyTags(key);
        delete this.cards[key];
        // Rebuild Active is responsibility of Site to avoid rebuilding active every operation
    }

    editCard(key, values) {
        this.cards[key].tags.forEach((tag) => { this.tagCounts[tag] -= 1 });
        values.tags.forEach((tag) => { this.tagCounts.hasOwnProperty(tag) ? this.tagCounts[tag] += 1 : this.tagCounts[tag] = 1 });
        this._cleanEmptyTags(key);
        
        this.cards[key] = new FlashCard(values.front, values.back, values.prompt, values.tags, key);
    }

    _cleanEmptyTags(key) {
        this.cards[key].tags.forEach((tag) => {
            if (this.tagCounts[tag] === 0)
                delete this.tagCounts[tag];
        });
    }

    rebuildActive(activeTags) {
        // Reset active cards, tags, and usedInActive flags
        this.activeTags = activeTags || this.activeTags || [];
        this.active = [];
        const usedInActive = {};

        // Add all cards with selected tags
        for (let [key, card] of Object.entries(this.cards)) {
            for (let tag of this.activeTags) {
                // Avoid appending duplicate cards
                if (card.isTagged(tag) && !usedInActive[key]) {
                    this.active.push(card);
                    usedInActive[key] = true;
                }
            }
        }
        this._buildUniqueCycle();
    }

    _buildUniqueCycle() {
        // Shallow copy OK since tags do not matter.
        this.uniqueCycleOfCards = this.active.slice();
        // Fisher-Yate's or Durstenfeld shuffle
        for (let i = this.active.length - 1; i > 0; i--) {
            let nextPicked = Math.floor(Math.random()*(i+1));
            // Swap into already-chosen region.
            [this.uniqueCycleOfCards[nextPicked], this.uniqueCycleOfCards[i]] = 
                [this.uniqueCycleOfCards[i], this.uniqueCycleOfCards[nextPicked]];
        }
    }

    getNextCard() {
        if (this.active.length === 0) {
            return void 0;
        }
        
        if (this.uniqueCycleOfCards.length <= 0) {
            this._buildUniqueCycle();
        }

        // Can add SRS system here with heap later
        return this.uniqueCycleOfCards.pop();
    }

    static buildFromJSON(json) {

        const newDeck = new Deck();
        const parsed = JSON.parse(json);

        // Copy values from JSON to the empty deck.
        Object.keys(parsed).forEach((key) => { newDeck[key] = parsed[key] });

        // Ensures objects get converted to FlashCard objects.
        if (newDeck.cards) {
            const newCardsObj = {};
            Object.entries(newDeck.cards).forEach(([key, obj]) => {
                const { front, back, prompt, tags } = obj;
                newCardsObj[Number(key)] = new FlashCard(front, back, prompt, tags, Number(key));
            });
            newDeck.cards = newCardsObj;
        }

        if (newDeck.uniqueCycleOfCards) {
            newDeck.uniqueCycleOfCards = newDeck.uniqueCycleOfCards.map((obj, i) => {
                const { front, back, prompt, tags, key } = obj;
                return new FlashCard(front, back, prompt, tags, Number(key));
            });
        }

        if (newDeck.active) {
            newDeck.active = newDeck.active.map((obj, i) => {
                const { front, back, prompt, tags, key } = obj;
                return new FlashCard(front, back, prompt, tags, Number(key));
            });
        }

        return newDeck;
    }
}

export function buildDefaultDeck() {
    function zipAndAppendToDeck(characters, phonetics, tags, deck) {
        let zipped = characters.map((char, i) => new FlashCard(char, phonetics[i], "phonetic", tags));
        // Reverse for regular order display in table.
        zipped.reverse().forEach((card) => deck.appendCard(card));
    }

    let defaultDeck = new Deck();

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

    const hiraganaYoOnPhoenetic = ["kya", "kyu", "kyo",
        "sha", "shu", "sho",
        "cha", "chu", "cho",
        "nya", "nyu", "nyo",
        "hya", "hyu", "hyo",
        "mya", "myu", "myo",
        "rya", "ryu", "ryo",
        "gya", "gyu", "gyo",
        "ja", "ju", "jo",
        "bya", "byu", "byo",
        "pya", "pyu", "pyo",

    ];
    const hiraganaYoOn = ["きゃ", "きゅ", "きょ",
        "しゃ", "しゅ", "しょ",
        "ちゃ", "ちゅ", "ちょ",
        "にゃ", "にゅ", "にょ",
        "ひゃ", "ひゅ", "ひょ",
        "みゃ", "みゅ", "みょ",
        "りゃ", "りゅ", "りょ",
        "ぎゃ", "ぎゅ", "ぎょ",
        "じゃ", "じゅ", "じょ",
        "びゃ", "びゅ", "びょ",
        "ぴゃ", "ぴゅ", "ぴょ"
    ];

    const katakanaSeiOnPhonetic = ["a", "i", "u", "e", "o",
        "ka", "ki", "ku", "ke", "ko",
        "sa", "shi", "su", "se", "so",
        "ta", "chi", "tsu", "te", "to",
        "na", "ni", "nu", "ne", "no",
        "ha", "hi", "fu", "he", "ho",
        "ma", "mi", "mu", "me", "mo",
        "ya", "yu", "yo",
        "ra", "ri", "ru", "re", "ro",
        "wa", "wo", "n",
    ];
    const katakanaSeiOn = ["ア", "イ", "ウ", "エ", "オ",
        "カ", "キ", "ク", "ケ", "コ",
        "サ", "シ", "ス", "セ", "ソ",
        "タ", "チ", "ツ", "テ", "ト",
        "ナ", "ニ", "ヌ", "ネ", "ノ",
        "ハ", "ヒ", "フ", "ヘ", "ホ",
        "マ", "ミ", "ム", "メ", "モ",
        "ヤ", "ユ", "ヨ",
        "ラ", "リ", "ル", "レ", "ロ",
        "ワ", "ヲ", "ン"
    ];

    const katakanaDakuOnPhonetic = ["ga", "gi", "gu", "ge", "go",
        "za", "ji", "zu", "ze", "zo",
        "da", "ji", "zu", "de", "do",
        "ba", "bi", "bu", "be", "bo",
        "pa", "pi", "pu", "pe", "po"
    ];
    const katakanaDakuOn = ["ガ", "ギ", "グ", "ゲ", "ゴ",
        "ザ", "ジ", "ズ", "ゼ", "ゾ",
        "ダ", "ヂ", "ヅ", "デ", "ド",
        "バ", "ビ", "ブ", "ベ", "ボ",
        "パ", "ピ", "プ", "ペ", "ポ"
    ];

    const katakanaYoOnPhonetic = ["kya", "kyu", "kyo",
        "sha", "shu", "sho",
        "cha", "chu", "cho",
        "nya", "nyu", "nyo",
        "hya", "hyu", "hyo",
        "mya", "myu", "myo",
        "rya", "ryu", "ryo",
        "gya", "gyu", "gyo",
        "ja", "ju", "jo",
        "bya", "byu", "byo",
        "pya", "pyu", "pyo",
    ];
    const katakanaYoOn = ["キャ", "キュ", "キョ",
        "シャ", "シュ", "ショ",
        "チャ", "チュ", "チョ",
        "ニャ", "ニュ", "ニョ",
        "ヒャ", "ヒュ", "ヒョ",
        "ミャ", "ミュ", "ミョ",
        "リャ", "リュ", "リョ",
        "ギャ", "ギュ", "ギョ",
        "ジャ", "ジュ", "ジョ",
        "ビャ", "ビュ", "ビョ",
        "ピャ", "ピュ", "ピョ"
    ];

    const katakanaForeignPhonetic = ["fa", "fi", "fe", "fo", "fyu",
        "wi", "we", "wo", "va", "vi", "ve", "vo",
        "tsa", "tsi", "tse", "tso",
        "che", "she", "je",
        "ti", "di", "du", "tu"
    ];
    const katakanaForeign = ["ファ", "フィ", "フェ", "フォ", "フュ",
        "ウィ", "ウェ", "ウォ", "ヴァ", "ヴィ", "ヴェ", "ヴォ",
        "ツァ", "ツィ", "ツェ", "ツォ", "チェ", "シェ", "ジェ",
        "ティ", "ディ", "デュ", "トゥ"
    ];

    zipAndAppendToDeck(katakanaForeign, katakanaForeignPhonetic, ["foreign katakana", "foreign", "katakana", "kana"], defaultDeck);
    zipAndAppendToDeck(katakanaYoOn, katakanaYoOnPhonetic, ["contracted katakana", "contracted", "katakana", "kana"], defaultDeck);
    zipAndAppendToDeck(katakanaDakuOn, katakanaDakuOnPhonetic, ["voiced katakana", "voiced", "katakana", "kana"], defaultDeck);
    zipAndAppendToDeck(katakanaSeiOn, katakanaSeiOnPhonetic, ["basic katakana", "basic", "katakana", "kana"], defaultDeck);
    zipAndAppendToDeck(hiraganaYoOn, hiraganaYoOnPhoenetic, ["contracted hiragana", "contracted", "hiragana", "kana"], defaultDeck);
    zipAndAppendToDeck(hiraganaDakuOn, hiraganaDakuOnPhonetic, ["voiced hiragana", "voiced", "hiragana", "kana"], defaultDeck);
    zipAndAppendToDeck(hiraganaSeiOn, hiraganaSeiOnPhonetic, ["basic hiragana", "basic", "hiragana", "kana"], defaultDeck);

    defaultDeck.rebuildActive(["basic hiragana"]);
    return defaultDeck;
}