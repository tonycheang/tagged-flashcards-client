import React from 'react';
import { Modal, Button, Form, Input, Icon } from "antd";
import ErrorBoundary from './ErrorBoundary';
import './AuthenticationModal.css';

async function dispatch(path, objectToStringify) {
    return fetch(path, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objectToStringify)
    }
    ).then(res => res.json()).then(val => console.log(val)).catch(err => console.log(err));
}

class Login extends React.Component {
    // constructor(props) {
    //     super(props);
    //     // this.login = this.login.bind(this);
    // }

    login = async () => {
        let username, password;
        this.props.form.validateFields((err, vals) => {
            username = vals.username;
            password = vals.password;
        });

        if (!username || !password) {
            // send a message or otherwise feedback about requirements
            return;
        }

        return dispatch("/auth/login", { username, password });
    }

    render() {
        const { getFieldDecorator } = this.props.form;
        const { switchToSignup } = this.props;

        return (
            <div>
                <Form className="form">
                    <Form.Item className="formItem" key={1}>
                        {getFieldDecorator("username")(
                            <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }}/>} 
                                placeholder="Username" 
                            />
                        )}
                    </Form.Item>
                    <Form.Item className="formItem" key={2}>
                        {getFieldDecorator("password")(<Input.Password placeholder="Password" />)}
                    </Form.Item>
                </Form>
                <Button
                    className="formItem"
                    type="primary"
                    onClick={this.login}>
                    Log In
                </Button>
                <span className="footer">
                    {/* SHIFT THIS TEXT DOWNWARD! */}
                    <p className="footerText">Don't have an account?</p>
                    <Button className="footerButton" size="small" type="link" onClick={switchToSignup}>
                        Sign up
                    </Button>
                </span>
            </div>
        );
    }
}

class SignUp extends React.Component {
    signup = async () => {
        let username, password, email;
        this.props.form.validateFields((err, vals) => {
            username = vals.username;
            password = vals.password;
            email = vals.email;
        });

        if (!username || !password || !email) {
            // send a message or otherwise feedback about requirements
            return;
        }

        return dispatch("/auth/signup", { username, password, email });
    }

    // Tooltips / feedback about form validation.
    render() {
        const { getFieldDecorator } = this.props.form;
        const { switchToLogin } = this.props;

        return (
            <div>
                <Form>
                    <Form.Item className="formItem" key={1}>
                        {getFieldDecorator("username")(
                            <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }}/>} 
                                placeholder="Username" 
                            />
                        )}
                    </Form.Item>
                    <Form.Item className="formItem" key={2}>
                        {getFieldDecorator("email")(
                            <Input prefix={<Icon type="mail" style={{ color: 'rgba(0,0,0,.25)' }}/>} 
                                placeholder="Email" 
                            />
                        )}
                    </Form.Item>
                    <Form.Item className="formItem" key={3}>
                        {getFieldDecorator("password")(<Input.Password placeholder="Password" />)}
                    </Form.Item>
                </Form>
                <Button
                    className="formItem"
                    type="primary"
                    onClick={this.signup}>
                    Sign up
                </Button>
                <span className="footer">
                    <p className="footerText">Have an account?</p>
                    <Button className="footerButton" size="small" type="link" onClick={switchToLogin}>
                        Log in
                    </Button>
                </span>

            </div>
        )
    }
}

const LoginForm = Form.create({ name: 'login' })(Login);
const SignUpForm = Form.create({ name: 'signup' })(SignUp);

class AuthenticationModal extends React.Component {
    constructor(props) {
        super(props);

        this.intentions = {
            login: "login",
            signup: "signup",
            resetPassword: "resetPassword"
        }
        Object.freeze(this.intentions);

        this.state = {
            intention: this.intentions.login
        }
    }

    render() {
        const { intention } = this.state;
        let activeForm, titleText;

        switch (intention) {
            case this.intentions.login:
                activeForm = (
                    <LoginForm switchToSignup={
                        () => { this.setState({ intention: this.intentions.signup }) }
                    }>
                    </LoginForm>
                );
                titleText = "Log In";
                break;
            case this.intentions.signup:
                activeForm = (
                    <SignUpForm switchToLogin={
                        () => { this.setState({ intention: this.intentions.login }) }
                    }>
                    </SignUpForm>
                )
                titleText = "Sign Up";
                break;
            default:
                throw Error("Invalid authentication component state!");
        }

        const title = (
            <span style={{ display: "flex", justifyContent: "center" }}>
                <h3 className="title"> {titleText} </h3>
            </span>
        );

        return (
            <ErrorBoundary>
                <Modal
                    width={300}
                    title={title}
                    visible={this.props.visible}
                    closable={false}
                    onCancel={this.props.closeModal}
                    footer={null}>
                    {activeForm}
                </Modal>
            </ErrorBoundary>
        )
    }
}

export default AuthenticationModal;