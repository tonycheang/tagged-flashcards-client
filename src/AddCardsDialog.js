import React from 'react';
import { Modal, Form, Input, message } from 'antd';
import EditableTagGroup from "./EditableTagGroup"
import { Card } from "./Deck"

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
                                setTags={(tags)=>this.props.setTags(tags)}>

                            </EditableTagGroup>
                        </Form.Item>
                    </Form>
                </Modal>
            )
        }
    }
)

class AddCardsDialog extends React.Component {
    state = {
        tags: []
    }

    saveFormRef = (formRef) => {
        this.formRef = formRef;
    }

    handleAdd = () => {
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
        return (
            <ModalForm
                wrappedComponentRef={this.saveFormRef}
                visible={this.props.visible}
                onCancel={this.props.closeModal}
                onAdd={this.handleAdd}
                tags={this.state.tags}
                setTags={(tags)=>{this.setState({tags})}}>
            </ModalForm>
        )
    }
}

export default AddCardsDialog;