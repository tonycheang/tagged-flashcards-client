import React from 'react';
import { shallow, mount } from 'enzyme';
import { Deck, FlashCard, buildDefaultDeck } from './Deck';
import { message } from 'antd';
import ManageDeckPage from './ManageDeckPage';
import { EditableTable } from './ManageDeckPage';
import ExpectationFailed from 'jest-jasmine2/build/ExpectationFailed';

let deck, deckOps, cards;

beforeEach(() => {
    deck = new Deck();
    cards = [
        new FlashCard("foo", "bar", "", ["baz"]),
        new FlashCard("water", "juice", "", ["drinks"]),
        new FlashCard("orange", "apple", "", ["fruits"]),
        new FlashCard("jackfruit", "tomato", "", ["fruits"]),
        new FlashCard("dog", "cat", "", ["animals"]),
        new FlashCard("lion", "bear", "", ["animals"]),
        new FlashCard("jackalope", "herring", "", ["animals"])
    ];
    cards.forEach((card) => { deck.appendCard(card) });

    deckOps = {};
    for (let [name, op] of Object.entries(deck.deckOps)) {
        deckOps[name] = jest.fn(op);
    }
    // These two are added by the site and passed along.
    deckOps["resetDeck"] = jest.fn();
    deckOps["deleteCards"] = jest.fn();
});

afterEach(() => {
    jest.resetAllMocks();
});

it("renders without crashing", () => {
    const mdpWrapper = mount(<ManageDeckPage listOfCards={cards} deckOps={deckOps} />);
    mdpWrapper.unmount();
});

describe("updates state and passes condition to EditableFormTable to deckChanged when", () => {

    let mdpWrapper, mdpDeckOps;

    beforeEach(() => {
        mdpWrapper = shallow(<ManageDeckPage listOfCards={cards} deckOps={deckOps}/>);
        // mdpDeckOps is deckOps after adding side effects the component handles
        mdpDeckOps = mdpWrapper.instance().deckOps;
    });

    afterEach(() => {
        mdpWrapper.unmount();
    });

    function testConditionsFor(action) {
        expect(mdpWrapper.state().deckChanged).toBe(false);
        action();
        expect(mdpWrapper.state().deckChanged).toBe(true);
    }

    it("appending a card", () => {
        testConditionsFor(() => { mdpDeckOps.appendCard(new FlashCard("foo", "bar", "baz", ["tag1"])) });
    });

    it("deleting a card", () => {
        testConditionsFor(() => { mdpDeckOps.deleteCard(1) });
    });

    it("deleting multiple cards", () => {
        testConditionsFor(() => { mdpDeckOps.deleteCards([1, 2]) });
    });

    it("editing a card", () => {
        // Not what actually passed back from forms, but easiest way to fake form return object.
        const values = new FlashCard("foo", "bar", "baz", ["tag1"]);
        testConditionsFor(() => { mdpDeckOps. editCard(1, values) });
    });

    it("resetting the deck", () => {
        testConditionsFor(() => { mdpDeckOps.resetDeck() });
    });
});

describe("editable form table unit tests", () => {

    const reportDealtWithChange = jest.fn();
    let etWrapper;

    beforeEach(() => {
        // must use shallow since we're not using Form.create() but we are using renderCell component
        // which requires getFieldDecorator to be passed to it. Save mount for integration test
        etWrapper = shallow(<EditableTable dataSource={cards} 
            deckChanged={false}
            reportDealtWithChange={reportDealtWithChange} 
            deckOps={deckOps} />
        );
    });

    afterEach(() => {
        etWrapper.unmount();
        jest.clearAllMocks();
    });

    describe("filtering data in ShouldComponentUpdate", () => {

        let setStateSpy, filterDataSpy;

        beforeEach(() => {
            filterDataSpy = jest.spyOn(etWrapper.instance(), "filterData");
            setStateSpy = jest.spyOn(etWrapper, "setState");
        });

        afterEach(() => {
            filterDataSpy.mockClear();
            setStateSpy.mockClear();
        });

        it("updates state's data", () => {
            expect(setStateSpy).not.toHaveBeenCalled();
            etWrapper.setProps({ deckChanged: true });
            // nothing changed; checking that it was called with an object containing the data property
            expect(setStateSpy).toHaveBeenCalledWith(expect.objectContaining({ data: cards }));
        });

        it("keeps only cards that contain search input", () => {
            const searchInput = "jack";
            expect(filterDataSpy).not.toHaveBeenCalled();
            etWrapper.setState({ searchInput });
            expect(filterDataSpy).toHaveBeenCalledTimes(1);
            const cardsContainingJack = cards.filter(card => card.includes(searchInput));
            
            expect(filterDataSpy).toHaveReturnedWith(expect.arrayContaining(cardsContainingJack));
            expect(setStateSpy).toHaveBeenCalledWith(expect.objectContaining({ data: cardsContainingJack }));
        });

        it("takes filters from the table component", () => {
            const pagination = 1;
            const fakeFilters = { tags: ["animals", "baz"] };
            etWrapper.instance().handleTableChange(pagination, fakeFilters);
            
            expect(setStateSpy).toHaveBeenCalledWith(expect.objectContaining({ filters: fakeFilters.tags }));
        });

        it("keeps only cards that contain tags selected from the table component", () => {
            const pagination = 1;
            const fakeFilters = { tags: ["animals", "baz"] };
            etWrapper.instance().handleTableChange(pagination, fakeFilters);
            const cardsTaggedAnimalsOrBaz = cards.filter(card => card.isTagged("animals") || card.isTagged("baz"));
            
            expect(setStateSpy).toHaveBeenCalledWith(expect.objectContaining({ data: cardsTaggedAnimalsOrBaz }));
        });

        it("keeps only cards matching criteria of search input  \
            and tags selected from the table componenet", () => {
                const searchInput = "jack";
                const pagination = 1;
                const fakeFilters = { tags: ["animals", "baz"] };
                etWrapper.instance().handleTableChange(pagination, fakeFilters);
                etWrapper.setState({ searchInput });

                const cardsContaingJackAndTaggedAnimalsOrBaz = 
                    cards.filter((card) => { 
                        return card.includes(searchInput) && 
                            (card.isTagged("animals") || card.isTagged("baz"));
                    });
                expect(setStateSpy).toHaveBeenCalledWith(expect.objectContaining({ data: cardsContaingJackAndTaggedAnimalsOrBaz }));
        });

        it("happens when noLongerCreating new card (action canceled)", () => {
            etWrapper.setState({ creatingNewCard: true });
            setStateSpy.mockClear();
            filterDataSpy.mockClear();
            etWrapper.setState({ creatingNewCard: false });
            // Once above, once in shouldComponentUpdate
            expect(setStateSpy).toHaveBeenCalledTimes(2);
            expect(filterDataSpy).toHaveBeenCalled(); 
        });

        it("happens when deckChanged is true in props", () => {
            etWrapper.setProps({ deckChanged: true });
            expect(setStateSpy).toHaveBeenCalled();
            expect(filterDataSpy).toHaveBeenCalled(); 
        });

        it("reports finished to parent by calling callback", () => {
            expect(reportDealtWithChange).not.toHaveBeenCalled();
            etWrapper.setProps({ deckChanged: true });
            expect(setStateSpy).toHaveBeenCalled();
            expect(filterDataSpy).toHaveBeenCalled(); 
            expect(reportDealtWithChange).toHaveBeenCalled();
        });

    });

    describe("selecting all", () => {
        it("in select-all mode selects all across pages", () => {

        });

        it("in select-page mode selects only the current page", () => {

        });

        it("in select-all mode deselected all across all pages", () => {

        });

        it("in select-page mode deselects only the current page", () => {

        });

        it("reports the number selected", () => {

        });

        it("reports the number deselected or all-deselected", () => {

        });
    });

    describe("delete selected rows", () => {
        it("calls deleteCards with selected keys", () => {

        });

        it("notifies the user of the deletion", () => {

        });

        it("notifies the user of the number deleted", () => {

        });

        it("empties state's selected row keys", () => {

        });
    });

    describe("making a new row", () => {
        it("makes a new card", () => {

        });

        it("flags the card as new", () => {

        });

        it("adds the new card to the deck", () => {

        });

        it("changes the state's creatingNewCard to true", () => {

        });

        it("changes state's editingKey to the newCard's key (puts the table into edit mode)", () => {

        });
    });

    it("editing pulls the list of tags from the editable tag group into state", () => {

    });

    describe("canceling editing", () => {
        it("resets the editing key", () => {

        });

        it("removes the added card if previously adding a new card", () => {

        });

        it("updates state's creatingNewCard to false if previously adding a new card", () => {

        });
    });

    describe("saving edits", () => {
        it("does not add the card when there's no front", () => {

        });

        it("alerts the user when there's no front", () => {

        });

        it("does not add the card when there's no back", () => {

        });

        it("alerts the user when there's no back", () => {

        });

        it("warns the user when there's no prompt", () => {

        });

        it("notifies the user if successfully saved", () => {

        });

        it("sets editingKey to '' afterward", () => {

        });

        it("sets rowTags to an empty array afterward", () => {

        });

        it("sets creatingNewCard to false afterward", () => {

        });
    });
});

describe("integration tests for editable table", () => {

    describe("filtering data in ShouldComponentUpdate", () => {
        it("happens when search bar changes", () => {

        });

        it("happens when selected filters change", () => {

        });
    });
});
