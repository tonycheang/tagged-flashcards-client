import React from 'react';
import { Form, Input, message, Popconfirm, Table, Tag, Tooltip } from 'antd';
import { Card, Divider, Button, Icon } from 'antd';
import EditableTagGroup from "./EditableTagGroup";
import { FlashCard } from "./Deck";
import Highlighter from 'react-highlight-words';
import ErrorBoundary from './ErrorBoundary';

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
            sortedInfo: null
        };

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
                onFilter: (value, record) => { return record.isTagged(value) || record.isNewCard },
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

    handleTableChange = (pagination, filters, sorter) => {
        this.setState({ sortedInfo: sorter, currentPage: pagination.current });
    }

    onSelectChange = (selectedRowKeys) => {
        this.setState({ selectedRowKeys });
    }

    onSelectAll = (selected, selectedRows, changeRows) => {
        // Say number selected, create banner asking if they want to select ALL.
        console.log(selected, selectedRows, changeRows);
    }

    deleteSelectedRows = () => {
        const { selectedRowKeys } = this.state;
        this.props.deckOps.deleteCards(selectedRowKeys);
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
            // Does not reset search filter to go back to search after addition of new card.
            sortedInfo: null,
            selectedRowKeys: [],
            currentPage: 1,
            rowTags: [],
            creatingNewCard: true,
            editingKey: newCard.key
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
                deleteOrResetButton = (
                    <Popconfirm title="Delete selected?" okType="primary" okText="Delete"
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

        const components = { body: { cell: EditableCell } };
        let { sortedInfo, selectedRowKeys } = this.state;
        sortedInfo = sortedInfo || {};
        const rowSelection = { selectedRowKeys , onChange: this.onSelectChange };

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

        let data = this.props.dataSource;
        if (!this.state.creatingNewCard) {
            data = data.filter((item) => item.includes(this.state.searchInput));
        }

        return <EditableContext.Provider value={this.props.form}>
            <Table components={components}
                onSelectAll={this.onSelectAll}
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
        listOfCards: this.props.listOfCards
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

    render() {
        return (
            <ErrorBoundary>
                <Card style={{margin: "2% 5% 2% 5%"}}>
                    <EditableFormTable dataSource={this.state.listOfCards} deckOps={this.deckOps} />
                </Card>
            </ErrorBoundary>
        )
    }
}

export default ManageDeckPage;