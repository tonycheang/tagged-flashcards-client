import React from 'react';
import { Empty } from 'antd';
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

    hasAnswer(input) {
        return input === this.back;
    }

    startsWith(input) {
        return input === this.back.slice(0, input.length);
    }
}

export class Deck {
    constructor(cards) {
        this.cards = cards || [];
        this.usedInActive = this.cards.map(() => { return false });
        // Check correctness of empty array here
        this.active = [];
        this.uniqueCycleOfCards = [];
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
        card.tags.forEach((tag) => { this.tags[tag] = true })
        this.usedInActive.push(false);
    }

    remove(card) {
        // to do
    }

    rebuildActive(activeTags) {
        // Reset active cards, tags, and usedInActive flags
        this.active = [];
        Object.keys(this.tags).forEach((tag) => { this.tags[tag] = false })
        this.usedInActive = this.cards.map(() => { return false });

        activeTags.forEach((tag) => { this.tags[tag] = true })
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
        this.buildUniqueCycle();
    }

    buildUniqueCycle() {
        // Shallow copy OK since tags do not matter.
        this.uniqueCycleOfCards = this.active.slice();
        // Fisher-Yate's or Durstenfeld shuffle
        for (let i = this.active.length - 1; i > 0 ;i--) {
            let nextPicked = Math.floor(Math.random()*(i+1));
            // Swap into already-chosen region.
            [this.uniqueCycleOfCards[nextPicked], this.uniqueCycleOfCards[i]] = 
                [this.uniqueCycleOfCards[i], this.uniqueCycleOfCards[nextPicked]];
        }
    }

    getNextCard() {
        if (this.active.length === 0) {
            return new Card(<Empty description="No active cards!" image={Empty.PRESENTED_IMAGE_SIMPLE} />);
        }
        
        if (this.uniqueCycleOfCards.length <= 0){
            this.buildUniqueCycle();
        }

        // Can add SRS system here with heap later
        return this.uniqueCycleOfCards.pop();
    }
}

export function buildDefaultDeck(activeTags) {
    function zipAndAppendToDeck(characters, phonetics, tag, deck) {
        let zipped = characters.map((char, i) => new Card(char, phonetics[i], [tag]));
        zipped.forEach((card) => deck.append(card));
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

    const katakanaYoOnPhonetic = ["キャ", "キュ", "キョ",
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
    const katakanaYoOn = ["kya", "kyu", "kyo",
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

    zipAndAppendToDeck(hiraganaSeiOn, hiraganaSeiOnPhonetic, "basic hiragana", defaultDeck);
    zipAndAppendToDeck(hiraganaDakuOn, hiraganaDakuOnPhonetic, "voiced hiragana", defaultDeck);
    zipAndAppendToDeck(hiraganaYoOn, hiraganaYoOnPhoenetic, "contracted hiragana", defaultDeck);
    zipAndAppendToDeck(katakanaSeiOn, katakanaSeiOnPhonetic, "basic katakana", defaultDeck);
    zipAndAppendToDeck(katakanaDakuOn, katakanaDakuOnPhonetic, "voiced katakana", defaultDeck);
    zipAndAppendToDeck(katakanaYoOn, katakanaYoOnPhonetic, "contracted katakana", defaultDeck);
    zipAndAppendToDeck(katakanaForeign, katakanaForeignPhonetic, "foreign katakana", defaultDeck);

    defaultDeck.rebuildActive(activeTags);
    return defaultDeck;
}