import React from 'react';
import { Table, Modal, Switch, message } from "antd";

import ErrorBoundary from '../reuse_components/ErrorBoundary';

class TagsModal extends React.Component {
    constructor(props) {
        super(props);
        this.handleClose = this.handleClose.bind(this);

        // To determine whether changes were made (e.g. two toggles on same toggle is not a change)
        this.tagsStartingStatuses = {}
        this.tagsStatuses = {};

        let savedSettings = JSON.parse(localStorage.getItem("activeTags"));

        // Populate values from local storage, if they exist.
        this.props.listOfTags.forEach((tag) => {
            let defaultToggle = savedSettings[tag] || false;
            this.tagsStatuses[tag] = defaultToggle;
            this.tagsStartingStatuses[tag] = defaultToggle;
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
            if (this.tagsStatuses[tag] !== startingStatus) {
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
            this.props.rebuildActive(activeTags);

            // Record the changes in local storage via overwrite
            localStorage.setItem("activeTags", JSON.stringify(this.tagsStatuses));

            this.props.changeCard();
            message.success("Deck rebuilt!");
        }

        this.props.closeModal();
    }

    render() {
        // Make for ALL tags.
        let dataSource = this.props.listOfTags.map((tag, i) => {
            return { key: i, tag: tag }
        });

        return (
            <ErrorBoundary>
                <Modal title="Active Categories"
                    visible={this.props.visible}
                    onCancel={this.handleClose}
                    cancelButtonProps={{ disabled: true }}
                    onOk={this.handleClose}>
                    <Table columns={this.columns} dataSource={dataSource}></Table>
                </Modal>
            </ErrorBoundary>
        );
    }
}

export default TagsModal;