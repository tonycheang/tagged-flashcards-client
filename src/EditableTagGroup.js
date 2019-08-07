import React from "react"
import { Tag, Input, Tooltip, Icon } from 'antd';

export default class EditableTagGroup extends React.Component {
  
  // Component pulls tags from props to allow parent component to read tags
  state = {
    inputVisible: false,
    inputValue: '',
  };

  handleClose = removedTag => {
    const tags = this.props.tags.filter(tag => tag !== removedTag);
    this.props.setTags(tags);
  };

  showInput = () => {
    this.setState({ inputVisible: true }, () => this.input.focus());
  };

  handleInputChange = e => {
    this.setState({ inputValue: e.target.value });
  };

  handleInputConfirm = () => {
    const { inputValue } = this.state;
    let { tags } = this.props;
    if (inputValue && tags.indexOf(inputValue) === -1) {
      tags = [...tags, inputValue];
    }

    this.props.setTags(tags);

    this.setState({
      inputVisible: false,
      inputValue: '',
    });
  };

  saveInputRef = input => (this.input = input);

  render() {
    const { inputVisible, inputValue } = this.state;
    const { tags } = this.props;

    return (
      <div>
        {tags.map((tag, index) => {
          const isLongTag = tag.length > 20;
          const tagElem = (
            <Tag key={tag} closable onClose={() => this.handleClose(tag)}>
              {isLongTag ? `${tag.slice(0, 20)}...` : tag}
            </Tag>
          );
          return isLongTag ? (
            <Tooltip title={tag} key={tag}>
              {tagElem}
            </Tooltip>
          ) : (
            tagElem
          );
        })}
        {/* Use AutoComplete */}
        {inputVisible && (
          <Input
            ref={this.saveInputRef}
            type="text"
            size="small"
            style={{ width: 78 }}
            value={inputValue}
            onChange={this.handleInputChange}
            onBlur={this.handleInputConfirm}
            onPressEnter={this.handleInputConfirm}
          />
        )}
        {!inputVisible && (
          <Tag onClick={this.showInput} style={{ background: '#fff', borderStyle: 'dashed' }}>
            <Icon type="plus" /> New Tag
          </Tag>
        )}
      </div>
    );
  }
}