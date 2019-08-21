import React from 'react';
import { Form, Input, message, Popconfirm, Table, Tag } from 'antd';
import { Card, Divider, Button, Icon, Alert } from 'antd';
import EditableTagGroup from "./EditableTagGroup";
import { FlashCard } from "./Deck";
import Highlighter from 'react-highlight-words';
import ErrorBoundary from './ErrorBoundary';
import _ from 'lodash';

const { Search } = Input;

const EditableContext = React.createContext();

class EditableCell extends React.Component {

    renderCell = ({ getFieldDecorator }) => {
        const { editing, dataIndex, title, inputType,
            record, index, children, ...restProps } = this.props;

        let cellToRender;

        if (editing) {
            cellToRender = <Form.Item style={{margin: 0}}>
                                {getFieldDecorator(dataIndex, {initialValue: record[dataIndex]})(<Input/>)}
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

class EditableTable extends React.Component {
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
            startingData: this.props.dataSource,
            filters: [],
            forceFilterUpdate: false
        };

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
        if (nextState.forceFilterUpdate || searchChanged || filtersChanged || noLongerCreatingNewCard) {

            // Filters from what parent component passes down.
            let newData = nextState.startingData;

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

            // Rely on data change to update component.
            this.setState({ data: newData, forceFilterUpdate: false });
            return false;
        }

        return true;
    }

    componentWillReceiveProps = (nextProps) => {
        //this.setState({ selectedKeys: nextProps.selectedKeys });

        this.setState({ 
            data: nextProps.dataSource, 
            startingData: nextProps.dataSource, 
            forceFilterUpdate: true 
        });
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
        if (this.props.onSelectChange)
            this.props.onSelectChange(selectedRowKeys);
    }

    onSelectAll = (selected, selectedRows, changeRows) => {
        // Need to ensure select all doesn't reset all filters
        this.setState({ forceFilterUpdate: true });
        if (this.props.onSelectAll)
            this.props.onSelectAll(selected, selectedRows, changeRows);
    }

    deleteSelectedRows = () => {
        const { selectedRowKeys } = this.state;
        this.props.deckOps.deleteCards(selectedRowKeys);
        message.success(`Deleted ${selectedRowKeys.length} cards!`);
        this.setState({ selectedRowKeys: [] });
    }

    /* ----- Row Opertions ----- */

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

            if (!values.front && !values.back) {
                message.warning("Cannot add empty card!");
                return;
            }

            if (!values.front) {
                message.warning("Card needs a front!");
                return;
            }

            if (!values.back) {
                message.warning("Card needs a back!");
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
                textToHighlight={text.toString()}/>
        }

        this.columns = [
            {
                title: "Front",
                dataIndex: "front",
                key: "front",
                width: "15%",
                editable: true,
                sorter: (a, b) => a.front.localeCompare(b.front),
                render: renderHighlighter
            },
            {
                title: "Back",
                dataIndex: "back",
                key: "back",
                width: "15%",
                editable: true,
                sorter: (a, b) => a.back.localeCompare(b.back),
                render: renderHighlighter
            },
            {
                title: "Tags",
                dataIndex: "tags",
                key: "tags",
                filters: this.props.deckOps.listOfTags.map((tag) => { return {text: tag, value: tag} }),
                //onFilter: (value, record) => { return record.isTagged(value) || record.isNewCard },
                render: (text, record, dataIndex) => {
                    const editable = this.isEditing(record);

                    if (editable) {
                        return <EditableTagGroup tags={this.state.rowTags} 
                                    setTags={ (rowTags) => { this.setState({ rowTags }) } }/>
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
                width: "20%",
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
                                <Divider type="vertical" />
                                <Popconfirm title="Delete this card?" okType="primary" okText="Delete"
                                    onConfirm={() => { this.props.deckOps.deleteCard(record.key); 
                                                        message.success("Deleted card!"); }}>
                                    <Button size="small" type="link">Delete</Button>
                                </Popconfirm>
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

            // reset to default deck button only appears with 0 cards
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
                        <Icon type="rollback"/>
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

        console.log("table rendering");

        let { sortedInfo, selectedRowKeys, data } = this.state;

        const components = { body: { cell: EditableCell } };
        sortedInfo = sortedInfo || {};
        const rowSelection = { 
            selectedRowKeys, 
            onChange: this.onSelectChange,
            onSelectAll: this.onSelectAll
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

const EditableFormTable = Form.create({ name: "Editable Form Table" })(EditableTable);

class ManageDeckPage extends React.Component {
    // Data lives here to refresh table component upon change
    state = {
        listOfCards: this.props.listOfCards,
        selectionBannerState: "off"
    };

    componentWillReceiveProps(nextProps) {
        // When parent component gives a new list of cards, should update to it.
        // This happens when the deck is reset, for example
        const { listOfCards } = nextProps;
        this.setState({ listOfCards });
    }

    get deckOps() {
        const refreshListOfCards = (func) => {
            return (...args) => {
                func(...args);
                // Can't use getter through props (evaluates in parent) so must explicitly call this function.
                this.setState({ listOfCards: this.props.deckOps.getListOfCards() });
            }
        }

        const appendCard = refreshListOfCards(this.props.deckOps.appendCard);
        const deleteCard = refreshListOfCards(this.props.deckOps.deleteCard);
        const deleteCards = refreshListOfCards(this.props.deckOps.deleteCards);
        const editCard = refreshListOfCards(this.props.deckOps.editCard);

        return {
            ...this.props.deckOps,
            appendCard,
            deleteCard,
            deleteCards,
            editCard
        }
    }

    onFilterChange = () => {
        // Need to check for emptied selection? banner should be removed
        // e.g. when creating new card, selectedKeys is emptied. 
        // Can just check in life cycle method for any case where nextState.selectedKeys is an empty array
    }

    onSelectAll = (selected, selectedRows, changeRows) => {
        if (selected) {
            this.changeBannerState("page");
        } else {
            this.changeBannerState("off");
        }
        if (selectedRows)
            this.numSelectedRows = selectedRows.length;
    }

    changeBannerState = (selectionBannerState) => {
        this.setState({ selectionBannerState });
    }

    render() {
        const { selectionBannerState } = this.state;
        const message = `All ${this.numSelectedRows} cards on this page are selected`;
        // Two needed to avoid second banner prematurely closing. Undefined won't show.
        let selectionBannerPage;
        let selectionBannerAll;
        let closeText;
        switch (selectionBannerState) {
            case "page":
                closeText = `Select all ___ cards`; // Need to grab a list of keys
                selectionBannerPage = (
                    <Alert style={{ margin: "2% 5% 2% 5%" }} 
                        message={message} 
                        type="info"
                        closeText={closeText}
                        onClose={() => { this.changeBannerState("all") }} // Also need to actually select all
                        showIcon>
                    </Alert>
                );
                break;
            case "all":
                closeText = "Clear Selection";
                selectionBannerAll = (
                    <Alert style={{ margin: "2% 5% 2% 5%" }} 
                        message={message} 
                        type="info"
                        closeText={closeText}
                        onClose={() => { this.changeBannerState("off") }} // Also needs to actually clear selection
                        showIcon>
                    </Alert>
                );
                break;
            case "off":
                break;
            default:
                throw Error("Assertion failed: selectionBannerState invalid state");
        }

        return (
            <ErrorBoundary>
                {selectionBannerPage}
                {selectionBannerAll}
                <Card style={{margin: "2% 5% 2% 5%"}}>
                    <EditableFormTable dataSource={this.state.listOfCards} 
                        deckOps={this.deckOps}
                        onSelectAll={this.onSelectAll}
                        onFilterChange={this.onFilterChange}/>
                </Card>
            </ErrorBoundary>
        )
    }
}

export default ManageDeckPage;