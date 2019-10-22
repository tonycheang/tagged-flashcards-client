import React from 'react';
import { Modal, Button, Form, Input, Steps, Icon, message, Tooltip } from "antd";

import ErrorBoundary from '../reuse_components/ErrorBoundary';
import { dispatchWithRedirect } from '../server_communication/Dispatch';
import './AuthenticationModal.css';

// Suppresses internal warnings in the dev console. (Since will warn after each key input).
import Schema from 'async-validator';
Schema.warning = function () { };

const { confirm } = Modal;
const { Step } = Steps;

function configureNext_(path, handlers) {
    /* 
        Function to be configured, then bound by components. 

        antd's validateFields needs the proper ref to a form component
        This function allows 'layering' of path and handlers higher up
        in the component tree. These then pass an unbound version of
        this function down to its children. The binding of 'this' in 
        Form.create() components will allow validateFields to work 
        properly.
    */


    return async function next_(event) {
        event.preventDefault();

        function defaultErrorHandler(err) {
            if (this.props.setLoading && typeof this.props.setLoading === "function")
                this.props.setLoading(false);
            if (this.setLoading && typeof this.setLoading === "function")
                this.setLoading(false);
            message.error("Opps! Something went wrong.");
        }


        // validateFields eats thrown errors in the callback.
        // Use "flag" errObj to save info about error instead.
        let objToSend;
        let errObj;
        this.props.form.validateFields((err, vals) => {
            if (err) {
                errObj = err;
                return;
            }

            objToSend = vals;
        });

        if (errObj) return;

        const { emailAuthToken } = this.props;
        if (emailAuthToken)
            objToSend['emailAuthToken'] = emailAuthToken;

        if (this.props.setLoading && typeof this.props.setLoading === "function")
            this.props.setLoading(true);
        if (this.setLoading && typeof this.setLoading === "function")
            this.setLoading(true);

        return dispatchWithRedirect(path, "POST", objToSend)
            .then(data => handlers.onSuccess ? handlers.onSuccess(data) : console.log(data))
            .catch(err => handlers.onError ? handlers.onError(err) : defaultErrorHandler.call(this, err))
            .finally(__ => handlers.finally ? handlers.finally() : undefined);
    }
}

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

/* ----- SIGN UP ----- */

// Function to be bound by SignUpStage components.
function onBlur(event) {
    const fieldName = event.target.id.split("_")[1];
    this.props.form.validateFields([fieldName], (err, vals) => {
        // If there's an error when the user changes fields,
        // The next time it should validate as it goes, not after blur.
        // This provides immediate feedback that the user has entered the correct format.
        const { fieldValidationTriggers } = this.state;
        fieldValidationTriggers[fieldName] = err ? "onChange" : "onBlur";
        this.setState({ fieldValidationTriggers });
    });
}

function configureEmailAuthFlow({ url, onCompletion, text }) {
    return class extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                stage: 1,
                emailAuthToken: undefined,
                loading: false,
                email: ""
            }

            this.unboundNext_ = configureNext_(url, { onSuccess: this.onSuccess });
        }
    
        onSuccess = (data) => {
            this.setState({ loading: false });
    
            if (data.error || data.response.status >= 300) {
                const errorMessage = data.body.message || "Opps, something went wrong!";
                const EXPIRY_INTERVAL = 3;
                return message.error(errorMessage, EXPIRY_INTERVAL);
            }
    
            if (data.response && data.response.status < 300 && data.response.status >= 200) {
                const { stage } = this.state;
                switch (stage) {
                    case 1:
                        if (!data.body || !data.body.emailAuthToken)
                            return message.warn("Opps! Server did not pass a token. Please retry.");
    
                        this.setState({ stage: 2, emailAuthToken: data.body.emailAuthToken });
                        this.props.setShouldWarnBeforeModalClose(true);
                        break;
                    case 2:
                        if (!data.body || !data.body.emailAuthToken)
                            return message.warn("Opps! Server did not pass a token. Please retry.");
    
                        this.setState({ stage: 3, emailAuthToken: data.body.emailAuthToken });
                        break;
                    case 3:
                        const MESSAGE_ACTIVE_TIME = 2.5;
                        message.success(text.onSuccess, MESSAGE_ACTIVE_TIME);

                        if (onCompletion.switchToLogin)
                            this.props.switchToLogin();

                        if (onCompletion.closeModal) 
                            this.props.closeModal();
                        
                        if (onCompletion.save) 
                            this.props.saveDeck();
                        
                        break;
                    default:
                        throw Error("Invalid email auth stage.");
                }
            }
        }
    
        switchToStageOne = () => {
            this.props.setShouldWarnBeforeModalClose(false);
            this.setState({ stage: 1 });
        }
    
        setLoading = (bool) => {
            this.setState({ loading: bool });
        }
    
        render() {
            const { switchToLogin } = this.props;
            const { stage, emailAuthToken, loading, email } = this.state;
    
            let infoText, stageFormComponent;
            switch (stage) {
                case 1:
                    const { stageOne } = text;
                    stageFormComponent = (
                        <EmailAuthStageOneForm
                            text={stageOne}
                            switchToLogin={switchToLogin}
                            setLoading={this.setLoading}
                            setEmail={(email) => this.setState({ email })}
                            loading={loading}
                            unboundNext_={this.unboundNext_}>
                        </EmailAuthStageOneForm>
                    );
                    break;
                case 2:
                    const { stageTwo } = text;
                    infoText = (
                        <p className="purpose" style={{ marginTop: "0px", marginBottom: "10px" }}>
                            Sent to {email} 
                        </p>
                    );
                    stageFormComponent = (
                        <EmailAuthStageTwoForm
                            text={stageTwo}
                            emailAuthToken={emailAuthToken}
                            setLoading={this.setLoading}
                            switchToStageOne={this.switchToStageOne}
                            loading={loading}
                            unboundNext_={this.unboundNext_}>
                        </EmailAuthStageTwoForm>
                    );
                    break;
                case 3:
                    const { stageThree } = text;
                    stageFormComponent = (
                        <EmailAuthStageThreeForm
                            text={stageThree}
                            emailAuthToken={emailAuthToken}
                            setLoading={this.setLoading}
                            loading={loading}
                            unboundNext_={this.unboundNext_}>
                        </EmailAuthStageThreeForm>
                    );
                    break;
                default:
                    throw Error("Invalid email auth stage.");
            }
    
            return (
                <div>
                    <span>
                        <Steps 
                            className="progressBar"
                            size="small" 
                            initial={1} 
                            current={stage}>
                            <Step icon={<Icon type="mail" />} />
                            <Step icon={<Icon type="safety-certificate" />} />
                            <Step icon={<Icon type="unlock" />} />
                        </Steps>
                    </span>
                    <span className="purpose">
                        {infoText}
                    </span>
                    {stageFormComponent}
                </div>
            )
        }
    }
}

class EmailAuthStageOne extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fieldValidationTriggers: {
                email: "onBlur"
            }
        }
        this.onBlur = onBlur.bind(this);
        this.next_ = this.props.unboundNext_.bind(this);
    }

    onSubmit = (event) => {
        this.next_(event);
        this.props.form.validateFields((err, vals) => {
            this.props.setEmail(vals.email);
        });
    }

    render() {
        const { switchToLogin, loading, text } = this.props;
        const { getFieldDecorator } = this.props.form;
        const { fieldValidationTriggers } = this.state;

        return (
            <div>
                <Form onSubmit={this.onSubmit} className="form">
                    <Form.Item className="formItem" key={"EmailAuthStageOneEmail"}>
                        <div onBlur={this.onBlur}>
                            {
                                getFieldDecorator("email",
                                    {
                                        validateTrigger: fieldValidationTriggers.email,
                                        rules: [
                                            { required: true, type: "email", message: "Must be a valid email address." },
                                            { max: 254, message: "Email exceeds 254 character limit." }
                                        ]
                                    }
                                )(
                                    <Input prefix={<Icon type="mail" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                        placeholder="Email"
                                    />
                                )
                            }
                        </div>
                    </Form.Item>

                    <Form.Item className="formItem">
                        <Button
                            className="formButton"
                            type="primary"
                            htmlType="submit"
                            loading={loading}>
                            Send verification code
                    </Button>
                    </Form.Item>
                </Form>
                <span className="footer">
                    <p className="footerText">{text.footer}</p>
                    <Button className="footerButton" size="small" type="link" onClick={switchToLogin}>
                        Log in
                    </Button>
                </span>
            </div>
        );
    }
}

class EmailAuthStageTwo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fieldValidationTriggers: {
                validationCode: "onBlur"
            }
        }
        this.onBlur = onBlur.bind(this);
        this.next_ = this.props.unboundNext_.bind(this);
    }

    render() {
        const { switchToStageOne, loading } = this.props;
        const { getFieldDecorator } = this.props.form;
        const { fieldValidationTriggers } = this.state;

        return (
            <div>
                <Form onSubmit={this.next_} className="form">
                    <Form.Item className="formItem" key={"EmailAuthStageOneVerificationCode"}>
                        <div onBlur={this.onBlur}>
                            {
                                getFieldDecorator("verificationCode",
                                    {
                                        validateTrigger: fieldValidationTriggers.verificationCode,
                                        rules: [
                                            {min: 10, max:10, required: true, message: "Wrong length verification code."}
                                        ]
                                    }
                                )(
                                    <Input prefix={<Icon type="safety-certificate" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                        placeholder="Verification code"
                                    />
                                )
                            }
                        </div>
                    </Form.Item>
                    <Form.Item className="formItem">
                        <Button
                            className="formButton"
                            type="primary"
                            htmlType="submit"
                            loading={loading}>
                            Verify
                        </Button>
                    </Form.Item>
                </Form>
                <span className="footer">
                    <p className="footerText">Sent to wrong email?</p>
                    <Button className="footerButton" size="small" type="link" onClick={switchToStageOne}>
                        Back
                    </Button>
                </span>

            </div>
        );
    }
}

class EmailAuthStageThree extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fieldValidationTriggers: {
                password: "onBlur",
                passwordValidation: "onBlur"
            }
        }
        this.passwordEntered = "";
        this.onBlur = onBlur.bind(this);
        this.next_ = this.props.unboundNext_.bind(this);
    }

    // Functions for async-validator.
    recordPasswordField = (rule, password, callback) => {
        this.passwordEntered = password;
        callback();
    }

    checkMatchingPasswords = (rule, passwordValidation, callback) => {
        // It has an odd callback() usage.
        this.passwordEntered === passwordValidation ? callback() : callback(false);
    }

    render() {
        const { loading, text } = this.props;
        const { getFieldDecorator } = this.props.form;
        const { fieldValidationTriggers } = this.state;

        const tooltipProps = { placement: "right", trigger: "focus", hasFeedback: true };

        return (
            <div>
                <Form onSubmit={this.next_} className="form">
                    <Form.Item className="formItem" key={"EmailAuthStageThreePassword"}>
                        <Tooltip title="8 - 50 characters." {...tooltipProps}>
                            <div onBlur={this.onBlur}>
                                {
                                    getFieldDecorator("password",
                                        {
                                            validateTrigger: fieldValidationTriggers.password,
                                            rules: [
                                                { min: 8, required: true, message: "Must be at least 8 characters." },
                                                { max: 50, message: "Password exceeds 50 character limit." },
                                                { validator: this.recordPasswordField }
                                            ]
                                        }
                                    )(<Input.Password placeholder="Password" />)
                                }
                            </div>
                        </Tooltip>
                    </Form.Item>
                    <Form.Item className="formItem" key={"EmailAuthStageThreePasswordValidation"}>
                        <Tooltip title="8 - 50 characters." {...tooltipProps}>
                            <div onBlur={this.onBlur}>
                                {
                                    getFieldDecorator("passwordValidation",
                                        {
                                            validateTrigger: fieldValidationTriggers.passwordValidation,
                                            rules: [
                                                { min: 8, required: true, message: "Must be at least 8 characters." },
                                                { max: 50, message: "Password exceeds 50 character limit." },
                                                { validator: this.checkMatchingPasswords, message: "Passwords must match." }
                                            ]
                                        }
                                    )(<Input.Password placeholder="Re-enter your password" />)
                                }
                            </div>
                        </Tooltip>
                    </Form.Item>
                    <Form.Item className="formItem">
                        <Button
                            className="formButton"
                            type="primary"
                            htmlType="submit"
                            loading={loading}>
                            {text.button}
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        );
    }
}

const LoginForm = Form.create({ name: 'Login' })(Login);
const EmailAuthStageOneForm = Form.create({ name: 'EmailAuthStageOne' })(EmailAuthStageOne);
const EmailAuthStageTwoForm = Form.create({ name: 'EmailAuthStageTwo' })(EmailAuthStageTwo);
const EmailAuthStageThreeForm = Form.create({ name: 'EmailAuthStageThree' })(EmailAuthStageThree);

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