import React from 'react';
import { Modal, Button, Form, Input, Steps, Icon, message, Tooltip } from "antd";
import ErrorBoundary from './ErrorBoundary';
import './AuthenticationModal.css';
import { dispatchWithRedirect } from './Dispatch';

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

        function defaultErrorHandler(err) {
            if (this.props.setLoading && typeof this.props.setLoading === "function")
                this.props.setLoading(false);
            if (this.setLoading && typeof this.setLoading === "function")
                this.setLoading(false);
            message.error("Opps! Something went wrong.");
        }

        event.preventDefault();

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
        const handlers = {
            onSuccess: this.onSuccess,
            finally: this.props.loadDeck
        }
        this.login = configureNext_("/auth/login", handlers).bind(this);
    }

    onSuccess = async (response) => {
        this.setState({ loading: false });
        const body = await response.json();
        const SECONDS_TILL_CLOSE = 2.5;

        if (response.status >= 400) {
            message.destroy();
            message.error(body.error, SECONDS_TILL_CLOSE);
            // These state variables are passed down as props.
            this.setState({ error: true, errorMessage: body.error });
        } else {
            message.destroy();
            message.success(body.message, SECONDS_TILL_CLOSE);
            this.props.closeModal();
        }
    }

    setLoading = (bool) => {
        this.setState({ loading: bool });
    }

    render() {
        const { getFieldDecorator } = this.props.form;
        const { switchToSignup, loading } = this.props;

        return (
            <div>
                <p className="purpose"> To save your deck remotely. </p>
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

class SignUp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            signUpStage: 1,
            emailAuthToken: undefined,
            loading: false
        }
        
        const handlersWithLoad = {
            onSuccess: this.onSuccess,
            finally: this.props.saveDeck
        }
        const handlersWithoutLoad = {
            onSuccess: this.onSuccess
        }
        this.unboundNext_LoadDeck = configureNext_("/auth/signup", handlersWithLoad)
        this.unboundNext_WithoutLoad = configureNext_("/auth/signup", handlersWithoutLoad);
    }

    onSuccess = (data) => {
        this.setState({ loading: false });

        if (data.error || data.response.status >= 300) {
            const errorMessage = data.body.message || "Opps, something went wrong!";
            const EXPIRY_INTERVAL = 3;
            return message.error(errorMessage, EXPIRY_INTERVAL);
        }

        if (data.response && data.response.status < 300 && data.response.status >= 200) {
            const { signUpStage } = this.state;
            switch (signUpStage) {
                case 1:
                    if (!data.body || !data.body.emailAuthToken)
                        return message.warn("Opps! Server did not pass a token. Please retry.");

                    this.setState({ signUpStage: 2, emailAuthToken: data.body.emailAuthToken });
                    this.props.setShouldWarnBeforeModalClose(true);
                    break;
                case 2:
                    if (!data.body || !data.body.emailAuthToken)
                        return message.warn("Opps! Server did not pass a token. Please retry.");

                    this.setState({ signUpStage: 3, emailAuthToken: data.body.emailAuthToken });
                    break;
                case 3:
                    const MESSAGE_ACTIVE_TIME = 2.5;
                    message.success("Signed up successfully! Automatically logged in.", MESSAGE_ACTIVE_TIME);
                    this.props.closeModal();
                    break;
                default:
                    throw Error("Invalid sign up stage.");
            }
        }
    }

    switchToStageOne = () => {
        this.props.setShouldWarnBeforeModalClose(false);
        this.setState({ signUpStage: 1 });
    }

    setLoading = (bool) => {
        this.setState({ loading: bool });
    }

    render() {
        const { switchToLogin } = this.props;
        const { signUpStage, emailAuthToken, loading } = this.state;

        let stageFormComponent;
        switch (signUpStage) {
            case 1:
                stageFormComponent = (
                    <EmailAuthStageOneForm
                        switchToLogin={switchToLogin}
                        setLoading={this.setLoading}
                        loading={loading}
                        unboundNext_={this.unboundNext_WithoutLoad}>
                    </EmailAuthStageOneForm>
                );
                break;
            case 2:
                stageFormComponent = (
                    <EmailAuthStageTwoForm
                        emailAuthToken={emailAuthToken}
                        setLoading={this.setLoading}
                        switchToStageOne={this.switchToStageOne}
                        loading={loading}
                        unboundNext_={this.unboundNext_WithoutLoad}>
                    </EmailAuthStageTwoForm>
                );
                break;
            case 3:
                stageFormComponent = (
                    <EmailAuthStageThreeForm
                        emailAuthToken={emailAuthToken}
                        setLoading={this.setLoading}
                        loading={loading}
                        unboundNext_={this.unboundNext_LoadDeck}>
                    </EmailAuthStageThreeForm>
                );
                break;
            default:
                throw Error("Invalid sign up stage.");
        }

        return (
            <div>
                <Steps 
                    className="progressBar"
                    size="small" 
                    initial={1} 
                    current={signUpStage}>
                    <Step icon={<Icon type="mail" />} />
                    <Step icon={<Icon type="safety-certificate" />} />
                    <Step icon={<Icon type="unlock" />} />
                </Steps>
                {stageFormComponent}
            </div>
        )
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

    render() {
        const { switchToLogin, loading } = this.props;
        const { getFieldDecorator } = this.props.form;
        const { fieldValidationTriggers } = this.state;

        return (
            <div>
                <Form onSubmit={this.next_} className="form">
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
                    <p className="footerText">Have an account?</p>
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
                                    <Input prefix={<Icon type="mail" style={{ color: 'rgba(0,0,0,.25)' }} />}
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
        const { loading } = this.props;
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
                            Sign up
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        );
    }
}

const LoginForm = Form.create({ name: 'Login' })(Login);
const EmailAuthStageOneForm = Form.create({ name: 'SignUpStageOne' })(EmailAuthStageOne);
const EmailAuthStageTwoForm = Form.create({ name: 'SignUpStageTwo' })(EmailAuthStageTwo);
const EmailAuthStageThreeForm = Form.create({ name: 'SignUpStageThree' })(EmailAuthStageThree);

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
                        switchToSignup={
                            () => {
                                this.setState({ intention: this.intentions.signup })
                            }
                        }>
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
            // Need case this.intentions.resetPassword
            default:
                throw Error("Invalid authentication component state!");
        }

        const title = (
            <span style={{ display: "flex", justifyContent: "center" }}>
                <h3 className="title"> {titleText} </h3>
            </span>
        );

        return (
            // Need closeModal to sometimes warn the user!
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