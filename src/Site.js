import React from 'react';
import { buildDefaultDeck } from './Deck'
import { Icon, Menu, Button } from "antd"
import FlashCardApp from './FlashCardApp';
import TagsModal from './TagsModal'
import AddCardsDialog from './AddCardsDialog'
import "./Site.css"

class Site extends React.Component {
    constructor(props) {
        super(props);
        this.selectMenuItem = this.selectMenuItem.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.changeCard = this.changeCard.bind(this);

        this.startingActive = [];

        // Load existing values if they're there.
        let savedSettings = JSON.parse(localStorage.getItem("activeTags"));

        if (savedSettings) {
            Object.entries(savedSettings).forEach(([tag, active]) => {
                if (active)
                    this.startingActive.push(tag);
            });
        } else {
            // Otherwise, default to having basic hiragana
            this.startingActive.push("basic hiragana");
            savedSettings = { "basic hiragana": true };
            localStorage.setItem("activeTags", JSON.stringify(savedSettings));
        }

        this.deck = buildDefaultDeck(this.startingActive);

        this.state = {
            currentCard: this.deck.getNextCard(),
            menuOpen: false,
            selected: ""
        };

        this.navBar = (

            <Menu mode="horizontal" style={{ height: "5%" }}
                onClick={this.selectMenuItem}
                selectedKeys={[this.state.selected]}>
                <Menu.Item key="tags"><Icon type="setting"></Icon>Kana Options</Menu.Item>
                <Menu.Item key="add"><Icon type="plus-circle"></Icon>Add Cards</Menu.Item>
                <Menu.Item key="delete" disabled><Icon type="minus-circle"></Icon>Delete Cards</Menu.Item>
                <Menu.Item key="stats" disabled><Icon type="line-chart"></Icon>Stats</Menu.Item>
                <Menu.Item key="login" style={{ float: "right", marginRight: "2%" }} disabled>
                    <Icon type="login"></Icon>
                    Log In
                            </Menu.Item>
            </Menu>


        );
    }

    closeModal() {
        this.setState({ selected: "" });
    }

    selectMenuItem(event) {
        this.setState({ selected: event.key })
    }

    changeCard() {
        this.setState({ currentCard: this.deck.getNextCard() });
    }

    render() {
        let modal;
        switch(this.state.selected) {
            case "tags":
                modal = <TagsModal
                            startingActive={this.startingActive}
                            tags={this.deck.tags}
                            closeModal={this.closeModal}
                            rebuildActive={(activeTags) => { this.deck.rebuildActive(activeTags) }}
                            changeCard={this.changeCard}
                            visible={this.state.selected === "tags"}>
                        </TagsModal>
                break;
            case "add":
                modal = <AddCardsDialog closeModal={this.closeModal}
                            visible={this.state.selected === "add"}
                            deckTags={this.deck.tags}
                            appendCard={this.deck.append}>
                        </AddCardsDialog>
                break;
            default:
                break;
        }

        return (
            <div>
                {this.navBar}
                {modal}
                <div style={{ marginTop: "1%" }}>
                    <header> Flash Cards for Japanese </header>
                </div>
                <FlashCardApp currentCard={this.state.currentCard}
                    changeCard={this.changeCard}
                    answering={this.state.selected == ""}></FlashCardApp>
            </div>
        )
    }
}

export default Site;