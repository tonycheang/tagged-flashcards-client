import React from 'react';
import { Modal, Form, Input, message, Popconfirm, Table, Tag } from 'antd';
import EditableTagGroup from "./EditableTagGroup"
import { Card } from "./Deck"

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
            cellToRender = <Form.Item>
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
        this.isEditing = this.isEditing.bind(this);
        this.edit = this.edit.bind(this);
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
                        // Is key even useful here? 
                        return record.tags.map((tag, i) => <Tag key={i}>{tag}</Tag>)
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
                                                    onClick={() => { this.save(form, record.key) }}
                                                    style={{ marginRight: 8 }}>
                                                    Save
                                                </a>
                                        }
                                    }
                                </EditableContext.Consumer>
                                <Popconfirm title="OK to cancel?"
                                    onConfirm={() => { this.cancel(record.key) }}>
                                    <a>Cancel</a>
                                </Popconfirm>
                            </span>
                        )
                    } else {
                        operationLink = <a disabled={editingKey !== ''}
                            onClick={() => { this.edit(record.key) }}>
                            Edit
                            </a>
                    }

                    return operationLink;
                }
            }
        ];
    }

    isEditing(record) {
        return record.key === this.state.editingKey;
    }

    edit(key) {
        this.setState({ editingKey: key });
    }

    cancel() {
        this.setState({ editingKey: '' });
    }

    save(form, key) {
        form.validateFields((error, row) => {
            console.log(error, row);
            this.setState({ editingKey: '' });
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
                title={()=>"Your Deck"}
                bordered
                style={{padding: "5%"}}/>
        </EditableContext.Provider>
    }
}

const EditableFormTable = Form.create({ name: "Editable Form Table" })(EditableTable);


const ModalForm = Form.create({ name: "Modal Form" })(
    class extends React.Component {

        render() {
            const { visible, onCancel, onAdd, form } = this.props;
            const { getFieldDecorator } = form;

            return (
                <Modal title="Add Card"
                    visible={visible}
                    onCancel={onCancel}
                    okText="Add"
                    onOk={onAdd}>
                    <Form layout="vertical">
                        <Form.Item>
                            {getFieldDecorator("front")(<Input placeholder="Front"></Input>)}
                        </Form.Item>
                        <Form.Item>
                            {getFieldDecorator("back")(<Input placeholder="Back"></Input>)}
                        </Form.Item>
                        <Form.Item>
                            <EditableTagGroup tags={this.props.tags}
                                setTags={(tags) => this.props.setTags(tags)}>

                            </EditableTagGroup>
                        </Form.Item>
                    </Form>
                </Modal>
            )
        }
    }
)

class AddCardsDialog extends React.Component {
    constructor(props) {
        super(props);
        this.saveFormRef = this.saveFormRef.bind(this);
        this.handleAdd = this.handleAdd.bind(this);
        this.state = {
            tags: []
        }
    }

    saveFormRef(formRef) {
        this.formRef = formRef;
    }

    handleAdd() {
        const { form } = this.formRef.props;
        const { tags } = this.state;
        form.validateFields((err, values) => {
            if (err) return;

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

            // Add a card here.
            this.props.appendCard(new Card(values.front, values.back, tags));

            message.success("Card added!");
            form.resetFields();
        });
    }

    render() {
        const data = this.props.allCards.map((card, i)=>{return {...card, key: i}});
        return (
            // <Modal title="Manage Deck" 
            //     visible={this.props.visible}
            //     onCancel={this.props.closeModal}
            //     onAdd={this.props.closeModal}>
                <EditableFormTable dataSource={data}/>
            // </Modal>
            // <ModalForm
            //     wrappedComponentRef={this.saveFormRef}
            //     visible={this.props.visible}
            //     onCancel={this.props.closeModal}
            //     onAdd={this.handleAdd}
            //     tags={this.state.tags}
            //     setTags={(tags) => { this.setState({ tags }) }}>
            // </ModalForm>
        )
    }
}

export default AddCardsDialog;