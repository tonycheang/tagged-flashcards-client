import React from 'react';
import { Button, Form, Input, Steps, Icon, message, Tooltip } from "antd";

import { dispatchWithRedirect } from '../server_communication/Dispatch';
import '../nav_components/AuthenticationModal.css';

const { Step } = Steps;

// Function to be bound by EmailAuthStage components.
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

const EmailAuthStageOneForm = Form.create({ name: 'EmailAuthStageOne' })(EmailAuthStageOne);
const EmailAuthStageTwoForm = Form.create({ name: 'EmailAuthStageTwo' })(EmailAuthStageTwo);
const EmailAuthStageThreeForm = Form.create({ name: 'EmailAuthStageThree' })(EmailAuthStageThree);

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

export { configureEmailAuthFlow, configureNext_ };