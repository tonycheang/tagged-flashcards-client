import React from 'react';

class UserInputDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.inputFieldStyle = {
            backgroundColor: this.props.backgroundColor,
            border: "none",
            color: this.props.textColor,
            margin: "20px",
            fontSize: 20,
            textAlign: "center"
        }
    }
    render() {
        return (
            <input autoFocus
                placeholder={this.props.defaultText}
                value={this.props.data}
                style={this.inputFieldStyle}
                onChange={this.props.onChange}>
            </input>
        )
    }
}

export default UserInputDisplay;