import React from 'react';

const ButtonStyling = {
    background: "#777777",
    border: "none",
    color: "#DDDDDD",
    padding: "15px",
    width: "100px",
    textAlign: "center",
    textDecoration: "none",
    display: "inline-block",
    fontSize: "16px",
    borderRadius: "5px"
}

class Button extends React.Component {
    render(){
        return (
            <button onClick={this.props.onClick} style={ButtonStyling}>
                {this.props.text || ""}
            </button>
        )
    }
}

export default Button;