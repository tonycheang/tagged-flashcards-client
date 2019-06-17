import React from 'react';

class CardDisplay extends React.Component {
    render(){
        return (
            <div style={{fontSize: 70, margin: "20px"}}>
                {this.props.data}
            </div>
        )
    }
}

export default CardDisplay;