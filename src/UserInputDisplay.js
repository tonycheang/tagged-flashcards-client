import React from 'react';
import Input from 'antd/es/input';

const inputFieldStyle = {
    backgroundColor: "transparent",
    // border: "none",
    fontSize: 20,
    textAlign: "center"
}

class UserInputDisplay extends React.Component {
    render() {
        return (
            <div align="center" style={{margin: "2%", width: "80%"}}>
                <Input autoFocus ghost
                    placeholder={this.props.defaultText}
                    value={this.props.data}
                    style={inputFieldStyle}
                    onChange={this.props.onChange}>
                </Input>
            </div>
        )
    }
}

export default UserInputDisplay;