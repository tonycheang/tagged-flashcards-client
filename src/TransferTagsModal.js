import React from 'react';
import { Transfer, Modal, Tag, message } from "antd";
import ErrorBoundary from './ErrorBoundary';
import _ from 'lodash';

class TransferTagsModal extends React.Component {
    constructor(props) {
        super(props);
        const savedSettings = JSON.parse(localStorage.getItem("activeTags"));
        this.tagsStatuses = { ...savedSettings };

        this.tagsToKeys = {};
        this.keysToTags = {};

        // Ultimately draws tags from props. Settings just to populate active/inactive
        this.props.listOfTags.forEach((tag, curKey) => {
            this.tagsToKeys[tag] = curKey;
            this.keysToTags[curKey] = tag;
        });
        
        const keyedTags = this.props.listOfTags.map((tag) => { return {tag, key: this.tagsToKeys[tag]} });

        const rightColumnKeys = Object
                                .entries(this.tagsToKeys)
                                .filter(([tag, _]) => { return savedSettings[tag] })
                                .map(([_, key]) => { return key });

        this.startingRightColumnKeys = rightColumnKeys;

        this.state  = {
            keyedTags,
            rightColumnKeys,
            selectedKeys: [],
        };
    }

    searchFilter = (input, entry) => {
        return entry.tag.toLowerCase().includes(input.toLowerCase());
    }

    handleChange = (nextTargetKeys, direction, moveKeys) => {
        this.setState({ rightColumnKeys: nextTargetKeys });
    }

    handleSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
        this.setState({ selectedKeys: [...sourceSelectedKeys, ...targetSelectedKeys] });
    }

    handleClose = () => {
        const { rightColumnKeys } = this.state;

        // Determine if anything changed
        const shared = _.intersection(rightColumnKeys, this.startingRightColumnKeys);
        if (shared.length !== rightColumnKeys.length || shared.length !== this.startingRightColumnKeys.length) {
            
            // Rebuild deck with active tags
            let activeTags = rightColumnKeys.map((key) => { return this.keysToTags[key]});
            this.props.rebuildActive(activeTags);

            // Record active or not in { tag: active? }
            const tagStatuses = {};
            rightColumnKeys.forEach((key) => tagStatuses[this.keysToTags[key]] = true);
            Object.keys(this.tagsToKeys).forEach((tag) => {
                if (!tagStatuses.hasOwnProperty(tag)) {
                    tagStatuses[tag] = false;
                }
            });

            // Record the changes in local storage via overwrite
            localStorage.setItem("activeTags", JSON.stringify(tagStatuses));

            this.props.changeCard();
            message.success("Deck rebuilt!");
        }

        this.props.closeModal();
    }

    render() {
        const { rightColumnKeys, selectedKeys, keyedTags } = this.state;

        return (
            <ErrorBoundary>
                <Modal title="Active Tags"
                    visible={this.props.visible}
                    onCancel={this.props.closeModal}
                    onOk={this.handleClose}>
                    <div style={{ display: "flex", justifyContent: "center", alignContent: "center" }}>
                        <Transfer listStyle={{ height: 450 }}
                            dataSource={keyedTags}
                            titles={["Inactive", "Active"]}
                            targetKeys={rightColumnKeys}
                            selectedKeys={selectedKeys}
                            onChange={this.handleChange}
                            onSelectChange={this.handleSelectChange}
                            render={(item) => { return <Tag>{item.tag}</Tag> }}
                            filterOption={this.searchFilter}
                            showSearch>
                        </Transfer>
                    </div>
                </Modal>
            </ErrorBoundary>
        );
    }
}

export default TransferTagsModal;