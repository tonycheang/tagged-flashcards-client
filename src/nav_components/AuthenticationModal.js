import React from 'react';
import { Modal, Button, Form, Input, Icon, message } from "antd";

import ErrorBoundary from '../reuse_components/ErrorBoundary';
import { configureEmailAuthFlow, configureNext_ } from '../reuse_components/EmailAuthFlow'
import './AuthenticationModal.css';

// Suppresses internal warnings in the dev console. (Since will warn after each key input).
import Schema from 'async-validator';
Schema.warning = function () { };

const { confirm } = Modal;

class Login extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
            error: false,
            errorMessage: ""
        }

        this.login = configureNext_("/auth/login", { onSuccess: this.onSuccess }).bind(this);
    }

    onSuccess = async (data) => {
        this.setState({ loading: false });
        const body = await data.json();
        const SECONDS_TILL_CLOSE = 2.5;
        if (data.response.status >= 400) {
            message.destroy();
            message.error(body.message, SECONDS_TILL_CLOSE);
            // These state variables are passed down as props.
            this.setState({ error: true, errorMessage: body.error });
        } else {
            message.destroy();
            message.success(body.message, SECONDS_TILL_CLOSE);
            this.props.loadDeck();
            this.props.closeModal();
        }
    }

    setLoading = (bool) => {
        this.setState({ loading: bool });
    }

    render() {
        const { getFieldDecorator } = this.props.form;
        const { switchToSignup, switchToResetPassword, loading } = this.props;

        return (
            <div>
                <p className="purpose"> Save and load your deck remotely. </p>
                <Form onSubmit={this.login} className="form">
                    <Form.Item className="formItem" key={1}>
                        {
                            getFieldDecorator("email",
                                {
                                    rules: [
                                        { required: true, type: "email", message: "Must be a valid email address." },
                                        { max: 254, message: "Email exceeds 254 character limit." }
                                    ]
                                }
                            )(
                                <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                    placeholder="Username or email"
                                />
                            )
                        }
                    </Form.Item>
                    <Form.Item className="formItem" key={2}>
                        {getFieldDecorator("password",
                            {
                                rules: [{ required: true, message: "Please enter your password." }]
                            }
                        )(<Input.Password placeholder="Password" />)}
                    </Form.Item>
                    <Form.Item className="formItem">
                        <Button
                            className="formButton"
                            type="primary"
                            htmlType="submit"
                            loading={loading}>
                            Log In
                        </Button>
                    </Form.Item>
                </Form>
                <span className="footerButtonGroup">
                    <Button style={{ color: "#8c8c8c" }} className="footerButton" size="small" type="link" onClick={switchToResetPassword}>
                        Forgot Password
                    </Button>
                    <Button style={{ color: "#40a9ff" }} className="footerButton" size="small" type="link" onClick={switchToSignup}>
                        Sign Up
                    </Button>
                </span>
            </div>
        );
    }
}


const LoginForm = Form.create({ name: 'Login' })(Login);
const signUpText = {
    stageOne: {
        footer: "Have an account?"
    },
    stageThree: {
        button: "Sign Up"
    },
    onSuccess: "Signed up successfully! Automatically logged in."
}

const SignUp = configureEmailAuthFlow({ 
    url: "/auth/signup", 
    onCompletion: {
        save: true,
        closeModal: true,
        switchToLogin: false
    }, 
    text: signUpText
});

const resetPasswordText = {
    stageOne: {
        footer: "Remember your password?"
    },
    stageThree: {
        button: "Change Password"
    },
    onSuccess: "Password reset successfully! Please log in."
}

const ResetPassword = configureEmailAuthFlow({ 
    url: "/auth/forgot-password", 
    onCompletion: {
        save: false,
        closeModal: false,
        switchToLogin: true
    },
    text: resetPasswordText
});
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
            intention: this.intentions.login,
            shouldWarnBeforeModalClose: false
        }
    }

    setShouldWarnBeforeModalClose = (bool) => {
        this.setState({ shouldWarnBeforeModalClose: bool });
    }

    onCancel = () => {
        const { shouldWarnBeforeModalClose } = this.state;
        if (shouldWarnBeforeModalClose) {
            confirm(
                {
                    title: "Are you sure you want to exit?",
                    onOk: () => {
                        this.props.closeModal();
                    }
                }
            );
        } else {
            this.props.closeModal();
        }
    }

    render() {
        const { intention } = this.state;
        let activeForm, titleText;

        switch (intention) {
            case this.intentions.login:
                activeForm = (
                    <LoginForm {...this.props}
                        switchToSignup={ () => this.setState({ intention: this.intentions.signup }) }
                        switchToResetPassword={ () => this.setState({ intention: this.intentions.resetPassword }) }>
                    </LoginForm>
                );
                titleText = "Log In";
                break;
            case this.intentions.signup:
                activeForm = (
                    <SignUp {...this.props}
                        switchToLogin={() => this.setState({ intention: this.intentions.login })}
                        setShouldWarnBeforeModalClose={this.setShouldWarnBeforeModalClose}>
                    </SignUp>
                );
                titleText = "Sign Up";
                break;
            case this.intentions.resetPassword:
                activeForm = (
                    <ResetPassword {...this.props}
                        switchToLogin={() => this.setState({ intention: this.intentions.login })}
                        setShouldWarnBeforeModalClose={this.setShouldWarnBeforeModalClose}>
                    </ResetPassword>
                );
                titleText = "Password Recovery";
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
                    onCancel={this.onCancel}
                    footer={null}>
                    {activeForm}
                </Modal>
            </ErrorBoundary>
        )
    }
}

export default AuthenticationModal;