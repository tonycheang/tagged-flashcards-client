import React from 'react';
import { shallow, mount } from 'enzyme';
import Site from './Site';
import { Deck } from './Deck';
import { message } from 'antd';

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
    const mockDeck = new Deck();
    const activeTagsMock = { "mockTag": true, "activeTag": true, "inactiveTag": false };
    const activeTagsArrayMock = Object.entries(activeTagsMock)
                                      .filter(([tag, active]) => { return active })
                                      .map(([tag, active]) => { return tag });

    mockDeck.rebuildActive(activeTagsArrayMock);
    localStorage.setItem("activeTags", JSON.stringify(activeTagsMock));
    localStorage.setItem("savedDeck", JSON.stringify(mockDeck));

    const siteWrap = shallow(<Site />);

    expect(localStorage.getItem).toHaveBeenCalledWith("savedDeck");
    // JSON Stringify only checks properties. We ensure access to same methods via toBeInstanceOf
    expect(siteWrap.state().deck).toBeInstanceOf(Deck);
    expect(JSON.stringify(siteWrap.state().deck)).toEqual(JSON.stringify(mockDeck));
    expect(siteWrap.state().deck.activeTags).toEqual(expect.arrayContaining(activeTagsArrayMock));

    siteWrap.unmount();
});

it("loads default settings if there are no saved settings", () => {
    expect(localStorage.setItem).not.toHaveBeenCalled();
    const siteWrap = shallow(<Site/>);

    expect(siteWrap.state().deck.activeTags).toEqual(expect.arrayContaining(["basic hiragana"]));
});

it("notifies the user about loading default settings", () => {
    spyOn(message, "success");
    expect(localStorage.setItem).not.toHaveBeenCalled();
    const siteWrap = shallow(<Site/>);
    expect(message.success).toHaveBeenCalled();
});

it("changes the active component via the nav bar", () => {
    throw Error("Test not yet implemented.");
});

it("reverts back to the original page after exiting a modal", () => {
    throw Error("Test not yet implemented.");
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

