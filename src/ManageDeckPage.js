import React from 'react';
import { Form, Input, message, Popconfirm, Table, Tag } from 'antd';
import { Card, Divider, Button, Icon } from 'antd'
import EditableTagGroup from "./EditableTagGroup"
import { FlashCard } from "./Deck"

const EditableContext = React.createContext();

class EditableCell extends React.Component {
    constructor(props) {
        super(props);
        this.renderCell = this.renderCell.bind(this);
    }

    renderCell({ getFieldDecorator }) {
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
        this.renderTableHeader = this.renderTableHeader.bind(this);
        this.isEditing = this.isEditing.bind(this);
        this.edit = this.edit.bind(this);
        this.cancel = this.cancel.bind(this);
        this.save = this.save.bind(this);

        this.state = {
            editingKey: '',
            refresh: false
        };

        this.columns = [
            {
                title: "Front",
                dataIndex: "front",
                width: "15%",
                editable: true
            },
            {
                title: "Back",
                dataIndex: "back",
                width: "15%",
                editable: true
            },
            {
                title: "Tags",
                dataIndex: "tags",
                width: "40%",
                render: (text, record, dataIndex) => {
                    const editable = this.isEditing(record);

                    if (editable) {
                        return <EditableTagGroup tags={record.tags} setTags={record.setTags}/>
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
                                    onConfirm={() => { this.props.deleteCard(record.key) }}>
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

    makeNewRow = () => {
        const { dataSource } = this.props;
        const newCard = new FlashCard("", "");
        this.props.appendCard(newCard, true);

        this.setState({
            creatingNewCard: true,
            editingKey: newCard.key
        });

        this.props.setData([newCard, ...dataSource]);
    }

    renderTableHeader(){
        return (
            <span style={{ display: "inline-flex", width: "100%", justifyContent: "flex-end"}}>
                <Button onClick={this.makeNewRow} disabled={this.state.editingKey !== ''}>
                    <Icon type="plus"/>
                    New Card
                </Button>
            </span>
        );
    }

    isEditing(record) {
        return record.key === this.state.editingKey;
    }

    edit(key) {
        this.setState({ editingKey: key });
    }

    cancel() {
        if (this.state.creatingNewCard) {
            const { editingKey } = this.state;
            this.setState({ creatingNewCard: false });
            this.props.deleteCard(editingKey, true);
        }
        this.setState({ editingKey: '' });
    }

    save(form, key) {
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

            this.props.editCard(key, values, this.state.creatingNewCard);

            if (this.state.creatingNewCard)
                message.success("Created card!");
            else
                message.success("Edited card!");

            this.setState({ editingKey: '', creatingNewCard: false });
        });
    }

    render() {
        const components = { body: { cell: EditableCell } };
        const columns = this.columns.map((col) => {
            if (!col.editable)
                return col;

            return {
                ...col,
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
                dataSource={this.props.dataSource}
                columns={columns}
                pagination={{ onChange: this.cancel }} 
                title={this.renderTableHeader}
                bordered
                />
        </EditableContext.Provider>
    }
}

const EditableFormTable = Form.create({ name: "Editable Form Table" })(EditableTable);

class ManageDeckPage extends React.Component {
    // Data lives here to refresh table component upon change
    state = {
        listOfCards: this.props.getListOfCards()
    };

    appendCard = (newCard) => {
        this.props.appendCard(newCard);
        this.setState({ listOfCards: this.props.getListOfCards() });
    }

    deleteCard = (key) => {
        this.props.deleteCard(key);
        // Can't use getter through props (evaluates in parent) so must explicitly call this function.
        this.setState({ listOfCards: this.props.getListOfCards() });
        message.success("Deleted card!")
    };

    editCard = (key, values) => {
        this.props.editCard(key, values);
        this.setState({ listOfCards: this.props.getListOfCards() });
    }

    render() {
        // Don't necessarily always want to set data and refresh upon cancel. When?
        // Or what happens when adding to top, then deleting a card below that?
        return (
            <Card style={{margin: "2% 5% 2% 5%"}}>
                <EditableFormTable dataSource={this.state.listOfCards} 
                    setData={(listOfCards) => { this.setState({ listOfCards }) }}
                    appendCard={this.appendCard}
                    editCard={this.editCard}
                    deleteCard={this.deleteCard}/>
            </Card>
        )
    }
}

export default ManageDeckPage;