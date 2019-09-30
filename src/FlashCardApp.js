import React from 'react';
import { Button, Card, Input, Empty, Form } from 'antd';
import ErrorBoundary from './ErrorBoundary';
import './FlashCardApp.css';

const inputFieldStyle = {
  backgroundColor: "transparent",
  fontSize: 20,
  textAlign: "center"
}

class FlashCardApp extends React.Component {
  constructor(props) {
    super(props);

    this.handleInput = this.handleInput.bind(this);
    this.reportCorrectness = this.reportCorrectness.bind(this);
    this.showAnswer = this.showAnswer.bind(this);
    this.resetInputAfterTyping = this.resetInput.bind(this, 500);
    this.resetInputAfterReveal = this.resetInput.bind(this, 0, true);

    this.defaultBackgroundColor = "#FFFFFF";

    this.state = {
      typed: "",
      textColor: "#000000",
      backgroundColor: this.defaultBackgroundColor,
      border: "1px solid",
      firstTimeTyping: true,
      justRevealed: false
    }
  }

  componentDidMount() {
    window.addEventListener("keydown", this.handleRevealButton);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleRevealButton);
  }

  handleRevealButton = (event) => {
    if (event.key === "Enter") {
      if (this.state.justRevealed)
        this.resetInputAfterReveal();
      else
        this.showAnswer();
    }
  }

  handleInput() {
    if (this.state.firstTimeTyping)
      this.setState({ firstTimeTyping: false });

    // Extend the timer to recognize input if it exists, otherwise make one
    if (this.state.typingTimer)
      clearTimeout(this.state.typingTimer);
    this.setState({ typingTimer: setTimeout(this.reportCorrectness, 300) });
  }

  showAnswer() {
    if (this.state.firstTimeTyping)
      this.setState({ firstTimeTyping: false });

    // this.setState({ justRevealed: true, typed: this.props.currentCard.back });
    this.setState({ justRevealed: true });
    this.props.form.setFieldsValue({ typed: this.props.currentCard.back });
  }

  reportCorrectness() {
    /* Flashes red or green on the page depending on input correctness */
    // Don't accept input if card got revealed
    if (this.state.justRevealed || !this.props.currentCard || !this.props.currentCard.back)
      return;


    this.props.form.validateFields((err, vals) => {
      let currentCard = this.props.currentCard;
      let answer = currentCard.back;
      let typed = vals.typed;

      // Don't report if the first few characters are correct
      if (typed.length < answer.length) {
        if (currentCard.answerStartsWith(typed))
          return;
      }

      if (currentCard.hasAnswer(typed)) {
        this.setState({ backgroundColor: "#f6ffed", border: "1px solid #b7eb8f" });
        this.resetInputAfterTyping(true);
      } else {
        this.setState({ backgroundColor: "#fff1f0", border: "1px solid #ffa39e" });
        this.resetInputAfterTyping(false);
      }
    });
  }

  resetInput(delay, nextCard) {
    /* Used to create partial functions via method.bind() for callback */
    if (nextCard) {
      // this.setState({ typed: "" });
      this.props.changeCard();
    }
    setTimeout(() => this.setState({ backgroundColor: this.defaultBackgroundColor, border: "1px solid" }), delay);
    // this.setState({ typed: "", typingTimer: null, justRevealed: false });
    this.setState({ typingTimer: null, justRevealed: false });
    this.props.form.setFieldsValue({ typed: "" });
  }

  render() {
    const { getFieldDecorator } = this.props.form;

    let card = this.props.currentCard;
    if (!card) {
      card = { prompt: <Empty description="No active cards!" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }
    }

    let defaultText = this.state.firstTimeTyping ? "answer here" : "";

    let displayButton;
    if (this.state.justRevealed)
      displayButton = <Button type="default" size="large" onClick={this.resetInputAfterReveal}
        style={{ backgroundColor: "transparent", margin: "2%" }}>continue</Button>;
    else
      displayButton = <Button type="default" size="large" onClick={this.showAnswer}
        style={{ backgroundColor: "transparent", margin: "2%" }}>show</Button>

    return (
      <ErrorBoundary>
        <div align="center">
          <Card className="Card" style={{ backgroundColor: this.state.backgroundColor }}>
            <div style={{ fontSize: 20, margin: ".5%", color: "#bfbfbf" }}>
              {card.prompt}
            </div>
            <div style={{ fontSize: 70, margin: "2%" }}>
              {card.front}
            </div>
            <div align="center" style={{ margin: "2%", width: "80%" }}>
              {
                getFieldDecorator("typed")(
                  <Input autoFocus ghost="true"
                    placeholder={defaultText}
                    style={inputFieldStyle}
                    onChange={this.handleInput} />
                )
              }
            </div>
            <div>{displayButton}</div>
          </Card>
        </div>
      </ErrorBoundary>
    )
  };
}

export default Form.create({ name: "flashcardapp" })(FlashCardApp);
