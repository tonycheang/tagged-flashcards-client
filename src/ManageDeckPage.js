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
        this.delete = this.delete.bind(this);
        this.cancel = this.cancel.bind(this);
        this.save = this.save.bind(this);

        this.state = {
            editingKey: '',
            data: this.props.dataSource
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
                        // setTags needed to make changes
                        return <EditableTagGroup tags={record.tags}/>
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
                                            return <a href="javascript:;"
                                                    onClick={() => { this.save(form, record.key) }}>
                                                    Save
                                                </a>
                                        }
                                    }
                                </EditableContext.Consumer>
                                <Divider type="vertical" />
                                <Popconfirm title="OK to cancel?"
                                    onConfirm={() => { this.cancel(record.key) }}>
                                    <a>Cancel</a>
                                </Popconfirm>
                            </span>
                        )
                    } else {
                        operationLink = (
                            <span>
                                <a disabled={editingKey !== ''}
                                    onClick={() => { this.edit(record.key) }}>
                                    Edit
                                </a>
                                <Divider type="vertical" />
                                <Popconfirm title="Are you sure?"
                                    onConfirm={() => { this.delete(record.key) }}>
                                    <a>Delete</a>
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
        const { data } = this.state;
        // Pulls from length of deck to create key, 
        // which is what deck itself will do in appendCard
        // THIS WILL BE PROBLEMATIC WITH HOLES. Stack of available keys?
        const newEntry = {tags: [], key: data.length};
        this.setState({
            creatingNewCard: true,
            data: [newEntry, ...data],
            editingKey: newEntry.key
        });
    }

    renderTableHeader(){
        return (
            <span style={{ display: "inline-flex", width: "100%", justifyContent: "flex-end"}}>
                <Button onClick={this.makeNewRow} disabled={this.state.editingKey != ''}>
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

    delete(key) {
        console.log(key);
        this.props.deleteCard(key);
        message.success("Card deleted!");
        // Refresh the component. Inconsistent? should remove at key?
        this.setState({ editingKey: '' });
    }

    cancel() {
        if (this.state.creatingNewCard) {
            const { data } = this.state;
            const restData = data.slice(1, data.length);
            this.setState({ data: restData, creatingNewCard: false });
        }
        this.setState({ editingKey: '' });
    }

    save(form, key) {
        form.validateFields((err, values) => {
            if (err) return;

            console.log(values);

            if (!values.front && !values.back) {
                message.warning("Cannot add empty card!");
                return;
            }

            if (!values.front) {
                message.warning("Card needs a front!")
                return;
            }

            if (!values.back) {
                message.warning("Card needs a back!")
                return;
            }

            if (this.state.creatingNewCard) {
                this.props.appendCard(new FlashCard(values.front, values.back, values.tags));
                // Show the change at the top until user navigates away.
                const { data } = this.state;
                let newEntry = data[0];
                newEntry = { ...values, key: newEntry.key };

                console.log(newEntry);
                const restData = data.slice(1, data.length);
                this.setState( {data: [newEntry, ...restData]} );

                message.success("Card added!");
            } else {
                this.props.editCard(key, values);
                message.success("Card changed!");
            }
            
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
                dataSource={this.state.data}
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
    render() {
        return (
            <Card style={{margin: "2% 5% 2% 5%"}}>
                <EditableFormTable dataSource={this.props.allCards} 
                    appendCard={this.props.appendCard}
                    editCard={this.props.editCard}
                    deleteCard={this.props.deleteCard}/>
            </Card>
        )
    }
}

export default ManageDeckPage;