import React from 'react';
import { buildDefaultDeck, Deck } from './Deck';
import { Icon, Menu, Layout, message } from "antd";
import ErrorBoundary from './ErrorBoundary';

import FlashCardApp from './FlashCardApp';
import ManageDeckPage from './ManageDeckPage';
import TransferTagsModal from './TransferTagsModal';
import AuthenticationModal from './AuthenticationModal';
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
        if (savedDeckJSON) deck.rebuildActive(startingActive);

        // Enum helps with iterating through testing
        this.menuKeys = Object.freeze({
            review: "review",
            manage: "manage",
            stats: "stats",
            login: "login",
            tags: "tags", 
        });

        this.state = {
            deck,
            currentCard: deck.getNextCard(),
            menuOpen: false,
            prevSelected: this.menuKeys.review,
            selected: this.menuKeys.review,
            manageDeckChanged: false
        };
    }

    closeModal() {
        this.setState({ selected: this.state.prevSelected });
    }

    selectMenuItem(event) {
        // Navigation away from ManageDeckPage should rebuild the deck to accomodate changes.
        if (this.state.selected === this.menuKeys.manage && this.state.manageDeckChanged) {
            this.state.deck.rebuildActive();
            this.setState({ currentCard: this.state.deck.getNextCard(), manageDeckChanged: false });
        }

        this.setState({ selected: event.key, prevSelected: this.state.selected });
    }

    changeCard() {
        this.setState({ currentCard: this.state.deck.getNextCard() });
    }

    get deckOps() {
        const { deck } = this.state;
        const reportAndSaveChanges = (func, toSaveDeck) => {
            return (...args) => {
                func(...args);
                this.setState({ manageDeckChanged: true });
                localStorage.setItem("savedDeck", JSON.stringify(toSaveDeck));
            }
        }

        const appendCard = reportAndSaveChanges(deck.appendCard, deck);
        const editCard = reportAndSaveChanges(deck.editCard, deck);
        const deleteCard = reportAndSaveChanges(deck.deleteCard, deck);
        const deleteCards = reportAndSaveChanges((keys) => { 
            keys.forEach((key) => deck.deleteCard(key));
        }, deck);
        const resetDeck = () => {
            // Not using HoF above since building a default deck rebuilds active anyway.
            // Better for testing.
            const defaultDeck = buildDefaultDeck();
            this.setState({ deck: defaultDeck, currentCard: defaultDeck.getNextCard() });
            message.destroy();
            message.success("Reset to default deck.");
            localStorage.setItem("activeTags", JSON.stringify({ "basic hiragana": true }));
            localStorage.setItem("savedDeck", JSON.stringify(defaultDeck));
        };

        return {
            ...deck.deckOps,
            appendCard,
            editCard,
            deleteCard,
            deleteCards,
            resetDeck
        }
    }

    render() {
        const menuKeys = this.menuKeys;
        const navBar = <Menu mode="horizontal" style={{ height: "5%" }}
                            onClick={this.selectMenuItem}
                            selectedKeys={[this.state.selected]}>
                            <Menu.Item id={menuKeys.review} key={menuKeys.review}><Icon type="home"></Icon>Review</Menu.Item>
                            <Menu.Item id={menuKeys.manage} key={menuKeys.manage}><Icon type="edit"></Icon>Manage Deck</Menu.Item>
                            <Menu.Item id={menuKeys.stats} key={menuKeys.stats} disabled><Icon type="line-chart"></Icon>Stats</Menu.Item>
                            
                            <Menu.Item id={menuKeys.login} key={menuKeys.login} style={ {float: "right"} }>
                                <Icon type="login"></Icon>
                                Log In
                            </Menu.Item>
                            <Menu.Item id={menuKeys.tags} key={menuKeys.tags} style={ {float: "right"} }>
                                <Icon type="setting"></Icon>
                                Active Tags
                            </Menu.Item>
                        </Menu>

        let modal;
        switch (this.state.selected) {
            case menuKeys.tags:
                modal = <TransferTagsModal 
                            listOfTags={this.state.deck.getListOfTags()}
                            closeModal={this.closeModal}
                            rebuildActive={(activeTags) => { this.state.deck.rebuildActive(activeTags) }}
                            changeCard={this.changeCard}
                            visible={this.state.selected === menuKeys.tags}>
                        </TransferTagsModal>
                break;
            case menuKeys.login:
                modal = (
                    <AuthenticationModal 
                        closeModal={this.closeModal}
                        visible={this.state.selected === menuKeys.login}>
                    </AuthenticationModal>
                );
                break;
            case menuKeys.manage:
                // Use this.activeMain so the modal persists over the active page.
                this.activeMain = <ManageDeckPage visible={this.state.selected === menuKeys.manage}
                                    listOfCards={ this.state.deck.getListOfCards() }
                                    deckOps={this.deckOps}/>
                break;
            case menuKeys.review:
                this.activeMain = <div>
                                <div style={{ marginTop: "1%" }}>
                                    <header> Customized Study Session </header>
                                </div>
                                <FlashCardApp currentCard={this.state.currentCard}
                                    changeCard={this.changeCard}
                                    answering={this.state.selected === menuKeys.review}>
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
                    {this.activeMain}
                    </Content>
                </ErrorBoundary>
            </Layout>
        )
    }
}

export default Site;