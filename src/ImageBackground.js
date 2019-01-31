// @flow
import * as _ from "lodash";
import * as React from "react";
import { ImageBackground as RNImageBackground, Animated, StyleSheet, View, Platform } from "react-native";
import { BlurView } from "expo";
import { type ____ImageStyleProp_Internal as ImageStyle } from "react-native/Libraries/StyleSheet/StyleSheetTypes";
import type { ImageSourcePropType } from "react-native/Libraries/Image/ImageSourcePropType";

import CacheManager, { type DownloadOptions } from "./CacheManager";

type ImageProps = {
    style?: ImageStyle,
    defaultSource?: ImageSourcePropType,
    preview?: ImageSourcePropType,
    options?: DownloadOptions,
    uri: string,
    transitionDuration?: number,
    tint?: "dark" | "light"
};

type ImageState = {
    uri: ?string,
    intensity: Animated.Value
};

export default class Image extends React.Component<ImageProps, ImageState> {
    mounted = true;

    static defaultProps = {
        transitionDuration: 300,
        tint: "dark"
    };

    state = {
        uri: undefined,
        intensity: new Animated.Value(100),
        error: false
    };

    async load({ uri, options = {} }: ImageProps): Promise<void> {
        if (uri) {
            const path = await CacheManager.get(uri, options).getPath();
            if (path && this.mounted) {
                this.setState({ uri: path, error: false });
            } else if (!path && this.mounted) {
                this.setState({ uri: undefined, error: true });
            }
        }
    }

    componentDidMount() {
        this.load(this.props);
    }

    componentDidUpdate(prevProps: ImageProps, prevState: ImageState) {
        const { preview, transitionDuration } = this.props;
        const { uri, intensity } = this.state;
        if (this.props.uri !== prevProps.uri) {
            this.load(this.props);
        } else if (uri && preview && prevState.uri === undefined) {
            Animated.timing(intensity, {
                duration: transitionDuration,
                toValue: 0,
                useNativeDriver: Platform.OS === "android"
            }).start();
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    render(): React.Node {
        const { preview, style, defaultSource, tint, previewResizeMode, ...otherProps } = this.props;
        const { uri, intensity, error } = this.state;
        if (error) {
            return <View {...{ style }}>{this.props.children}</View>;
        }
        const hasDefaultSource = !!defaultSource;
        const hasPreview = !!preview;
        const isImageReady = !!uri;
        const opacity = intensity.interpolate({
            inputRange: [0, 100],
            outputRange: [0, 0.5]
        });
        const computedStyle = [
            StyleSheet.absoluteFill,
            _.transform(
                _.pickBy(StyleSheet.flatten(style), (value, key) => propsToCopy.indexOf(key) !== -1),
                // $FlowFixMe
                (result, value, key) => Object.assign(result, { [key]: value - (style.borderWidth || 0) })
            )
        ];
        return (
            <View {...{ style }}>
                {hasDefaultSource && !hasPreview && !isImageReady && (
                    <RNImageBackground source={defaultSource} style={computedStyle} {...otherProps}>
                        {this.props.children}
                    </RNImageBackground>
                )}
                {hasPreview && (
                    <RNImageBackground
                        source={preview}
                        resizeMode={previewResizeMode || "cover"}
                        style={computedStyle}
                        blurRadius={Platform.OS === "android" ? 0.5 : 0}
                    >
                        {this.props.children}
                    </RNImageBackground>
                )}
                {isImageReady && (
                    <RNImageBackground source={{ uri }} style={computedStyle} {...otherProps}>
                        {this.props.children}
                    </RNImageBackground>
                )}
                {hasPreview && Platform.OS === "ios" && (
                    <AnimatedBlurView style={computedStyle} {...{ intensity, tint }}>
                        {this.props.children}
                    </AnimatedBlurView>
                )}
                {hasPreview && Platform.OS === "android" && (
                    <Animated.View
                        style={[computedStyle, { backgroundColor: tint === "dark" ? black : white, opacity }]}
                    >
                        {this.props.children}
                    </Animated.View>
                )}
            </View>
        );
    }
}

const black = "black";
const white = "white";
const propsToCopy = [
    "borderRadius",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius"
];
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
