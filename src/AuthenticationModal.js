import React from 'react';
import { Modal, Button, Form, Input, Icon, message } from "antd";
import ErrorBoundary from './ErrorBoundary';
import './AuthenticationModal.css';

async function dispatch(path, objectToStringify) {
    return fetch(path, 
        {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objectToStringify)
        }
    );
}

function withResponseHandlers(WrappedComponent) {
    return class extends React.Component {
        state = {
            loading: false,
            error: false,
            errorMessage: ""
        }
    
        onSuccess = async (response) => {
            this.setState({ loading: false });
            const body = await response.json();

            if (response.status >= 400) {
                message.error(body.error);
                // These state variables are passed down as props.
                this.setState({ error: true, errorMessage: body.error });
            } else {
                message.success(body.message);
                this.props.closeModal();
            }
        }
    
        onError = (err) => {
            this.setState({ loading: false });
            message.error("Opps! Something went wrong.");
        }

        render() {
            const { error, errorMessage, loading } = this.state;
            return (
                <WrappedComponent 
                    loading={loading}
                    error={error}
                    errorMessage={errorMessage}
                    setLoading={(loading) => { this.setState({ loading })}}
                    onSuccess={this.onSuccess}
                    onError={this.onError}
                    {...this.props}>
                </WrappedComponent>
            );
        }
    }
}

class Login extends React.Component {

    login = async (event) => {
        event.preventDefault();

        // validateFields eats throw errors in the callback.
        // using "flag" errObj to save info about error instead.
        let username, password, errObj;
        this.props.form.validateFields((err, vals) => {
            if (err) {
                errObj = err;
                return;
            }
            username = vals.username;
            password = vals.password;
        });
        
        if (errObj) return;

        const { onSuccess, onError, setLoading } = this.props;
        setLoading(true);

        return dispatch("/auth/login", { username, password })
            .then(data => { onSuccess(data) })
            .catch(err => onError(err));
    }

    render() {
        const { getFieldDecorator } = this.props.form;
        const { switchToSignup, loading } = this.props;

        return (
            <div>
                <Form onSubmit={this.login} className="form">
                    <Form.Item className="formItem" key={1}>
                        {
                            getFieldDecorator("username",
                                {
                                    rules: [{required: true, message: "Please enter your username or email."}]
                                }
                            )(
                                <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }}/>} 
                                    placeholder="Username or email" 
                                />
                            )
                        }
                    </Form.Item>
                    <Form.Item className="formItem" key={2}>
                        {getFieldDecorator("password", 
                            {
                                rules: [{required: true, message: "Please enter your password."}]
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
                <span className="footer">
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

    signup = async (event) => {
        event.preventDefault();

        // validateFields eats throw errors in the callback.
        // using "flag" errObj to save info about error instead.
        let username, password, email, errObj;
        this.props.form.validateFields((err, vals) => {
            if (err) {
                errObj = err;
                return;
            }

            username = vals.username;
            password = vals.password;
            email = vals.email;
        });

        if (errObj) return;

        const { onSuccess, onError, setLoading } = this.props;
        setLoading(true);

        return dispatch("/auth/signup", { username, password, email })
            .then(data => onSuccess(data))
            .catch(err => onError(err));
    }

    // Tooltips / feedback about form validation.
    render() {
        const { getFieldDecorator } = this.props.form;
        const { switchToLogin, loading } = this.props;

        return (
            <div>
                <Form onSubmit={this.signup} className="form">
                    <Form.Item className="formItem" key={1}>
                        {
                            getFieldDecorator("username", 
                                {
                                    rules: [{required: true, message: "Please enter a username."}]
                                }
                            )(
                                <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }}/>} 
                                    placeholder="Username" 
                                />
                            )
                        }
                    </Form.Item>
                    <Form.Item className="formItem" key={2}>
                        {
                            getFieldDecorator("email", 
                                {
                                    rules: [{required: true, message: "Please enter your email."}]
                                }
                            )(
                                <Input prefix={<Icon type="mail" style={{ color: 'rgba(0,0,0,.25)' }}/>} 
                                    placeholder="Email" 
                                />
                            )
                        }
                    </Form.Item>
                    <Form.Item className="formItem" key={3}>
                        {getFieldDecorator("password",
                            {
                                rules: [{required: true, message: "Please enter a password."}]
                            }
                        )(<Input.Password placeholder="Password" />)}
                    </Form.Item>
                    <Form.Item className="formItem">
                        <Button
                            className="formButton"
                            type="primary"
                            htmlType="submit"
                            loading={loading}>
                            Sign up
                        </Button>
                    </Form.Item>
                    </Form>
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

const LoginForm = Form.create({ name: 'login' })(withResponseHandlers(Login));
const SignUpForm = Form.create({ name: 'signup' })(withResponseHandlers(SignUp));

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
                    <LoginForm closeModal={this.props.closeModal}
                        switchToSignup={
                            () => { this.setState({ intention: this.intentions.signup }) 
                        }
                    }>
                    </LoginForm>
                );
                titleText = "Log In";
                break;
            case this.intentions.signup:
                activeForm = (
                    <SignUpForm closeModal={this.props.closeModal}
                        switchToLogin={
                            () => { this.setState({ intention: this.intentions.login }) 
                        }
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