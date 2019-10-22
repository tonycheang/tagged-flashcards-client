import React from 'react';
import ReactDOM from 'react-dom';
import { shallow, mount } from 'enzyme';
import FlashCardApp from './FlashCardApp';
import { FlashCard } from './Deck';
import { Button, Input } from 'antd';

// Mock addEventListener for ALL tests
let eventMap = {};
window.addEventListener = jest.fn((event, cb) => { eventMap[event] = cb });

beforeEach(() => {
  eventMap = {};
});

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<FlashCardApp />, div);
  ReactDOM.unmountComponentAtNode(div);
});

it('reads keyboard input when answering', () => {
  jest.spyOn(FlashCardApp.prototype, "handleInput");

  const flashCardApp = shallow(<FlashCardApp answering={true} />);
  eventMap.keydown({ key: "a" });

  expect(window.addEventListener).toHaveBeenCalled();
  expect(FlashCardApp.prototype.handleInput).toHaveBeenCalled();
  expect(flashCardApp.state().typed).toBe("a");
  eventMap.keydown({ key: "b" });
  expect(flashCardApp.state().typed).toBe("ab");

  flashCardApp.unmount();
});

it('does not read keyboard input when not answering', () => {
  const flashCardApp = shallow(<FlashCardApp answering={false} />);
  jest.spyOn(FlashCardApp.prototype, "handleInput");
  eventMap.keydown({ key: "a" });
  eventMap.keydown({ key: "b" });

  expect(FlashCardApp.prototype.handleInput).toHaveBeenCalled();
  expect(flashCardApp.state().typed).toBe("");

  flashCardApp.unmount();
});

it('allows deleting input', () => {
  const flashCardApp = shallow(<FlashCardApp answering={true} />);
  eventMap.keydown({ key: "a" });
  eventMap.keydown({ key: "b" });

  expect(flashCardApp.state().typed).toBe("ab");
  eventMap.keydown({ key: "Backspace" });
  expect(flashCardApp.state().typed).toBe("a");
  eventMap.keydown({ key: "Backspace" });
  expect(flashCardApp.state().typed).toBe("");
  eventMap.keydown({ key: "Backspace" });
  expect(flashCardApp.state().typed).toBe("");

  flashCardApp.unmount();
});

describe("recognizing input", () => {

  let mockCard, mockChangeCard, flashCardApp;

  beforeEach(() => {
    // clearALlTimers is CRITICAL for tests not to interfere with one another.
    jest.clearAllTimers();
    jest.useFakeTimers();

    // mock basic inputs for FlashCardApp
    mockCard = new FlashCard("front", "back", "any", ["tag1", "tag2"]);
    mockChangeCard = jest.fn();
    flashCardApp = shallow(
      <FlashCardApp
        answering={true}
        currentCard={mockCard}
        changeCard={mockChangeCard}>
      </FlashCardApp>
    );
  });

  afterEach(() => {
    flashCardApp.unmount();
  });

  it('changes the current card if correct', () => {
    // Simulate typing "back"
    [..."back"].forEach(char => { eventMap.keydown({ key: char }) });
    expect(flashCardApp.state().typed).toEqual(mockCard.back);
    // Skip forward.
    jest.runOnlyPendingTimers();

    expect(mockChangeCard).toHaveBeenCalled();
  });

  it('resets input if correct', () => {
    const resetInputSpy = jest.spyOn(flashCardApp.instance(), "resetInputAfterTyping");

    [...mockCard.back].forEach(char => { eventMap.keydown({ key: char }) });
    expect(flashCardApp.state().typed).toEqual(mockCard.back);
    jest.runOnlyPendingTimers();

    expect(resetInputSpy).toHaveBeenCalled();
  });

  it('changes background color state if correct', () => {
    const startingBackgroundColor = flashCardApp.state().backgroundColor;

    [...mockCard.back].forEach(char => { eventMap.keydown({ key: char }) });
    jest.runOnlyPendingTimers();

    expect(flashCardApp.state().backgroundColor).not.toBe(startingBackgroundColor);
  });

  it('changes background color state back to standard after correct input', () => {
    const startingBackgroundColor = flashCardApp.state().backgroundColor;

    [...mockCard.back].forEach(char => { eventMap.keydown({ key: char }) });
    jest.runOnlyPendingTimers();

    expect(flashCardApp.state().backgroundColor).not.toBe(startingBackgroundColor);
    jest.runOnlyPendingTimers();

    expect(flashCardApp.state().backgroundColor).toBe(startingBackgroundColor);
  });

  it('changes background color state after incorrect input', () => {
    const startingBackgroundColor = flashCardApp.state().backgroundColor;

    [..."baka"].forEach(char => { eventMap.keydown({ key: char }) });
    jest.runOnlyPendingTimers();

    expect(flashCardApp.state().backgroundColor).not.toBe(startingBackgroundColor);
  });
  
  it('changes background color state back to standard after incorrect input', () => {
    const startingBackgroundColor = flashCardApp.state().backgroundColor;
    
    [..."baka"].forEach(char => { eventMap.keydown({ key: char }) });
    jest.runOnlyPendingTimers();
  
    expect(flashCardApp.state().backgroundColor).not.toBe(startingBackgroundColor);
    jest.runOnlyPendingTimers();
    expect(flashCardApp.state().backgroundColor).toBe(startingBackgroundColor);
  });

  it('does not change background color state if partial correct answer', () => {
    const startingBackgroundColor = flashCardApp.state().backgroundColor;
    
    [...mockCard.back.slice(0, mockCard.back.length-1)].forEach(char => { eventMap.keydown({ key: char }) });
    jest.runOnlyPendingTimers();

    expect(flashCardApp.state().backgroundColor).toBe(startingBackgroundColor);
  });

  it('does not reset input if partial correct answer', () => {
    const resetInputSpy = jest.spyOn(flashCardApp.instance(), "resetInputAfterTyping");

    [...mockCard.back.slice(0, mockCard.back.length-1)].forEach(char => { eventMap.keydown({ key: char }) });

    expect(flashCardApp.state().typed).toEqual("bac");
    jest.runOnlyPendingTimers();
    expect(resetInputSpy).not.toHaveBeenCalled();
    expect(flashCardApp.state().typed).toEqual("bac");
  });
});

describe("revealing the answer", () => {
  let mockCard, mockChangeCard, flashCardApp;

  beforeEach(() => {
    // clearALlTimers is CRITICAL for tests not to interfere with one another.
    jest.clearAllTimers();
    jest.useFakeTimers();

    // mock basic inputs for FlashCardApp
    mockCard = new FlashCard("front", "back", "any", ["tag1", "tag2"]);
    mockChangeCard = jest.fn();
    flashCardApp = mount(
      <FlashCardApp
        answering={true}
        currentCard={mockCard}
        changeCard={mockChangeCard}>
      </FlashCardApp>
    );
  });

  afterEach(() => {
    flashCardApp.unmount();
  });

  it("can be done by clicking on the button", () => {
    flashCardApp.find(Button).simulate('click');
    expect(flashCardApp.state().justRevealed).toBe(true);
  });

  it("can be done by pressing enter", () => {
    eventMap.keydown({ key: "Enter" });
    expect(flashCardApp.state().justRevealed).toBe(true);
  });

  it("changes state.typed to the answer when clicked", () => {
    flashCardApp.find(Button).simulate('click');
    expect(flashCardApp.state().typed).toBe(mockCard.back);
  });

  it("changes state.typed to the answer when using the enter key", () => {
    eventMap.keydown({ key: "Enter" });
    expect(flashCardApp.state().typed).toBe(mockCard.back);
  });

  it("displays the answer in the input field", () => {
    flashCardApp.find(Button).simulate('click');
    const inputText = flashCardApp.find(Input).props().value;
    expect(inputText).toBe(mockCard.back);
  });

  it("does not allow for answer recognition (change card upon backspace and input) afterward", () => {
    const resetInputSpy = jest.spyOn(flashCardApp.instance(), "resetInputAfterTyping");
    flashCardApp.find(Button).simulate('click');

    let inputText = flashCardApp.find(Input).props().value;
    expect(inputText).toBe(mockCard.back);

    [...mockCard.back].forEach((char) => { eventMap.keydown({ key: "Backspace" }) });

    expect(flashCardApp.state().typed).toBe("");
    // Updates needed to 
    flashCardApp.update();
    inputText = flashCardApp.find(Input).props().value;
    expect(inputText).toBe("");

    [...mockCard.back].forEach((char) => { eventMap.keydown({ key: char }) });

    flashCardApp.update();
    inputText = flashCardApp.find(Input).props().value;
    expect(inputText).toBe(mockCard.back);

    jest.runOnlyPendingTimers();
    expect(mockChangeCard).not.toHaveBeenCalled();
    expect(resetInputSpy).not.toHaveBeenCalled();
  });

  it("does not change the background color before changing to a new card", () => {
    const startingBackgroundColor = flashCardApp.state().backgroundColor;
    flashCardApp.find(Button).simulate('click');
    expect(flashCardApp.state().justRevealed).toBe(true);
    expect(flashCardApp.state().backgroundColor).toBe(startingBackgroundColor);
  });

  // i.e. after revealing the answer
  it("allows moving onto the next card upon clicking show", () => {
    flashCardApp.find(Button).simulate('click');
    expect(flashCardApp.state().justRevealed).toBe(true);
    flashCardApp.find(Button).simulate('click');
    expect(flashCardApp.state().justRevealed).toBe(false);
    expect(mockChangeCard).toHaveBeenCalled();
  });

  it("allows moving onto the next card upon pressing enter", () => {
    eventMap.keydown({ key: "Enter" });
    expect(flashCardApp.state().justRevealed).toBe(true);
    eventMap.keydown({ key: "Enter" });
    expect(flashCardApp.state().justRevealed).toBe(false);
    expect(mockChangeCard).toHaveBeenCalled();
  });

  it("clears input after moving onto the next card", () => {
    flashCardApp.setState({ justRevealed: true, typed: "asdfg" });
    eventMap.keydown({ key: "Enter" });
    flashCardApp.update();

    expect(mockChangeCard).toHaveBeenCalled();
    const inputText = flashCardApp.find(Input).props().value;
    expect(inputText).toBe("");
    expect(flashCardApp.state().typed).toBe("");
  });
});