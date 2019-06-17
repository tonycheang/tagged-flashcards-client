import React from 'react';

class UserInputDisplay extends React.Component {
    render(){
        return (
            <div minheight="20%" style={{color: this.props.textColor, margin: "20px", fontSize: 20}}>
                    {this.props.data === "" ? '\u00A0' : this.props.data}
            </div>
        )
    }
}

export default UserInputDisplay;