import React from 'react';
import {Modal, Form, Input, message} from 'antd';

const ModalForm = Form.create({name: "Modal Form"})(
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
                    </Form>
                </Modal>
            )
        }
    }
)

class AddCardsDialog extends React.Component {

    // What is going on here?
    saveFormRef = (formRef) => {
        this.formRef = formRef;
    }

    handleAdd = () => {
        const { form } = this.formRef.props;
        form.validateFields((err, values) => {
            if (err) return;
            console.log("form recieved: ", values);

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
                onAdd={this.handleAdd}>
            </ModalForm>
        )
    }
}

export default AddCardsDialog;