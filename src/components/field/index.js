import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  StyleSheet,
  Platform,
  ViewPropTypes,
} from 'react-native';

import Line from '../line';
import Label from '../label';
import Affix from '../affix';
import Helper from '../helper';
import Counter from '../counter';

import styles from './styles.js';

function startAnimation(animation, options, callback) {
  Animated
    .timing(animation, options)
    .start(callback);
}

function labelStateFromProps(props, state) {
  let { placeholder, defaultValue } = props;
  let { text, receivedFocus } = state;

  return !!(placeholder || text || (!receivedFocus && defaultValue));
}

function errorStateFromProps(props, state) {
  let { error } = props;

  return !!error;
}

export default class TextField extends PureComponent {
  static defaultProps = {
    underlineColorAndroid: 'transparent',
    disableFullscreenUI: true,
    autoCapitalize: 'sentences',
    editable: true,

    animationDuration: 225,

    fontSize: 16,
    labelFontSize: 12,
    labelHeight: 32,
    labelPadding: 4,
    inputContainerPadding: 8,

    tintColor: 'rgb(0, 145, 234)',
    textColor: 'rgba(0, 0, 0, .87)',
    baseColor: 'rgba(0, 0, 0, .38)',

    errorColor: 'rgb(213, 0, 0)',

    lineWidth: StyleSheet.hairlineWidth,
    activeLineWidth: 2,
    disabledLineWidth: 1,

    lineType: 'solid',
    disabledLineType: 'dotted',

    disabled: false,
  };

  static propTypes = {
    ...TextInput.propTypes,

    animationDuration: PropTypes.number,

    fontSize: PropTypes.number,
    labelFontSize: PropTypes.number,
    labelHeight: PropTypes.number,
    labelPadding: PropTypes.number,
    inputContainerPadding: PropTypes.number,

    labelTextStyle: Text.propTypes.style,
    titleTextStyle: Text.propTypes.style,
    affixTextStyle: Text.propTypes.style,

    tintColor: PropTypes.string,
    textColor: PropTypes.string,
    baseColor: PropTypes.string,

    label: PropTypes.string.isRequired,
    title: PropTypes.string,

    characterRestriction: PropTypes.number,

    error: PropTypes.string,
    errorColor: PropTypes.string,

    lineWidth: PropTypes.number,
    activeLineWidth: PropTypes.number,
    disabledLineWidth: PropTypes.number,

    lineType: Line.propTypes.lineType,
    disabledLineType: Line.propTypes.lineType,

    disabled: PropTypes.bool,

    formatText: PropTypes.func,

    renderLeftAccessory: PropTypes.func,
    renderRightAccessory: PropTypes.func,

    prefix: PropTypes.string,
    suffix: PropTypes.string,

    containerStyle: (ViewPropTypes || View.propTypes).style,
    inputContainerStyle: (ViewPropTypes || View.propTypes).style,
  };

  static getDerivedStateFromProps({ error }, state) {
    /* Keep last received error in state */
    if (error && error !== state.error) {
      return { error };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.onBlur = this.onBlur.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onPress = this.focus.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onChangeText = this.onChangeText.bind(this);
    this.onContentSizeChange = this.onContentSizeChange.bind(this);
    this.onFocusAnimationEnd = this.onFocusAnimationEnd.bind(this);

    this.inputRef = React.createRef();
    this.mounted = false;
    this.focused = false;

    let { value: text, error, fontSize } = this.props;

    let labelState = labelStateFromProps(this.props, { text })? 1 : 0;
    let focusState = errorStateFromProps(this.props)? -1 : 0;

    this.state = {
      text,
      error,

      focusAnimation: new Animated.Value(focusState),
      labelAnimation: new Animated.Value(labelState),

      receivedFocus: false,

      height: fontSize * 1.5,
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidUpdate(prevProps, prevState) {
    let errorState = errorStateFromProps(this.props);
    let prevErrorState = errorStateFromProps(prevProps);

    if (errorState ^ prevErrorState) {
      this.startFocusAnimation();
    }

    let labelState = labelStateFromProps(this.props, this.state);
    let prevLabelState = labelStateFromProps(prevProps, prevState);

    if (labelState ^ prevLabelState) {
      this.startLabelAnimation();
    }
  }

  startFocusAnimation() {
    let { focusAnimation } = this.state;
    let { animationDuration: duration } = this.props;

    let options = {
      toValue: this.focusState(),
      duration,
    };

    startAnimation(focusAnimation, options, this.onFocusAnimationEnd);
  }

  startLabelAnimation() {
    let { labelAnimation } = this.state;
    let { animationDuration: duration } = this.props;

    let options = {
      toValue: this.labelState(),
      duration,
    };

    startAnimation(labelAnimation, options);
  }

  setNativeProps(props) {
    let { current: input } = this.inputRef;

    input.setNativeProps(props);
  }

  focusState() {
    if (errorStateFromProps(this.props)) {
      return -1;
    }

    return this.focused? 1 : 0;
  }

  labelState() {
    if (labelStateFromProps(this.props, this.state)) {
      return 1;
    }

    return this.focused? 1 : 0;
  }

  focus() {
    let { disabled, editable } = this.props;
    let { current: input } = this.inputRef;

    if (!disabled && editable) {
      input.focus();
    }
  }

  blur() {
    let { current: input } = this.inputRef;

    input.blur();
  }

  clear() {
    let { current: input } = this.inputRef;

    input.clear();

    /* onChangeText is not triggered by .clear() */
    this.onChangeText('');
  }

  value() {
    let { text } = this.state;
    let { defaultValue } = this.props;

    let value = this.isDefaultVisible()?
      defaultValue:
      text;

    if (null == value) {
      return '';
    }

    return 'string' === typeof value?
      value:
      String(value);
  }

  setValue(text) {
    this.setState({ text });
  }

  isFocused() {
    let { current: input } = this.inputRef;

    return input.isFocused();
  }

  isRestricted() {
    let { characterRestriction: limit } = this.props;
    let { length: count } = this.value();

    return limit < count;
  }

  isErrored() {
    return errorStateFromProps(this.props);
  }

  isDefaultVisible() {
    let { text, receivedFocus } = this.state;
    let { defaultValue } = this.props;

    return !receivedFocus && null == text && null != defaultValue;
  }

  isPlaceholderVisible() {
    let { placeholder } = this.props;

    return placeholder && !this.focused && !this.value();
  }

  isLabelActive() {
    return 1 === this.labelState();
  }

  onFocus(event) {
    let { onFocus, clearTextOnFocus } = this.props;
    let { receivedFocus } = this.state;

    if ('function' === typeof onFocus) {
      onFocus(event);
    }

    if (clearTextOnFocus) {
      this.clear();
    }

    this.focused = true;

    this.startFocusAnimation();
    this.startLabelAnimation();

    if (!receivedFocus) {
      this.setState({ receivedFocus: true, text: this.value() });
    }
  }

  onBlur(event) {
    let { onBlur } = this.props;

    if ('function' === typeof onBlur) {
      onBlur(event);
    }

    this.focused = false;

    this.startFocusAnimation();
    this.startLabelAnimation();
  }

  onChange(event) {
    let { onChange } = this.props;

    if ('function' === typeof onChange) {
      onChange(event);
    }
  }

  onChangeText(text) {
    let { onChangeText, formatText } = this.props;

    if ('function' === typeof formatText) {
      text = formatText(text);
    }

    this.setState({ text });

    if ('function' === typeof onChangeText) {
      onChangeText(text);
    }
  }

  onContentSizeChange(event) {
    let { onContentSizeChange, fontSize } = this.props;
    let { height } = event.nativeEvent.contentSize;

    if ('function' === typeof onContentSizeChange) {
      onContentSizeChange(event);
    }

    this.setState({
      height: Math.max(
        fontSize * 1.5,
        Math.ceil(height) + Platform.select({ ios: 4, android: 1 })
      ),
    });
  }

  onFocusAnimationEnd() {
    let { error } = this.props;
    let { error: retainedError } = this.state;

    if (this.mounted && !error && retainedError) {
      this.setState({ error: null });
    }
  }

  inputHeight() {
    let { height: computedHeight } = this.state;
    let { multiline, fontSize, height = computedHeight } = this.props;

    return multiline?
      height:
      fontSize * 1.5;
  }

  inputContainerHeight() {
    let { labelHeight, inputContainerPadding, multiline } = this.props;

    if ('web' === Platform.OS && multiline) {
      return 'auto';
    }

    return labelHeight + inputContainerPadding + this.inputHeight();
  }

  inputProps() {
    return Object.keys(TextInput.propTypes)
      .reduce((store, key) => {
        switch (key) {
          case 'defaultValue':
            break;

          default:
            if (key in this.props) {
              store[key] = this.props[key];
            }
        }

        return store;
      }, {});
  }

  renderAccessory(prop) {
    let { [prop]: renderAccessory } = this.props;

    if ('function' !== typeof renderAccessory) {
      return null;
    }

    return (
      <View style={styles.accessory}>
        {renderAccessory()}
      </View>
    );
  }

  renderAffix(type) {
    let { labelAnimation } = this.state;
    let {
      [type]: affix,
      fontSize,
      baseColor: color,
      affixTextStyle: style,
    } = this.props;

    if (null == affix) {
      return null;
    }

    let props = {
      type,
      style,
      color,
      fontSize,
      labelAnimation,
    };

    return (
      <Affix {...props}>{affix}</Affix>
    );
  }

  renderHelper() {
    let { focusAnimation, error } = this.state;

    let {
      title,
      disabled,
      baseColor,
      errorColor,
      titleTextStyle: style,
      characterRestriction: limit,
    } = this.props;

    let { length: count } = this.value();

    let styleProps = {
      style,
      baseColor,
      errorColor,
    };

    let counterProps = {
      ...styleProps,
      limit,
      count,
    };

    let helperProps = {
      ...styleProps,
      title,
      error,
      disabled,
      focusAnimation,
    };

    return (
      <View style={styles.helperContainer}>
        <Helper {...helperProps} />
        <Counter {...counterProps} />
      </View>
    );
  }

  renderInput() {
    let {
      disabled,
      editable,
      multiline,
      fontSize,
      baseColor,
      tintColor,
      textColor,
      style: inputStyleOverrides,
    } = this.props;

    let props = this.inputProps();
    let defaultVisible = this.isDefaultVisible();

    let inputStyle = {
      fontSize,

      color: (disabled || defaultVisible)?
        baseColor:
        textColor,

      height: this.inputHeight(),
    };

    if (multiline) {
      let lineHeight = fontSize * 1.5;

      inputStyle.height += lineHeight;
      inputStyle.transform = [{
        translateY: lineHeight + ('ios' === Platform.OS? 2 : 0),
      }];
    }

    return (
      <TextInput
        selectionColor={tintColor}

        {...props}

        style={[styles.input, inputStyle, inputStyleOverrides]}
        editable={!disabled && editable}
        onChange={this.onChange}
        onChangeText={this.onChangeText}
        onContentSizeChange={this.onContentSizeChange}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        value={this.value()}
        ref={this.inputRef}
      />
    );
  }

  render() {
    let { labelAnimation, focusAnimation } = this.state;
    let {
      label,
      editable,
      disabled,
      lineType,
      disabledLineType,
      lineWidth,
      activeLineWidth,
      disabledLineWidth,
      fontSize,
      labelFontSize,
      labelHeight,
      labelPadding,
      labelTextStyle,
      tintColor,
      baseColor,
      errorColor,
      containerStyle,
      inputContainerPadding,
      inputContainerStyle: inputContainerStyleOverrides,
    } = this.props;

    let restricted = this.isRestricted();

    let inputContainerStyle = {
      paddingBottom: inputContainerPadding,
      height: this.inputContainerHeight(),
    };

    let containerProps = {
      style: containerStyle,
      onStartShouldSetResponder: () => true,
      onResponderRelease: this.onPress,
      pointerEvents: !disabled && editable?
        'auto':
        'none',
    };

    let inputContainerProps = {
      style: [
        styles.inputContainer,
        inputContainerStyle,
        inputContainerStyleOverrides,
      ],
    };

    let styleProps = {
      disabled,
      restricted,
      baseColor,
      tintColor,
      errorColor,

      focusAnimation,
      labelAnimation,
    };

    let lineProps = {
      ...styleProps,

      lineWidth,
      activeLineWidth,
      disabledLineWidth,

      lineType,
      disabledLineType,
    };

    let labelProps = {
      ...styleProps,

      fontSize,
      activeFontSize: labelFontSize,

      baseSize: labelHeight,
      basePadding: labelPadding,

      style: labelTextStyle,
    };

    return (
      <View {...containerProps}>
        <Animated.View {...inputContainerProps}>
          <Line {...lineProps} />

          {this.renderAccessory('renderLeftAccessory')}

          <View style={styles.stack}>
            <Label {...labelProps}>{label}</Label>

            <View style={styles.row}>
              {this.renderAffix('prefix')}
              {this.renderInput()}
              {this.renderAffix('suffix')}
            </View>
          </View>

          {this.renderAccessory('renderRightAccessory')}
        </Animated.View>

        {this.renderHelper()}
      </View>
    );
  }
}
