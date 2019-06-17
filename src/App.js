import React from 'react';
import CardDisplay from './CardDisplay';
import UserInputDisplay from './UserInputDisplay';

class Card {
  constructor(front, back) {
    this.front = front;
    this.back = back;
  }
}

class FlashCardApp extends React.Component {
  constructor(props) {
    super(props);
    this.handleInput = this.handleInput.bind(this);
    this.reportCorrectness = this.reportCorrectness.bind(this);
    this.defaultColor = "#888888"
    let phonetic = ['a', 'i', 'u', 'e', 'o',
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
    let hirgana = ['あ', 'い', 'う', 'え', 'お',
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
    this.cards = hirgana.map((char, i) => new Card(char, phonetic[i]));
    this.state = {
      currentCard: this.cards[Math.floor(this.cards.length * Math.random())],
      showFront: true,
      typed: "",
      textColor: "#000000",
      backgroundColor: this.defaultColor,
      firstTimeTyping: true
    }
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleInput);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleInput);
  }

  handleInput(event) {
    if (this.state.firstTimeTyping)
      this.setState({firstTimeTyping: false});

    let curText = this.state.typed;
    let isLetter = /^\w$/;
    if (event.key === "Backspace") {
      if (curText.length > 0) {
        this.setState({ typed: curText.slice(0, curText.length - 1) })
      }
    } else if (isLetter.test(event.key)) {
      this.setState((state) => state.typed += event.key)
    }
    if (this.state.typingTimer)
      clearTimeout(this.state.typingTimer);
    this.setState({ typingTimer: setTimeout(this.reportCorrectness, 300) });
  }

  reportCorrectness() {
    let answer = this.state.currentCard.back;
    let typed = this.state.typed.toLowerCase();

    // Don't report if the first few characters are correct
    if (typed.length < answer.length) {
      if (typed === answer.slice(0, typed.length))
        return
    }

    if (typed === this.state.currentCard.back) {
      this.setState({ backgroundColor: "#00BB00" });
      this.setState({
        currentCard: this.cards[Math.floor(this.cards.length * Math.random())],
        typed: ""
      })
    } else {
      this.setState({ backgroundColor: "#BB0000" });
    }
    this.setState({typed: ""})
    setTimeout(() => this.setState({ backgroundColor: this.defaultColor }), 500)
    this.setState({ typingTimer: null });
  }

  render() {
    let card = this.state.currentCard;
    let displayData = this.state.showFront ? card.front : card.back;
    let defaultText = this.state.firstTimeTyping ? "type the phonetic translation" : "";
    return (
      <div align="center" style={{ backgroundColor: this.state.backgroundColor, margin: "10px", touchAction:"none" }}>
        <header style={{fontSize: 20}}>
          A Flash Card Mini-Game for Hiragana
        </header>
        <CardDisplay data={displayData}></CardDisplay>
        <UserInputDisplay data={this.state.typed}
          defaultText={defaultText} 
          textColor={this.state.textColor}
          backgroundColor={this.state.backgroundColor}>
          </UserInputDisplay>
      </div>
    )
  };
}

export default FlashCardApp;
