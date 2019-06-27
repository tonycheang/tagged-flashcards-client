import React from 'react';
import { Table, Modal, Switch, message } from "antd"

class TagsModal extends React.Component {
    constructor(props) {
        super(props);
        this.handleClose = this.handleClose.bind(this);

        // To determine whether changes were made (e.g. two toggles on same toggle is not a change)
        this.tagsStartingStatuses = {}
        this.tagsStatuses = {};

        // Populate values from local storage, if they exist.
        Object.keys(this.props.tags).forEach((tag) => {
            let defaultToggle = window.localStorage.getItem(tag);
            if (defaultToggle) {
                this.tagsStatuses[tag] = (defaultToggle === "true");
                this.tagsStartingStatuses[tag] = (defaultToggle === "true");
            } else {
                this.tagsStatuses[tag] = false;
                this.tagsStartingStatuses[tag] = false;
            }
        });

        this.columns = [
            {
                title: 'Tag',
                dataIndex: 'tag',
                key: 'tag',
            },
            {
                title: 'Active',
                dataIndex: 'active',
                key: 'active',
                render: (_, record) => {
                    let handleSwitches = (checked) => {
                        this.tagsStatuses[record.tag] = checked;
                    }

                    return <Switch defaultChecked={this.tagsStatuses[record.tag]}
                        onChange={handleSwitches}>
                    </Switch>;
                }
            }
        ];
    }

    handleClose() {
        // Determine if anything changed
        let changed = false;
        Object.entries(this.tagsStartingStatuses).forEach(([tag, startingStatus]) => {
            if (this.tagsStatuses[tag] != startingStatus) {
                changed = true;
                // Update the starting status for next deck change
                this.tagsStartingStatuses[tag] = this.tagsStatuses[tag];
            }
        })

        // Rebuild deck with active tags
        if (changed) {
            let activeTags = Object.keys(this.tagsStatuses).filter((tag) => {
                return this.tagsStatuses[tag];
            });
            this.props.deck.rebuildActive(activeTags);

            // Record the changes in local storage
            Object.entries(this.tagsStatuses).forEach(([tag, active]) => {
                window.localStorage.setItem(tag, active);
            })
            message.success("Deck rebuilt!");
        }

        this.props.closeModal();
    }

    render() {
        let dataSource = Object.keys(this.props.tags).map((tag, i) => {
            return { key: i, tag: tag }
        });

        return (
            <Modal title="Active Categories"
                visible={this.props.visible}
                onCancel={this.handleClose}
                onOk={this.handleClose}>
                <Table columns={this.columns} dataSource={dataSource}></Table>
            </Modal>
        );
    }
}

export default TagsModal;