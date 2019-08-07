import React from 'react';
import { buildDefaultDeck } from './Deck'
import { Icon, Menu, Layout } from "antd"
import FlashCardApp from './FlashCardApp';
import TagsModal from './TagsModal'
import AddCardsDialog from './AddCardsDialog'
import "./Site.css"

const { Header, Content, Footer } = Layout;

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
            prevSelected: "review",
            selected: "review"
        };
    }

    closeModal() {
        this.setState({ selected: this.state.prevSelected });
    }

    selectMenuItem(event) {
        this.setState({ selected: event.key, prevSelected: this.state.selected })
    }

    changeCard() {
        this.setState({ currentCard: this.deck.getNextCard() });
    }

    render() {
        const navBar = <Menu mode="horizontal" style={{ height: "5%" }}
                            onClick={this.selectMenuItem}
                            selectedKeys={[this.state.selected]}>
                            <Menu.Item key="review"><Icon type="home"></Icon>Review</Menu.Item>
                            <Menu.Item key="tags"><Icon type="setting"></Icon>Active Tags</Menu.Item>
                            <Menu.Item key="manage"><Icon type="edit"></Icon>Manage Deck</Menu.Item>
                            <Menu.Item key="stats" disabled><Icon type="line-chart"></Icon>Stats</Menu.Item>
                            <Menu.Item key="login" style={{ float: "right", marginRight: "2%" }} disabled>
                                <Icon type="login"></Icon>
                                Log In
                            </Menu.Item>
                        </Menu>

        let modal;
        switch (this.state.selected) {
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
            case "manage":
                this.activeMain = <AddCardsDialog visible={this.state.selected === "manage"}
                                    allCards={this.deck.cards}
                                    deckTags={this.deck.tags}
                                    appendCard={this.deck.append}>
                                </AddCardsDialog>
                break;
            case "review":
                this.activeMain = <div>
                                    <div style={{ marginTop: "1%" }}>
                                        <header> Flash Cards for Japanese </header>
                                    </div>
                                    <FlashCardApp currentCard={this.state.currentCard}
                                        changeCard={this.changeCard}
                                        answering={this.state.selected === "review"}>
                                    </FlashCardApp>
                                </div>
                break;
            default:
                break;
        }

        return (
            <div>
                {navBar}
                {modal}
                {this.activeMain}
            </div>
        )
    }
}

export default Site;