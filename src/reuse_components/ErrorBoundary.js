import React from 'react';
import { Result, Card } from 'antd';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
  
    componentDidCatch(error, info) {
        this.setState({ hasError: true });
    }
  
    render() {
        if (this.state.hasError) {
            return (
                <Card>
                    <Result status="warning" title="Opps! Something went wrong. Please refresh."/>
                </Card>
            )
        }
        return this.props.children;
    }
  }

export default ErrorBoundary;