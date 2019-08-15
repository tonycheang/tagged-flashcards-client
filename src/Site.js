import React from 'react';
import { buildDefaultDeck, Deck } from './Deck'
import { Icon, Menu, Layout, message } from "antd"
import FlashCardApp from './FlashCardApp';
import TagsModal from './TagsModal'
import ManageDeckPage from './ManageDeckPage'
import "./Site.css"

const { Content } = Layout;

class Site extends React.Component {
    constructor(props) {
        super(props);
        this.selectMenuItem = this.selectMenuItem.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.changeCard = this.changeCard.bind(this);

        const startingActive = [];

        // Load existing values if they're there.
        let savedSettings = JSON.parse(localStorage.getItem("activeTags"));

        if (savedSettings) {
            Object.entries(savedSettings).forEach(([tag, active]) => {
                if (active)
                    startingActive.push(tag);
            });
        } else {
            // Otherwise, default to having basic hiragana
            startingActive.push("basic hiragana");
            savedSettings = { "basic hiragana": true };
            localStorage.setItem("activeTags", JSON.stringify(savedSettings));
            message.success("Loaded default settings!");
        }

        let savedDeckJSON = localStorage.getItem("savedDeck");
        this.deck = savedDeckJSON ? Deck.buildFromJSON(savedDeckJSON) : buildDefaultDeck(startingActive);
        // Since we do not serialize deck into savedDeck in TagsModal, we need to pull settings and rebuild.
        this.deck.rebuildActive(startingActive);

        this.state = {
            currentCard: this.deck.getNextCard(),
            menuOpen: false,
            prevSelected: "review",
            selected: "review"
        };
        this.manageDeckChanged = false;
    }

    closeModal() {
        this.setState({ selected: this.state.prevSelected });
    }

    selectMenuItem(event) {
        // Navigation away from ManageDeckPage should rebuild the deck to accomodate changes.
        if (this.state.selected === "manage" && this.manageDeckChanged) {
            this.deck.rebuildActive();
            this.setState({ currentCard: this.deck.getNextCard() });
            this.manageDeckChanged = false;
        }

        this.setState({ selected: event.key, prevSelected: this.state.selected })
    }

    changeCard() {
        this.setState({ currentCard: this.deck.getNextCard() });
    }

    get deckOps() {
        const appendCard = (...args) => {
            this.deck.appendCard(...args);
            this.manageDeckChanged = true;
            localStorage.setItem("savedDeck", JSON.stringify(this.deck));
        };
        const editCard = (...args) => {
            this.deck.editCard(...args);
            this.manageDeckChanged = true;
            localStorage.setItem("savedDeck", JSON.stringify(this.deck));
        };
        const deleteCard = (...args) => {
            this.deck.deleteCard(...args);
            this.manageDeckChanged = true;
            localStorage.setItem("savedDeck", JSON.stringify(this.deck));
        };

        return {
            listOfTags: this.deck.listOfTags,
            getCardFromKey: this.deck.getCardFromKey,
            getListOfCards: this.deck.getListOfCards,
            appendCard,
            editCard,
            deleteCard
        }
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
                            listOfTags={this.deck.listOfTags}
                            closeModal={this.closeModal}
                            rebuildActive={(activeTags) => { this.deck.rebuildActive(activeTags) }}
                            changeCard={this.changeCard}
                            visible={this.state.selected === "tags"}>
                        </TagsModal>
                break;
            case "manage":
                this.activeMain = <ManageDeckPage visible={this.state.selected === "manage"} 
                                    deckOps={this.deckOps}/>
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
            <Layout>
                {navBar}
                {modal}
                <Content>
                {this.activeMain}
                </Content>
            </Layout>
        )
    }
}

export default Site;