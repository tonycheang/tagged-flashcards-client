import React from 'react';
import { buildDefaultDeck, Deck } from './Deck';
import { Icon, Menu, Layout, message } from "antd";
import FlashCardApp from './FlashCardApp';
import TransferTagsModal from './TransferTagsModal';
import ManageDeckPage from './ManageDeckPage';
import ErrorBoundary from './ErrorBoundary';
import "./Site.css";

const { Content } = Layout;

class Site extends React.Component {
    constructor(props) {
        super(props);
        this.selectMenuItem = this.selectMenuItem.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.changeCard = this.changeCard.bind(this);

        const startingActive = [];

        // Load existing values if they're there.
        const savedSettings = JSON.parse(localStorage.getItem("activeTags"));

        if (savedSettings) {
            Object.entries(savedSettings).forEach(([tag, active]) => {
                if (active)
                    startingActive.push(tag);
            });
        } else {
            // Otherwise, default to having basic hiragana
            startingActive.push("basic hiragana");
            localStorage.setItem("activeTags", JSON.stringify({ "basic hiragana": true }));
            message.success("Loaded default settings!");
        }

        const savedDeckJSON = localStorage.getItem("savedDeck");
        const deck = savedDeckJSON ? Deck.buildFromJSON(savedDeckJSON) : buildDefaultDeck();
        // Since we do not serialize deck into savedDeck in TagsModal, we need to pull settings and rebuild.
        deck.rebuildActive(startingActive);

        this.state = {
            deck,
            currentCard: deck.getNextCard(),
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
            this.state.deck.rebuildActive();
            this.setState({ currentCard: this.state.deck.getNextCard() });
            this.manageDeckChanged = false;
        }

        this.setState({ selected: event.key, prevSelected: this.state.selected })
    }

    changeCard() {
        this.setState({ currentCard: this.state.deck.getNextCard() });
    }

    get deckOps() {
        const { deck } = this.state;
        const defaultDeck = buildDefaultDeck();
        const reportAndSaveChanges = (func, toSaveDeck) => {
            return (...args) => {
                func(...args);
                this.manageDeckChanged = true;
                localStorage.setItem("savedDeck", JSON.stringify(toSaveDeck));
            }
        }

        const appendCard = reportAndSaveChanges(deck.appendCard, deck);
        const editCard = reportAndSaveChanges(deck.editCard, deck);
        const deleteCard = reportAndSaveChanges(deck.deleteCard, deck);
        const deleteCards = reportAndSaveChanges((keys) => { 
            keys.forEach((key) => deck.deleteCard(key));
        }, deck);
        const resetDeck = reportAndSaveChanges(() => { 
            this.setState({ deck: defaultDeck });
            message.destroy();
            message.success("Reset to default deck.");
        }, defaultDeck);

        return {
            getListOfTags: deck.getListOfTags,
            getCardFromKey: deck.getCardFromKey,
            getListOfCards: deck.getListOfCards,
            appendCard,
            editCard,
            deleteCard,
            deleteCards,
            resetDeck
        }
    }

    render() {
        const navBar = <Menu mode="horizontal" style={{ height: "5%" }}
                            onClick={this.selectMenuItem}
                            selectedKeys={[this.state.selected]}>
                            <Menu.Item key="review"><Icon type="home"></Icon>Review</Menu.Item>
                            <Menu.Item key="manage"><Icon type="edit"></Icon>Manage Deck</Menu.Item>
                            <Menu.Item key="stats" disabled><Icon type="line-chart"></Icon>Stats</Menu.Item>
                            
                            <Menu.Item key="login" style={ {float: "right"} } disabled>
                                <Icon type="login"></Icon>
                                Log In
                            </Menu.Item>
                            <Menu.Item key="tags" style={ {float: "right"} }>
                                <Icon type="setting"></Icon>
                                Active Tags
                            </Menu.Item>
                        </Menu>

        let modal;
        let activeMain;
        switch (this.state.selected) {
            case "tags":
                modal = <TransferTagsModal 
                            listOfTags={this.state.deck.getListOfTags()}
                            closeModal={this.closeModal}
                            rebuildActive={(activeTags) => { this.state.deck.rebuildActive(activeTags) }}
                            changeCard={this.changeCard}
                            visible={this.state.selected === "tags"}>
                        </TransferTagsModal>
                break;
            case "manage":
                activeMain = <ManageDeckPage visible={this.state.selected === "manage"} 
                                    listOfCards={this.state.deck.getListOfCards()}
                                    deckOps={this.deckOps}/>
                break;
            case "review":
                activeMain = <div>
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
                    <ErrorBoundary>
                    {modal}
                    <Content>
                    {activeMain}
                    </Content>
                </ErrorBoundary>
            </Layout>
        )
    }
}

export default Site;