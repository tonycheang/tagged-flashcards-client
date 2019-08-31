import React from 'react';
import { shallow, render, mount } from 'enzyme';
import Site from './Site';
import { Deck, FlashCard, buildDefaultDeck } from './Deck';
import ManageDeckPage from './ManageDeckPage';
import TransferTagsModal from './TransferTagsModal';
import FlashCardApp from './FlashCardApp';
import { Menu, message } from 'antd';

// Work around for JSDdom issue with jest mocks (August '18):
// https://github.com/facebook/jest/issues/6798
const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
const getItemSpy = jest.spyOn(Storage.prototype, "getItem");
const clearSpy = jest.spyOn(Storage.prototype, "clear");

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    jest.clearAllMocks();
});

it("renders without crashing", () => {
    const siteFullRenderWrap = mount(<Site />);
    siteFullRenderWrap.unmount();
});

it("pulls saved deck from local storage", () => {
    localStorage.setItem("savedDeck", JSON.stringify(new Deck()));
    const siteWrap = shallow(<Site />);

    expect(localStorage.getItem).toHaveBeenCalledWith("savedDeck");

    siteWrap.unmount();
});

it("pulls saved active tags from local storage", () => {
    localStorage.setItem("activeTags", JSON.stringify({ "mockTag": true }));
    const siteWrap = shallow(<Site />);

    expect(localStorage.getItem).toHaveBeenCalledWith("activeTags");

    siteWrap.unmount();
});

it("builds the saved deck with active tags pulled from localStorage", () => {
    const fakeDeck = new Deck();
    const activeTagsFake = { "fakeTag": true, "activeTag": true, "inactiveTag": false };
    const activeTagsArrayFake = Object.entries(activeTagsFake)
        .filter(([tag, active]) => { return active })
        .map(([tag, active]) => { return tag });

    fakeDeck.rebuildActive(activeTagsArrayFake);
    localStorage.setItem("activeTags", JSON.stringify(activeTagsFake));
    localStorage.setItem("savedDeck", JSON.stringify(fakeDeck));

    const siteWrap = shallow(<Site />);

    expect(localStorage.getItem).toHaveBeenCalledWith("savedDeck");
    // JSON Stringify only checks properties. We ensure access to same methods via toBeInstanceOf
    expect(siteWrap.state().deck).toBeInstanceOf(Deck);
    expect(JSON.stringify(siteWrap.state().deck)).toEqual(JSON.stringify(fakeDeck));
    expect(siteWrap.state().deck.activeTags).toEqual(expect.arrayContaining(activeTagsArrayFake));

    siteWrap.unmount();
});

it("loads default settings if there are no saved settings", () => {
    expect(localStorage.setItem).not.toHaveBeenCalled();
    const siteWrap = shallow(<Site />);

    expect(siteWrap.state().deck.activeTags).toEqual(expect.arrayContaining(["basic hiragana"]));

    siteWrap.unmount();
});

it("notifies the user about loading default settings", () => {
    spyOn(message, "success");
    expect(localStorage.setItem).not.toHaveBeenCalled();
    const siteWrap = shallow(<Site />);

    expect(message.success).toHaveBeenCalled();

    siteWrap.unmount();
});

describe("using the navbar", () => {

    function currentStateOf(site) {
        // Helper function to balance test clarity and avoiding code duplication.
        return {
            review: site.exists(FlashCardApp),
            manage: site.exists(ManageDeckPage),
            tags: site.exists(TransferTagsModal)
        }
    };

    const startingState = {
        review: true,
        manage: false,
        tags: false
    };

    it("changes the state.selected", () => {
        const siteWrap = shallow(<Site />);
        const menuKeys = siteWrap.instance().menuKeys;

        expect(siteWrap.state().selected).toBe(menuKeys.review);

        Object.values(menuKeys).forEach((key) => {
            siteWrap.find(Menu).simulate('click', { key });
            expect(siteWrap.state().selected).toBe(key);
        });

        siteWrap.unmount();
    });

    it("changes the active component", () => {
        const siteWrap = shallow(<Site />);
        const menuKeys = siteWrap.instance().menuKeys;

        expect(currentStateOf(siteWrap)).toEqual(startingState);

        // Click around the navbar
        siteWrap.find(Menu).simulate('click', { key: menuKeys.manage });
        expect(siteWrap.exists(ManageDeckPage)).toBe(true);

        siteWrap.find(Menu).simulate('click', { key: menuKeys.tags });
        expect(siteWrap.exists(TransferTagsModal)).toBe(true);

        siteWrap.find(Menu).simulate('click', { key: menuKeys.review });
        expect(siteWrap.exists(FlashCardApp)).toBe(true);

        siteWrap.unmount();
    });

    it("keeps the active component in the background when tags modal is selected", () => {
        const siteWrap = shallow(<Site />);
        const menuKeys = siteWrap.instance().menuKeys;

        expect(currentStateOf(siteWrap)).toEqual(startingState);

        // Navigating from Review to Tags
        siteWrap.find(Menu).simulate('click', { key: menuKeys.tags });
        expect(currentStateOf(siteWrap)).toEqual(
            expect.objectContaining(
                {
                    review: true,
                    manage: false,
                    tags: true
                }
            )
        );

        // Navigating from Tags to Manage
        siteWrap.find(Menu).simulate('click', { key: menuKeys.manage });
        expect(currentStateOf(siteWrap)).toEqual(
            expect.objectContaining(
                {
                    review: false,
                    manage: true,
                    tags: false
                }
            )
        );

        // Navigating from Manage to Tags
        siteWrap.find(Menu).simulate('click', { key: menuKeys.tags });
        expect(currentStateOf(siteWrap)).toEqual(
            expect.objectContaining(
                {
                    review: false,
                    manage: true,
                    tags: true
                }
            )
        );

        // Navigating from Tags to Review
        siteWrap.find(Menu).simulate('click', { key: menuKeys.review });
        expect(currentStateOf(siteWrap)).toEqual(
            expect.objectContaining(
                {
                    review: true,
                    manage: false,
                    tags: false
                }
            )
        );

        siteWrap.unmount();
    });

    it("reverts back to the original main page after exiting the tags modal", () => {
        // Differs from above test in that this simulates actual flow of bringing up the Tags Modal
        const siteWrap = mount(<Site />);
        const menuKeys = siteWrap.instance().menuKeys;

        // Starting State: Review
        expect(currentStateOf(siteWrap)).toEqual(startingState);

        // Navigating from Review to bring up Tags
        siteWrap.find(Menu).find("#" + menuKeys.tags).at(0).simulate('click');
        expect(currentStateOf(siteWrap)).toEqual(
            expect.objectContaining(
                {
                    review: true,
                    manage: false,
                    tags: true
                }
            )
        );

        // Navigating out from Tags (expected: to Review)
        siteWrap.find(TransferTagsModal).find("button").at(0).simulate('click');
        expect(currentStateOf(siteWrap)).toEqual(startingState);

        // Navigating from Review to Manage
        siteWrap.find(Menu).find("#" + menuKeys.manage).at(0).simulate('click');
        expect(currentStateOf(siteWrap)).toEqual(
            expect.objectContaining(
                {
                    review: false,
                    manage: true,
                    tags: false
                }
            )
        );

        // Navigating from Manage to bring up Tags
        siteWrap.find(Menu).find("#" + menuKeys.tags).at(0).simulate('click');
        expect(currentStateOf(siteWrap)).toEqual(
            expect.objectContaining(
                {
                    review: false,
                    manage: true,
                    tags: true
                }
            )
        );

        // Navigating out from Tags (expected: to Manage)
        siteWrap.find(TransferTagsModal).find("button").at(0).simulate('click');
        expect(currentStateOf(siteWrap)).toEqual(
            expect.objectContaining(
                {
                    review: false,
                    manage: true,
                    tags: false
                }
            )
        );

        siteWrap.unmount();
    });

});

it("changes the active card upon method call", () => {
    spyOn(Deck.prototype, "getNextCard");
    const siteWrap = shallow(<Site />);
    const startingCard = siteWrap.state().currentCard;
    expect(Deck.prototype.getNextCard).toHaveBeenCalledTimes(1);
    siteWrap.instance().changeCard();
    expect(Deck.prototype.getNextCard).toHaveBeenCalledTimes(2);
    siteWrap.unmount();
});

describe("deck operations", () => {

    let siteWrap, deckOps;

    beforeEach(() => {
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
        siteWrap = shallow(<Site />);
        // Ensure we use the fake deck
        siteWrap.setState({ deck, currentCard: deck.getNextCard() });
        deckOps = siteWrap.instance().deckOps;
    });

    afterEach(() => {
        siteWrap.unmount();
    });

    it("can append a card to the deck", () => {
        const additionalCard = new FlashCard("added", "new", "card", ["tag1", "tag2"])

        deckOps.appendCard(additionalCard);
        const deckContainsAdditionalCard = deckOps.getListOfCards().some((card) => card === additionalCard);

        expect(deckContainsAdditionalCard).toBe(true);
    });

    it("can edit a card in the deck", () => {
        const DECK_KEY = 2;
        const originalCard = deckOps.getCardFromKey(DECK_KEY);
        const fakeValues = { front: "edited", back: "this", prompt: "card", tags: ["tag1", "tag2"] };

        deckOps.editCard(DECK_KEY, fakeValues);

        const card = deckOps.getCardFromKey(DECK_KEY);
        // edited card present
        expect(card).toEqual(expect.objectContaining(fakeValues));

        // old card gone
        deckOps.getListOfCards().forEach((card) => {
            expect(card).not.toEqual(expect.objectContaining(originalCard));
        });
    });

    it("can delete a card from the deck", () => {
        const DECK_KEY = 2;
        const originalCard = deckOps.getCardFromKey(DECK_KEY);

        deckOps.deleteCard(DECK_KEY);

        deckOps.getListOfCards().forEach((card) => {
            expect(card).not.toEqual(expect.objectContaining(originalCard));
        });
    });

    it("can delete multiple cards from the deck", () => {
        const DECK_KEYS = [3, 4, 5];
        const originalCards = DECK_KEYS.map(key => deckOps.getCardFromKey(key));

        deckOps.deleteCards(DECK_KEYS);

        deckOps.getListOfCards().forEach((card) => {
            originalCards.forEach((deletedCard) => {
                expect(card).not.toEqual(expect.objectContaining(deletedCard));
            });
        });
    });

    it("can reset the deck to the default deck", () => {
        const listOfDefaultCards = buildDefaultDeck().getListOfCards();
        expect(siteWrap.state().deck).not.toEqual(expect.arrayContaining(listOfDefaultCards));

        deckOps.resetDeck();

        const listOfCardsAfterReset = siteWrap.state().deck.getListOfCards();
        const currentCard = siteWrap.state().currentCard

        expect(listOfCardsAfterReset).toEqual(expect.arrayContaining(listOfDefaultCards));
        expect(listOfDefaultCards).toContainEqual(expect.objectContaining(currentCard));
    });

    it("resetting the deck notifies the user", () => {
        const messageSpy = spyOn(message, "success");
        expect(messageSpy).not.toHaveBeenCalled();
        deckOps.resetDeck();
        expect(messageSpy).toHaveBeenCalled();
    });

    function expectEachDeckOperationTo(testConditionsFor) {
        // To test pre- and post- conditions of each deck operation.
        // testConditionsFor(action) where action is called
        // is the signature of the function parameter
        it("appended a card", () => {
            const additionalCard = new FlashCard("added", "new", "card", ["tag1", "tag2"]);

            testConditionsFor(() => { deckOps.appendCard(additionalCard) });
        });

        it("edited a card", () => {
            const DECK_KEY = 2;
            const fakeValues = { front: "edited", back: "this", prompt: "card", tags: ["tag1", "tag2"] };

            testConditionsFor(() => { deckOps.editCard(DECK_KEY, fakeValues) });
        });

        it("deleted a card", () => {
            const DECK_KEY = 2;

            testConditionsFor(() => { deckOps.deleteCard(DECK_KEY) });
        });

        it("deleted multiple cards", () => {
            const DECK_KEYS = [3, 4, 5];

            testConditionsFor(() => { deckOps.deleteCards(DECK_KEYS) });
        });

        it("reset the deck", () => {
            testConditionsFor(deckOps.resetDeck);
        });
    }

    describe("rebuild the deck upon having", () => {

        const rebuildActiveSpy = jest.spyOn(Deck.prototype, "rebuildActive");
        let menuKeys;

        beforeEach(() => {
            rebuildActiveSpy.mockClear();
            menuKeys = siteWrap.instance().menuKeys;
            siteWrap.setState({ selected: menuKeys.manage });
        });

        const rebuildDeck = (action) => {
            expect(rebuildActiveSpy).not.toHaveBeenCalled();
            action();
            siteWrap.find(Menu).simulate('click', { key: menuKeys.review });
            expect(rebuildActiveSpy).toHaveBeenCalledTimes(1);
        };

        expectEachDeckOperationTo(rebuildDeck);
    });

    describe("change active card upon having", () => {

        const getNextCardSpy = jest.spyOn(Deck.prototype, "getNextCard");
        let menuKeys;

        beforeEach(() => {
            getNextCardSpy.mockClear();
            menuKeys = siteWrap.instance().menuKeys;
            siteWrap.setState({ selected: menuKeys.manage });
        });

        const changeActiveCard = (action) => {
            // Cleared after constructor so it's buildDefaultDeck call isn't recorded
            expect(getNextCardSpy).not.toHaveBeenCalled();
            action();
            siteWrap.find(Menu).simulate('click', { key: menuKeys.review });
            expect(getNextCardSpy).toHaveBeenCalledTimes(1);
        };

        expectEachDeckOperationTo(changeActiveCard);
    });

    describe("serialize the deck into local storage upon having", () => {

        const saveDeck = (action) => {
            /* Helper method to check serialization of deck. */
            expect(localStorage.setItem).toHaveBeenCalledTimes(1);
            expect(localStorage.setItem).toHaveBeenCalledWith("activeTags", expect.any(String));
            action();
            expect(localStorage.setItem).toHaveBeenCalledWith("savedDeck", expect.any(String));
        }

        expectEachDeckOperationTo(saveDeck);
    });
});

