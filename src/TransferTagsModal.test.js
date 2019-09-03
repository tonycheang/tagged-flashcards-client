import React from 'react';
import { shallow } from 'enzyme';
import TransferTagsModal from "./TransferTagsModal";
import { Deck, FlashCard } from './Deck';

// Work around for JSDdom issue with jest mocks for localStorage (August '18):
// https://github.com/facebook/jest/issues/6798
const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
const getItemSpy = jest.spyOn(Storage.prototype, "getItem");
const clearSpy = jest.spyOn(Storage.prototype, "clear");

let siteWrap, deckOps;

/*

    listOfTags={this.state.deck.getListOfTags()}
    closeModal={this.closeModal}
    rebuildActive={(activeTags) => { this.state.deck.rebuildActive(activeTags) }}
    changeCard={this.changeCard}

*/

beforeEach(() => {
    localStorage.clear();

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
    siteWrap = shallow(<TransferTagsModal />);
    // Ensure we use the fake deck
    siteWrap.setState({ deck, currentCard: deck.getNextCard() });
    deckOps = siteWrap.instance().deckOps;
});

afterEach(() => {
    siteWrap.unmount();
    jest.clearAllMocks();
});

it("renders without crashing", () => {
    throw Error("Test not yet implemented.");
});

it("loads saved settings", () => {
    throw Error("Test not yet implemented.");
});

it("filters tags by search on the left hand side", () => {
    throw Error("Test not yet implemented.");
});

it("filters tags by search on the right hand side", () => {
    throw Error("Test not yet implemented.");
});

describe("closing the modal", () => {
    it("saves to and updates localStorage", () => {
        throw Error("Test not yet implemented.");
    });

    it("notifies the user", () => {
        throw Error("Test not yet implemented.");
    });

    it("rebuilds the deck", () => {
        throw Error("Test not yet implemented.");
    });

    it("closes the modal", () => {
        throw Error("Test not yet implemented.");
    });
});

