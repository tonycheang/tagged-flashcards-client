import { Deck, buildDefaultDeck, FlashCard } from './Deck';

/* -----Public Methods----- */

//--Deck--//

it("builds a default deck", () => {
    const defaultDeck = buildDefaultDeck();
    expect(defaultDeck).toBeInstanceOf(Deck);
    expect(defaultDeck.getListOfCards().length).not.toBe(0);
});

it("deserializes a json saved deck properly", () => {
    // JSON comparison used because class methods won't evaluate as equal
    // Relies on toBeInstanceOf to ensure both objects have access to same methods
    const originalDeck = buildDefaultDeck();
    const originalDeckJSON = JSON.stringify(originalDeck);
    const decodedDeck = Deck.buildFromJSON(originalDeckJSON);
    const decodedDeckJSON = JSON.stringify(decodedDeck);

    expect(decodedDeck).toBeInstanceOf(Deck);
    expect(decodedDeckJSON).toBe(originalDeckJSON);
});

describe("deck's rebuildActive method", () => {

    it("rebuilds the active sub-deck with specified tags", () => {
        const deck = buildDefaultDeck();
        deck.rebuildActive(["basic", "hiragana"]);
        const cards = deck.getListOfActiveCards();

        cards.forEach((card) => {
            expect(card.isTagged("basic") || card.isTagged("hiragana")).toBe(true);
        });
    });

    it("rebuilds the active sub-deck with saved tags if not given specified tags", () => {
        const deck = buildDefaultDeck();
        deck.rebuildActive(["basic", "hiragana"]);
        const originalCards = deck.getListOfActiveCards();
        deck.rebuildActive();
        const rebuiltCards = deck.getListOfActiveCards();

        expect(rebuiltCards).toEqual(expect.arrayContaining(originalCards));
    });

    it("rebuilds the active sub-deck without duplicate cards", () => {
        const deck = buildDefaultDeck();
        deck.rebuildActive(["basic", "hiragana"]);
        const cards = deck.getListOfActiveCards();
        const seenCards = {};

        cards.forEach((card) => {
            expect(seenCards.hasOwnProperty(JSON.stringify(card))).toBe(false);
            seenCards[JSON.stringify(card)] = true;
        });
    });

});

describe("decks can", () => {
    // Using a smaller mock deck to check validity of CRUD operations on deck.

    it("append cards", () => {
        const deck = new Deck();
        const cards = [
            new FlashCard("foo", "bar", ["baz"]),
            new FlashCard("water", "juice", ["drinks"]),
            new FlashCard("orange", "apple", ["fruits"]),
            new FlashCard("jackfruit", "tomato", ["fruits"]),
            new FlashCard("dog", "cat", ["animals"]),
            new FlashCard("lion", "bear", ["animals"]),
            new FlashCard("jackalope", "herring", ["animals"])
        ]
        cards.forEach((card) => { deck.appendCard(card) });
        const deckCards = deck.getListOfCards();

        expect(deckCards.length).toBe(cards.length);
        expect(deckCards).toEqual(expect.arrayContaining(cards));
    });

    it("delete cards", () => {
        const deck = new Deck();
        const cards = [
            new FlashCard("foo", "bar", "", ["baz"]),
            new FlashCard("water", "juice", "", ["drinks"]),
            new FlashCard("orange", "apple", "", ["fruits"]),
            new FlashCard("jackfruit", "tomato", "", ["fruits"]),
            new FlashCard("dog", "cat", "", ["animals"]),
            new FlashCard("lion", "bear", "", ["animals"]),
            new FlashCard("jackalope", "herring", "", ["animals"])
        ]
        cards.forEach((card) => { deck.appendCard(card) });

        // Delete all the cards we just added.
        let deckCards = deck.getListOfCards();
        deckCards.forEach((card) => { deck.deleteCard(card.key) });
        deckCards = deck.getListOfCards();

        expect(deckCards.length).toBe(0);
    });

    it("modifies cards", () => {
        const deck = buildDefaultDeck();
        const cards = [
            new FlashCard("foo", "bar", "", ["baz"]),
            new FlashCard("water", "juice", "", ["drinks"]),
            new FlashCard("orange", "apple", "", ["fruits"]),
            new FlashCard("jackfruit", "tomato", "", ["fruits"]),
            new FlashCard("dog", "cat", "", ["animals"]),
            new FlashCard("lion", "bear", "", ["animals"]),
            new FlashCard("jackalope", "herring", "", ["animals"])
        ]
        cards.forEach((card) => { deck.appendCard(card) });

        const key = cards[2].key;
        const editedCardFields = {
            front: "apricot", 
            back: "peach",
            prompt: "guess",
            tags: ["fruits", "pitted"],
            key
        };
        deck.editCard(key, editedCardFields);
        const deckCards = deck.getListOfCards();
        
        expect(deckCards).toContainEqual(editedCardFields);
        expect(deckCards).not.toContainEqual(cards[2]);
    });

    it("append cards after deletion", () => {
        const deck = new Deck();
        const initialCards = [
            new FlashCard("foo", "bar", "", ["baz"]),
            new FlashCard("water", "juice", "", ["drinks"]),
            new FlashCard("orange", "apple", "", ["fruits"]),
            new FlashCard("jackfruit", "tomato", "", ["fruits"]),
        ];
        initialCards.forEach((card) => { deck.appendCard(card) });

        // Delete 0th and 2th card.
        for (let i = 0; i < initialCards.length; i += 2) {
            deck.deleteCard(initialCards[i].key);
        }

        const secondaryCards = [
            new FlashCard("dog", "cat", "", ["animals"]),
            new FlashCard("lion", "bear", "", ["animals"]),
            new FlashCard("jackalope", "herring", "", ["animals"])
        ];
        secondaryCards.forEach((card) => { deck.appendCard(card) });

        const resultantCards = [...secondaryCards, initialCards[1], initialCards[3]];
        const finalCardsFromDeck = deck.getListOfCards();

        expect(finalCardsFromDeck).toEqual(expect.arrayContaining(resultantCards));
    });

});

//--FlashCard--//

// check card.includes
// check answerStartsWith
// check isTagged


/* -----"Private" Methods----- */

//--Deck--//

it("builds a cycle that only contains cards from the active pile", () => {
    const deck = buildDefaultDeck();
    deck.rebuildActive(["basic", "hiragana"]);
    const originalCards = deck.getListOfActiveCards();

    // To avoid directly reading deck, in case implementation changes
    const uniqueCycleOfCards = [];
    for (let i = 0; i < originalCards.length; i++) {
        uniqueCycleOfCards.push(deck.getNextCard());
    }

    expect(uniqueCycleOfCards).toEqual(expect.arrayContaining(originalCards));
});

it("rebuilds a cycle when the current one runs out", () => {
    const deck = buildDefaultDeck();
    deck.rebuildActive(["basic", "hiragana"]);
    const buildUniqueCycleSpy = jest.spyOn(deck, "_buildUniqueCycle");
    const numCards = deck.getListOfActiveCards().length;

    // After the last card has been exhausted...
    for (let i = 0; i < numCards + 1; i++) {
        deck.getNextCard();
    }

    expect(buildUniqueCycleSpy).toHaveBeenCalled();
});

it("removes keys that do not have cards", () => {
    const deck = buildDefaultDeck();
    const tagToRemove = "hiragana";
    const cardsTaggedWithToRemove = deck.getListOfCards().filter((card) => { return card.isTagged(tagToRemove) })
    cardsTaggedWithToRemove.forEach((card) => { deck.deleteCard(card.key) });
    const listOfTagsAfterRemoval = deck.getListOfTags();

    expect(listOfTagsAfterRemoval).not.toContain(tagToRemove);
});

