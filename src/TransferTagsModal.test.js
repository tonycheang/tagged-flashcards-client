import React from 'react';
import { shallow, mount } from 'enzyme';
import TransferTagsModal from "./TransferTagsModal";
import { Deck, FlashCard } from './Deck';
import { message } from 'antd';

/*
    Tests omitted (antd's API/domain):
    (1) Filtering on either side via search bar
    (2) Selecting gives back keys
    (3) Move action changes rightColumnKeys

    antd's API essentially just uses parent state to help keep
    track of the keys. Callbacks, rendering, filtering are all 
    handled within the Tranfer component.

    Can later add some snapshot tests once component is finalized.
*/

// Work around for JSDdom issue with jest mocks for localStorage (August '18):
// https://github.com/facebook/jest/issues/6798
const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
const getItemSpy = jest.spyOn(Storage.prototype, "getItem");
const clearSpy = jest.spyOn(Storage.prototype, "clear");

const closeModalMock = jest.fn();
const rebuildActiveMock = jest.fn();
const changeCardMock = jest.fn();

let deck, fakeSettings;

beforeEach(() => {
    localStorage.clear();

    deck = new Deck();
    const cards = [
        new FlashCard("foo", "bar", "", ["baz"]),
        new FlashCard("water", "juice", "", ["drinks"]),
        new FlashCard("orange", "apple", "", ["fruits"]),
        new FlashCard("jackfruit", "tomato", "", ["fruits"]),
        new FlashCard("dog", "cat", "", ["animals"]),
        new FlashCard("lion", "bear", "", ["animals"]),
        new FlashCard("jackalope", "herring", "", ["animals"])
    ];
    cards.forEach((card) => { deck.appendCard(card) });

    fakeSettings = {
        "baz": false,
        "drinks": false,
        "fruits": false,
        "animals": true
    }
    localStorage.setItem("activeTags", JSON.stringify(fakeSettings));

    // This resets all calls for inspection during actual tests
    jest.clearAllMocks();
});

it("renders without crashing", () => {
    const fullMount = mount(
        <TransferTagsModal 
            listOfTags={deck.getListOfTags()}
            closeModal={closeModalMock}
            rebuildActive={rebuildActiveMock} 
            changeCard={changeCardMock}>
        </TransferTagsModal>
    );
    fullMount.unmount();
});

it("loads saved activeTags from local storage", () => {
    expect(localStorage.getItem).not.toHaveBeenCalled();
    const ttModalWrap = shallow(
        <TransferTagsModal 
            listOfTags={deck.getListOfTags()} 
            closeModal={closeModalMock}
            rebuildActive={rebuildActiveMock} 
            changeCard={changeCardMock}>
        </TransferTagsModal>
    );
    expect(localStorage.getItem).toHaveBeenCalledTimes(1);

    const keyedTags = ttModalWrap.state().keyedTags;
    const getTagFromKey = function(key) {
        for (let keyedTag of keyedTags) {
            if (keyedTag.key === key) {
                return keyedTag.tag;
            }
        }
        return void 0;
    }

    // check that the rightColumnKeys loaded are in fakeSettings
    const startingRightColumnKeys = ttModalWrap.instance().startingRightColumnKeys;
    startingRightColumnKeys.forEach((key) => {
        const tag = getTagFromKey(key);
        expect(fakeSettings.hasOwnProperty(tag)).toBe(true);
    });

    ttModalWrap.unmount();
});

it("checks entries for filter input", () => {
    const fakeEntry = { tag: "thisincludesasubstringinthemiddle" };
    const ttModalWrap = shallow(
        <TransferTagsModal 
            listOfTags={deck.getListOfTags()} 
            closeModal={closeModalMock}
            rebuildActive={rebuildActiveMock} 
            changeCard={changeCardMock}>
        </TransferTagsModal>
    );

    let searchResult = ttModalWrap.instance().searchFilter("substring", fakeEntry);
    expect(searchResult).toBe(true);
    searchResult = ttModalWrap.instance().searchFilter("notincluded", fakeEntry);
    expect(searchResult).toBe(false);
});

describe("Closing the modal", () => {
    
    let ttModalWrap, messageSpy;

    beforeEach(() => {
        messageSpy = spyOn(message, "success");
        ttModalWrap = shallow(
            <TransferTagsModal 
                listOfTags={deck.getListOfTags()} 
                closeModal={closeModalMock}
                rebuildActive={rebuildActiveMock} 
                changeCard={changeCardMock}>
            </TransferTagsModal>
        );
    });

    afterEach(() => {
        ttModalWrap.unmount();
    });

    it("calls the passed in closeModal function", () => {
        expect(closeModalMock).not.toHaveBeenCalled();

        ttModalWrap.instance().handleClose();

        expect(closeModalMock).toHaveBeenCalled();
    });

    describe("if settings change", () => {
        beforeEach(() => {
            // select all
            const keyedTags = ttModalWrap.state().keyedTags;
            const nextTargetKeys = keyedTags.map(keyedTag => keyedTag.key);
            ttModalWrap.instance().handleChange(nextTargetKeys);
            expect(ttModalWrap.state().rightColumnKeys).toEqual(expect.arrayContaining(nextTargetKeys));

            // pre-conditions
            expect(localStorage.setItem).not.toHaveBeenCalled();
            expect(messageSpy).not.toHaveBeenCalled();
            expect(rebuildActiveMock).not.toHaveBeenCalled();

            // close the modal
            ttModalWrap.instance().handleClose();
        });

        it("saves to and updates localStorage", () => {
            expect(localStorage.setItem).toHaveBeenCalled();
            expect(localStorage.setItem).toHaveBeenCalledWith("activeTags", expect.any(String));
            const savedSettings = JSON.parse(localStorage.getItem("activeTags"));

            // All should be true because we put all keys as nextTargetKeys
            Object.entries(savedSettings).forEach(([tag, active]) => {
                expect(active).toBe(true);
            });
        });

        it("notifies the user", () => {
            expect(messageSpy).toHaveBeenCalled();
        });

        it("rebuilds the deck", () => {
            expect(rebuildActiveMock).toHaveBeenCalled();
        });
    });

    describe("if settings do not change,", () => {
        beforeEach(() => {
            // pre-conditions
            expect(localStorage.setItem).not.toHaveBeenCalled();
            expect(messageSpy).not.toHaveBeenCalled();
            expect(rebuildActiveMock).not.toHaveBeenCalled();

            // close the modal
            ttModalWrap.instance().handleClose();
        });

        it("does not save to and updates localStorage", () => {
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });

        it("does not notify the user", () => {
            expect(messageSpy).not.toHaveBeenCalled();
        });

        it("does not rebuild the deck", () => {
            expect(rebuildActiveMock).not.toHaveBeenCalled();
        });
    });
});

