import React from 'react';
import { buildDefaultDeck } from './Deck'
import { Icon, Menu, Button } from "antd"
import FlashCardApp from './FlashCardApp';
import TagsModal from './TagsModal'
import "./Site.css"

class Site extends React.Component {
    constructor(props) {
        super(props);
        this.openMenu = this.openMenu.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
        this.selectMenuItem = this.selectMenuItem.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.changeCard = this.changeCard.bind(this);

        this.startingActive = [];

        // Load existing values if they're there.
        if (Object.keys(window.localStorage).length === 0) {
            this.startingActive.push("basic hiragana");
        } else {
            Object.keys(window.localStorage).forEach((tag) => {
                console.log(tag)
                let active = window.localStorage.getItem(tag);
                if (active) this.startingActive.push(tag);
            });
        }
        
        this.deck = buildDefaultDeck(this.startingActive);

        this.state = {
            currentCard: this.deck.getNextCard(),
            menuOpen: false,
            selected: ""
        }

        this.navBar = (

            <Menu mode="horizontal" style={{ height: "5%" }}
                onClick={this.selectMenuItem}
                selectedKeys={[this.state.selected]}>
                <Menu.Item key="tags"><Icon type="setting"></Icon>Kana Options</Menu.Item>
                <Menu.Item key="add" disabled><Icon type="plus-circle"></Icon>Add Custom Cards</Menu.Item>
                <Menu.Item key="delete" disabled><Icon type="minus-circle"></Icon>Delete Cards</Menu.Item>
                <Menu.Item key="stats" disabled><Icon type="line-chart"></Icon>Stats</Menu.Item>
                <Menu.Item key="login" style={{ float: "right", marginRight: "2%" }} disabled>
                    <Icon type="login"></Icon>
                    Log In
                            </Menu.Item>
            </Menu>


        );
    }

    openMenu() {
        this.setState({ menuOpen: true });
    }

    closeMenu() {
        this.setState({ menuOpen: false });
    }

    closeModal() {
        this.setState({ selected: "" });
    }

    selectMenuItem(event) {
        this.setState({ selected: event.key })
    }

    changeCard(){
        this.setState({currentCard: this.deck.getNextCard()});
    }

    render() {
        return (
            <div>
                {this.navBar}
                <TagsModal 
                    startingActive={this.startingActive}
                    tags={this.deck.tags}
                    closeModal={this.closeModal}
                    rebuildActive={(activeTags)=>{this.deck.rebuildActive(activeTags)}}
                    changeCard={this.changeCard}
                    visible={this.state.selected === "tags"}>
                </TagsModal>
                <div style={{ marginTop: "1%" }}>
                    <header> Flash Cards for Japanese </header>
                </div>
                <FlashCardApp currentCard={this.state.currentCard} 
                    changeCard={this.changeCard}></FlashCardApp>
            </div>
        )
    }
}

export default Site;