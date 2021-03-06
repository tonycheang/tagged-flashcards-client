import React from 'react';
import Highlighter from 'react-highlight-words';
import { Form, Input, Table, Tag } from 'antd';
import { Card, Divider, Button, Icon } from 'antd';
import { message, notification, Popconfirm } from 'antd';
import _ from 'lodash';

import { FlashCard } from "../Deck";
import EditableTagGroup from "../reuse_components/EditableTagGroup";
import ErrorBoundary from '../reuse_components/ErrorBoundary';

const { Search } = Input;

const EditableContext = React.createContext();

class EditableCell extends React.Component {

    renderCell = ({ getFieldDecorator }) => {
        const { editing, dataIndex, title, inputType,
            record, index, children, ...restProps } = this.props;

        let cellToRender;

        if (editing) {
            cellToRender = <Form.Item style={{ margin: 0 }}>
                {getFieldDecorator(dataIndex, { initialValue: record[dataIndex] })(<Input />)}
            </Form.Item>
        } else {
            cellToRender = children;
        }

        return (
            <td {...restProps}>
                {cellToRender}
            </td>
        );
    }

    render() {
        return <EditableContext.Consumer>{this.renderCell}</EditableContext.Consumer>;
    }
}

export class EditableTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            searchInput: "",
            editingKey: "",
            selectedRowKeys: [],
            currentPage: 1,
            refresh: false,
            rowTags: [],
            sortedInfo: null,
            data: this.props.dataSource,
            filters: []
        };

        // Doesn't need to update state and rerender.
        this.selectAllMode = "page-data";
        this.setColumns();
    }

    /* ----- Lifecycle ----- */

    shouldComponentUpdate = (nextProps, nextState) => {
        const { searchInput, filters } = this.state;

        const shared = _.intersection(filters, nextState.filters);
        const filtersChanged = shared.length !== filters.length || shared.length !== nextState.filters.length;
        const searchChanged = searchInput !== nextState.searchInput;
        const noLongerCreatingNewCard = this.state.creatingNewCard === true && nextState.creatingNewCard === false;

        // Don't update on filter change and search input change.
        if (nextProps.deckChanged || searchChanged || filtersChanged || noLongerCreatingNewCard) {
            // Filters from what parent component passes down.
            let newData = this.filterData(nextProps, nextState);
            // Rely on data change to update component.
            this.setState({ data: newData });
            this.props.reportDealtWithChange();
            return false;
        }
        return true;
    }

    filterData = (nextProps, nextState) => {
        // Props will always contain the full list of cards, so pull starting data from that.
        let newData = nextProps.dataSource;

        // Don't filter if empty inputs though.
        if (nextState.searchInput !== "") {
            newData = newData.filter((flashcard) => {
                return flashcard.includes(nextState.searchInput) || flashcard.isNewCard;
            });
        }

        if (nextState.filters.length !== 0) {
            newData = newData.filter((flashcard) => {
                for (let tag of nextState.filters) {
                    if (flashcard.isTagged(tag) || flashcard.isNewCard)
                        return true;
                }
                return false;
            });
        }

        return newData;
    }

    /* ----- Callbacks for Table Component ----- */

    handleTableChange = (pagination, filters, sorter, extra) => {
        if (filters.tags) {
            this.setState({ filters: filters.tags });
        }
        this.setState({ sortedInfo: sorter, currentPage: pagination.current });
    }

    onSelectChange = (selectedRowKeys) => {
        this.setState({ selectedRowKeys });
    }

    onSelectAll = (selected, selectedRows, changeRows) => {
        // Changes keys to pass onto table depending on selectAllMode and user action.
        const { data } = this.state;
        message.destroy();
        if (selected) {
            if (this.selectAllMode === "all-data") {
                this.setState({ selectedRowKeys: data.map((card) => card.key) });
                message.info(`Selected ${data.length} cards across pages.`);
            } else if (this.selectAllMode === "page-data") {
                this.setState({ selectedRowKeys: selectedRows.map((card) => card.key) });
                message.info(`Selected ${selectedRows.length} cards from this page.`);
            } else {
                throw Error("Assertion Error: invalid state for EdtiableTable selectAllMode");
            }
        } else {
            if (this.selectAllMode === "all-data") {
                this.setState({ selectedRowKeys: [] });
                message.info("Deselected all cards.")
            } else if (this.selectAllMode === "page-data") {
                // deselect only the current page, even if selected all in a previous step
                const selectedRowKeys = selectedRows.map((card) => card.key);
                this.setState({ selectedRowKeys });
                if (selectedRowKeys.length > 0) {
                    message.info(`Deselected page. ${selectedRowKeys.length} cards still selected.`)
                } else {
                    message.info(`Deselected all cards.`)
                }
            } else {
                throw Error("Assertion Error: invalid state for EdtiableTable selectAllMode");
            }
        }
    }

    /* ----- Row Operations ----- */

    deleteSelectedRows = () => {
        /* 
        Note: cannot remove tags with 0 cards from the list of filters,
        because antd's Table internally keeps track of filters and won't remove
        even if the passed columns prop changes.
        */
        const { selectedRowKeys } = this.state;
        this.props.deckOps.deleteCards(selectedRowKeys);
        message.destroy();
        message.success(`Deleted ${selectedRowKeys.length} cards!`);
        this.setState({ selectedRowKeys: [] });
    }

    makeNewRow = () => {
        const newCard = new FlashCard("", "");
        // To help keep fields up top even if filters are on.
        // Property goes away after editCard, since it create a new FlashCard.
        newCard.isNewCard = true;
        this.props.deckOps.appendCard(newCard);

        this.setState({
            // Resets sorting and pagination to avoid form not shown.
            sortedInfo: null,
            currentPage: 1,
            // Empties selected keys to avoid selected cards deep in pagination
            selectedRowKeys: [],
            rowTags: [],
            creatingNewCard: true,
            editingKey: newCard.key
            // Does not reset search or filters to go back to search + filters after addition of new card.
        });
    }

    isEditing = (record) => {
        return record.key === this.state.editingKey;
    }

    edit = (key) => {
        // Pull existing tags for editing
        const rowTags = this.props.deckOps.getCardFromKey(key).tags || [];
        this.setState({ editingKey: key, rowTags });
    }

    cancel = () => {
        if (this.state.creatingNewCard) {
            const { editingKey } = this.state;
            this.setState({ creatingNewCard: false });
            this.props.deckOps.deleteCard(editingKey);
        }
        this.setState({ editingKey: '' });
    }

    save = (form, key) => {
        form.validateFields((err, values) => {
            if (err) return;
            message.destroy();

            if (!values.front && !values.back) {
                message.error("Cannot add empty card!");
                return;
            }

            if (!values.front) {
                message.error("Card needs a front!");
                return;
            }

            if (!values.back) {
                message.error("Card needs a back!");
                return;
            }

            values.tags = this.state.rowTags;
            this.props.deckOps.editCard(key, values);

            if (this.state.creatingNewCard)
                message.success("Created card!");
            else
                message.success("Edited card!");

            this.setState({ editingKey: '', creatingNewCard: false, rowTags: [] });
        });
    }

    /* ----- Render Related ----- */

    setColumns = () => {
        const renderHighlighter = (text) => {
            return <Highlighter
                highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                searchWords={[this.state.searchInput]}
                autoEscape
                textToHighlight={text.toString()} />
        }
        this.tagsColumnIndex = 2;
        this.columns = [
            {
                title: "Front",
                dataIndex: "front",
                key: "front",
                width: "10%",
                editable: true,
                sorter: (a, b) => a.front.localeCompare(b.front),
                render: renderHighlighter
            },
            {
                title: "Back",
                dataIndex: "back",
                key: "back",
                width: "10%",
                editable: true,
                sorter: (a, b) => a.back.localeCompare(b.back),
                render: renderHighlighter
            },
            {
                title: "Prompt",
                dataIndex: "prompt",
                key: "prompt",
                width: "10%",
                editable: true,
                render: renderHighlighter
            },
            {
                title: "Tags",
                dataIndex: "tags",
                key: "tags",
                filters: this.props.deckOps
                    .getListOfTags()
                    .map((tag) => { return { text: tag, value: tag } })
                    .sort((textValA, textValB) => textValA.text.localeCompare(textValB.text)),
                render: (text, record, dataIndex) => {
                    const editable = this.isEditing(record);

                    if (editable) {
                        return <EditableTagGroup tags={this.state.rowTags}
                            setTags={(rowTags) => { this.setState({ rowTags }) }} />
                    } else {
                        if (record.tags)
                            return record.tags.map((tag, i) => <Tag key={i}>{tag}</Tag>);
                        else
                            return;
                    }
                }
            },
            {
                title: "Operations",
                dataIndex: "operations",
                key: "operations",
                width: "10%",
                render: (text, record) => {
                    const { editingKey } = this.state;
                    const editable = this.isEditing(record);
                    let operationLink;

                    if (editable) {
                        operationLink = (
                            <span>
                                <EditableContext.Consumer>
                                    {
                                        (form) => {
                                            return <Button size="small" type="link"
                                                onClick={() => { this.save(form, record.key) }}>
                                                Save
                                                </Button>
                                        }
                                    }
                                </EditableContext.Consumer>
                                <Divider type="vertical" />
                                <Popconfirm title="OK to cancel?"
                                    onConfirm={() => { this.cancel(record.key) }}>
                                    <Button size="small" type="link">Cancel</Button>
                                </Popconfirm>
                            </span>
                        )
                    } else {
                        operationLink = (
                            <span>
                                <Button disabled={editingKey !== ''} size="small" type="link"
                                    onClick={() => { this.edit(record.key) }}>
                                    Edit
                                </Button>
                            </span>
                        )
                    }

                    return operationLink;
                }
            }
        ];
    }

    render() {
        const renderTableHeader = () => {
            const handleSearchChange = (event) => {
                const { value } = event.target;
                this.setState({ searchInput: value });
            };

            const { selectedRowKeys } = this.state;
            const { dataSource } = this.props;

            // Reset to default deck button only appears with 0 cards
            let deleteOrResetButton;
            if (dataSource && dataSource.length > 0) {
                const deleteText = `Delete ${selectedRowKeys.length} Selected?`;
                deleteOrResetButton = (
                    <Popconfirm title={deleteText} okType="primary" okText="Delete"
                        onConfirm={this.deleteSelectedRows}
                        disabled={selectedRowKeys.length === 0}>
                        <Button
                            ghost type="danger"
                            disabled={selectedRowKeys.length === 0}>
                            <Icon type="minus" />
                            Delete
                            </Button>
                    </Popconfirm>
                )
            } else {
                deleteOrResetButton = (
                    <Button onClick={this.props.deckOps.resetDeck}>
                        <Icon type="rollback" />
                        Default
                    </Button>
                )
            }

            return (
                <span style={{ display: "inline-flex", width: "100%", justifyContent: "flex-end" }}>
                    <Search placeholder="Search"
                        style={{ marginRight: "1.5%" }}
                        onChange={handleSearchChange} />
                    <div style={{ marginRight: "1.5%" }}>
                        {deleteOrResetButton}
                    </div>
                    <Button ghost type="primary"
                        onClick={this.makeNewRow}
                        disabled={this.state.editingKey !== ''}>
                        <Icon type="plus" />
                        New Card
                    </Button>
                </span>
            );
        }

        let { sortedInfo, selectedRowKeys, data } = this.state;

        const components = { body: { cell: EditableCell } };
        sortedInfo = sortedInfo || {};
        const rowSelection = {
            selectedRowKeys,
            onChange: this.onSelectChange,
            onSelectAll: this.onSelectAll,
            hideDefaultSelections: true,
            selections: [
                {
                    key: 'all-data',
                    text: 'Select-All Mode',
                    onSelect: () => {
                        message.destroy();
                        message.info("Select All Mode Enabled");
                        this.selectAllMode = "all-data";
                    }
                },
                {
                    key: 'page-data',
                    text: 'Select-Page Mode',
                    onSelect: () => {
                        message.destroy();
                        message.info("Select Page Mode Enabled");
                        this.selectAllMode = "page-data";
                    }
                }
            ]
        };

        const columns = this.columns.map((col) => {
            if (!col.editable)
                return col;

            return {
                ...col,
                sortOrder: sortedInfo.columnKey === col.key && sortedInfo.order,
                onCell: (record) => {
                    return {
                        record,
                        dataIndex: col.dataIndex,
                        title: col.title,
                        editing: this.isEditing(record)
                    }
                }
            }
        });

        return <EditableContext.Provider value={this.props.form}>
            <Table components={components}
                onChange={this.handleTableChange}
                rowSelection={rowSelection}
                dataSource={data}
                columns={columns}
                pagination={{ onChange: this.cancel, current: this.state.currentPage }}
                title={renderTableHeader}
                bordered />
        </EditableContext.Provider>
    }
}

export const EditableFormTable = Form.create({ name: "Editable Form Table" })(EditableTable);

class ManageDeckPage extends React.Component {
    // Data lives here to refresh table component upon change
    state = {
        listOfCards: this.props.listOfCards,
        // deckChanged used to determine if EditableFormTable should re-filter.
        // Done here to easily attach to deckOps, if not the most elegant solution.
        // Also allows EditableFormTable to wait for ManageDeckTable to pass the new list of cards.
        deckChanged: false,
        childrenKey: 0
    };

    componentDidMount = () => {
        const { showNotification, reportNotificationShown } = this.props;

        if (showNotification) {
            notification["warning"]({
                message: "You are not logged in.",
                description: "Changes made will only be saved locally. Log in or sign up to make sure changes save to your account.",
                placement: "topRight"
            });
            reportNotificationShown();
        }
    }

    shouldComponentUpdate = (nextProps, nextState) => {
        const wasLoggedIn = this.props.isLoggedIn;
        const isNowLoggedIn = nextProps.isLoggedIn;
        const { childrenKey } = this.state;

        if (!wasLoggedIn && isNowLoggedIn) {
            // Updating childrenKey will rerender the entire component
            // Desireable to ensure EditableFormTable resets completely: filters, cards, and all.
            this.setState({ childrenKey: childrenKey + 1 });
            return false;
        }
        return true;
    }

    static getDerivedStateFromProps(props, state) {
        return { listOfCards: props.listOfCards };
    }

    get deckOps() {
        const refreshListOfCards = (func) => {
            return (...args) => {
                func(...args);
                // Can't use getter through props (evaluates in parent) so must explicitly call this function.
                this.setState({ listOfCards: this.props.deckOps.getListOfCards(), deckChanged: true });
            }
        }

        const appendCard = refreshListOfCards(this.props.deckOps.appendCard);
        const deleteCard = refreshListOfCards(this.props.deckOps.deleteCard);
        const deleteCards = refreshListOfCards(this.props.deckOps.deleteCards);
        const editCard = refreshListOfCards(this.props.deckOps.editCard);
        const resetDeck = refreshListOfCards(this.props.deckOps.resetDeck);

        return {
            ...this.props.deckOps,
            appendCard,
            deleteCard,
            deleteCards,
            editCard,
            resetDeck
        }
    }

    reportDealtWithChange = () => {
        // Flag in state to refresh child component.
        this.setState({ deckChanged: false });
    }

    render() {
        const { childrenKey, listOfCards, deckChanged } = this.state;

        return (
            <ErrorBoundary>
                <Card style={{ margin: "1.5% 5% 2% 5%" }}>
                    <EditableFormTable key={childrenKey}
                        dataSource={listOfCards}
                        reportDealtWithChange={this.reportDealtWithChange}
                        deckChanged={deckChanged}
                        deckOps={this.deckOps} />
                </Card>
            </ErrorBoundary>
        )
    }
}

export default ManageDeckPage;