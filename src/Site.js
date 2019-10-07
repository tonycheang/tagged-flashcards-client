import React from 'react';
import { buildDefaultDeck, Deck } from './Deck';
import { Icon, Menu, Layout, message } from "antd";
import ErrorBoundary from './ErrorBoundary';

import FlashCardApp from './FlashCardApp';
import ManageDeckPage from './ManageDeckPage';
import TransferTagsModal from './TransferTagsModal';
import AuthenticationModal from './AuthenticationModal';
import "./Site.css";

import { dispatchTries } from './Dispatch';

const { Content } = Layout;

class Site extends React.Component {
    constructor(props) {
        super(props);

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
            logout: "logout",
            tags: "tags",
        });

        this.state = {
            deck,
            currentCard: deck.getNextCard(),
            menuOpen: false,
            prevSelected: this.menuKeys.review,
            selected: this.menuKeys.review,
            manageDeckChanged: false,
            isLoggedIn: false
        };

        this.firstVisitMDPWhileNotLoggedIn = true;
    }

    componentDidMount = () => {
        dispatchTries("/auth/refresh-session", "POST", {}, { maxTries: 3 })
            .then(res => console.log(res) )
            .catch(e => console.log("Error in Site.js while attempting to refresh-session:", e))
            .finally(__ => this.setIsLoggedInFromCookies());
    }

    setIsLoggedInFromCookies = () => {
        const previouslyLoggedIn = this.state.isLoggedIn;
        const cookies = document.cookie.split(";");

        let isLoggedInCookie;
        if (cookies) isLoggedInCookie = cookies.filter(cookie => cookie.trim().startsWith("isLoggedIn="))[0];
        
        let isLoggedIn;
        if (isLoggedInCookie) isLoggedIn = isLoggedInCookie.split('=')[1] === "true";

        if (previouslyLoggedIn && !isLoggedIn) {
            message.success("You have been logged out.");
            this.firstVisitMDPWhileNotLoggedIn = true;
        }

        this.setState({ isLoggedIn });
    }

    closeModal = () => {
        this.setState({ selected: this.state.prevSelected });
    }

    selectMenuItem = (event) => {
        const { selected, manageDeckChanged, deck } = this.state;

        if (event.key === this.menuKeys.logout) {
            // Logging out shouldn't set the state.selected or state.prevSelected
            return dispatchTries("/auth/logout", "POST", {}, { maxTries: 3 })
            .then(res => console.log(res))
            .catch(e => console.log("Error in Site.js while attempting to logout:", e))
            .finally(__ => this.setIsLoggedInFromCookies());
        }

        // Navigation away from ManageDeckPage should rebuild the deck to accomodate changes.
        if (selected === this.menuKeys.manage && manageDeckChanged) {
            deck.rebuildActive();
            this.setState({ currentCard: deck.getNextCard(), manageDeckChanged: false });
        }

        this.setState({ selected: event.key, prevSelected: selected });
    }

    changeCard = () => {
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
        const { isLoggedIn, selected } = this.state;
        const menuKeys = this.menuKeys;

        const loginElement = (
            <Menu.Item id={menuKeys.login} key={menuKeys.login} style={{ float: "right" }}>
                <Icon type="login"></Icon>
                Log In
            </Menu.Item>
        );

        const logoutElement = (
            <Menu.Item id={menuKeys.logout} key={menuKeys.logout} style={{ float: "right" }}>
                <Icon type="logout"></Icon>
                Log Out
            </Menu.Item>
        );

        const navBar = <Menu mode="horizontal" style={{ height: "5%" }}
            onClick={this.selectMenuItem}
            selectedKeys={[this.state.selected]}>
            <Menu.Item id={menuKeys.review} key={menuKeys.review}><Icon type="home"></Icon>Review</Menu.Item>
            <Menu.Item id={menuKeys.manage} key={menuKeys.manage}><Icon type="edit"></Icon>Manage Deck</Menu.Item>
            <Menu.Item id={menuKeys.stats} key={menuKeys.stats} disabled><Icon type="line-chart"></Icon>Stats</Menu.Item>

            { isLoggedIn ? logoutElement : loginElement }

            <Menu.Item id={menuKeys.tags} key={menuKeys.tags} style={{ float: "right" }}>
                <Icon type="setting"></Icon>
                Active Tags
            </Menu.Item>
        </Menu>

        let modal;
        switch (selected) {
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
                        setIsLoggedInFromCookies={this.setIsLoggedInFromCookies}
                        visible={this.state.selected === menuKeys.login}>
                    </AuthenticationModal>
                );
                break;
            case menuKeys.manage:
                // Use this.activeMain so the modal persists over the active page.
                this.activeMain = (
                    <ManageDeckPage 
                        visible={this.state.selected === menuKeys.manage}
                        showNotification={!isLoggedIn && this.firstVisitMDPWhileNotLoggedIn }
                        reportNotificationShown={() => this.firstVisitMDPWhileNotLoggedIn = false }
                        listOfCards={this.state.deck.getListOfCards()}
                        deckOps={this.deckOps} />
                );
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