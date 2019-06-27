import React from 'react';
import FlashCardApp from './FlashCardApp';
import { buildDefaultDeck } from './Deck'
import { Icon, Menu, Modal, Button, Switch} from "antd"
import "./Site.css"
const { SubMenu } = Menu;

class Site extends React.Component {
    constructor(props) {
        super(props);
        this.openMenu = this.openMenu.bind(this);
        this.closeMenu = this.closeMenu.bind(this);
        this.selectMenuItem = this.selectMenuItem.bind(this);
        this.closeModal = this.closeModal.bind(this);

        this.deck = buildDefaultDeck(["basic hiragana"]);
        this.state = {
            menuOpen: false,
            selected: ""
        }

        this.navBar = (
            
                <Menu mode="horizontal" style={{height: "5%"}} 
                    onClick={this.selectMenuItem}
                    selectedKeys={[this.state.selected]}>
                            <Menu.Item key="tags"><Icon type="setting"></Icon>Kana Options</Menu.Item>
                            <Menu.Item key="add" disabled><Icon type="plus-circle"></Icon>Add Custom Cards</Menu.Item>
                            <Menu.Item key="delete" disabled><Icon type="minus-circle"></Icon>Delete Cards</Menu.Item>
                            <Menu.Item key="stats" disabled><Icon type="line-chart"></Icon>Stats</Menu.Item>
                            <Menu.Item key="login" style={{float: "right", marginRight: "2%"}} disabled>
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
        this.setState({selected: ""});
    }

    selectMenuItem(event) {
        this.setState({selected: event.key})
    }

    rebuildDeck(activeTags){
        this.deck.rebuildActive(activeTags);
    }

    render() {
        return (
            <div>
                {this.navBar}
                <Modal title="Tags" visible={this.state.selected === "tags"}
                    onCancel={this.closeModal} onOk={this.closeModal}>
                    <table>
                    {
                        Object.keys(this.deck.tags).map((tag) => {
                            console.log(tag);
                            return (
                                <tr>
                                    <td>{tag}</td>
                                    <td><Switch></Switch></td>
                                </tr>
                            );
                        })
                    }
                    </table>
                </Modal>
                <div style={{ marginTop: "1%" }}>
                    <header>
                        Flash Cards for Japanese
                    </header>
                </div>
                <FlashCardApp deck={this.deck}></FlashCardApp>
            </div>
        )
    }
}

export default Site;