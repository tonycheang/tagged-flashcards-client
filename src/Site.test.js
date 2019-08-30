import React from 'react';
import { shallow, render, mount } from 'enzyme';
import Site from './Site';
import { Deck, FlashCard } from './Deck';
import ManageDeckPage from './ManageDeckPage';
import TransferTagsModal from './TransferTagsModal';
import FlashCardApp from './FlashCardApp'
import { Menu, message } from 'antd';
import { Button } from 'antd/lib/radio';

// Work around for JSDdom issue with jest mocks (August '18):
// https://github.com/facebook/jest/issues/6798
const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
const getItemSpy = jest.spyOn(Storage.prototype, "getItem");
const clearSpy = jest.spyOn(Storage.prototype, "clear");

beforeEach(() => {
    localStorage.clear();
    setItemSpy.mockClear();
    getItemSpy.mockClear();
    clearSpy.mockClear();
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
    throw Error("Test not yet implemented.");
});

describe("deck operations", () => {
    it("change the deck", () => {
        throw Error("Test not yet implemented.");
    });

    it("serialize the deck", () => {
        throw Error("Test not yet implemented.");
    });

    it("rebuild the deck", () => {
        throw Error("Test not yet implemented.");
    });

    it("refresh the active card", () => {
        throw Error("Test not yet implemented.");
    });

    it("resetting the deck notifies the user", () => {
        throw Error("Test not yet implemented.");
    });
});

